// Локальний сервер на чистому Node.js (без сторонніх бібліотек)
// Запуск: node local-server.js
// Адреса: http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DIR = __dirname;
const DATA_FILE = path.join(DIR, 'data.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const reqUrl = req.url.split('?')[0];

  // Отримання даних через API
  if (req.method === 'GET' && reqUrl === '/api/data') {
    fs.readFile(DATA_FILE, 'utf-8', (err, content) => {
      if (err) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ source: 'empty', items: [] }));
        return;
      }
      try {
        const parsed = JSON.parse(content);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          source: 'file',
          items: Array.isArray(parsed) ? parsed : (parsed.items || [])
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Збереження оновленого data.json на диску
  if (req.method === 'POST' && reqUrl === '/api/save') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'ok', storage: 'local_file', count: data.length }));
        console.log(`[OK] data.json успішно оновлено на диску. Записів: ${data.length}`);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Віддача статичних файлів (index.html, data.json)
  let filePath = path.join(DIR, reqUrl === '/' ? 'index.html' : reqUrl);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404: Файл не знайдено');
    } else {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 Сервер запущено: http://localhost:${PORT}`);
  console.log(`📁 Файл на диску: ${DATA_FILE}`);
  console.log(`💡 Будь-які зміни (додавання чи видалення) автоматично записуються в data.json\n`);
});
