// Normalización de los campos relevantes del JSON de graylog
function parseGraylogToItems(graylogJson) {
  
  const rows = graylogJson.datarows || [];
  const messages = rows.map((r) => r?.[0]).filter(Boolean);

  const items = [];
  for (const msg of messages) {
    try {
      const parts = String(msg).split('}').slice(1);
      const rebuilt = '{' + parts.join('}') + '}';
      const obj = JSON.parse(rebuilt);

      items.push({
        flowID: obj.flowID ?? obj.flowId ?? obj.flowid,
        serviceAccountID: obj.serviceAccountID ?? obj.serviceAccountId ?? obj.serviceaccountid,
        responseCode: obj.responseCode,
        responseMessage: obj.responseMessage,
      });
    } catch {
     
    }
  }
  return items;
}

module.exports = { parseGraylogToItems };
