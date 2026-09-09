/* vis4.js — a contact sheet of a give-and-go being played back.

   The assertions in t25 can say the ball ends up within 3 units of the runner,
   but they cannot say whether the picture reads as a one-two to a coach. This
   walks one drill — A passes to B, B plays it back, A runs onto the return —
   and photographs it at six points, so the ball can be seen leaving A, arriving
   at B, coming back, and meeting A somewhere neither of them started.

   Panels are lifted straight out of the live pitch, so a still that shows the
   ball frozen at A's old mark would mean the re-aiming never happened. */
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');

let rafQ=[],rafId=1,now=0,errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://e.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  w.performance.now=()=>now;
  w.requestAnimationFrame=cb=>{rafQ.push([rafId,cb]);return rafId++;};
  w.cancelAnimationFrame=id=>{rafQ=rafQ.filter(e=>e[0]!==id);};
}});
dom.virtualConsole.on('jsdomError',e=>errs.push(e.message));
const w=dom.window,d=w.document,$=i=>d.getElementById(i);
function step(ms,frames=1){
  for(let i=0;i<frames;i++){ now+=ms/frames; const q=rafQ; rafQ=[]; q.forEach(([,cb])=>cb(now)); }
}
const svg=()=>d.querySelector('.field-wrap.on svg');
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
const pe=(el,t,x,y,ex={})=>el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1,...ex}));
const click=(el,x,y,ex={})=>{pe(el,'pointerdown',x,y,ex);pe(el,'pointerup',x,y,ex);};
const arm=k=>{const b=d.querySelector(`.kit[data-kit="${k}"]`);if(!b.classList.contains('on'))b.click();};
// re-look-up every time: adding a stop re-renders and detaches the old nodes
const A=()=>items()[0], B=()=>items()[1];
const ball=()=>[...d.querySelectorAll('.field-wrap.on .play-layer circle')]
                 .find(c=>c.getAttribute('r')==='1.15');
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const uniq=(h,n)=>h.replace(/id="([\w-]+)"/g,`id="$1_p${n}"`).replace(/url\(#([\w-]+)\)/g,`url(#$1_p${n})`);

// a yard, and the corner the drill is built from — client px are pitch units here
const YD=3, O=[70,60];
const P=(a,b)=>[O[0]+a*YD, O[1]+b*YD];

setTimeout(()=>{
  $('modeSelect').click(); $('clearBtn').click();

  // A at the bottom, B twenty yards up the pitch
  arm('playerBlue'); click(svg(),...P(0,20));
  arm('playerBlue'); click(svg(),...P(0,0));

  // the one-two: A to B, B back to A
  $('modeBall').click();
  click(A(),...P(0,20));
  click(B(),...P(0,0));
  click(A(),...P(0,20));

  // A runs on past B rather than standing still for the return
  $('modeRun').click();
  click(A(),...P(0,20));
  click(svg(),...P(9,-6));
  $('modeSelect').click();

  const shots=[];
  const snap=cap=>{
    const s=svg().cloneNode(true);
    const b=ball();
    shots.push({ cap, vb:s.getAttribute('viewBox'), html:s.innerHTML,
                 ball: b ? {x:+b.getAttribute('cx'), y:+b.getAttribute('cy')} : null,
                 a:{...pos(A())}, b2:{...pos(B())} });
  };
  const pos=g=>{const m=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
                return {x:+m[1], y:+m[2]};};

  snap('before kick-off — three stops, A twice');
  $('playBtn').click(); step(0);
  snap('0.0s — the ball is on A');
  for (const [ms,cap] of [[600,'0.6s — played up to B'],
                          [1200,'1.2s — B has it, A is away'],
                          [1900,'1.9s — the return, chasing A'],
                          [3500,'3.5s — it meets A where A got to']]){
    step(ms-now, Math.max(1,Math.round((ms-now)/20)));
    snap(cap);
  }

  /* Crop to what actually happened, with a margin, so the panels are not mostly
     empty grass — the same problem the printed plan had. */
  const xs=[], ys=[];
  shots.forEach(s=>{ [s.a,s.b2,s.ball].forEach(p=>{ if(p){xs.push(p.x); ys.push(p.y);} }); });
  // the run's own waypoint too, or its arrow head walks out of frame
  xs.push(P(9,-6)[0]); ys.push(P(9,-6)[1]);
  const M=4*YD, AR=0.68;                      // portrait panels: the move is a long thin one
  const mx=(Math.min(...xs)+Math.max(...xs))/2, my=(Math.min(...ys)+Math.max(...ys))/2;
  let cw=Math.max(...xs)-Math.min(...xs)+M*2, ch=Math.max(...ys)-Math.min(...ys)+M*2;
  if (cw/ch > AR) ch = cw/AR; else cw = ch*AR;
  const x0=mx-cw/2, y0=my-ch/2;

  const PW=250, PS=Math.round(PW/AR), PAD=20, GAP=14, COLS=3, CAP=26;
  const rows=Math.ceil(shots.length/COLS);
  const W=PAD*2+COLS*PW+(COLS-1)*GAP, H=PAD+34+rows*(PS+CAP+GAP);
  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>.stop-hit{fill:transparent}</style>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${PAD}" y="${PAD+16}" font-family="sans-serif" font-size="17" font-weight="700" fill="#111">Give-and-go — A passes to B, B plays it back, A runs onto it</text>`;

  shots.forEach((s,i)=>{
    const cx=PAD+(i%COLS)*(PW+GAP), cy=PAD+34+Math.floor(i/COLS)*(PS+CAP+GAP);
    const sc=PW/cw;
    out+=`<g transform="translate(${cx} ${cy})">
      <g clip-path="url(#p${i})"><g transform="scale(${sc.toFixed(5)}) translate(${(-x0).toFixed(2)} ${(-y0).toFixed(2)})">${uniq(s.html,i)}</g></g>
      <rect width="${PW}" height="${PS}" fill="none" stroke="#bbb"/>
    </g>
    <defs><clipPath id="p${i}"><rect width="${PW}" height="${PS}"/></clipPath></defs>
    <text x="${cx}" y="${cy+PS+16}" font-family="sans-serif" font-size="12" fill="#333">${esc(s.cap)}</text>`;
  });
  out+='</svg>';
  fs.writeFileSync('/sessions/gracious-epic-cerf/mnt/outputs/one-two.svg',out);

  const last=shots[shots.length-1], first=shots[1];
  console.log('wrote one-two.svg —',shots.length,'panels');
  console.log('A started at', JSON.stringify(first.a), 'and finished at', JSON.stringify(last.a));
  console.log('the ball finished at', JSON.stringify(last.ball));
  console.log('ball-to-A at the end:',
    last.ball ? Math.hypot(last.ball.x-last.a.x, last.ball.y-last.a.y).toFixed(2) : 'no ball');
  console.log('ball-to-A\'s-start:',
    last.ball ? Math.hypot(last.ball.x-first.a.x, last.ball.y-first.a.y).toFixed(2) : '-');
  console.log('errors:', errs.length?errs:'none');
},400);
