const http = require('http');

const OPTIONS = {
  port: '3000',
  path: '/health',
  timeout: 2000,
};

const request = http.request(OPTIONS, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error(`ERROR: ${err}`);
  process.exit(1);
});

request.end();
