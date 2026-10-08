/* 색깔 매트 놀이터 — 카메라 판정 게임 모음 (판정기와 매트 라이브 TV 화면이 함께 씀)
   칸 번호: 0 빨강(왼위) 1 노랑(오위) 2 초록(왼아래) 3 파랑(오아래)
   makeGames(E) 로 게임을 만듦. E.random 을 같은 씨앗으로 주고 같은 시각(T)으로 돌리면
   어느 기기에서나 똑같은 문제가 똑같은 순간에 나옴 (다음 문제 시각은 실제 프레임이 아니라 예정 시각으로 셈) */
export const TILE = ['빨강','노랑','초록','파랑'];
export const NAME = ['빨간색','노란색','초록색','파란색'];
export const TILE_COLOR = ['#F2392F','#FFD21F','#2FC653','#4C88FF'];
export const INK = ['#F2392F','#E6B800','#2FC653','#4C88FF'];   // 흰 바탕에서 노랑이 잘 보이게
// 놀이터 v1.9 색깔 스트룹과 같은 단계표
export const LEVELS=[{gap:3.0,trick:0},{gap:2.5,trick:0},{gap:2.2,trick:0.3},{gap:1.9,trick:0.45},{gap:1.65,trick:0.6},
  {gap:1.45,trick:0.7},{gap:1.3,trick:0.8},{gap:1.15,trick:0.85},{gap:1.0,trick:0.9},{gap:0.85,trick:0.95}];
