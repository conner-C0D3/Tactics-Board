/* vis2.js — contact sheet of a stamped formation defending a moving ball.

   As with vis.js, nothing is redrawn: each panel is the whole <svg> of a live
   instance — grass, markings, unit hulls, players, ball path — lifted out
   mid-playback. If the block is stretching, drifting off its line, or reacting
   on the wrong axis, it shows up here as a picture rather than as a number.

   Ids inside a panel are suffixed per panel. The app names its gradient, grid
   and arrowhead ids after the pitch, so eight copies of the same pitch on one
   sheet would otherwise be eight copies of the same id, and a strict renderer
   resolves every reference to whichever came first. */
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
const step=(ms,n=1)=>{for(let i=0;i<n;i++){now+=ms/n;const q=rafQ;rafQ=[];q.forEach(([,cb])=>cb(now));}};
const svg=()=>d.querySelector('.field-wrap.on svg');
const pe=(el,t,x,y)=>el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1}));
const click=(el,x,y)=>{pe(el,'pointerdown',x,y);pe(el,'pointerup',x,y);};
const fire=(id,v,ev)=>{$(id).value=String(v);$(id).dispatchEvent(new w.Event(ev||'change',{bubbles:true}));};
const pickUnit=re=>{const o=[...$('unitPick').options].find(o=>re.test(o.textContent));
                    if(o){fire('unitPick',o.value);return true;} return false;};

/* The ball's tour: out to one flank in the attacking half, switched across and
   driven back at the defence. A ball that only ever went one way would let a
   block that reacted on a single axis pass for a working one. Every point is
   well inside the touchlines — a stop off the grass draws a ball path leaving
   the picture, which reads as a bug in the block rather than in the fixture. */
const BALL=[[210,45],[125,200],[80,120]];

function setup(plan){
  $('modeSelect').click(); $('clearBtn').click();
  fire('formPick','f442'); fire('formSide','playerBlue'); fire('formEnd',0);
  $('stampForm').click();
  for (const [re,pol,amt,lag] of plan){
    if (!pickUnit(re)) continue;
    fire('unitPolicy',pol); fire('unitAmt',amt,'input'); fire('unitLag',lag);
  }
  // deselect, so no unit is drawn in its highlighted state and the panels match
  $('modeBall').click();
  BALL.forEach(([x,y])=>click(svg(),x,y));
  $('modeSelect').click();
}

/* Play once and photograph the pitch at each of `times` seconds. One playthrough
   for all frames: restarting per frame would work too, but a single run is the
   thing the coach actually presses play on.

   A time of -1 means "before play started". That frame earns its place: at t=0
   the block is already sitting where the ball's opening position demands, so
   without a rest frame to compare against there is nothing in the sheet that
   shows how far the shape has actually travelled. */
function frames(plan, times){
  setup(plan);
  const rest=svg().innerHTML;
  $('playBtn').click(); step(0);
  const out=[]; let t=0;
  for (const tt of times){
    if (tt<0){ out.push(rest); continue; }
    const dt=tt*1000-t;
    if (dt>0){ step(dt, Math.max(1,Math.round(dt/25))); t+=dt; }
    out.push(svg().innerHTML);
  }
  $('modeSelect').click();
  return out;
}

const uniq=(html,n)=>html.replace(/id="([\w-]+)"/g,`id="$1_p${n}"`)
                         .replace(/url\(#([\w-]+)\)/g,`url(#$1_p${n})`);

setTimeout(()=>{
  const P=[];
  const BLOCK=[[/Back four/,'block',0.6,0.35],[/Midfield four/,'block',0.5,0.5],
               [/Front two/,'slide',0.3,0.7],[/Keeper/,'slide',0.25,0.1]];

  const T=[-1,0,1.6,3.2];
  const TL=['at rest, before kick-off','0.0s — the ball is already out wide','1.6s','3.2s'];
  frames(BLOCK,T).forEach((h,i)=>P.push({label:`4-4-2 holding a block — ${TL[i]}`,html:h}));

  /* The same instant under each policy, so the four are read side by side. Every
     unit gets the policy under test, which is not how a side plays but is how a
     policy is best seen.

     The instant is the opening one, with the ball high and on the far touchline.
     A later frame looked fairer but was worthless: by 3.2s the ball has arrived
     more or less on top of the block, and a ball with no offset gives slide and
     drop nothing to react to — all four panels came out looking like hold. */
  const one=pol=>frames([[/Back four/,pol,0.7,0],[/Midfield four/,pol,0.7,0],
                         [/Front two/,pol,0.7,0],[/Keeper/,'hold',0,0]],[0])[0];
  [['hold','Hold shape — the marks, untouched'],
   ['slide','Slide across — width only'],
   ['drop','Drop and push — depth only, damped'],
   ['press','Press the ball — all of it, and it squeezes']]
    .forEach(([p,l])=>P.push({label:l,html:one(p)}));

  const [fx,fy,fw,fh]=svg().getAttribute('viewBox').split(/\s+/).map(Number);
  /* Crop to the defending 62% of the pitch. A whole pitch fits the panel, but a
     player is a 1.2-unit disc and a hull is a 0.34-wide dashed line: at full
     width the block is a scatter of dots and the shape being tested is invisible.
     Cropping is honest — it is the same markup, just closer. */
  const vx=fx, vy=fy, vw=fw*0.62, vh=fh;
  const cols=4, IW=420, IH=Math.round(IW*vh/vw), PAD=18, LAB=26, GAP=14;
  const PW=IW+GAP, PH=IH+LAB+GAP, rows=Math.ceil(P.length/cols);
  const W=cols*PW+PAD*2-GAP, H=rows*PH+PAD*2+40-GAP+24, s=IW/vw;

  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>.stop-hit{fill:transparent}</style>
  <defs>${P.map((p,i)=>`<clipPath id="cl${i}"><rect width="${IW}" height="${IH}"/></clipPath>`).join('')}</defs>
  <rect width="100%" height="100%" fill="#0f1c14"/>
  <text x="${PAD}" y="27" fill="#cfe8d6" font-family="sans-serif" font-size="17" font-weight="700">Formation units defending a moving ball — real app markup, mid-playback</text>
  <text x="${PAD}" y="${H-10}" fill="#7f9d88" font-family="sans-serif" font-size="12">Bottom row: every unit on the same policy, with the ball high and wide — the opening position.</text>`;
  P.forEach((p,i)=>{
    const gx=PAD+(i%cols)*PW, gy=PAD+40+Math.floor(i/cols)*PH;
    out+=`<g transform="translate(${gx} ${gy})">
      <g clip-path="url(#cl${i})">
        <g transform="scale(${s.toFixed(5)}) translate(${-vx} ${-vy})">${uniq(p.html,i)}</g>
      </g>
      <rect width="${IW}" height="${IH}" fill="none" stroke="#2f5c3c"/>
      <text x="${IW/2}" y="${IH+18}" text-anchor="middle" fill="#cfe8d6"
            font-family="sans-serif" font-size="14">${p.label}</text>
    </g>`;
  });
  out+='</svg>';
  fs.writeFileSync('/sessions/gracious-epic-cerf/mnt/outputs/shape-check.svg',out);
  console.log('wrote shape-check.svg —',P.length,'panels; errors:',errs.length?errs:'none');
},400);
