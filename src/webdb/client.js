const axios = require('axios');
const https = require('https');

const { WebdbConnector, BalancedWebdbConnector } = require('@telecom-ar/webdb-connector');

/**
 * Cache del connector por (baseUrl|token|insecureTls)
 */
const _connectorCache = new Map();

function buildAxios(webdbCfg) {
  if (!webdbCfg?.baseUrl) throw new Error('WEBDB_BASEURL_MISSING');

  const insecureTls = Boolean(webdbCfg?.insecureTls);

  return axios.create({
    baseURL: webdbCfg.baseUrl,
    timeout: webdbCfg.timeoutMs ?? 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(webdbCfg.token ? { Authorization: `Bearer ${webdbCfg.token}` } : {}),
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: !insecureTls }),
  });
}

function getConnector(webdbCfg) {
  const baseUrl = webdbCfg?.baseUrl;
  const token = webdbCfg?.token ?? '';
  const insecureTls = Boolean(webdbCfg?.insecureTls);

  const cacheKey = `${baseUrl}|${token}|${insecureTls}`;

  const cached = _connectorCache.get(cacheKey);
  if (cached) return cached;

  const requestHandler = buildAxios(webdbCfg);

  const primary = WebdbConnector.withRequestHandler(webdbCfg.baseUrl, requestHandler);

  const connector =
    typeof BalancedWebdbConnector?.fromConnectors === 'function'
      ? BalancedWebdbConnector.fromConnectors([primary])
      : primary;

  _connectorCache.set(cacheKey, connector);
  return connector;
}

async function searchRelatedDataByServiceAccount(webdbCfg, serviceAccountId) {
  try {
    const connector = getConnector(webdbCfg);

    const rd = await connector.searchRelatedData({
      optionKey: 'IDSERVICEACCOUNT',
      relateDataValue: String(serviceAccountId),
    });

    if (!rd || !rd.digitalUserId) return { status: 'pending' };

    return { status: 'ok', digitalUserId: String(rd.digitalUserId) };
  } catch (err) {
    return {
      status: 'error',
      http: err?.response?.status,
      body: err?.response?.data ?? (err?.message || String(err)),
    };
  }
}

async function flowIdExists(webdbCfg, digitalUserId, flowID) {
  const connector = getConnector(webdbCfg);

  const rows = await connector.listRelatedDataByDigitalUser({
    digitalUserId: String(digitalUserId),
  });

  return rows.some(
    (r) => String(r.key) === 'FLOWID' && String(r.value) === String(flowID)
  );
}

async function createRelatedData(webdbCfg, { digitalUserId, key, value }) {
  const connector = getConnector(webdbCfg);

  await connector.createRelatedData({
    digitalUserId: String(digitalUserId),
    key: String(key),
    value: String(value),
  });
}

module.exports = {
  searchRelatedDataByServiceAccount,
  flowIdExists,
  createRelatedData,
};

