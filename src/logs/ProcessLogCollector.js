class ProcessLogCollector {
  constructor({ streamIdGraylog }) {
    this.streamIdGraylog = streamIdGraylog;
    this.logs = [];
  }

  add({ status, serviceAccountId, flowId, digitalUserId, errorMessage }) {
    this.logs.push({
      status,
      streamIdGraylog: this.streamIdGraylog || null,
      serviceAccountId: serviceAccountId || null,
      flowId: flowId || null,
      digitalUserId: digitalUserId ?? null,
      errorMessage: errorMessage || null,
    });
  }

  all() {
    return this.logs;
  }

  count() {
    return this.logs.length;
  }
}

module.exports = { ProcessLogCollector };