export function seeded(seed){ let a=(seed>>>0)||1; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
export const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt = s => `${Math.floor(Math.max(0,s)/60)}:${String(Math.floor(Math.max(0,s)%60)).padStart(2,'0')}`;
export function pop(el){ if (!el) return; el.animate?.([{transform:'scale(.82)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:260,easing:'ease-out'}); }
export const hintMat = (cls='') => `<div class="hmat ${cls}">${[0,1,2,3].map(i=>`<i class="h${i}"><b></b></i>`).join('')}</div>`;
// list: null = 모두 밝게, [] = 모두 흐리게, [{c, label, style}] = 그 칸만 밝게 (style 'off'면 글자만 보이고 흐리게)
export function hintShow(el, list){
  if (!el) return;
  [...el.children].forEach((cell,i)=>{
    const its = list ? list.filter(x=>x.c===i) : [];
    const lit = list===null || its.some(x=>x.style!=='off');
    cell.className = 'h'+i + (lit?' on':'') + its.map(x=>x.style&&x.style!=='off'?' '+x.style:'').join('') + (its.some(x=>x.style==='off')?' off':'');
    cell.querySelector('b').textContent = its.map(x=>x.label||'').filter(Boolean).join(' · ');
  });
}

// E = { api, score(ok), beep(f,ms,type,vol), limbTile(l) → 칸|null, raw() → [왼발 칸, 오른발 칸], TEST, random }
export function makeGames(E){
const { api, beep } = E, score = E.score || (()=>{}), limbTile = E.limbTile || (()=>null), raw = E.raw || (()=>[null,null]), TEST = !!E.TEST;
const R = E.random || Math.random;
const rnd = n => Math.floor(R()*n);
const shuffle = a => { a=a.slice(); for (let i=a.length-1;i>0;i--){ const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; };
// 놀이터 단계 진행(30초 단계 · 단계 사이 안내)을 함께 쓰는 게임용
function leveled(T, st, NL, LS, BN, note){
  const li=Math.min(NL-1,Math.floor(T/LS));
  if (li!==st.lvl){ st.lvl=li; api.level(li+1); api.hud(`${li+1}단계`,`/ ${NL}`); if (li>0) api.banner(`${li+1}단계`, note(li)); if (st.onLevel) st.onLevel(li); }
  const t=T-li*LS;
  if ((li>0 || st.bnAll) && t<BN){ st.nextAt=li*LS+BN; return {li, ready:false}; }
  api.hideBanner();
  return {li, ready:T>=st.nextAt};
}

// ================= 게임들 (놀이터 v1.9 규칙 그대로) =================
const CK = [1,2,3,0];   // 놀이터 색 번호(노랑0 초록1 파랑2 빨강3) → 판정기 칸 번호
const GDEF = {};

// ----- 색깔 점프 -----
GDEF.basic = { name:'색깔 점프', sub:'화면 색 칸으로 점프',
  desc:'화면이 한 가지 색으로 바뀌면 그 색 칸으로 점프해요. 8단계 × 30초(4분). <b>다음 색이 나오기 전에 그 칸에 있으면 정답</b>. "2개"는 왼쪽 색 = 왼발, 오른쪽 색 = 오른발.',
  options:[{id:'mode',label:'나오는 색',choices:[['1','1개'],['2','2개 (왼발·오른발)']]},
           {id:'diff',label:'빠르기',choices:[['easy','천천히'],['normal','보통'],['hard','빠르게']],def:'normal'}],
  diffKey:o=>o.diff+(o.mode==='2'?'2':''), ruleKey:o=>'c'+o.mode,
  rule:o=>o.mode==='2'?'왼쪽 색은 <b>왼발</b>, 오른쪽 색은 <b>오른발</b>':'화면 색 칸으로 점프',
  create(o){
    const GAPS={easy:[3.0,2.7,2.4,2.2,2.0,1.8,1.6,1.4],normal:[2.5,2.2,1.9,1.7,1.5,1.3,1.1,0.95],hard:[2.0,1.7,1.5,1.3,1.1,0.95,0.85,0.75]}[o.diff];
    const two=o.mode==='2', NL=8, LS=TEST?6:30, BN=2.5, TOTAL=NL*LS;
    const st=api.stage(`<div class="blk">${two?'<div><small>왼발</small></div><div><small>오른발</small></div>':'<div></div>'}</div>`);
    const halves=[...st.querySelectorAll('.blk>div')], S0={lvl:-1,nextAt:0}; let prev=[];
    return { update(T){
      if (T>=TOTAL) return api.finish();
      const {li,ready}=leveled(T,S0,NL,LS,BN,i=>i===NL-1?'마지막 단계! 최고 속도로!':'조금 더 빨라져요');
      if (ready){
        let cs;
        for (let n=0;n<40;n++){ cs=two?[rnd(4),rnd(4)]:[rnd(4)]; if (two&&cs[0]===cs[1]) continue; if (cs.some((c,i)=>c===prev[i])) continue; break; }
        if (two && cs[0]===cs[1]) cs[1]=(cs[0]+1)%4;
        prev=cs; cs.forEach((c,i)=>{ halves[i].style.background=TILE_COLOR[c]; pop(halves[i]); });
        S0.nextAt+=GAPS[li]*(two?1.2:1);
        api.ask({ kind:two?'lr':'one', t:cs, until:S0.nextAt });
      }
      api.left(fmt(TOTAL-T));
    } };
  } };

// ----- 색깔 스트룹 -----
GDEF.stroop = { name:'색깔 스트룹', sub:'글자 색깔·뜻 보고 밟기',
  desc:'10단계 × 30초(5분), 3단계부터 함정. <b>다음 글자가 나오기 전에 정답 칸에 있으면 정답</b>이에요(옮겨 가다 다른 칸을 밟아도 괜찮아요). 하드는 두 발로 두 칸, 익스퍼트는 왼발·오른발 칸이 정해져요.',
  options:[{id:'rule',label:'보고 밟기',choices:[['ink','글자 색깔'],['word','글자 읽기']]},
           {id:'mode',label:'모드',choices:[['1','노말'],['2','하드'],['3','익스퍼트']]},
           {id:'speed',label:'속도',choices:[['1.25','천천히'],['1','보통'],['0.8','빠르게']],def:'1'}],
  diffKey:o=>({1:'normal',2:'hard',3:'expert'})[o.mode], ruleKey:o=>o.rule, speedOf:o=>+o.speed,
  rule:o=>(o.rule==='word'?'글자를 <b>읽고</b> 밟아요':'글자 <b>색깔</b>을 보고 밟아요')+(o.mode==='2'?' · 두 발로 두 칸':o.mode==='3'?' · 왼발·오른발 칸 따로':''),
  create(o){
    const mode=+o.mode, speed=+o.speed, rule=o.rule, NL=10, LS=TEST?6:30, BN=2.5, TOTAL=NL*LS;
    const word=api.stage('<div class="word"></div>').firstChild, S0={lvl:-1,nextAt:0};
    let prev={m:-1,k:-1,t:-1,key:''};
    S0.onLevel=()=>{ prev={m:-1,k:-1,t:-1,key:''}; };
    function pickOne(L,avoid){
      for (let n=0;n<60;n++){
        const m=rnd(4); let k=m;
        if (R()<L.trick){ do{ k=rnd(4); }while(k===m); }
        const t = rule==='word' ? m : k;
        if (avoid.includes(t)) continue;
        if (mode===1 && m===prev.m && k===prev.k) continue;
        return {m,k,t};
      }
      const t=[0,1,2,3].find(x=>!avoid.includes(x)); return {m:t,k:t,t};
    }
    const wHTML = (w,label) => `<span class="w" style="color:${INK[w.k]}">${NAME[w.m]}${label?`<small>${label}</small>`:''}</span>`;
    return { update(T){
      if (T>=TOTAL) return api.finish();
      const {li,ready}=leveled(T,S0,NL,LS,BN,i=>LEVELS[i].trick>0&&LEVELS[i-1].trick===0?'이제 함정이 나와요!':i===9?'마지막 단계! 최고 속도로!':'조금 더 빨라져요');
      if (ready){
        const L=LEVELS[li];
        word.style.fontSize = `calc(min(${mode>1?13:24}vw,${mode>1?90:140}px) * ${(1-0.5*li/9).toFixed(3)})`;
        S0.nextAt+=L.gap*speed*(mode>=2?1.25:1);
        if (mode>=2){
          let a,b;
          for (let n=0;n<30;n++){ a=pickOne(L,[]); b=pickOne(L,[a.t]); const key=[a.t,b.t].sort().join(); if (key!==prev.key){ prev={key,m:-1,k:-1,t:-1}; break; } }
          word.innerHTML = mode===3 ? wHTML(a,'왼발')+wHTML(b,'오른발') : wHTML(a)+wHTML(b);
          api.ask({ kind:mode===3?'lr':'pair', t:[a.t,b.t], until:S0.nextAt });
        } else {
          const w=pickOne(L,[prev.t]); prev=w; word.innerHTML=wHTML(w);
          api.ask({ kind:'one', t:[w.t], until:S0.nextAt });
        }
        pop(word);
      }
      api.left(fmt(TOTAL-T));
    } };
  } };

// ----- 기억력 스텝 -----
GDEF.memory = { name:'기억력 스텝', sub:'반짝인 순서대로 밟기',
  desc:'"잘 보세요!" 동안 매트에 반짝이는 순서를 외워요(움직이지 않기). "따라 밟아요!"가 나오면 <b>삐 소리에 맞춰 하나씩</b> 순서대로 밟아요. 한 칸마다 그 박자 안에 그 칸에 있으면 정답. 라운드를 모두 마치면 완주.',
  options:[{id:'diff',label:'난이도',choices:[['easy','쉬움 (2개부터)'],['normal','보통 (3개부터)'],['hard','어려움 (4개부터)']],def:'normal'},
           {id:'rounds',label:'라운드',choices:[['6','6'],['8','8'],['10','10']],def:'8'}],
  diffKey:o=>o.diff, ruleKey:o=>'r'+o.rounds,
  rule:()=>'순서를 기억해서 밟기',
  create(o){
    const cfg={easy:{start:2,show:0.95},normal:{start:3,show:0.75},hard:{start:4,show:0.58}}[o.diff];
    const R=TEST?2:+o.rounds, lenOf=r=>cfg.start+Math.floor(r/2), stepDo=cfg.show*1.7;
    const st=api.stage(`<div class="cap"></div>${hintMat()}<div class="slots"></div>`);
    const cap=st.querySelector('.cap'), hm=st.querySelector('.hmat'), slots=st.querySelector('.slots');
    let r=0, seq=[], phase='', p0=0, shown=-999;
    function newSeq(n){ const s=[]; for (let i=0;i<n;i++){ let c; do{ c=rnd(4); }while(c===s[i-1]); s.push(c); } return s; }
    function setSlots(n,filled,numbers){ slots.innerHTML=Array.from({length:n},(_,i)=>`<span class="${i<filled?'done':''}">${numbers&&i<filled?i+1:''}</span>`).join(''); }
    function startRound(T){ seq=newSeq(lenOf(r)); phase='intro'; p0=T; shown=-999;
      api.banner(`${r+1}라운드`,`${seq.length}개를 기억해요`); api.level(r+1); api.hud(`${r+1}라운드`,`/ ${R}`); api.left(`${seq.length}개 기억하기`);
      cap.textContent=''; hintShow(hm,[]); setSlots(seq.length,0); api.bar(1); }
    const go=(ph,T)=>{ phase=ph; p0=T; shown=-999; };
    const D=()=>({intro:2.2, show:0.5+seq.length*cfg.show, ready:1.3, do:seq.length*stepDo+0.9, check:0.4+seq.length*0.5+2.2});
    return { update(T){
      if (!phase) startRound(0);
      const el=T-p0, d=D();
      if (phase==='intro'){ if (el>=d.intro){ api.hideBanner(); go('show',p0+d.intro); cap.textContent='잘 보세요! (움직이지 않아요)'; } }
      else if (phase==='show'){
        const k=Math.floor((el-0.5)/cfg.show), on=el>=0.5 && ((el-0.5)%cfg.show)<cfg.show*0.7, key=on?k:-1000-k;
        if (k<seq.length && key!==shown){ shown=key; if (on){ hintShow(hm,[{c:seq[k]}]); beep([523,659,784,1046][seq[k]],140,'triangle',.14); setSlots(seq.length,k+1); } else hintShow(hm,[]); }
        api.bar(1-el/d.show);
        if (el>=d.show){ go('ready',p0+d.show); hintShow(hm,null); cap.textContent='따라 밟아요!'; setSlots(seq.length,0); beep(660,200,'triangle'); }
      }
      else if (phase==='ready'){ if (el>=d.ready) go('do',p0+d.ready); }
      else if (phase==='do'){
        const k=Math.floor(el/stepDo);
        if (k!==shown && k<seq.length){ shown=k; setSlots(seq.length,k+1,true); beep(880,70,'triangle'); api.ask({ kind:'one', t:[seq[k]], until:p0+(k+1)*stepDo }); }
        if (el>=d.do){ api.close(); go('check',p0+d.do); cap.textContent='정답 확인'; hintShow(hm,[]); }
      }
      else if (phase==='check'){
        const k=Math.min(seq.length,Math.floor((el-0.4)/0.5)+1);
        if (el>=0.4 && k!==shown){ shown=k; hintShow(hm,seq.slice(0,k).map((c,i)=>({c,label:String(i+1)}))); }
        if (el>=d.check){ r++; if (r>=R) return api.finish(); startRound(p0+d.check); }
      }
    } };
  } };

// ----- 방향 점프 -----
const DIRS=[{dr:-1,dc:0,ang:-90},{dr:1,dc:0,ang:90},{dr:0,dc:-1,ang:180},{dr:0,dc:1,ang:0},
  {dr:-1,dc:-1,ang:-135},{dr:-1,dc:1,ang:-45},{dr:1,dc:-1,ang:135},{dr:1,dc:1,ang:45}];
GDEF.dir = { name:'방향 점프', sub:'화살표 방향 옆 칸으로',
  desc:'단계마다 알려 주는 칸에서 출발해, 화살표 방향의 옆 칸으로 점프해요. 8단계 × 30초(4분). <b>다음 화살표 전에 그 칸에 있으면 정답</b>. "제자리!"는 화살표가 바뀔 때 그 칸에 그대로 있으면 정답.',
  options:[{id:'diff',label:'난이도',choices:[['easy','쉬움 (도착 칸 표시)'],['normal','보통 (대각선)'],['hard','어려움 (함정)']],def:'normal'}],
  diffKey:o=>o.diff, rule:()=>'화살표 방향으로 한 칸 점프',
  create(o){
    const D={easy:{gaps:[3.4,3.1,2.8,2.6,2.4,2.2,2.0,1.8],diag:false,hint:'full',trick:false},
             normal:{gaps:[3.0,2.7,2.4,2.2,2.0,1.8,1.6,1.45],diag:true,hint:'pos',trick:false},
             hard:{gaps:[2.6,2.3,2.1,1.9,1.7,1.55,1.4,1.25],diag:true,hint:'none',trick:true}}[o.diff];
    const NL=8, LS=TEST?8:30, BN=3, TOTAL=NL*LS;
    const st=api.stage(`<div class="arrowbox"><div class="trick" hidden>반대로!</div><div class="stay" hidden>제자리!</div><svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="M-40,-13 H8 V-32 L44,0 L8,32 V13 H-40 Z" fill="#1f2937"/></svg></div>${D.hint!=='none'?hintMat():''}`);
    const svg=st.querySelector('svg'), path=svg.querySelector('path'), trickEl=st.querySelector('.trick'), stayEl=st.querySelector('.stay'), hm=st.querySelector('.hmat');
    const S0={lvl:-1,nextAt:0,bnAll:true}; let pos=0, lastStart=-1;
    const rc=p=>[Math.floor(p/2),p%2];
    S0.onLevel=li=>{ let s; do{ s=rnd(4); }while(s===lastStart); lastStart=s; pos=s;
      api.banner(li===0?'출발!':`${li+1}단계`,`${TILE[s]} 칸에서 시작해요`); svg.style.visibility='hidden'; trickEl.hidden=true; stayEl.hidden=true;
      hintShow(hm,[{c:s,label:'출발'}]); };
    function next(T){
      const [r,c]=rc(pos);
      if (D.trick && S0.lvl>=4 && R()<0.12){
        svg.style.visibility='hidden'; trickEl.hidden=true; stayEl.hidden=false; pop(stayEl);
        hintShow(hm, D.hint==='full'?[{c:pos,label:'제자리'}]:[{c:pos,label:'지금',style:'now'}]);
        api.ask({ kind:'one', t:[pos], until:S0.nextAt, judge:'end' }); return;
      }
      const valid=DIRS.filter((d,i)=>(D.diag||i<4) && r+d.dr>=0 && r+d.dr<2 && c+d.dc>=0 && c+d.dc<2);
      const m=valid[rnd(valid.length)], trick=D.trick && S0.lvl>=2 && R()<0.3;
      const from=pos; pos=(r+m.dr)*2+(c+m.dc);
      path.setAttribute('transform',`rotate(${trick?m.ang+180:m.ang})`);
      svg.style.visibility='visible'; stayEl.hidden=true; trickEl.hidden=!trick; pop(svg);
      if (D.hint==='full') hintShow(hm,[{c:from,label:'지금',style:'now'},{c:pos,label:'여기!'}]);
      else if (D.hint==='pos') hintShow(hm,[{c:from,label:'지금',style:'now'}]);
      api.ask({ kind:'one', t:[pos], until:S0.nextAt });
    }
    return { update(T){
      if (T>=TOTAL) return api.finish();
      const {li,ready}=leveled(T,S0,NL,LS,BN,()=>'');
      if (ready){ S0.nextAt+=D.gaps[li]; next(T); }
      api.left(fmt(TOTAL-T));
    } };
  } };

// ----- 퀴즈 점프 -----
const PE_QUIZ=[
  ['축구는 한 팀에 몇 명이 경기해요?','11명','9명','10명','12명'],['농구는 한 팀에 몇 명이 코트에서 경기해요?','5명','4명','6명','7명'],
  ['배구는 한 팀에 몇 명이 코트에서 경기해요?','6명','5명','7명','9명'],['야구에서 수비하는 선수는 몇 명이에요?','9명','7명','8명','11명'],
  ['핸드볼은 한 팀에 몇 명이 코트에서 경기해요?','7명','5명','6명','9명'],['올림픽 오륜기의 고리는 몇 개예요?','5개','4개','6개','7개'],
  ['올림픽은 몇 년마다 열려요?','4년','2년','3년','5년'],['마라톤의 거리는?','42.195km','40km','21km','50km'],
  ['태권도가 처음 시작된 나라는?','대한민국','일본','중국','태국'],['배드민턴에서 치는 공의 이름은?','셔틀콕','테니스공','탁구공','배구공'],
  ['탁구 한 게임은 몇 점을 먼저 내면 이겨요?','11점','15점','21점','25점'],['배드민턴 한 게임은 몇 점을 먼저 내면 이겨요?','21점','11점','15점','25점'],
  ['농구에서 3점 선 밖에서 넣은 슛은 몇 점?','3점','1점','2점','4점'],['농구 자유투를 넣으면 몇 점?','1점','2점','3점','0점'],
  ['2단 뛰기는 한 번 뛸 때 줄이 몇 번 돌아요?','2번','1번','3번','4번'],['달리기에서 손을 땅에 짚고 하는 출발은?','크라우칭 스타트','스탠딩 스타트','점프 스타트','롤링 스타트'],
  ['PAPS에서 심폐지구력을 재는 종목은?','왕복오래달리기','50m 달리기','윗몸말아올리기','제자리멀리뛰기'],['PAPS에서 유연성을 재는 종목은?','앉아윗몸앞으로굽히기','왕복오래달리기','악력','50m 달리기'],
  ['운동 전에 준비운동을 하는 가장 큰 이유는?','다치지 않으려고','배가 고파서','점수를 받으려고','시간이 남아서'],['운동하고 나서 몸을 천천히 푸는 운동은?','정리운동','준비운동','본운동','달리기'],
];
function numOpts(ans,cands){ const set=new Set(); cands.concat([ans+1,ans-1,ans+2,ans-2,ans+10,ans-10,ans+3]).forEach(v=>{ if (v!==ans && v>=0 && set.size<3) set.add(v); }); return [...set].map(String); }
const RR=(lo,hi)=>lo+rnd(hi-lo+1);
const QGEN={
  add:L=>{ const plus=R()<.5; let a,b;
    if (L===1){ if (plus){ a=RR(1,9); b=RR(1,10-a); } else { a=RR(2,10); b=RR(1,a-1); } }
    else if (L===2){ if (plus){ a=RR(2,9); b=RR(11-a,9); } else { a=RR(11,18); b=RR(a-9,9); } }
    else { if (plus){ a=RR(12,89); b=RR(11,99-a>11?99-a:11); } else { a=RR(30,99); b=RR(11,a-5); } }
    const ans=plus?a+b:a-b; return [`${a} ${plus?'+':'−'} ${b} = ?`,String(ans),...numOpts(ans,[ans+1,ans-1,ans+10,ans-10,plus?a-b:a+b])]; },
  times:L=>{ const a=L===1?[2,3,4,5][rnd(4)]:L===2?RR(2,9):RR(6,9), b=L===3?RR(3,9):RR(1,9), p=a*b;
    if (L===3 && R()<.4) return [`${a} × ? = ${p}`,String(b),...numOpts(b,[b+1,b-1,a])];
    return [`${a} × ${b} = ?`,String(p),...numOpts(p,[a*(b+1),(a+1)*b,a*(b-1),p+1])]; },
  muldiv:L=>{ if (R()<.5){ const a=L===1?RR(11,30):L===2?RR(12,99):RR(12,40), b=L===1?RR(2,5):L===2?RR(2,9):RR(11,25), p=a*b; return [`${a} × ${b} = ?`,String(p),...numOpts(p,[p+b,p-b,p+10,p-10,p+a])]; }
    const d=L===1?RR(2,9):L===2?RR(2,9):RR(3,9), q=L===1?RR(2,9):L===2?RR(11,30):RR(Math.ceil(100/d),99), n=d*q; return [`${n} ÷ ${d} = ?`,String(q),...numOpts(q,[q+1,q-1,q+10,q-10,d])]; },
};
GDEF.quiz = { name:'퀴즈 점프', sub:'정답 칸으로 점프',
  desc:'문제와 함께 네 칸에 보기가 나와요. <b>생각 시간이 끝날 때 정답 칸에 서 있으면 정답</b>(한 발이라도 정답 칸). 문제를 모두 풀면 완주.',
  options:[{id:'set',label:'문제',choices:[['add','덧셈·뺄셈'],['times','구구단'],['muldiv','곱셈·나눗셈'],['pe','체육 상식']],def:'times'},
           {id:'mlevel',label:'수학 난이도',choices:[['1','쉬움'],['2','보통'],['3','어려움']],def:'2',showIf:o=>o.set!=='pe'},
           {id:'think',label:'생각 시간',choices:[['8','8초'],['6','6초'],['4','4초']],def:'6'},
           {id:'count',label:'문제 수',choices:[['10','10'],['15','15'],['20','20']],def:'15'}],
  diffKey:o=>o.set==='pe'?'pe':o.set+(o.mlevel||'2'), ruleKey:o=>'t'+o.think, rule:()=>'생각 시간이 끝날 때 정답 칸에!',
  create(o){
    const think=+o.think, count=TEST?3:+o.count;
    let list;
    if (o.set==='pe') list=shuffle(PE_QUIZ).slice(0,count);
    else { list=[]; const seen=new Set(); for (let n=0;list.length<count && n<500;n++){ const q=QGEN[o.set](+o.mlevel||2); if (!seen.has(q[0])){ seen.add(q[0]); list.push(q); } } }
    const N=list.length;
    const st=api.stage(`<div class="qtext"></div>${hintMat('ans')}<div class="sub2"></div>`);
    const qtext=st.querySelector('.qtext'), hm=st.querySelector('.hmat'), qans=st.querySelector('.sub2');
    let qi=-1, phase='', p0=0, correct=0, opts=[], lastSec=-1;
    function load(i,T){
      qi=i; phase='think'; p0=T; lastSec=-1;
      const q=list[i]; opts=shuffle([{t:q[1],ok:true},...q.slice(2,5).map(t=>({t,ok:false}))]); while (opts.length<4) opts.push({t:'',ok:false});
      correct=opts.findIndex(x=>x.ok);
      qtext.textContent=q[0]; pop(qtext); qans.textContent='';
      hintShow(hm, opts.map((x,c)=>({c,label:x.t})));
      api.level(i+1); api.hud(`${i+1}번`,`/ ${N}`);
      api.ask({ kind:'one', t:[correct], until:T+think, judge:'end' });
    }
    return { update(T){
      if (!phase) load(0,0);
      const el=T-p0;
      if (phase==='think'){
        const s=Math.ceil(think-el); if (s!==lastSec){ lastSec=s; if (s>0&&s<=3) beep(990,60,'square',.1); }
        api.left(`${Math.max(0,s)}초`);
        if (el>=think){ phase='reveal'; p0+=think; hintShow(hm, opts.map((x,c)=>({c,label:x.t,style:c===correct?'':'off'}))); qans.textContent=`정답은 ${TILE[correct]} 칸!`; api.left(''); }
      } else if (phase==='reveal' && el>=2.8){
        if (qi+1>=N) return api.finish();
        load(qi+1,p0+2.8);
      }
    } };
  } };

// ----- 연상 점프 -----
const ITEMS=[
  ['🍌','바나나',0],['🐥','병아리',0],['🌻','해바라기',0],['🍋','레몬',0],['🌽','옥수수',0],['🧀','치즈',0],['⭐','별',0],
  ['🐸','개구리',1],['🥒','오이',1],['🍀','네잎클로버',1],['🥦','브로콜리',1],['🐢','거북이',1],['🌲','나무',1],['🦖','공룡',1],
  ['🐳','고래',2],['🌊','파도',2],['💧','물방울',2],['👖','청바지',2],['🐬','돌고래',2],['🦋','파란 나비',2],['🧢','파란 모자',2],
  ['🍎','사과',3],['🍓','딸기',3],['🍅','토마토',3],['🌶️','고추',3],['🚒','소방차',3],['🍒','체리',3],['❤️','하트',3],
];
const ITEMS2=[
  ['🍉','수박',[1,3]],['🌍','지구',[2,1]],['🌷','튤립',[3,1]],['🌹','장미',[3,1]],['🎄','크리스마스 트리',[1,3]],['🍍','파인애플',[0,1]],
  ['🏖️','바닷가',[2,0]],['🇰🇷','태극기',[3,2]],['🦜','앵무새',[3,1]],['🐠','열대어',[0,2]],['🌻','해바라기 꽃과 줄기',[0,1]],['🚦','신호등',[3,1]],
  ['🍋','레몬과 잎',[0,1]],['🐝','꿀벌',[0,3]],['🌈','무지개 끝',[3,2]],['🥝','키위',[1,3]],['🍑','복숭아',[0,3]],['🧜','인어',[2,1]],
];
GDEF.assoc = { name:'연상 점프', sub:'그림 보고 떠오르는 색',
  desc:'바나나를 보면 노랑, 개구리를 보면 초록처럼 떠오르는 색 칸을 밟아요. 8단계 × 30초(4분). <b>다음 그림 전에 그 칸에 있으면 정답</b>. 그림 2개나 두 색 물건은 두 발로 두 칸.',
  options:[{id:'diff',label:'난이도',choices:[['easy','쉬움 (칸 표시)'],['normal','보통'],['hard','어려움 (2개 동시)']],def:'easy'},
           {id:'speed',label:'속도',choices:[['1.25','천천히'],['1','보통'],['0.8','빠르게']],def:'1'},
           {id:'multi',label:'두 색 물건',choices:[['off','안 넣기'],['on','넣기']],def:'off'}],
  diffKey:o=>o.diff, ruleKey:o=>'m'+o.multi, speedOf:o=>+o.speed, rule:()=>'그림을 보고 떠오르는 색 칸으로',
  create(o){
    const GAPS=[3.6,3.2,2.9,2.6,2.3,2.0,1.8,1.6], NL=8, LS=TEST?6:30, BN=2.5, TOTAL=NL*LS, speed=+o.speed;
    const POOL=(o.multi==='on'?ITEMS.concat(ITEMS2):ITEMS).map(it=>({e:it[0],n:it[1],cs:(Array.isArray(it[2])?it[2]:[it[2]]).map(c=>CK[c])}));
    const easy=o.diff==='easy', two=o.diff==='hard';
    const st=api.stage(`<div class="pics"></div>${easy?hintMat():''}`), pics=st.querySelector('.pics'), hm=st.querySelector('.hmat');
    const S0={lvl:-1,nextAt:0}; let prevKey='', recent=[];
    S0.onLevel=li=>pics.style.setProperty('--s',(1-0.4*li/(NL-1)).toFixed(3));
    function pickItem(avoidC, single){
      for (let n=0;n<80;n++){ const it=POOL[rnd(POOL.length)]; if ((single&&it.cs.length>1)||it.cs.some(c=>avoidC.includes(c))||recent.includes(it.n)) continue; recent.push(it.n); if (recent.length>8) recent.shift(); return it; }
      return POOL.find(it=>!it.cs.some(c=>avoidC.includes(c))&&(!single||it.cs.length===1));
    }
    return { update(T){
      if (T>=TOTAL) return api.finish();
      const {li,ready}=leveled(T,S0,NL,LS,BN,i=>i===NL-1?'마지막 단계!':'조금 더 빨라져요');
      if (ready){
        let its;
        for (let n=0;n<30;n++){ const a=pickItem([]); its=(two&&a.cs.length===1)?[a,pickItem(a.cs,true)]:[a]; const key=its.map(i=>i.cs.join('+')).sort().join(); if (key!==prevKey||n>20){ prevKey=key; break; } recent.pop(); }
        pics.innerHTML=its.map(it=>`<div class="pic"><div class="e" style="font-size:calc(min(${its.length>1?20:26}vw,${its.length>1?110:140}px) * var(--s,1))">${it.e}</div><div class="n">${esc(it.n)}${it.cs.length>1?' <small>두 발!</small>':''}</div></div>`).join('');
        const tiles=its.flatMap(it=>it.cs);
        if (easy) hintShow(hm, tiles.map(c=>({c,label:'여기!'})));
        pop(pics);
        S0.nextAt+=GAPS[li]*speed*(two?1.25:1);
        api.ask({ kind:tiles.length>1?'pair':'one', t:tiles, until:S0.nextAt });
      }
      api.left(fmt(TOTAL-T));
    } };
  } };

// ----- 손발 트위스터 -----
const LIMBS=['왼발','오른발','왼손','오른손'];
GDEF.twist = { name:'손발 트위스터', sub:'손발을 칸에 놓고 버티기',
  desc:'"왼손 → 빨강"처럼 손과 발을 놓을 칸이 하나씩 나와요. 이미 놓은 손발은 그대로 두고 버텨요. <b>버티는 시간 안에 그 손(발)이 그 칸에 잠깐(1초 남짓) 머물면 정답</b>. 손은 매트 바닥을 짚어야 잘 잡혀요.',
  options:[{id:'diff',label:'난이도',choices:[['easy','쉬움 (두 발만)'],['normal','보통 (두 손 두 발)'],['hard','어려움 (옮기기 추가)']],def:'normal'},
           {id:'rounds',label:'라운드',choices:[['4','4'],['6','6'],['8','8']],def:'6'}],
  diffKey:o=>o.diff, ruleKey:o=>'r'+o.rounds, rule:()=>'손발을 칸에 놓고 버티기',
  create(o){
    const D={easy:{limbs:[0,1],hold:6,extra:0},normal:{limbs:[0,1,2,3],hold:5,extra:0},hard:{limbs:[0,1,2,3],hold:4,extra:2}}[o.diff];
    const R=TEST?1:+o.rounds, REST=4, INTRO=2, NEED=Math.min(1.2,D.hold*0.3);
    const st=api.stage(`<div class="big2"></div><div class="sub2"></div>${hintMat()}`);
    const limbEl=st.querySelector('.big2'), toEl=st.querySelector('.sub2'), hm=st.querySelector('.hmat');
    let r=0, plan=[], k=-1, phase='', p0=0, placed={}, on=0, lastT=0, scored=false;
    function makePlan(){ const cols=shuffle([0,1,2,3]), p=[], cur={};
      D.limbs.forEach((l,i)=>{ p.push({l,c:cols[i]}); cur[l]=cols[i]; });
      for (let n=0;n<D.extra;n++){ const l=D.limbs[rnd(D.limbs.length)]; let c; do{ c=rnd(4); }while(c===cur[l]); cur[l]=c; p.push({l,c,move:true}); }
      return p; }
    function startRound(T){ plan=makePlan(); k=-1; placed={}; phase='intro'; p0=T;
      api.banner(`${r+1}라운드`, o.diff==='easy'?'두 발을 준비해요':'두 손 두 발을 준비해요'); api.level(r+1); api.hud(`${r+1}라운드`,`/ ${R}`);
      limbEl.textContent=''; toEl.textContent=''; hintShow(hm,null); }
    function step(T){
      k++; phase='hold'; p0=T; on=0; scored=false; const s=plan[k]; placed[s.l]=s.c;
      limbEl.textContent=(s.move?'옮겨요! ':'')+LIMBS[s.l];
      toEl.innerHTML=`→ <b style="color:${INK[s.c]};font-size:1.6em">${TILE[s.c]}</b>`;
      hintShow(hm, Object.entries(placed).map(([l,c])=>({c,label:LIMBS[l],style:+l===s.l?'':'now'})));
      pop(limbEl); beep([523,659,784,1046][s.c],140,'triangle',.14);
    }
    return { update(T){
      if (!phase) startRound(0);
      const el=T-p0, dt=Math.min(.25,T-lastT); lastT=T;
      if (phase==='intro'){ if (el>=INTRO){ api.hideBanner(); step(p0+INTRO); } }
      else if (phase==='hold'){
        const s=plan[k];
        if (limbTile(s.l)===s.c) on+=dt;
        if (!scored && on>=NEED){ scored=true; score(true); }
        const left=D.hold-el; api.left(`버텨요 ${Math.max(0,Math.ceil(left))}`); api.bar(left/D.hold);
        if (left<=0){ if (!scored) score(false);
          if (k+1<plan.length) step(p0+D.hold); else { phase='rest'; p0+=D.hold; limbEl.textContent='풀고 쉬어요'; toEl.textContent=''; hintShow(hm,null); api.left(''); api.bar(0); beep(1046,200,'triangle'); } }
      } else if (phase==='rest' && el>=REST){ r++; if (r>=R) return api.finish(); startRound(p0+REST); }
    } };
  } };

// ----- 얼음 스텝 -----
const POSES=['한 발로 서기','두 팔 옆으로 쭉','쪼그려 앉기','양손 머리 위로','비행기 자세','까치발 들기','한 손으로 무릎 잡기','동상처럼 멋진 자세'];
GDEF.freeze = { name:'얼음 스텝', sub:'소리가 멈추면 색 칸으로',
  desc:'박자 소리가 나오는 동안 <b>매트 밖에서</b> 춤추다가, 호루라기가 울리면 나온 색 칸으로 뛰어가 "얼음!" 해요. <b>얼음이 끝나기 전에 그 칸에 서 있으면 정답</b>. 어려움은 두 색 = 두 발.',
  options:[{id:'diff',label:'난이도',choices:[['easy','쉬움 (칸 표시 · 4초)'],['normal','보통 (자세 미션 · 3초)'],['hard','어려움 (두 발 · 2.5초)']],def:'normal'},
           {id:'rounds',label:'라운드',choices:[['6','6'],['10','10'],['14','14']],def:'10'}],
  diffKey:o=>o.diff, ruleKey:o=>'r'+o.rounds, rule:()=>'소리가 멈추면 색 칸으로!',
  create(o){
    const D={easy:{dance:[6,10],go:4,hold:4,pose:false,two:false,hint:true},normal:{dance:[4,9],go:3,hold:4,pose:true,two:false,hint:false},hard:{dance:[3,7],go:2.5,hold:5,pose:true,two:true,hint:false}}[o.diff];
    const R=TEST?2:+o.rounds, MELT=1.4;
    const st=api.stage(`<div class="big2"></div><div class="sub2"></div>${D.hint?hintMat():''}`);
    const big=st.querySelector('.big2'), sub=st.querySelector('.sub2'), hm=st.querySelector('.hmat');
    let r=0, phase='', p0=0, danceLen=0, targets=[], lastBeat=-1, prevKey='';
    const bpm=()=>112+Math.min(r,9)*3;
    function dance(T){ phase='dance'; p0=T; danceLen=TEST?2:D.dance[0]+R()*(D.dance[1]-D.dance[0]); lastBeat=-1;
      big.style.fontSize=''; big.textContent='춤춰요!'; sub.textContent='매트 밖에서 신나게! 소리가 멈추면…'; if (hm) hm.style.visibility='hidden';
      api.level(r+1); api.hud(`${r+1}라운드`,`/ ${R}`); api.left(''); api.bar(0); }
    function go(T){ phase='go'; p0=T; beep(2200,180,'square',.12); setTimeout(()=>beep(2200,380,'square',.12),220);
      let t; for (let n=0;n<20;n++){ const a=rnd(4); t=D.two?[a,(a+1+rnd(3))%4]:[a]; const key=t.slice().sort().join(); if (key!==prevKey){ prevKey=key; break; } }
      targets=t; big.style.color=''; big.style.fontSize=t.length>1?'min(12vw,70px)':'';
      big.innerHTML=t.map(c=>`<span style="color:${INK[c]}">${TILE[c]}</span>`).join(' + ');
      sub.textContent=D.two?'두 발로 두 칸에!':'이 색 칸으로 뛰어가요!';
      if (hm){ hm.style.visibility='visible'; hintShow(hm,t.map(c=>({c,label:'여기!'}))); }
      pop(big); api.ask({ kind:t.length>1?'pair':'one', t, until:T+D.go+D.hold });
    }
    return { update(T){
      if (!phase) dance(0);
      const el=T-p0;
      if (phase==='dance'){
        const beat=Math.floor(el*bpm()/60);
        if (beat!==lastBeat){ lastBeat=beat; big.style.color=TILE_COLOR[beat%4]; beep(beat%4?520:700,60,'triangle',.08); }
        if (el>=danceLen) go(p0+danceLen);
      } else if (phase==='go'){
        if (el>=D.go){ phase='freeze'; p0+=D.go; big.innerHTML='얼음!'; big.style.fontSize=''; sub.textContent=D.pose&&r>=1?POSES[rnd(POSES.length)]:'움직이지 마요!'; beep(1400,400,'triangle'); }
      } else if (phase==='freeze'){
        if (el>=D.hold){ phase='melt'; p0+=D.hold; big.textContent='땡!'; sub.textContent=r+1<R?'다시 춤출 준비!':'마지막 라운드 끝!'; if (hm) hm.style.visibility='hidden'; }
      } else if (phase==='melt' && el>=MELT){ r++; if (r>=R) return api.finish(); dance(p0+MELT); }
    } };
  } };

// ----- 용암 매트 -----
GDEF.lava = { name:'용암 매트', sub:'용암 칸 피해서 콩콩',
  desc:'용암으로 변한 칸은 밟으면 안 돼요! 안전한 칸에서 계속 콩콩 뛰다가 용암이 바뀌면 재빨리 옮겨요. 8단계 × 30초(4분). <b>용암이 바뀌고 1초가 지나도 용암 칸을 밟고 있으면 오답</b>, 다음에 바뀔 때까지 안전한 칸에서 버티면 정답.',
  options:[{id:'diff',label:'빠르기',choices:[['easy','천천히'],['normal','보통'],['hard','빠르게']],def:'normal'}],
  diffKey:o=>o.diff, rule:()=>'안전한 칸에서 계속 콩콩!',
  create(o){
    const GAPS={easy:[5,4.6,4.2,4.4,4,3.6,3.4,3],normal:[4,3.6,3.2,3.4,3,2.6,2.5,2.2],hard:[3.2,2.8,2.5,2.7,2.3,2,1.8,1.6]}[o.diff];
    const STAGE=[{n:1,map:1,ink:1},{n:1,map:1,ink:1},{n:2,map:1,ink:1},{n:2,map:1,ink:1},{n:0,map:0,ink:1},{n:0,map:0,ink:1},{n:2,map:0,ink:0},{n:2,map:0,ink:0}];
    const NL=8, LS=TEST?6:30, BN=2.5, TOTAL=NL*LS, WARN=0.7;
    const st=api.stage(`<div class="big2" style="font-size:min(11vw,60px)"></div>${hintMat('lava')}<div class="sub2"></div>`);
    const title=st.querySelector('.big2'), hm=st.querySelector('.hmat'), note=st.querySelector('.sub2');
    const S0={lvl:-1,nextAt:0}; let lava=[], warned=false, iv=null, gap=3;
    function draw(){
      const sg=STAGE[S0.lvl];
      [...hm.children].forEach((cell,c)=>{ const hot=lava.includes(c); cell.className='h'+c+' on'+(hot?' hot':''); cell.querySelector('b').textContent=hot?'용암':'안전'; });
      hm.style.display=sg.map?'':'none';
      title.innerHTML='용암: '+lava.map(c=>`<span style="color:${sg.ink?INK[c]:'var(--ink)'}">${TILE[c]}</span>`).join(' · ');
      note.textContent=!sg.map?'매트 그림이 없어요! 글자를 보고 피해요':lava.length===2?'안전한 두 칸 사이를 오가며 콩콩!':'용암만 피해서 콩콩!';
    }
    function endIv(){ if (iv && !iv.failed && iv.lava.length) score(iv.safe); iv=null; }
    function change(T){
      endIv();
      const n=STAGE[S0.lvl].n||(1+rnd(2)); let next;
      for (let k=0;k<40;k++){ next=shuffle([0,1,2,3]).slice(0,n).sort(); if (next.join()!==lava.join()) break; }
      lava=next; draw(); pop(hm); warned=false; [...hm.children].forEach(c=>c.classList.remove('warn'));
      beep(90,300,'sawtooth',.12);
      iv={ from:T, lava:lava.slice(), failed:false, safe:false, grace:Math.min(1.0,gap*0.45) };
    }
    S0.onLevel=li=>{ if (li>0){ const a=STAGE[li-1], b=STAGE[li]; api.banner(`${li+1}단계`, a.map&&!b.map?'이제 매트 그림 없이 글자만 나와요!':a.ink&&!b.ink?'글자 색도 사라져요!':(b.n===2&&a.n===1)?'용암이 2칸으로 늘어나요!':'용암이 더 빨리 바뀌어요'); } };
    return { update(T){
      if (T>=TOTAL){ endIv(); return api.finish(); }
      const {li,ready}=leveled(T,S0,NL,LS,BN,()=>'');
          if (!warned && lava.length && T>=S0.nextAt-WARN && T-li*LS>=BN){ warned=true; [...hm.children].forEach((c,i)=>{ if (lava.includes(i)) c.classList.add('warn'); }); beep(620,120,'square',.1); }
      if (ready){ const at=S0.nextAt; gap=GAPS[li]; S0.nextAt=at+gap; change(at); }
      // 판정: 바뀐 뒤 잠깐(grace)이 지나면 디딘 발이 용암 칸에 있는지 봄
      if (iv && !iv.failed && T-iv.from>=iv.grace){
        const pl=raw().filter(x=>typeof x==='number');
        if (pl.some(x=>iv.lava.includes(x))){ iv.failed=true; score(false); }
        else if (pl.length) iv.safe=true;
      }
      if (lava.length) api.bar((S0.nextAt-T)/gap);
      api.left(fmt(TOTAL-T));
    } };
  } };

  return GDEF;
}
export const GAME_ORDER = ['basic','stroop','memory','dir','quiz','assoc','twist','freeze','lava'];
