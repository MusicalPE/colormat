#!/usr/bin/env node
// 색동 코드 검사 (1단계) — 화면을 띄우지 않고 파일만 읽어서 봐요
//   ① 문법 오류: 화면 파일 속 스크립트, cm-app.js·판정기 게임·서비스워커, 껍데기(Shell.gs)
//   ② 짝: 따옴표·괄호는 ①에서, 화면 뼈대의 여닫는 태그(div 등)와 태그 안 따옴표 짝
//   ③ 단추가 가리키는 함수·요소가 실제로 있는지 (onclick="함수()", $('아이디').onclick = …)
//   ④ 판 번호가 파일마다 같은지 (놀이터 제목·머리·README, 껍데기 판 ↔ 화면이 바라는 판)
//   ⑤ 설정 파일(json) 읽기
// 쓰는 법: node dev/check.js   → 문제가 없으면 "코드 검사 통과", 있으면 목록을 보여 주고 1로 끝남
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = process.env.CM_ROOT || path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const errs = [], notes = [];
const bad = (f, m) => errs.push(`${f}: ${m}`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmcheck-'));

const PAGES = ['index.html', 'board.html', 'app.html', 'play/index.html', 'live/index.html', 'checker/index.html'];
const SCRIPTS = ['cm-app.js', 'sw.js', 'checker/games.js', 'Shell.gs'];
const JSONS = ['manifest.webmanifest', 'national.json', 'live/database.rules.json'];

function nodeCheck(code, ext, label){
  const f = path.join(tmp, 'c' + Math.random().toString(36).slice(2) + ext);
  fs.writeFileSync(f, code);
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) {
    const msg = String(e.stderr || e.message).split('\n').filter(l => /SyntaxError|^\s*\^|:\d+$/.test(l) || /Error/.test(l)).slice(0, 4).join(' | ').replace(new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), label);
    bad(label, '문법 오류 — ' + msg);
  }
}
// 스크립트 블록 꺼내기 (줄 번호를 맞추려고 앞부분은 빈 줄로 채움)
function scripts(html){
  const out = []; const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/.test(m[1])) continue;
    if (/type\s*=\s*["']?(application\/ld\+json|text\/template)/i.test(m[1])) continue;
    const line = html.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length - 1;
    out.push({ module: /type\s*=\s*["']?module/i.test(m[1]), code: '\n'.repeat(line) + m[2] });
  }
  return out;
}
const stripScripts = h => h.replace(/<script\b[\s\S]*?<\/script>/gi, m => m.replace(/[^\n]/g, ' ')).replace(/<style\b[\s\S]*?<\/style>/gi, m => m.replace(/[^\n]/g, ' ')).replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));

// ① 문법
for (const f of PAGES) {
  const h = rd(f);
  scripts(h).forEach((s, i) => nodeCheck(s.code, s.module ? '.mjs' : '.js', `${f} (스크립트 ${i + 1})`));
}
for (const f of SCRIPTS) nodeCheck(rd(f), f.endsWith('.gs') ? '.js' : '.js', f);

// ①-2 없는 이름 부르기 (함수 이름을 바꾸고 부르는 곳을 못 고친 경우 등) — eslint 의 no-undef
//      eslint 가 없으면 건너뛰고 알려 줌 (dev 폴더에서 npm i 하면 생겨요)
(function(){
  let Linter;
  for (const p of [path.join(__dirname, 'node_modules/eslint'), 'eslint', '/opt/node-tools/node_modules/eslint']) { try { ({ Linter } = require(p)); break; } catch (e) {} }
  if (!Linter) { notes.push('없는 이름 검사는 건너뜀 (eslint 없음 — dev 폴더에서 npm i)'); return; }
  const BROWSER = JSON.parse(fs.readFileSync(path.join(__dirname, 'browser-globals.json'), 'utf8'));
  const GAS = ['SpreadsheetApp', 'PropertiesService', 'CacheService', 'Utilities', 'Session', 'ContentService', 'HtmlService', 'ScriptApp', 'UrlFetchApp', 'LockService', 'Logger', 'globalThis'];
  // 페이지 안 스크립트끼리·cm-app.js 와 서로 쓰는 맨 바깥 이름
  const tops = code => [...code.matchAll(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+\{([^}]*)\}|\bwindow\.([A-Za-z_$][\w$]*)\s*=(?!=)/gm)]
    .flatMap(m => m[3] ? m[3].split(',').map(x => x.split(':').pop().trim()) : [m[1] || m[2] || m[4]]).filter(Boolean);
  const linter = new Linter();
  const run = (code, label, sourceType, extra) => {
    const g = {}; BROWSER.concat(extra).forEach(n => { g[n] = 'readonly'; });
    const msgs = linter.verify(code, [{ languageOptions: { ecmaVersion: 'latest', sourceType, globals: g }, rules: { 'no-undef': 'error' } }]);
    const seen = new Set();
    msgs.forEach(m => { const k = m.message; if (seen.has(k)) return; seen.add(k);
      bad(label, `${m.line}번째 줄 — ${m.fatal ? '문법: ' : ''}${m.message.replace(/'(.+)' is not defined\./, "'$1' 이(가) 어디에도 없어요")}`); });
  };
  const shared = rd('cm-app.js');
  run(shared, 'cm-app.js', 'script', ['qrcode']);   // qrcode: 쓸 때 불러오는 QR 글자 라이브러리
  run(rd('checker/games.js'), 'checker/games.js', 'module', []);
  run(rd('sw.js'), 'sw.js', 'script', ['self', 'caches', 'clients']);
  run(rd('Shell.gs'), 'Shell.gs', 'script', GAS);
  for (const f of PAGES) {
    const h = rd(f), ss = scripts(h);
    const usesShared = /<script src="(\.\.\/)?cm-app\.js">/.test(h);
    const names = ss.filter(s => !s.module).flatMap(s => tops(s.code)).concat(usesShared ? tops(shared) : []);
    const libs = /qrcode/.test(h) ? ['QRCode'] : [];
    ss.forEach((s, i) => run(s.code, `${f} (스크립트 ${i + 1})`, s.module ? 'module' : 'script', names.concat(libs, ['YT', 'onYouTubeIframeAPIReady'])));
  }
})();
// ⑤ json
for (const f of JSONS) { try { JSON.parse(rd(f)); } catch (e) { bad(f, 'json 읽기 실패 — ' + e.message); } }

