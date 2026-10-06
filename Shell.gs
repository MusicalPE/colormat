/*************************************************************
 * 색깔 매트 놀이터 — 학교 시트용 껍데기 (Shell.gs)
 * ------------------------------------------------------------
 * 이 파일 하나만 스프레드시트의 Apps Script 에 붙여넣고 웹앱으로 배포하면 됩니다.
 * 화면은 GitHub(musicalpe.github.io/colormat/app.html)에서 열리고, 이 파일은 뒤에서
 * 학생·기록·설정을 시트에 읽고 쓰는 일만 합니다. 화면이 새 판으로 바뀌어도
 * 이 파일은 그대로 두면 됩니다. (껍데기를 바꿔야 할 때는 화면이 알려줍니다)
 *
 * 배포 설정: 다음 사용자로 실행 = 나, 액세스 권한 = 모든 사용자
 * 처음 관리자 비밀번호: 1234 (관리자 메뉴에서 바꾸세요)
 *************************************************************/

const SHELL_VERSION = 1;
const APP_URL = 'https://musicalpe.github.io/colormat/app.html';

const SHEET_STUDENTS = 'Students';
const SHEET_RECORDS = 'Records';
const STUDENTS_HEADER = ['ID', 'Grade', 'Class', 'Number', 'Name', 'SortOrder'];
const RECORDS_HEADER = ['RecordID', 'Timestamp', 'StudentID', 'Date', 'Game', 'Difficulty', 'Rule', 'Speed',
  'Correct', 'Attempts', 'PlaySec', 'Completed', 'Camera', 'Status', 'Level'];
const TOKEN_TTL_SEC = 60 * 60;          // 관리자 로그인 유지: 1시간
const DEFAULT_ADMIN_PASSWORD = '1234';
const GAMES_ = ['basic', 'stroop', 'memory', 'rhythm', 'dir', 'quiz', 'assoc', 'twist', 'freeze', 'lava'];

