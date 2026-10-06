/* 색깔 매트 놀이터 — 접속 QR · 바로가기(앱 설치) 공용 스크립트
   놀이터(index.html) · 판정기(checker/) · 현황판(board.html)이 함께 씀.
   버튼 id: cmQrBtn(QR 보기), cmInstallBtn(바로가기 만들기) — 있으면 알아서 연결함 */
(function () {
  var HOME = 'https://musicalpe.github.io/colormat/';
  var me = document.currentScript && document.currentScript.src;
  // 파일로 열었을 때는 QR이 쓸모없으니 GitHub 주소로
  var ROOT = (/^https?:/.test(location.protocol) && me) ? new URL('.', me).href : HOME;
  var TARGETS = [
    { key: 'checker', label: '📷 카메라 판정기', url: ROOT + 'checker/index.html', note: '휴대폰·태블릿으로 찍으면 판정기가 열려요. 매트 앞에 세워 두고 쓰세요.' },
    { key: 'play', label: '🎮 놀이터', url: ROOT, note: '찍으면 색깔 매트 놀이터가 열려요.' },
    { key: 'board', label: '🏆 전국 현황판', url: ROOT + 'board.html', note: '찍으면 전국 매트 현황판이 열려요.' }
  ];

  // ---------- 앱 설치 ----------
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', function () { deferred = null; var b = document.getElementById('cmInstallBtn'); if (b) b.style.display = 'none'; });
  try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT }); } catch (e) {}
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;

  // ---------- 보기 좋은 덮개 ----------
  var css = '' +
    '.cmq-ov{position:fixed;inset:0;z-index:9999;background:rgba(17,24,39,.62);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}' +
    '.cmq-sheet{background:#fff;border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.25);width:min(560px,100%);max-height:100%;overflow:auto;text-align:center;color:#1F2937}' +
    '.cmq-head{background:linear-gradient(135deg,#F2392F 0%,#FF8A3D 50%,#2FC653 130%);color:#fff;padding:20px 24px 16px;border-radius:24px 24px 0 0}' +
    '.cmq-head h2{margin:0 0 4px;font-size:1.5em;color:#fff}.cmq-head p{margin:0;opacity:.93;font-weight:600}' +
    '.cmq-body{padding:18px 22px 22px;display:flex;flex-direction:column;align-items:center;gap:12px}' +
    '.cmq-tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;background:#F3F5F8;border-radius:999px;padding:4px}' +
    '.cmq-tabs button{border:0;background:transparent;font:inherit;font-weight:700;font-size:.92em;padding:7px 12px;border-radius:999px;color:#6B7280;cursor:pointer}' +
    '.cmq-tabs button.on{background:#fff;color:#DC2626;box-shadow:0 1px 3px rgba(0,0,0,.08)}' +
    '.cmq-box{background:#fff;padding:12px;border-radius:18px;border:1px solid #E5E7EB;line-height:0}' +
    '.cmq-box svg{display:block;width:min(58vh,76vw,400px);height:auto}' +
    '.cmq-url{font-size:.82em;color:#6B7280;word-break:break-all;background:#F9FAFB;border:1px solid #EEF0F3;border-radius:10px;padding:8px 12px;max-width:100%}' +
    '.cmq-note{font-size:.92em;color:#374151;margin:0}' +
    '.cmq-act{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}' +
    '.cmq-act button{font:inherit;font-weight:700;font-size:.92em;border-radius:12px;padding:9px 14px;cursor:pointer;border:1.5px solid #E5E7EB;background:#fff;color:#374151}' +
    '.cmq-act button.main{background:#FF6B5B;border-color:#FF6B5B;color:#fff}' +
    '.cmq-steps{text-align:left;margin:0;padding:0;list-style:none;width:100%}' +
    '.cmq-steps li{background:#F9FAFB;border:1px solid #EEF0F3;border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:.95em;line-height:1.55}' +
    '.cmq-steps li.me{border-color:#FF6B5B;background:#FFF1EE}' +
    '.cmq-steps b{color:#111827}';
  function addCss() { if (document.getElementById('cmq-css')) return; var s = document.createElement('style'); s.id = 'cmq-css'; s.textContent = css; document.head.appendChild(s); }

  var escKey = null;
  function close() { var o = document.getElementById('cmqOv'); if (o) o.remove(); if (escKey) document.removeEventListener('keydown', escKey); }
  function open(title, sub, bodyHTML, onClick) {
    close(); addCss();
    var ov = document.createElement('div'); ov.className = 'cmq-ov'; ov.id = 'cmqOv';
    ov.innerHTML = '<div class="cmq-sheet" role="dialog"><div class="cmq-head"><h2>' + title + '</h2><p>' + sub + '</p></div><div class="cmq-body">' + bodyHTML + '</div></div>';
    ov.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cm]');
      if (e.target === ov || (b && b.dataset.cm === 'close')) return close();
      if (b && onClick) onClick(b.dataset.cm, b, ov);
    });
    document.body.appendChild(ov);
    escKey = function (e) { if (e.key === 'Escape') close(); }; document.addEventListener('keydown', escKey);
    return ov;
  }

  // ---------- QR ----------
  function loadQr(cb) {
    if (typeof qrcode === 'function') return cb(true);
    var s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
    s.onload = function () { cb(typeof qrcode === 'function'); }; s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }
  function qrSvg(text) { var q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 8, margin: 2, scalable: true }); }
  function qrPng(text) {
    var q = qrcode(0, 'M'); q.addData(text); q.make();
    var n = q.getModuleCount(), cell = 16, pad = 4 * cell, size = n * cell + pad * 2;
    var c = document.createElement('canvas'); c.width = c.height = size; var g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#111';
    for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect(pad + k * cell, pad + r * cell, cell, cell);
    return c.toDataURL('image/png');
  }
  function copy(text, btn) {
    function done() { var t = btn.textContent; btn.textContent = '복사했어요 ✓'; setTimeout(function () { btn.textContent = t; }, 1400); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { prompt('아래 주소를 복사하세요', text); });
    else prompt('아래 주소를 복사하세요', text);
  }
  function showQr(startKey) {
    var cur = TARGETS.filter(function (t) { return t.key === startKey; })[0] || TARGETS[0];
    loadQr(function (ok) {
      var tabs = '<div class="cmq-tabs">' + TARGETS.map(function (t) { return '<button data-cm="tab:' + t.key + '" class="' + (t === cur ? 'on' : '') + '">' + t.label + '</button>'; }).join('') + '</div>';
      var body = tabs + (ok ? '<div class="cmq-box">' + qrSvg(cur.url) + '</div>' : '<p class="cmq-note">QR을 만들 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>') +
        '<p class="cmq-note">' + cur.note + '</p><div class="cmq-url">' + cur.url + '</div>' +
        '<div class="cmq-act"><button data-cm="copy">주소 복사</button>' + (ok ? '<button data-cm="png">QR 그림 저장</button>' : '') + '<button data-cm="full">전체 화면</button><button data-cm="close" class="main">닫기</button></div>';
      open('휴대폰으로 찍어서 들어와요', '카메라 앱으로 QR을 비추면 바로 열려요', body, function (act, btn) {
        if (act.indexOf('tab:') === 0) return showQr(act.slice(4));
        if (act === 'copy') return copy(cur.url, btn);
        if (act === 'png') { var a = document.createElement('a'); a.href = qrPng(cur.url); a.download = '매트놀이터_' + cur.key + '_QR.png'; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 300); }
        if (act === 'full') { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {} }
      });
    });
  }

  // ---------- 바로가기 ----------
  function showInstall() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; }).catch(function () {});
      return;
    }
    var ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document), android = /Android/.test(ua);
    var steps = [
      { on: ios, t: '<b>아이폰·아이패드</b> — Safari 아래(또는 위) <b>공유 버튼(□↑)</b> → <b>홈 화면에 추가</b>' },
      { on: android, t: '<b>안드로이드</b> — 크롬 오른쪽 위 <b>⋮</b> → <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>' },
      { on: !ios && !android, t: '<b>컴퓨터(크롬·엣지)</b> — 주소창 오른쪽의 <b>설치 아이콘(⊕)</b>, 또는 <b>⋮ → 전송, 저장, 공유 → 바로가기 만들기</b>' }
    ];
    var body = (location.protocol === 'file:' ? '<p class="cmq-note">파일로 열린 상태라 바로가기를 만들 수 없어요. <b>' + HOME + '</b> 주소로 열어 주세요.</p>' : '') +
      '<ul class="cmq-steps">' + steps.map(function (s) { return '<li class="' + (s.on ? 'me' : '') + '">' + s.t + '</li>'; }).join('') + '</ul>' +
      '<p class="cmq-note">바탕화면·홈 화면의 <b>매트 놀이터</b> 아이콘을 누르면 주소 없이 바로 열려요. 길게 누르면 판정기·현황판으로 바로 갈 수도 있어요(안드로이드).</p>' +
      '<div class="cmq-act"><button data-cm="close" class="main">알겠어요</button></div>';
    open('바로가기 아이콘 만들기', '바탕화면·홈 화면에 앱처럼 놓고 써요', body);
  }

  function wire() {
    var q = document.getElementById('cmQrBtn'), i = document.getElementById('cmInstallBtn');
    if (q) q.onclick = function () { showQr(q.getAttribute('data-target') || 'checker'); };
    if (i) { if (standalone) i.style.display = 'none'; else i.onclick = showInstall; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  window.CMApp = { showQr: showQr, showInstall: showInstall };
})();
