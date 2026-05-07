const http = require('http');
const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, '..', 'public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };
http.createServer((request, response) => {
  const safePath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.join(publicDir, safePath);
  const resolved = fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : path.join(publicDir, 'index.html');
  response.writeHead(200, { 'content-type': types[path.extname(resolved)] || 'application/octet-stream' });
  fs.createReadStream(resolved).pipe(response);
}).listen(process.env.PORT || 3000, () => console.log(`RFI Manager running on http://localhost:${process.env.PORT || 3000}`));