/************ 입구 ************/
// 주소로 열면: "프로그램 열기" 안내 화면 (화면은 GitHub 에 있음)
function doGet() {
  const self = ScriptApp.getService().getUrl();
  const app = APP_URL + '?s=' + encodeURIComponent(self);
  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:Pretendard,"Malgun Gothic",sans-serif;background:#F3F5F8;margin:0;padding:24px;color:#1F2937}' +
    '.c{max-width:560px;margin:30px auto;background:#fff;border-radius:18px;box-shadow:0 4px 18px rgba(0,0,0,.06);overflow:hidden}' +
    '.h{background:linear-gradient(135deg,#F2392F,#FF8A3D 55%,#2FC653 130%);color:#fff;padding:22px 24px}.h h1{margin:0 0 4px;font-size:22px}.h p{margin:0;opacity:.92}' +
    '.b{padding:22px 24px;line-height:1.6}a.btn{display:block;text-align:center;background:#FF6B5B;color:#fff;text-decoration:none;font-weight:800;padding:14px;border-radius:12px;font-size:17px;margin:14px 0}' +
    'code{display:block;background:#F3F4F6;padding:10px;border-radius:8px;word-break:break-all;font-size:12px}small{color:#6B7280}</style></head><body>' +
    '<div class="c"><div class="h"><h1>🟥🟨🟩🟦 색깔 매트 놀이터</h1><p>껍데기 설치 완료 · 껍데기 판 ' + SHELL_VERSION + '</p></div><div class="b">' +
    '<p>이 주소는 <b>설치 확인용</b>이에요. 프로그램은 아래 버튼으로 엽니다. 열린 주소를 <b>즐겨찾기</b>해 두고, 학생들에게는 관리자 메뉴의 <b>QR</b>로 알려 주세요.</p>' +
    '<a class="btn" href="' + app + '" target="_top">프로그램 열기 →</a>' +
    '<small>프로그램 주소</small><code>' + app + '</code>' +
    '</div></div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('색깔 매트 놀이터 — 설치 확인')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 화면(GitHub)에서 오는 요청: POST 본문 {"fn":"함수이름","args":[...]} → {"ok":true,"result":...}
const RPC_ALLOW_ = [
  'ping', 'getPublic', 'addRecord',
  'verifyAdminPassword', 'changeAdminPassword', 'getAllDataAdmin',
  'addStudentsBulk', 'updateStudent', 'deleteStudents',
  'setRecordsStatus', 'deleteRecords',
  'setAppSettings', 'setExtraSettings'
];
function doPost(e) {
  let out;
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const fn = String(body.fn || '');
    if (RPC_ALLOW_.indexOf(fn) === -1) throw new Error('알 수 없는 요청: ' + fn);
    const g = (typeof globalThis !== 'undefined') ? globalThis : this;
    const f = g[fn];
    if (typeof f !== 'function') throw new Error('이 껍데기에 없는 기능입니다: ' + fn + ' (껍데기를 새 판으로 바꿔 주세요)');
    out = { ok: true, result: f.apply(null, Array.isArray(body.args) ? body.args : []) };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function ping() {
  return { shell: SHELL_VERSION, appUrl: APP_URL, self: ScriptApp.getService().getUrl(), title: getSS_().getName() };
}

/************ 공통 ************/
function getSS_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function props_() { return PropertiesService.getScriptProperties(); }
function sheet_(name, header) {
  const ss = getSS_();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); }
  return sh;
}
function studentsSheet_() { return sheet_(SHEET_STUDENTS, STUDENTS_HEADER); }
function recordsSheet_() { return sheet_(SHEET_RECORDS, RECORDS_HEADER); }
function hashPw_(pw) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(pw), Utilities.Charset.UTF_8);
  return raw.map(function (b) { return ((b < 0 ? b + 256 : b).toString(16)).padStart(2, '0'); }).join('');
}
function fmtDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v || '').slice(0, 10);
}
function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function clean_(s, max) { return String(s == null ? '' : s).replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max || 40); }
function int_(v, max) { const n = Math.round(Number(v)); return (isFinite(n) && n > 0) ? Math.min(n, max) : 0; }
function approvalOn_() { return props_().getProperty('APPROVAL_ON') !== '0'; }   // 기본: 켜짐
function needAdmin_(token) { if (!token || !CacheService.getScriptCache().get('ADMIN_' + token)) throw new Error('권한이 없습니다. 다시 로그인해 주세요.'); }

/************ 누구나 (학생 화면) ************/
function getPublic() {
  const v = studentsSheet_().getDataRange().getValues();
  const list = [];
  for (let i = 1; i < v.length; i++) {
    if (!String(v[i][0]).trim()) continue;
    list.push({ id: String(v[i][0]).trim(), grade: v[i][1], cls: v[i][2], number: v[i][3], name: v[i][4], order: Number(v[i][5]) || 9999 + i });
  }
  list.sort(function (a, b) { return a.order - b.order; });
  return { shell: SHELL_VERSION, title: getSS_().getName(), approvalOn: approvalOn_(), students: list, climb: climb_() };
}
// 다 함께 하늘까지: 승인된 카메라 판정 정답 착지 1번 = 1m. 학년도(3월 1일 시작)별 합
function schoolYear_(d) { const y = Number(String(d).slice(0, 4)), m = Number(String(d).slice(5, 7)); return String(m >= 3 ? y : y - 1); }
function climb_() {
  const v = recordsSheet_().getDataRange().getValues(), years = {};
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][13]) !== 'approved' || Number(v[i][12]) !== 1) continue;
    const sy = schoolYear_(fmtDate_(v[i][3]));
    years[sy] = (years[sy] || 0) + (Number(v[i][8]) || 0);
  }
  return { year: schoolYear_(today_()), years: years };
}

