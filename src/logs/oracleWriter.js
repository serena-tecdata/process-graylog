const oracledb = require('oracledb');

async function withOracleConnection(cfg, fn) {
  const connection = await oracledb.getConnection({
    user: cfg.user,
    password: cfg.password,
    connectString: cfg.connectString,
  });

  try {
    return await fn(connection);
  } finally {
    try {
      await connection.close();
    } catch (_) {
      // 
    }
  }
}

async function insertFlowidLogs(oracleCfg, logs) {
  if (!logs || logs.length === 0) return { inserted: 0 };

  const sql = `
    INSERT INTO IDP_FLOWID_LOGS (
      status,
      streamid_graylog,
      serviceaccountid,
      flowid,
      digitaluserid,
      error_message
    ) VALUES (
      :status,
      :streamIdGraylog,
      :serviceAccountId,
      :flowId,
      :digitalUserId,
      :errorMessage
    )
  `;

  return withOracleConnection(oracleCfg, async (conn) => {
    const binds = logs.map((l) => ({
      status: l.status,
      streamIdGraylog: l.streamIdGraylog,
      serviceAccountId: l.serviceAccountId,
      flowId: l.flowId,
      digitalUserId: l.digitalUserId,
      errorMessage: l.errorMessage,
    }));

    await conn.executeMany(sql, binds, { autoCommit: true });
    return { inserted: binds.length };
  });
}

module.exports = { insertFlowidLogs };
