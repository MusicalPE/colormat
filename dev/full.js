#!/usr/bin/env node
// 색동 전체 시험 (2단계) — 코드 검사에 더해, 시험 서버를 켜고 화면을 실제로 띄워 한 번씩 밟아 봐요
//   우리 학교(관리자 로그인 · 학생 추가 · 화면 이름 · 전국 참여) → 판정기에서 기록 제출 → 승인 → 그래프·하늘까지 반영
//   → 색동 한마당(학교 순위 · 우리 학교 · 학교 안 순위 · 학생 순위 팝업 · 우리 학교만 · 이름 찾기)
//   → 놀이터(게임 열고 시작) → 색동 한판(방 열기 · 기기 3대 자동 번호 · 차례 돌리기 · 기기 찾기 · 판 시작·끝 · 결과 저장 · 다음 조)
//   화면마다 자바스크립트 오류가 하나라도 나면 실패. 넓은 화면·휴대폰 화면 사진은 dev/shots/ 에 남겨요.
// 쓰는 법: node dev/full.js     (playwright 필요 — dev 폴더에서 npm i, 크로미움은 PW_CHROMIUM 으로 경로 지정 가능)
const path = require('path'), fs = require('fs'), { spawn, execFileSync } = require('child_process'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
let pw; for (const p of [path.join(__dirname, 'node_modules/playwright'), 'playwright', '/opt/node-tools/node_modules/playwright']) { try { pw = require(p); break; } catch (e) {} }
if (!pw) { console.log('전체 시험을 못 돌려요 — playwright 가 없어요 (dev 폴더에서 npm i)'); process.exit(2); }
const EXE = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const PORT = +(process.env.PORT || 8900 + Math.floor(Math.random() * 90));
const BASE = 'http://localhost:' + PORT, SH = BASE + '/shell', SHQ = encodeURIComponent(SH);
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const steps = []; let failed = 0;
const ok = (m) => { steps.push('  ✓ ' + m); console.log('  ✓ ' + m); };
const fail = (m) => { failed++; steps.push('  ✗ ' + m); console.log('  ✗ ' + m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const post = (url, fn, args) => fetch(url, { method: 'POST', body: JSON.stringify({ fn, args }) }).then(r => r.json());

// 1단계 코드 검사 먼저
try { console.log(execFileSync(process.execPath, [path.join(__dirname, 'check.js')], { encoding: 'utf8' }).trim()); }
catch (e) { console.log(String(e.stdout || e.message)); console.log('코드 검사에서 걸려서 전체 시험은 하지 않았어요'); process.exit(1); }

const srv = spawn(process.execPath, [path.join(__dirname, 'server.js'), String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
const stop = () => { try { srv.kill(); } catch (e) {} };
process.on('exit', stop);

async function step(name, fn){
  try { const r = await fn(); ok(name + (r ? ' — ' + r : '')); return true; }
  catch (e) { fail(name + ' — ' + String(e && e.message || e).split('\n')[0]); return false; }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

(async () => {
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/index.html'); break; } catch (e) { await sleep(150); } }
  const browser = await pw.chromium.launch({ executablePath: EXE });
  const errs = [];
  const watch = (pg, tag) => {
    pg.on('pageerror', e => errs.push(`${tag}: ${e.message}`));
    pg.on('dialog', d => d.accept());
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage(); watch(pg, '우리 학교');
  const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: false }).catch(() => {});
  const TITLE = '햇살초 색동', SCHOOL = '햇살초등학교';

  console.log('\n[우리 학교 · 관리자]');
  await step('관리자 로그인', async () => {
    await pg.goto(`${BASE}/index.html?s=${SHQ}&page=admin`);
    await pg.fill('#pw', '1234'); await pg.click('#lf button');
    await pg.waitForSelector('.admin-nav', { timeout: 8000 });
  });
  await step('학생 한 명 추가 · 여러 명 붙여넣기', async () => {
    await pg.click('[data-tab="students"]');
    await pg.fill('#aG', '4'); await pg.fill('#aC', '1'); await pg.fill('#aN', '1'); await pg.fill('#aName', '김하늘');
    await pg.click('#addOne button'); await pg.waitForFunction(() => document.querySelectorAll('tr[data-sid]').length === 1, null, { timeout: 8000 });
    await pg.fill('#bulk', '4 1 2 이바다\n4 1 3 박구름\n4 1 4 정새벽\n4 1 5 강들판\n4 2 1 최노을');
    await pg.click('#bulkGo'); await pg.waitForFunction(() => document.querySelectorAll('tr[data-sid]').length === 6, null, { timeout: 8000 });
    return '6명';
  });
  await step('화면 이름 저장', async () => {
    await pg.click('[data-tab="settings"]'); await pg.fill('#appTitle', TITLE); await pg.click('#appTitleSave');
    await pg.waitForSelector('.msg.ok', { timeout: 8000 });
  });
  await step('전국 현황판 참여 켜기', async () => {
    await pg.click('[data-tab="settings"]').catch(() => {});
    await pg.waitForSelector('#natName'); await pg.fill('#natName', SCHOOL);
    if (!(await pg.isChecked('#natShow'))) await pg.check('#natShow');
    await pg.click('#natOn'); await pg.waitForSelector('#natSave', { timeout: 10000 });
  });
  await shot(pg, 'admin-1440');

  console.log('\n[학생 기록 제출 → 승인]');
  let checkerUrl = '';
  await step('우리 학교 화면에서 학생 고르고 판정기로', async () => {
    await pg.goto(`${BASE}/index.html?s=${SHQ}`);
    await pg.waitForSelector('#selG'); const t = await pg.textContent('.hero');
    must(t.includes(TITLE), '큰 제목에 화면 이름이 없어요');
    await pg.selectOption('#selG', '4'); await pg.selectOption('#selC', '1');
    const v = await pg.$$eval('#selN option', o => (o.find(x => x.textContent.includes('김하늘')) || {}).value);
    await pg.selectOption('#selN', v);
    await Promise.all([pg.waitForURL(/checker\/index\.html/), pg.click('#goCam')]);
    checkerUrl = pg.url(); must(/[?&]s=/.test(checkerUrl) && /[?&]sid=/.test(checkerUrl), '판정기 주소에 학교·학생이 없어요');
  });
  await shot(pg, 'main-before-1440');
  await step('판정기에서 게임하고 기록 제출', async () => {
    const ck = await ctx.newPage(); watch(ck, '판정기');
    await ck.goto(checkerUrl + '&test=1'); await ck.waitForFunction(() => window.__ck);
    await ck.evaluate(() => { const C = window.__ck; C.begin('basic', { seed: 7 }); let seen = null, at = 0;
      window.__t = setInterval(() => { const now = performance.now(), c = C.GM.cur; C.TR.feet = [{ x: .3, y: .3 }, { x: .3, y: .3 }];
        if (c !== seen) { seen = c; at = now; } if (c && now - at > 300) C.TR.stable = c.kind === 'one' ? 's' + c.t[0] : 'p' + c.t[0] + c.t[1];
        C.gameFrame(now); }, 30); });
    await ck.waitForFunction(() => window.__ck.GM.correct >= 3, null, { timeout: 30000 });
    await ck.evaluate(() => clearInterval(window.__t));
    await ck.click('#stopBtn'); await ck.waitForFunction(() => /저장했어요/.test(document.getElementById('rSent').textContent), null, { timeout: 10000 });
    const c = await ck.evaluate(() => window.__ck.GM.correct); await ck.close(); return `정답 ${c}번`;
  });
  await step('오늘 뛴 기록에 "대기"로 보임', async () => {
    await pg.goto(`${BASE}/index.html?s=${SHQ}`); await pg.waitForSelector('.dash-today');
    const t = await pg.textContent('.dash-today'); must(t.includes('김하늘') && t.includes('대기'), '오늘 뛴 기록에 대기 기록이 없어요');
  });
  await step('관리자 승인 → 전국 현황판에 보내기', async () => {
    await pg.goto(`${BASE}/index.html?s=${SHQ}&page=approval`);
    await pg.waitForSelector('#okAll', { timeout: 10000 }); await pg.click('#okAll');
    await pg.waitForFunction(() => /전국 현황판에도 반영/.test(document.body.innerText), null, { timeout: 10000 });
  });
  await step('승인 뒤 그래프·숫자·하늘까지 반영', async () => {
    await pg.goto(`${BASE}/index.html?s=${SHQ}`); await pg.waitForSelector('.dash-today');
    const t = await pg.textContent('.dash-today'); must(t.includes('승인'), '오늘 뛴 기록이 승인으로 안 바뀌었어요');
    const stats = await pg.textContent('.stats'); must(!/학년도 정답 착지\s*0\b/.test(stats.replace(/\s+/g, ' ')), '정답 착지 숫자가 0이에요');
    const bars = await pg.textContent('.bars'); must(bars.includes('김하늘'), '학생별 그래프에 김하늘이 없어요');
  });
  await shot(pg, 'main-1440');
  { const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); watch(m, '우리 학교(휴대폰)');
    await m.goto(`${BASE}/index.html?s=${SHQ}`); await m.waitForSelector('.dash-today').catch(() => {}); await shot(m, 'main-390'); await m.close(); }

  console.log('\n[색동 한마당]');
  const pid = (await post(SH, 'getPublic', [])).result.natPid;
  const bd = await ctx.newPage(); watch(bd, '한마당');
  await step('학교 순위에 우리 학교 · 우리 학교 표시', async () => {
    must(/^[0-9a-f]{10}$/.test(pid || ''), '껍데기가 학교 공개 번호(natPid)를 주지 않아요');
    await bd.goto(`${BASE}/board.html?game=basic&me=${pid}`); await bd.waitForSelector('tr.school', { timeout: 10000 });
    const t = await bd.textContent('tr.school.me'); must(t.includes(SCHOOL) && t.includes('우리 학교'), '우리 학교 줄이 없어요');
  });
  await step('학교 줄 → 학교 안 순위', async () => {
    await bd.click('tr.school.me'); await bd.waitForSelector('tr.detail table', { timeout: 8000 });
    must((await bd.textContent('tr.detail')).includes('김*늘'), '학교 안 순위에 학생이 없어요');
  });
  await step('학생 순위 팝업 · 우리 학교만 · 이름 찾기', async () => {
    await bd.click('#stuMore'); await bd.waitForSelector('#rankModal .pop-list tbody tr');
    await bd.click('.pop-mine'); await bd.waitForFunction(() => /전국 등수/.test((document.querySelector('.pop-note') || {}).textContent || ''), null, { timeout: 8000 });
    await bd.fill('.pop-search', '김하'); const n = await bd.$$eval('.pop-list tbody tr', r => r.length); must(n >= 1, '이름 찾기 결과가 없어요');
    await bd.keyboard.press('Escape');
  });
  await shot(bd, 'board-1440'); await bd.close();
  { const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); watch(m, '한마당(휴대폰)');
    await m.goto(`${BASE}/board.html?game=basic`); await m.waitForSelector('tr.school').catch(() => {}); await shot(m, 'board-390'); await m.close(); }

  console.log('\n[놀이터]');
  await step('게임 목록 → 게임 열고 시작', async () => {
    const p = await ctx.newPage(); watch(p, '놀이터');
    await p.goto(`${BASE}/play/`); await p.waitForSelector('[data-game]');
    const n = await p.$$eval('[data-game]', b => b.length); must(n >= 10, `게임이 ${n}개뿐이에요`);
    await p.click('[data-game]'); await p.waitForSelector('#mgSetup:not([hidden])'); await p.click('#mgStartBtn');
    await p.waitForSelector('#mgPlay:not([hidden])', { timeout: 8000 }); await sleep(1500); await shot(p, 'play-1440'); await p.close();
    return `게임 ${n}개`;
  });

  console.log('\n[색동 한판]');
  const mon = await ctx.newPage(); watch(mon, '한판 TV');
  const devs = [];
  await step('방 열기 (명단 · 매트 3개 · 색깔 뛰기)', async () => {
    await mon.goto(`${BASE}/live/?demo=1&test=1&s=${SHQ}`); await mon.waitForSelector('#clsChips .chip', { timeout: 15000 });
    await mon.selectOption('#selMats', '3'); await mon.click('#games button[data-g="basic"]'); await mon.click('#btnOpen');
    await mon.waitForSelector('#qr:not([hidden])');
  });
  await step('기기 3대가 들어와 번호를 저절로 받음', async () => {
    const url = await mon.textContent('#qrUrl');
    for (let i = 1; i <= 3; i++) devs.push(await ctx.newPage());
    await Promise.all(devs.map(async (d, k) => { watch(d, '기기' + (k + 1)); await d.setViewportSize({ width: 420, height: 860 });
      await d.goto(url + '&slot=' + (k + 1)); await d.waitForFunction(() => window.__ck && window.__ck.LV.mat > 0 && !window.__ck.LV.matBusy, null, { timeout: 20000 }); }));
    const mats = (await Promise.all(devs.map(d => d.evaluate(() => window.__ck.LV.mat)))).sort();
    must(mats.join() === '1,2,3', '기기 번호가 겹치거나 비어요: ' + mats);
    for (const d of devs) {
      await d.evaluate(() => { const C = window.__ck; C.S.H = [1, 0, 0, 0, 1, 0, 0, 0]; C.S.Hinv = [1, 0, 0, 0, 1, 0, 0, 0]; C.liveWait();
        const p = document.getElementById('lvPick'); if (p) p.classList.add('hidden'); let seen = null, at = 0;
        setInterval(() => { const now = performance.now(), c = C.GM.cur; C.TR.feet = [{ x: .3, y: .3 }, { x: .3, y: .3 }];
          if (c !== seen) { seen = c; at = now; } if (c && now - at > 350) C.TR.stable = c.kind === 'one' ? 's' + c.t[0] : 'p' + c.t[0] + c.t[1];
          C.gameFrame(now); }, 30); });
    }
    await mon.waitForTimeout(1200); await mon.click('#btnQrClose');
  });
  await step('차례 돌리기: 조 나누기 → 기기마다 지금 차례', async () => {
    await mon.click('#btnRot'); await mon.click('#rotMake'); await sleep(900);
    const bars = await Promise.all(devs.map(d => d.$eval('#lvBar', e => e.innerText)));
    must(bars.every(b => /지금 차례\s*4학년 1반 \d번/.test(b)), '기기에 지금 차례가 안 떠요: ' + bars.join(' / '));
    await mon.click('#rotClose');
  });
  await step('기기 찾기 신호', async () => {
    await mon.click('#btnDevs'); await mon.click('[data-find="2"]'); await sleep(500);
    const shown = await Promise.all(devs.map(d => d.evaluate(() => { const e = document.getElementById('lvFind'); return !!(e && !e.classList.contains('hidden')); })));
    must(shown.filter(Boolean).length === 1, '찾기 화면이 2번 기기에만 떠야 해요');
    await mon.click('#btnDevClose');
  });
  await step('판 시작 → 끝 → 결과 3명', async () => {
    await mon.click('#btnGo'); await mon.waitForSelector('#resModal:not([hidden])', { timeout: 150000 }); await sleep(600);
    const rows = await mon.$$eval('#resBody tr', r => r.map(x => x.innerText.replace(/\s+/g, ' ')));
    must(rows.length === 3 && rows.every(r => /\d+%/.test(r)), '결과표가 이상해요: ' + rows.join(' / '));
    return rows.length + '명';
  });
  await step('저장 안 하고 닫으면 한 번 알림', async () => {
    await mon.click('#btnResClose'); must(!(await mon.isHidden('#resModal')), '결과 창이 바로 닫혔어요');
    must(/시트에 넣지 않았어요/.test(await mon.textContent('#resMsg')), '알림이 없어요');
  });
  await step('결과를 우리 학교 시트에 저장', async () => {
    if (await mon.isVisible('#resPw')) { await mon.fill('#resPw', '1234'); await mon.click('#btnResSave'); }
    await mon.waitForFunction(() => /기록했어요/.test(document.getElementById('resSaveRow').innerText), null, { timeout: 15000 });
    const recs = (await post(SH, 'getPublic', [])).result.today || [];
    must(recs.length >= 4, '시트에 한판 기록이 안 들어왔어요 (오늘 기록 ' + recs.length + '개)');
  });
  await shot(mon, 'live-result-1440');
  await step('다음 조로 → 기기 차례가 바뀜', async () => {
    must(await mon.isVisible('#btnResNext'), '결과 창에 "다음 조로" 단추가 없어요');
    await mon.click('#btnResNext'); await sleep(900);
    const b = await devs[0].$eval('#lvBar', e => e.innerText); must(/4학년 (1반 [4-9]|2반)|쉬는 기기/.test(b), '다음 조로 안 바뀌었어요: ' + b);
  });
  await shot(mon, 'live-1440'); await shot(devs[0], 'live-device-420');

  // 화면 오류 모음
  if (errs.length) { fail('화면 자바스크립트 오류 ' + errs.length + '건'); [...new Set(errs)].slice(0, 10).forEach(e => console.log('     · ' + e)); }
  else ok('모든 화면에서 자바스크립트 오류 없음');

  await browser.close(); stop();
  const pass = steps.filter(s => s.includes('✓')).length;
  console.log(`\n${failed ? '전체 시험 실패' : '전체 시험 통과'} — ${pass}/${pass + failed} 단계 · 사진: dev/shots/`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log('전체 시험 중단 — ' + (e && e.stack || e)); stop(); process.exit(1); });