// 판정기 결과 저장: rec = { game, difficulty, rule, speed, correct, attempts, playSeconds, completed, cameraJudged, levelReached }
function addRecord(studentId, rec) {
  studentId = clean_(studentId, 40);
  rec = rec || {};
  const sv = studentsSheet_().getDataRange().getValues();
  let found = false;
  for (let i = 1; i < sv.length; i++) if (String(sv[i][0]).trim() === studentId) { found = true; break; }
  if (!found) throw new Error('등록된 학생이 아니에요.');
  const game = clean_(rec.game, 12);
  if (GAMES_.indexOf(game) < 0) throw new Error('알 수 없는 게임');
  const attempts = int_(rec.attempts, 2000);
  const correct = Math.min(int_(rec.correct, 2000), attempts);
  const sec = int_(rec.playSeconds, 3600);
  const camera = rec.cameraJudged ? 1 : 0;
  // 카메라 판정이 아닌 기록은 늘 승인 대기 (전국판에는 어차피 안 올라감)
  const status = (approvalOn_() || !camera) ? 'pending' : 'approved';
  const id = Utilities.getUuid().slice(0, 13);
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    recordsSheet_().appendRow([id, new Date(), studentId, today_(), game, clean_(rec.difficulty, 12), clean_(rec.rule, 8),
      Number(rec.speed) || 1, correct, attempts, sec, rec.completed ? 1 : 0, camera, status, int_(rec.levelReached, 20)]);
  } finally { lock.releaseLock(); }
  return { recordId: id, status: status };
}

/************ 관리자 ************/
function verifyAdminPassword(password) {
  const saved = props_().getProperty('ADMIN_HASH') || hashPw_(DEFAULT_ADMIN_PASSWORD);
  if (hashPw_(password) !== saved) return { ok: false, message: '비밀번호가 올바르지 않습니다.' };
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('ADMIN_' + token, '1', TOKEN_TTL_SEC);
  return { ok: true, token: token, isDefault: !props_().getProperty('ADMIN_HASH') };
}
function changeAdminPassword(token, newPassword) {
  needAdmin_(token);
  const pw = String(newPassword || '').trim();
  if (pw.length < 4) return { ok: false, message: '비밀번호는 4자 이상 입력하세요.' };
  props_().setProperty('ADMIN_HASH', hashPw_(pw));
  return { ok: true };
}
// (선택) 편집기에서 직접 비밀번호를 정할 때: setAdminPassword("새비밀번호") 실행
function setAdminPassword(password) { props_().setProperty('ADMIN_HASH', hashPw_(password)); }

function getAllDataAdmin(token) {
  needAdmin_(token);
  const pub = getPublic();
  const rv = recordsSheet_().getDataRange().getValues();
  const records = [];
  for (let i = 1; i < rv.length; i++) {
    const r = rv[i];
    if (!String(r[0]).trim()) continue;
    records.push({ id: String(r[0]), ts: r[1] instanceof Date ? r[1].getTime() : 0, studentId: String(r[2]).trim(), date: fmtDate_(r[3]),
      game: String(r[4]), difficulty: String(r[5]), rule: String(r[6]), speed: Number(r[7]) || 1,
      correct: Number(r[8]) || 0, attempts: Number(r[9]) || 0, sec: Number(r[10]) || 0,
      completed: Number(r[11]) === 1, camera: Number(r[12]) === 1, status: String(r[13] || 'pending'), level: Number(r[14]) || 0 });
  }
  return { shell: SHELL_VERSION, title: pub.title, approvalOn: pub.approvalOn, students: pub.students, records: records, extra: getExtraSettings() };
}

