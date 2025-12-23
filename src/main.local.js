require('dotenv').config();
const { handler } = require('./handler');

handler()
  .then((summary) => {
    console.log(JSON.stringify({ level: 'info', event: 'SUMMARY', ...summary }));
    process.exit(0);
  })
  .catch((err) => {
    console.error(JSON.stringify({ level: 'error', event: 'FATAL', message: String(err), stack: err?.stack }));
    process.exit(1);
  });
