const pLimit = require('p-limit');
const cfg = require('./config');
const { getStreamId, searchMessages } = require('./graylog/client');
const { parseGraylogToItems } = require('./parsing/extract');
const {
  searchRelatedDataByServiceAccount,
  flowIdExists,
  createRelatedData,
} = require('./webdb/client');
const { ProcessLogCollector } = require('./logs/ProcessLogCollector');
const { insertFlowidLogs } = require('./logs/OracleWriter');



async function handler() {
  const streamId = await getStreamId({
    baseUrl: cfg.graylog.baseUrl,
    token: cfg.graylog.token,
    title: cfg.graylog.streamTitle,
  });
  
  const logCollector = new ProcessLogCollector({ streamIdGraylog: streamId });


  const graylogJson = await searchMessages({
    baseUrl: cfg.graylog.baseUrl,
    token: cfg.graylog.token,
    streamId,
    searchQueryJson: cfg.graylog.searchQueryJson,
  });

  const items = parseGraylogToItems(graylogJson);

  //Ver unicamente los logs de graylog, sin procesarlos
  const onlyGraylog = process.argv.includes('--only-graylog');
  if (onlyGraylog) {
    let emitted = 0;
    for (const it of items) {
      if (!it.serviceAccountID) continue;
      emitted++;
      console.log(
        JSON.stringify({
          level: 'info',
          event: 'GRAYLOG_ITEM',
          flowID: String(it.flowID ?? ''),
          serviceAccountID: String(it.serviceAccountID),
        })
      );
    }
    return { mode: 'only-graylog', processed: items.length, emitted };
  }

  const limit = pLimit(cfg.runtime.concurrency);

  let ok = 0;
  let pending = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  const results = [];

  // Procesar logs: busqueda de serviceAccountID y obtención del digitalUser por cada item del log
  await Promise.all(
    items.map((it) =>
      limit(async () => {
        if (!it.serviceAccountID) return;

        const r = await searchRelatedDataByServiceAccount(cfg.webdb, it.serviceAccountID);

        if (r.status === 'ok') {
          ok++;
          results.push({
            flowID: String(it.flowID ?? ''),
            serviceAccountID: String(it.serviceAccountID),
            digitalUserId: String(r.digitalUserId),
          });
        } else if (r.status === 'pending') {
          pending++;
          console.error(
            JSON.stringify({
              level: 'warn',
              event: 'PENDING',
              flowID: it.flowID,
              serviceAccountID: it.serviceAccountID,
            })
          );
          logCollector.add({
            status: 'PENDING',
            flowId: String(it.flowID ?? ''),
            serviceAccountId: String(it.serviceAccountID),
            digitalUserId: null,
          });
        } else {
          errors++;
          console.error(
            JSON.stringify({
              level: 'error',
              event: 'WEBDB_SEARCH_ERROR',
              flowID: it.flowID,
              serviceAccountID: it.serviceAccountID,
              http: r.http,
              body: r.body,
            })
          );
          logCollector.add({
            status: 'INSERTED_ERROR',
            flowId: String(it.flowID ?? ''),
            serviceAccountId: String(it.serviceAccountID),
            digitalUserId: null,
            errorMessage: String(r.body ?? 'WEBDB_SEARCH_ERROR'),
          });
        }
      })
    )
  );


  for (const r of results) {
    console.log(JSON.stringify({ level: 'info', event: 'FOUND', ...r }));
  }

  // Insertar flowID si no existe en relatedData
  for (const r of results) {
    const { flowID, serviceAccountID, digitalUserId } = r;

    try {
      const exists = await flowIdExists(cfg.webdb, digitalUserId, flowID);
      if (exists) {
        skipped++;
        console.log(
          JSON.stringify({
            level: 'info',
            event: 'SKIP_ALREADY_EXISTS',
            flowID,
            serviceAccountID,
            digitalUserId,
          })
        );
        logCollector.add({
          status: 'SKIP_ALREADY_EXISTS',
          flowId: String(flowID),
          serviceAccountId: String(serviceAccountID),
          digitalUserId: String(digitalUserId),
        });
        continue;
      }

      await createRelatedData(cfg.webdb, {
        digitalUserId,
        key: 'FLOWID',
        value: flowID,
      });

      inserted++;

      console.log(
        JSON.stringify({
          level: 'info',
          event: 'INSERTED',
          flowID,
          serviceAccountID,
          digitalUserId,
        })
      );
      logCollector.add({
        status: 'INSERTED',
        flowId: String(flowID),
        serviceAccountId: String(serviceAccountID),
        digitalUserId: String(digitalUserId),
      });

    } catch (err) {
      errors++;
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'INSERT_ERROR',
          flowID,
          serviceAccountID,
          digitalUserId,
          error: err?.message || String(err),
        })
      );
      logCollector.add({
        status: 'INSERTED_ERROR',
        flowId: String(flowID),
        serviceAccountId: String(serviceAccountID),
        digitalUserId: String(digitalUserId),
        errorMessage: err?.message || String(err),
      });

    }
  }

  try {
    const dbRes = await insertFlowidLogs(cfg.oracleLogs, logCollector.all());
    console.log(JSON.stringify({ level: 'info', event: 'ORACLE_LOGS_INSERTED', inserted: dbRes.inserted }));
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', event: 'ORACLE_LOGS_INSERT_ERROR', error: e?.message || String(e) }));
  }


  return {
    processed: items.length,
    ok,
    pending,
    inserted,
    skipped,
    errors,
  };
}

module.exports = { handler };