// rows = [[학년, 반, 번호, 이름], ...] — 이미 있는 학생(네 칸이 같은)은 건너뜀
function addStudentsBulk(token, rows) {
  needAdmin_(token);
  const sh = studentsSheet_();
  const v = sh.getDataRange().getValues();
  const have = {};
  let maxOrder = 0;
  for (let i = 1; i < v.length; i++) { have[[v[i][1], v[i][2], v[i][3], v[i][4]].join('|')] = 1; maxOrder = Math.max(maxOrder, Number(v[i][5]) || 0); }
  const add = [];
  (rows || []).slice(0, 1000).forEach(function (r) {
    if (!Array.isArray(r)) return;
    const g = clean_(r[0], 4), c = clean_(r[1], 6), n = clean_(r[2], 6), name = clean_(r[3], 20);
    if (!name) return;
    const k = [g, c, n, name].join('|');
    if (have[k]) return;
    have[k] = 1;
    add.push([Utilities.getUuid().slice(0, 8), g, c, n, name, ++maxOrder]);
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, STUDENTS_HEADER.length).setValues(add);
  return { added: add.length };
}
function updateStudent(token, id, obj) {
  needAdmin_(token);
  const sh = studentsSheet_(), v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]).trim() === String(id)) {
    sh.getRange(i + 1, 2, 1, 4).setValues([[clean_(obj.grade, 4), clean_(obj.cls, 6), clean_(obj.number, 6), clean_(obj.name, 20)]]);
    return { ok: true };
  }
  return { ok: false, message: '학생을 찾지 못했어요.' };
}
// 학생을 지우면 그 학생 기록도 함께 지움
function deleteStudents(token, ids) {
  needAdmin_(token);
  const set = {}; (ids || []).forEach(function (x) { set[String(x)] = 1; });
  let n = 0;
  [[studentsSheet_(), 0], [recordsSheet_(), 2]].forEach(function (p) {
    const sh = p[0], col = p[1], v = sh.getDataRange().getValues();
    for (let i = v.length - 1; i >= 1; i--) if (set[String(v[i][col]).trim()]) { sh.deleteRow(i + 1); if (col === 0) n++; }
  });
  return { removed: n };
}

function setRecordsStatus(token, ids, status) {
  needAdmin_(token);
  if (['approved', 'rejected', 'pending'].indexOf(status) < 0) throw new Error('알 수 없는 상태');
  const set = {}; (ids || []).forEach(function (x) { set[String(x)] = 1; });
  const sh = recordsSheet_(), v = sh.getDataRange().getValues();
  let n = 0;
  for (let i = 1; i < v.length; i++) if (set[String(v[i][0])]) {
    // 카메라 판정이 아닌 기록은 승인해도 전국판에는 안 감(수집 때 걸러짐)
    sh.getRange(i + 1, 14).setValue(status); n++;
  }
  return { changed: n };
}
function deleteRecords(token, ids) {
  needAdmin_(token);
  const set = {}; (ids || []).forEach(function (x) { set[String(x)] = 1; });
  const sh = recordsSheet_(), v = sh.getDataRange().getValues();
  let n = 0;
  for (let i = v.length - 1; i >= 1; i--) if (set[String(v[i][0])]) { sh.deleteRow(i + 1); n++; }
  return { removed: n };
}

function setAppSettings(token, obj) {
  needAdmin_(token);
  obj = obj || {};
  if (obj.approvalOn !== undefined) props_().setProperty('APPROVAL_ON', obj.approvalOn ? '1' : '0');
  return { approvalOn: approvalOn_() };
}
// 화면이 새 설정을 두더라도 껍데기를 바꾸지 않도록 마련한 자유 저장칸 (JSON). 전국 참여 설정(nat, 학교 키 포함)도 여기
// → 학교 키가 새지 않게 관리자만 읽음 (getAllDataAdmin 의 extra)
function getExtraSettings() {
  try { return JSON.parse(props_().getProperty('EXTRA_SETTINGS') || '{}'); } catch (e) { return {}; }
}
function setExtraSettings(token, patch) {
  needAdmin_(token);
  const cur = getExtraSettings();
  Object.keys(patch || {}).forEach(function (k) { if (patch[k] === null) delete cur[k]; else cur[k] = patch[k]; });
  const text = JSON.stringify(cur);
  if (text.length > 8000) return { ok: false, message: '저장할 설정이 너무 큽니다.' };
  props_().setProperty('EXTRA_SETTINGS', text);
  return { ok: true, settings: cur };
}
