import http from 'http';

const data = JSON.stringify({
  target_domain: "work",
  timezone: "America/New_York"
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/internal/cron/tick',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