// ② 화면 뼈대 태그 짝 · 태그 안 따옴표 짝
const PAIRED = ['div', 'section', 'main', 'header', 'footer', 'nav', 'form', 'table', 'thead', 'tbody', 'ul', 'ol', 'select', 'button', 'label', 'p', 'h1', 'h2', 'h3', 'a', 'span'];
for (const f of PAGES) {
  const h = stripScripts(rd(f));
  for (const t of PAIRED) {
    const open = (h.match(new RegExp('<' + t + '(\\s[^>]*)?>', 'gi')) || []).length;
    const close = (h.match(new RegExp('</' + t + '\\s*>', 'gi')) || []).length;
    if (open !== close) bad(f, `<${t}> 여는 태그 ${open}개 · 닫는 태그 ${close}개 — 짝이 안 맞아요`);
  }
  const tagRe = /<[a-zA-Z][^<>]*>/g; let m;
  while ((m = tagRe.exec(h))) {
    const t = m[0].replace(/'[^']*'/g, '');   // 작은따옴표 안의 큰따옴표는 빼고 셈
    if ((t.match(/"/g) || []).length % 2) bad(f, `${h.slice(0, m.index).split('\n').length}번째 줄 태그의 따옴표 짝이 안 맞아요: ${m[0].slice(0, 70)}`);
  }
}

// ③ 단추가 가리키는 함수·요소
const BUILTIN = new Set(['if', 'return', 'event', 'this', 'location', 'history', 'window', 'document', 'alert', 'confirm', 'navigator', 'Math', 'parseInt', 'Number', 'String', 'setTimeout', 'clearTimeout', 'void', 'new', 'typeof', 'open', 'close', 'print']);
function defined(code, name){
  const n = name.replace(/\$/g, '\\$');
  return new RegExp('(function\\s+' + n + '\\s*\\(|(const|let|var)\\s+' + n + '\\s*=|window\\.' + n + '\\s*=|[{,]\\s*' + n + '\\s*[:(,}]|\\b' + n + '\\s*=\\s*(function|\\(|async)|\\(\\s*' + n + '\\s*[,)]|,\\s*' + n + '\\s*[,)])').test(code);
}
const SHARED = rd('cm-app.js');
for (const f of PAGES) {
  const h = rd(f), all = h + '\n' + SHARED;
  // 인라인 onclick="함수(...)"
  const re = /\son[a-z]+\s*=\s*\\?["']([^"'\\]+)/gi; let m;
  while ((m = re.exec(h))) {
    const call = /^\s*([A-Za-z_$][\w$]*)\s*\(/.exec(m[1]); if (!call || BUILTIN.has(call[1])) continue;
    if (!defined(all, call[1])) bad(f, `단추가 부르는 함수 ${call[1]}() 가 없어요 (${m[0].trim().slice(0, 50)})`);
  }
  // $('아이디').onclick = 함수이름  /  .addEventListener('click', 함수이름)
  const re2 = /\$\(\s*'([\w-]+)'\s*\)\.(on[a-z]+)\s*=\s*([A-Za-z_$][\w$]*)\s*;/g;
  while ((m = re2.exec(h))) if (!BUILTIN.has(m[3]) && !defined(all, m[3])) bad(f, `#${m[1]}.${m[2]} 이 가리키는 함수 ${m[3]} 가 없어요`);
  // $('아이디').on… = / .addEventListener — 그 아이디를 가진 요소가 화면이나 만드는 코드 어디에든 있어야 함
  const ids = new Set(); const idRe = /\bid\s*=\s*\\?["']([\w-]+)|\.id\s*=\s*["']([\w-]+)|\bid:\s*["']([\w-]+)/g;
  while ((m = idRe.exec(all))) ids.add(m[1] || m[2] || m[3]);
  const re3 = /\$\(\s*'([\w-]+)'\s*\)\s*\.\s*(on[a-z]+\s*=|addEventListener\s*\()/g;
  while ((m = re3.exec(h))) {
    const guarded = new RegExp("if\\s*\\(\\s*\\$\\('" + m[1] + "'\\)").test(h) || new RegExp("\\$\\('" + m[1] + "'\\)\\s*&&").test(h);
    if (!ids.has(m[1]) && !guarded) bad(f, `#${m[1]} 단추를 연결하는데 그 아이디를 가진 요소가 없어요`);
  }
}

// ④ 판 번호
(function(){
  const play = rd('play/index.html');
  const tv = (/<title>[^<]*?v(\d+\.\d+\.\d+)/.exec(play) || [])[1], hv = (/<span class="v">v(\d+\.\d+\.\d+)/.exec(play) || [])[1];
  if (!tv || !hv) bad('play/index.html', '놀이터 판 번호(제목·머리)를 찾지 못했어요');
  else if (tv !== hv) bad('play/index.html', `놀이터 판 번호가 달라요 — 제목 v${tv} · 머리 v${hv}`);
  const rv = (/놀이터[^\n]*?단독판 v(\d+\.\d+\.\d+)/.exec(rd('README.md')) || [])[1];
  if (rv && tv && rv !== tv) bad('README.md', `놀이터 판 번호가 화면(v${tv})과 달라요 — README v${rv}`);
  const shellV = +((/const SHELL_VERSION = (\d+)/.exec(rd('Shell.gs')) || [])[1] || 0);
  if (!shellV) bad('Shell.gs', 'SHELL_VERSION 을 찾지 못했어요');
  const idx = rd('index.html');
  const req = +((/const REQUIRED_SHELL = (\d+)/.exec(idx) || [])[1] || 0);
  if (req > shellV) bad('index.html', `화면이 바라는 껍데기 ${req}판이 껍데기 파일(${shellV}판)보다 높아요`);
  const wants = [...idx.matchAll(/d\.shell\s*<\s*(\d+)/g)].map(x => +x[1]).concat([...idx.matchAll(/껍데기를?\s*(\d+)판/g)].map(x => +x[1]));
  wants.filter(n => n > shellV).forEach(n => bad('index.html', `껍데기 ${n}판을 말하는데 껍데기 파일은 ${shellV}판이에요`));
  const sh = rd('Shell.gs');
  [...sh.matchAll(/(\d+)판:/g)].map(x => +x[1]).filter(n => n > shellV).forEach(n => bad('Shell.gs', `머리 설명에 ${n}판이 있는데 SHELL_VERSION 은 ${shellV}예요`));
  const vers = {
    '우리 학교': (/const VERSION = 'app v([\d.]+)'/.exec(idx) || [])[1],
    '놀이터': tv,
    '색동 한판': (/const VER='([\d.]+)'/.exec(rd('live/index.html')) || [])[1],
    '판정기': (/const VERSION = 'v([\d.]+)'/.exec(rd('checker/index.html')) || [])[1],
    '껍데기': shellV + '판'
  };
  Object.entries(vers).forEach(([k, v]) => { if (!v) bad(k, '판 번호를 찾지 못했어요'); });
  notes.push('판 번호: ' + Object.entries(vers).map(([k, v]) => `${k} ${v}`).join(' · '));
})();

fs.rmSync(tmp, { recursive: true, force: true });
if (errs.length) {
  console.log(`코드 검사 실패 — ${errs.length}건`);
  errs.forEach(e => console.log('  ✗ ' + e));
  process.exit(1);
}
console.log('코드 검사 통과 — 문법 · 없는 이름 · 태그 짝 · 단추 연결 · 판 번호 · 설정 파일');
notes.forEach(n => console.log('  ' + n));
