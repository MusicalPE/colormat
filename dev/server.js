// 색동 시험용 서버 — 실제 구글 서버 없이 이 컴퓨터에서 색동 전체를 돌려 봄
//   /            저장소 파일 그대로 (우리 학교 · 한마당 · 놀이터 · 한판 · 판정기)
//   /shell       우리 학교 껍데기(../Shell.gs)를 흉내 낸 서버  → index.html?s=http://localhost:PORT/shell
//   /collector   전국 수집기(dev/Collector.gs, 점퍼스 저장소에서 복사해 둔 것)
//   /national.json  → 위 /collector 를 가리키게 바꿔서 돌려줌 (진짜 전국 현황판에 안 보냄)
// 쓰는 법: node dev/server.js [포트]   (기본 8897) — 켤 때마다 빈 시트에서 시작
const http = require('http'), fs = require('fs'), path = require('path');
const { createGas } = require('./gas-emu');
const PORT = +(process.argv[2] || process.env.PORT || 8897);
const ROOT = path.join(__dirname, '..');
const BASE = 'http://localhost:' + PORT;
const shell = createGas({ selfUrl: BASE + '/shell', shellPath: path.join(ROOT, 'Shell.gs') });
const col = createGas({ selfUrl: BASE + '/collector', shellPath: path.join(__dirname, 'Collector.gs') });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.gs': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
function out(res, o){
  const t = o && o.getContent ? o.getContent() : JSON.stringify(o);
  res.writeHead(200, { 'Content-Type': o && o._type === 'html' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(t);
}
function body(req){ return new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(b)); }); }
http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, BASE), p = decodeURIComponent(u.pathname);
    const q = Object.fromEntries(u.searchParams);
    if (p === '/shell' || p === '/collector') {
      const g = p === '/shell' ? shell : col;
      if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); return res.end(); }
      if (req.method === 'POST') return out(res, g.ctx.doPost({ postData: { contents: await body(req) }, parameter: q }));
      return out(res, g.ctx.doGet({ parameter: q }));
    }
    if (/\/national\.json$/.test(p)) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ collector: BASE + '/collector' })); }
    let f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  } catch (e) { res.writeHead(500); res.end(String(e && e.stack || e)); }
}).listen(PORT, () => console.log('색동 시험 서버: ' + BASE + '/index.html?s=' + encodeURIComponent(BASE + '/shell')));
