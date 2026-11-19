/* 색동 미리보기(?demo) — 설치 없이 둘러보는 지어낸 학급
   · 학교 시트 대신, 껍데기(Shell.gs)를 이 브라우저 안에서 그대로 돌린다. (dev/gas-emu.js 를 브라우저용으로 옮긴 것)
   · 학교·학생 이름은 모두 지어낸 것이고, 눌러 본 내용은 저장되지 않는다. 새로 고치면 처음 상태로 돌아간다. */
(function () {
  'use strict';
  /* ---- 작은 SHA-256 (동기) ---- */
  function sha256Bytes(str) {
    var K = [], H = [], i, j, isPrime = function (n) { for (var f = 2; f * f <= n; f++) if (n % f === 0) return false; return true; }, frac = function (x) { return ((x - Math.floor(x)) * 4294967296) | 0; };
    for (i = 2; K.length < 64; i++) if (isPrime(i)) { if (H.length < 8) H.push(frac(Math.pow(i, 1 / 2))); K.push(frac(Math.pow(i, 1 / 3))); }
    var bytes = Array.from(new TextEncoder().encode(String(str))), l = bytes.length * 8;
    bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
    for (i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    var rr = function (v, n) { return (v >>> n) | (v << (32 - n)); };
    for (var o = 0; o < bytes.length; o += 64) {
      var w = [];
      for (i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
      for (i = 16; i < 64; i++) { var s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H = [(H[0] + a) | 0, (H[1] + b) | 0, (H[2] + c) | 0, (H[3] + d) | 0, (H[4] + e) | 0, (H[5] + f) | 0, (H[6] + g) | 0, (H[7] + h) | 0];
    }
    var out = [];
    for (i = 0; i < 8; i++) for (j = 3; j >= 0; j--) { var v = (H[i] >>> (j * 8)) & 255; out.push(v > 127 ? v - 256 : v); }
    return out;
  }
  /* ---- 가짜 시트 ---- */
  function makeSheet(name) {
    var rows = [];
    var sh = {
      getName: function () { return name; }, getLastRow: function () { return rows.length; }, getMaxRows: function () { return 1000; },
      getLastColumn: function () { return rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0); },
      appendRow: function (arr) { rows.push(arr.slice()); },
      insertColumnBefore: function (c) { rows.forEach(function (r) { r.splice(c - 1, 0, ''); }); },
      deleteRow: function (r) { rows.splice(r - 1, 1); }, deleteRows: function (r, n) { rows.splice(r - 1, n); },
      getDataRange: function () { return sh.getRange(1, 1, Math.max(rows.length, 1), Math.max(sh.getLastColumn(), 1)); },
      getRange: function (r, c, nr, nc) {
        nr = nr || 1; nc = nc || 1;
        var get = function (i, j) { var row = rows[r - 1 + i], v = row ? row[c - 1 + j] : undefined; return v === undefined || v === null ? '' : v; };
        var set = function (i, j, v) { while (rows.length < r + i) rows.push([]); var row = rows[r - 1 + i]; while (row.length < c + j) row.push(''); row[c - 1 + j] = v; };
        return {
          getValue: function () { return get(0, 0); }, setValue: function (v) { set(0, 0, v); }, setNumberFormat: function () {},
          getValues: function () { if (!rows.length) return [[]]; var out = []; for (var i = 0; i < nr; i++) { var rr = []; for (var j = 0; j < nc; j++) rr.push(get(i, j)); out.push(rr); } return out; },
          setValues: function (vals) { vals.forEach(function (rr, i) { rr.forEach(function (v, j) { set(i, j, v); }); }); }
        };
      }
    };
    return sh;
  }
  /* ---- 시계: 지난 기록을 채울 때만 뒤로 돌린다 ---- */
  var offset = 0, RealDate = Date;
  function FakeDate(a) { return arguments.length ? new (Function.prototype.bind.apply(RealDate, [null].concat([].slice.call(arguments))))() : new RealDate(RealDate.now() + offset); }
  FakeDate.now = function () { return RealDate.now() + offset; }; FakeDate.prototype = RealDate.prototype; FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC;
  var pad = function (n) { return String(n).padStart(2, '0'); }, uid = 0;
  function gas(title) {
    var sheets = {}, props = {}, cache = {};
    var ss = { getName: function () { return title; }, getUrl: function () { return 'https://docs.google.com/spreadsheets/d/CM-DEMO/edit'; }, getSheetByName: function (n) { return sheets[n] || null; }, insertSheet: function (n) { return (sheets[n] = makeSheet(n)); }, getSheets: function () { return Object.keys(sheets).map(function (k) { return sheets[k]; }); } };
    return {
      Date: FakeDate,
      SpreadsheetApp: { getActiveSpreadsheet: function () { return ss; } },
      PropertiesService: { getScriptProperties: function () { return { getProperty: function (k) { return k in props ? props[k] : null; }, setProperty: function (k, v) { props[k] = String(v); }, deleteProperty: function (k) { delete props[k]; }, getProperties: function () { return Object.assign({}, props); } }; } },
      CacheService: { getScriptCache: function () { return { get: function (k) { return cache[k] || null; }, put: function (k, v) { cache[k] = String(v); }, remove: function (k) { delete cache[k]; }, removeAll: function (ks) { ks.forEach(function (k) { delete cache[k]; }); } }; } },
      Utilities: {
        getUuid: function () { uid++; var h = sha256Bytes('cm-demo-' + uid + '-' + Math.random()).map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join(''); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20, 32); },
        DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
        computeDigest: function (alg, s) { return sha256Bytes(s); },
        formatDate: function (d, tz, f) { d = new RealDate(d); return f.replace('yyyy', d.getFullYear()).replace('MM', pad(d.getMonth() + 1)).replace('dd', pad(d.getDate())).replace('HH', pad(d.getHours())).replace('mm', pad(d.getMinutes())).replace('ss', pad(d.getSeconds())); }
      },
      Session: { getScriptTimeZone: function () { return 'Asia/Seoul'; } },
      ContentService: { MimeType: { JSON: 'json' }, createTextOutput: function (t) { return { content: t, setMimeType: function () { return this; }, getContent: function () { return this.content; } }; } },
      HtmlService: { createHtmlOutput: function (h) { return { content: h, setTitle: function () { return this; }, addMetaTag: function () { return this; }, getContent: function () { return this.content; } }; } },
      ScriptApp: { getService: function () { return { getUrl: function () { return 'https://script.google.com/macros/s/CM-DEMO/exec'; } }; } },
      UrlFetchApp: { fetch: function () { throw new Error('미리보기에서는 바깥으로 요청을 보내지 않아요.'); } },
      LockService: { getScriptLock: function () { return { waitLock: function () {}, tryLock: function () { return true; }, releaseLock: function () {} }; } },
      Logger: { log: function () {} }
    };
  }

  /* ---- 지어낸 학급: 햇살초등학교 4학년 두 반 ---- */
  var C1 = ['강태윤', '한지우', '오세린', '배준서', '임하늘', '문도윤', '서가온', '채은호', '노아린', '표민재', '길서우', '양도현'];
  var C2 = ['선유나', '마은성', '도하람', '진예준', '우시현', '방다온', '현재이', '탁민서', '송이안', '구하율'];
  var PLAYS = [['basic', 'easy'], ['basic', 'normal'], ['stroop', 'normal'], ['memory', 'easy'], ['dir', 'normal'], ['quiz', 'times1'], ['basic', 'hard'], ['assoc', 'normal'], ['lava', 'easy'], ['twist', 'normal']];
  var api = null, allow = null, DEMO_PW = 'cm-demo-open';
  function build(src) {
    var env = gas('햇살초등학교 색동');
    var names = []; src.replace(/^function (\w+)\(/gm, function (m, n) { names.push(n); });
    var keys = Object.keys(env);
    var make = new Function(keys.join(','), src + '\nreturn { RPC_ALLOW_: RPC_ALLOW_, fns: {' + names.map(function (n) { return n + ':' + n; }).join(',') + '} };');
    var got = make.apply(null, keys.map(function (k) { return env[k]; }));
    var g = got.fns; allow = got.RPC_ALLOW_;
    var DAY = 86400000, t = g.verifyAdminPassword('1234').token;
    offset = -40 * DAY;
    g.addStudentsBulk(t, C1.map(function (n, i) { return ['4', '1', String(i + 1), n]; }).concat(C2.map(function (n, i) { return ['4', '2', String(i + 1), n]; })));
    g.setExtraSettings(t, { title: '햇살초등학교' });
    var ids = g.getPublic().students.map(function (s) { return s.id; });
    // 많이 뛰는 친구, 이제 시작한 친구가 섞이게
    var ok = [], k = 0;
    for (var day = 38; day >= 1; day--) {
      if (day % 7 === 0 || day % 7 === 6) continue;            // 주말은 쉼
      ids.forEach(function (id, si) {
        if ((si * 3 + day) % (si % 4 + 2) !== 0) return;
        var p = PLAYS[(si + day + k) % PLAYS.length], att = 20 + (si * 7 + day * 3) % 25, cor = Math.round(att * (0.62 + ((si * 11 + day) % 30) / 100));
        offset = -day * DAY - (k % 6) * 1800000; k++;
        ok.push(g.addRecord(id, { game: p[0], difficulty: p[1], attempts: att, correct: Math.min(cor, att), playSeconds: 60 + (att * 4), completed: 1, cameraJudged: 1 }).recordId);
      });
    }
    g.setRecordsStatus(t, ok, 'approved');
    // 오늘 뛰고 승인을 기다리는 기록
    offset = -2 * 3600000;
    [0, 4, 13].forEach(function (si, i) { var p = PLAYS[i * 3]; g.addRecord(ids[si], { game: p[0], difficulty: p[1], attempts: 30, correct: 24 - i * 3, playSeconds: 150, completed: 1, cameraJudged: 1 }); });
    offset = 0;
    g.changeAdminPassword(t, DEMO_PW);   // 처음 비밀번호 안내가 뜨지 않게
    api = g;
  }
  var ready = null;
  function load() {
    if (!ready) ready = fetch('Shell.gs', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('미리보기를 준비하지 못했어요.'); return r.text(); }).then(build);
    return ready;
  }
  window.CM_DEMO = {
    // 화면의 rpc 를 대신 받는다. 관리자 비밀번호는 무엇을 넣어도 들어가진다.
    call: function (fn, args) {
      return load().then(function () {
        if (allow.indexOf(fn) === -1 || typeof api[fn] !== 'function') throw new Error('알 수 없는 요청: ' + fn);
        if (fn === 'verifyAdminPassword') return api.verifyAdminPassword(DEMO_PW);
        if (fn === 'changeAdminPassword') return { ok: true };   // 미리보기에서는 비밀번호를 바꾸지 않음
        return JSON.parse(JSON.stringify(api[fn].apply(null, args || [])));
      });
    }
  };
})();
