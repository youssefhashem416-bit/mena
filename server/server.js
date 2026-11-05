const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleApi } = require('./api');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const query = Object.fromEntries(parsedUrl.searchParams.entries());

  // 1. API routes
  if (pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, pathname, query);
    } catch (err) {
      console.error('API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'حدث خطأ في الخادم', details: err.message }));
    }
    return;
  }

  // 2. Static Files
  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.normalize(path.join(PUBLIC_DIR, relativePath));

  // Security check: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Access Denied');
  }

  // If path is directory, look for index.html inside
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } else {
    // 404
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head><meta charset="UTF-8"><title>404 - الصفحة غير موجودة</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; background: #f8fafc; color: #334155; }
        h1 { color: #2563eb; }
        a { color: #2563eb; text-decoration: none; font-weight: bold; }
      </style>
      </head>
      <body>
        <h1>404 | الصفحة غير موجودة</h1>
        <p>عذرًا، لم نتمكن من العثور على الصفحة المطلوبة (${pathname}).</p>
        <p><a href="/index.html">العودة إلى الصفحة الرئيسية لمنصة بصمة أمل</a></p>
      </body>
      </html>
    `);
  }
});

server.listen(PORT, () => {
  console.log(`
  ==============================================================
   بصمة أمل | HOPE TOUCH - منصة التعليم والتأهيل الذكية
   الشعار: كل طفل لديه قدرة تستحق أن تُكتشف
  ==============================================================
   الخادم يعمل بنجاح على: http://localhost:${PORT}
   قاعدة البيانات: JSON Relational Engine مع 20 جدولًا نشطًا
   حسابات التجربة السريعة:
     - المدير: admin / admin123
     - المعلم: teacher_sarah / teacher123
     - ولي الأمر: parent_khalid / parent123
     - الطفل (توحد - 5 سنوات): child_omar / child123
     - الطفلة (متلازمة داون - 7 سنوات): child_nour / child123
  ==============================================================
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nإيقاف خادم بصمة أمل بأمان...');
  server.close(() => process.exit(0));
});

