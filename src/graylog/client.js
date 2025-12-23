const https = require('https');
const graylogHttpsAgent = new https.Agent({ rejectUnauthorized: false });

function httpsJson(url, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);

    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method,
        headers,
        agent: graylogHttpsAgent,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, headers: res.headers, body: data });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function basicAuth(user, pass) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

async function getStreamId({ baseUrl, token, title }) {
  const url = `${baseUrl}/api/streams`;
  const r = await httpsJson(url, {
    headers: {
      Accept: 'application/json',
      'X-Requested-By': 'cli',
      Authorization: basicAuth(token, 'token'),
    },
  });

  if (r.status !== 200) {
    throw new Error(`Graylog /api/streams status=${r.status} body=${r.body}`);
  }
  const json = JSON.parse(r.body);
  const stream = (json.streams || []).find((s) => s.title === title);
  if (!stream?.id) throw new Error(`Stream not found: ${title}`);
  return stream.id;
}

async function searchMessages({ baseUrl, token, streamId, searchQueryJson }) {
  const url = `${baseUrl}/api/search/messages`;

  const query = JSON.parse(searchQueryJson);
  query.streams = [streamId];

  const r = await httpsJson(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-By': 'cli',
      Authorization: basicAuth(token, 'token'),
    },
    body: JSON.stringify(query),
  });

  if (r.status !== 200) {
    throw new Error(`Graylog /api/search/messages status=${r.status} body=${r.body}`);
  }
  return JSON.parse(r.body);
}

module.exports = { getStreamId, searchMessages };
