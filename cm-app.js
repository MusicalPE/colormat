/* 색깔 매트 놀이터 — 접속 QR · 바로가기(앱 설치) 공용 스크립트
   우리 학교 메인(index.html) · 놀이터(play/) · 판정기(checker/) · 현황판(board.html)이 함께 씀.
   버튼 id: cmQrBtn(QR 보기), cmInstallBtn(바로가기 만들기) — 있으면 알아서 연결함 */
(function () {
  var HOME = 'https://musicalpe.github.io/colormat/';
  var me = document.currentScript && document.currentScript.src;
  // 파일로 열었을 때는 QR이 쓸모없으니 GitHub 주소로
  var ROOT = (/^https?:/.test(location.protocol) && me) ? new URL('.', me).href : HOME;
  var TARGETS = [
    { key: 'checker', label: '📷 카메라 판정기', url: ROOT + 'checker/index.html', note: '휴대폰·태블릿으로 찍으면 판정기가 열려요. 매트 앞에 세워 두고 쓰세요.' },
    { key: 'play', label: '🎮 놀이터', url: ROOT + 'play/', note: '찍으면 색깔 매트 놀이터(게임 모음)가 열려요.' },
    { key: 'board', label: '🏆 색동 현황판', url: ROOT + 'board.html', note: '찍으면 전국 매트 현황판이 열려요.' }
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
  function showQr(startKey, list) {
    list = list || TARGETS;
    var cur = list.filter(function (t) { return t.key === startKey; })[0] || list[0];
    loadQr(function (ok) {
      var tabs = list.length < 2 ? '' : '<div class="cmq-tabs">' + list.map(function (t) { return '<button data-cm="tab:' + t.key + '" class="' + (t === cur ? 'on' : '') + '">' + t.label + '</button>'; }).join('') + '</div>';
      var body = tabs + (ok ? '<div class="cmq-box">' + qrSvg(cur.url) + '</div>' : '<p class="cmq-note">QR을 만들 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>') +
        '<p class="cmq-note">' + cur.note + '</p><div class="cmq-url">' + cur.url + '</div>' +
        '<div class="cmq-act"><button data-cm="copy">주소 복사</button>' + (ok ? '<button data-cm="png">QR 그림 저장</button>' : '') + '<button data-cm="full">전체 화면</button><button data-cm="close" class="main">닫기</button></div>';
      open('휴대폰으로 찍어서 들어와요', '카메라 앱으로 QR을 비추면 바로 열려요', body, function (act, btn) {
        if (act.indexOf('tab:') === 0) return showQr(act.slice(4), list);
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
    if (q && !q.onclick) q.onclick = function () { showQr(q.getAttribute('data-target') || 'checker'); };
    if (i) { if (standalone) i.style.display = 'none'; else i.onclick = showInstall; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  // 원하는 주소 하나(또는 여러 개)로 QR 띄우기: [{key, label, url, note}]
  // ---------- 다 함께 하늘까지: 정답 착지 1번 = 1m ----------
  var CLIMB = [
    { m: 0, name: '출발', ico: '🟩' }, { m: 480, name: '남산서울타워', ico: '🗼' }, { m: 555, name: '롯데월드타워', ico: '🏙️' },
    { m: 1947, name: '한라산', ico: '⛰️' }, { m: 2744, name: '백두산', ico: '🏔️' }, { m: 8849, name: '에베레스트', ico: '🏔️' },
    { m: 10000, name: '여객기 비행 높이', ico: '✈️' }, { m: 100000, name: '우주의 시작', ico: '🌌' },
    { m: 400000, name: '국제우주정거장', ico: '🛰️' }, { m: 384400000, name: '달', ico: '🌕' }
  ];
  function eul(w) { var c = w.charCodeAt(w.length - 1) - 0xAC00; return (c >= 0 && c <= 11171 && c % 28) ? '을' : '를'; }
  function fmtM(m) { m = Math.round(m || 0); return m >= 10000 ? (Math.round(m / 100) / 10).toLocaleString('ko-KR') + 'km' : m.toLocaleString('ko-KR') + 'm'; }
  function climbInfo(m) {
    var i = 0; while (i + 1 < CLIMB.length && m >= CLIMB[i + 1].m) i++;
    var prev = CLIMB[i], next = CLIMB[i + 1] || null;
    return { m: m, prev: prev, next: next, pct: next ? (m - prev.m) / (next.m - prev.m) : 1, reached: CLIMB.slice(1, i + 1) };
  }
  // 위로 올라가는 그림 + 설명 HTML (높이 m, 제목, 작년 높이)
  // 다 함께 하늘까지: 4색 청사초롱을 든 아이가 이정표 계단을 따라 달까지 걸어 올라감
  function lanternKid(x, y, k) {   // (x,y) = 발 위치, k = 크기
    var g = '<g transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') scale(' + k + ')">';
    g += '<circle cx="15" cy="-34" r="16" fill="url(#cmcGlow)"/>';
    // 몸 (흰 테두리 + 먹색)
    var body = function (c, w) { return '<g stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
      '<path d="M0 -30 L0 -14"/><path d="M0 -14 L-6 -4 L-8 0 M0 -14 L5 -6 L9 -1"/><path d="M0 -26 L-6 -18 M0 -26 L8 -30 L12 -40"/></g>'; };
    g += body('#fff', 6.5) + '<circle cx="0" cy="-37" r="5.6" fill="#fff"/>' + body('#1d2b53', 3.6) + '<circle cx="0" cy="-37" r="4.2" fill="#1d2b53"/>';
    // 청사초롱: 장대 끝에 매단 네 색 초롱
    g += '<path d="M12 -40 L15 -44" stroke="#5b3a1a" stroke-width="1.6" stroke-linecap="round"/><path d="M15 -44 L15 -41" stroke="#5b3a1a" stroke-width="1"/>' +
      '<rect x="10.5" y="-41.5" width="9" height="1.8" rx=".6" fill="#7a1f1f"/>' +
      '<rect x="10" y="-39.8" width="10" height="2.6" fill="#E0352B"/><rect x="10" y="-37.2" width="10" height="2.6" fill="#F2C230"/>' +
      '<rect x="10" y="-34.6" width="10" height="2.6" fill="#2E9E57"/><rect x="10" y="-32" width="10" height="2.6" fill="#2F5FB3"/>' +
      '<rect x="10.5" y="-29.4" width="9" height="1.8" rx=".6" fill="#7a1f1f"/><path d="M15 -27.6 L15 -24.5" stroke="#E0352B" stroke-width="1.2"/>';
    return g + '</g>';
  }
  function climbScene(m) {
    var W = 600, H = 150, n = CLIMB.length - 1, x0 = 26, y0 = 138, x1 = 520, y1 = 34;
    var c = climbInfo(m), i = Math.max(0, CLIMB.indexOf(c.prev)), f = Math.min(1, (i + Math.max(0, Math.min(1, c.pct))) / n);
    var sx = (x1 - x0) / n, sy = (y0 - y1) / n, svg = '<svg class="cmc-scene" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<defs><radialGradient id="cmcGlow"><stop offset="0" stop-color="#FFE9A0" stop-opacity=".95"/><stop offset=".45" stop-color="#FDBA4D" stop-opacity=".45"/><stop offset="1" stop-color="#FDBA4D" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="cmcMoon"><stop offset="0" stop-color="#FFF7D6"/><stop offset=".7" stop-color="#FDE68A"/><stop offset="1" stop-color="#F5C451"/></radialGradient></defs>';
    [[60, 22], [140, 48], [210, 16], [300, 30], [380, 12], [455, 58], [250, 70], [110, 86]].forEach(function (p) { svg += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.4" fill="#fff" opacity=".7"/>'; });
    svg += '<circle cx="560" cy="30" r="40" fill="url(#cmcGlow)" opacity=".55"/><circle cx="560" cy="30" r="20" fill="url(#cmcMoon)"/>' +
      '<circle cx="553" cy="25" r="3.5" fill="#E9C45A" opacity=".55"/><circle cx="566" cy="36" r="2.5" fill="#E9C45A" opacity=".5"/>';
    // 돌계단 (이정표마다 한 칸)
    for (var k = 0; k < n; k++) {
      var sxk = x0 + k * sx, syk = y0 - (k + 1) * sy, done = m >= CLIMB[k + 1].m;
      svg += '<rect x="' + sxk.toFixed(1) + '" y="' + syk.toFixed(1) + '" width="' + (sx + 1).toFixed(1) + '" height="' + (y0 - syk + 10).toFixed(1) + '" fill="' + (done ? '#d9c9a3' : '#8d93a8') + '" opacity="' + (done ? .95 : .45) + '"/>' +
        '<rect x="' + sxk.toFixed(1) + '" y="' + syk.toFixed(1) + '" width="' + (sx + 1).toFixed(1) + '" height="3" fill="' + (done ? '#f3e7c9' : '#b6bccd') + '" opacity="' + (done ? 1 : .5) + '"/>' + (k === n - 1 ? '' :
        '<text x="' + (sxk + sx / 2).toFixed(1) + '" y="' + (syk - 6).toFixed(1) + '" text-anchor="middle" font-size="13">' + CLIMB[k + 1].ico + '</text>');
    }
    // 아이 위치: 지금 오르는 계단 위
    var kx = x0 + f * (x1 - x0), ky = y0 - Math.min(n, Math.floor(f * n + 1e-9)) * sy;
    svg += lanternKid(kx - 6, ky, 1.25);
    return svg + '</svg>';
  }
  function climbHTML(m, title, lastYear) {
    var c = climbInfo(m);
    var steps = CLIMB.slice(1).map(function (s) { var on = m >= s.m; return '<span class="cmc-step' + (on ? ' on' : '') + (c.next === s ? ' next' : '') + '" title="' + fmtM(s.m) + '">' + s.ico + '<small>' + s.name + '</small></span>'; }).join('');
    return '<div class="cmc"><div class="cmc-top"><div><div class="cmc-t">' + title + '</div><div class="cmc-h">' + fmtM(m) + '</div>' +
      '<div class="cmc-s">' + (c.next ? (c.prev.m ? c.prev.name + eul(c.prev.name) + ' 넘었어요! ' : '') + '<b>' + c.next.name + '(' + fmtM(c.next.m) + ')</b>까지 <b>' + fmtM(c.next.m - m) + '</b> 남았어요' : '🌕 청사초롱 들고 달에 도착했어요!') + '</div></div></div>' +
      climbScene(m) +
      '<div class="cmc-steps">' + steps + '</div>' +
      '<div class="cmc-f">4색 청사초롱 들고 다 함께 달까지 · 정답 착지 1번 = 1m 위로 · 3월 1일마다 새로 출발' + (lastYear ? ' · 지난 학년도에는 ' + fmtM(lastYear) + '까지 올라갔어요' : '') + '</div></div>';
  }
  var climbCss = '.cmc{background:linear-gradient(180deg,#0B1B3F 0%,#1E3A8A 55%,#3B5BA9 100%);color:#fff;border-radius:18px;padding:18px 20px;margin-bottom:16px;box-shadow:0 4px 16px rgba(17,24,39,.08);overflow:hidden}' +
    '.cmc-top{display:flex;justify-content:space-between;align-items:center;gap:10px}.cmc-t{font-weight:800;opacity:.9}.cmc-h{font-size:2.3em;font-weight:900;line-height:1.15;font-variant-numeric:tabular-nums}' +
    '.cmc-s{opacity:.95;margin-top:2px}.cmc-s b{color:#FDE68A}' +
    '.cmc-scene{display:block;width:100%;height:auto;max-height:220px;margin:6px 0 2px}' +
    '.cmc-steps{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.cmc-step{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.12);border-radius:999px;padding:3px 9px;font-size:.95em;opacity:.55}' +
    '.cmc-step small{font-size:.72em;font-weight:700}.cmc-step.on{opacity:1;background:rgba(253,230,138,.25)}.cmc-step.next{opacity:1;outline:2px dashed #FDE68A}' +
    '.cmc-f{font-size:.78em;opacity:.8;margin-top:10px}';
  function addClimbCss() { if (document.getElementById('cmc-css')) return; var st = document.createElement('style'); st.id = 'cmc-css'; st.textContent = climbCss; document.head.appendChild(st); }
  // ---------- 카메라 판정 게임 목록 · 난이도 이름 (판정기·우리 학교·현황판이 함께 씀) ----------
  var E3 = [['easy', '쉬움'], ['normal', '보통'], ['hard', '어려움']];
  var CAM_GAMES = [
    ['basic', '색깔 점프', [['easy', '천천히'], ['normal', '보통'], ['hard', '빠르게'], ['easy2', '2색 천천히'], ['normal2', '2색 보통'], ['hard2', '2색 빠르게']]],
    ['stroop', '색깔 스트룹', [['normal', '노말'], ['hard', '하드'], ['expert', '익스퍼트']]],
    ['memory', '기억력 스텝', E3],
    ['dir', '방향 점프', E3],
    ['quiz', '퀴즈 점프', [['add1', '덧셈·뺄셈 쉬움'], ['add2', '덧셈·뺄셈 보통'], ['add3', '덧셈·뺄셈 어려움'], ['times1', '구구단 쉬움'], ['times2', '구구단 보통'], ['times3', '구구단 어려움'],
      ['muldiv1', '곱셈·나눗셈 쉬움'], ['muldiv2', '곱셈·나눗셈 보통'], ['muldiv3', '곱셈·나눗셈 어려움'], ['pe', '체육 상식']]],
    ['assoc', '연상 점프', E3],
    ['twist', '손발 트위스터', E3],
    ['freeze', '얼음 스텝', E3],
    ['lava', '용암 매트', E3]
  ];
  var GAME_NAMES = { rhythm: '리듬 스텝' };
  CAM_GAMES.forEach(function (g) { GAME_NAMES[g[0]] = g[1]; });
  function gameName(g) { return GAME_NAMES[g] || g || ''; }
  function diffName(g, d) {
    for (var i = 0; i < CAM_GAMES.length; i++) if (CAM_GAMES[i][0] === g)
      for (var j = 0; j < CAM_GAMES[i][2].length; j++) if (CAM_GAMES[i][2][j][0] === d) return CAM_GAMES[i][2][j][1];
    return d || '';
  }
  // 색동 마크: 매트 2×2 그대로 — 왼위 빨강 '새', 오위 노랑 '도', 왼아래 초록 'ㄱ', 오아래 파랑 'ㅇ' (세로로 읽으면 색 · 동)
  function saekdong(size) {
    var t = [['#F2392F', '새', 0, 0, '#fff'], ['#FFD21F', '도', 1, 0, '#3b2a00'], ['#2FC653', 'ㄱ', 0, 1, '#fff'], ['#4C88FF', 'ㅇ', 1, 1, '#fff']];
    return '<svg class="sd-mark" viewBox="0 0 100 100" width="' + (size || 48) + '" height="' + (size || 48) + '" role="img" aria-label="색동">' +
      t.map(function (x) { return '<rect x="' + (x[2] * 51 + 1) + '" y="' + (x[3] * 51 + 1) + '" width="47" height="47" rx="9" fill="' + x[0] + '"/>' +
        '<text x="' + (x[2] * 51 + 24.5) + '" y="' + (x[3] * 51 + 25) + '" text-anchor="middle" dominant-baseline="central" font-family="Pretendard,\'Apple SD Gothic Neo\',\'Malgun Gothic\',sans-serif" font-weight="900" font-size="30" fill="' + x[4] + '">' + x[1] + '</text>'; }).join('') + '</svg>';
  }
  window.CMApp = { showQr: showQr, showInstall: showInstall, showQrList: function (list) { showQr(list[0].key, list); }, ROOT: ROOT,
    climbInfo: climbInfo, fmtM: fmtM, CAM_GAMES: CAM_GAMES, saekdong: saekdong, gameName: gameName, diffName: diffName, climbHTML: function (m, t, ly) { addClimbCss(); return climbHTML(m, t, ly); } };
})();
