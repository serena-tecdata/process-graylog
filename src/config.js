const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
};

module.exports = {
  graylog: {
    baseUrl: required('GRAYLOG_URL').replace(/\/$/, ''),
    token: required('GRAYLOG_TOKEN'),
    streamTitle: required('GRAYLOG_STREAM_TITLE'),
    searchQueryJson: required('GRAYLOG_SEARCH_JSON'),
  },
  webdb: {
    baseUrl: required('WEBDB_BASE_URL').replace(/\/$/, ''),
    insecureTls: (process.env.WEBDB_INSECURE_TLS || 'true') === 'true',
  },
  oracleLogs: {
    user: required('ORACLE_LOGS_USER'),
    password: required('ORACLE_LOGS_PASSWORD'),
    connectString: required('ORACLE_LOGS_CONNECT_STRING'),
  },
  runtime: {
    concurrency: Number(process.env.CONCURRENCY || '5'),
  },
};
