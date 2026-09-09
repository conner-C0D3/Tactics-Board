/* vis.js — contact sheet of the real markup the app draws.
   Nothing here is re-implemented: each panel is the actual item / path / play
   layer lifted out of a live instance after a pass has been played, so what the
   picture shows is what a coach would see rather than an artist's impression. */
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');
let rafQ=[],rafId=1,now=0;
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://e.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  w.performance.now=()=>now;
  w.requestAnimationFrame=cb=>{rafQ.push([rafId,cb]);return rafId++;};
  w.cancelAnimationFrame=id=>{rafQ=rafQ.filter(e=>e[0]!==id);};
}});
const w=dom.window,d=w.document;
const step=(ms,n=1)=>{for(let i=0;i<n;i++){now+=ms/n;const q=rafQ;rafQ=[];q.forEach(([,cb])=>cb(now));}};
const pe=(el,t,x,y,ex={})=>el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1,...ex}));
const rclick=(el,x,y)=>el.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:x,clientY:y,button:2}));
const svg=()=>d.querySelector('.field-wrap.on svg');
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
const arm=k=>{const b=d.querySelector(`.kit[data-kit="${k}"]`);if(!b.classList.contains('on'))b.click();};
const tf=g=>{const m=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);return{x:+m[1],y:+m[2]};};
const layer=c=>{const l=d.querySelector('.field-wrap.on .'+c);return l?l.innerHTML:'';};

/* One panel: a pass from the left into a receiver turned `turns` quarter-turns,
   with the stop shifted `cycles` steps round the foot cycle, played to the end. */
function panel(turns, cycles, label){
  d.getElementById('modeSelect').click();
  d.getElementById('clearBtn').click();
  arm('playerBlue');
  pe(svg(),'pointerdown',60,120); pe(svg(),'pointerup',60,120);
  pe(svg(),'pointerdown',170,120); pe(svg(),'pointerup',170,120);
  const rcv=items()[1], c=tf(rcv);
  for (let i=0;i<turns;i++) rclick(items()[1], c.x, c.y);
  d.getElementById('modeBall').click();
  pe(items()[0],'pointerdown',60,120);  pe(items()[0],'pointerup',60,120);
  pe(items()[1],'pointerdown',170,120); pe(items()[1],'pointerup',170,120);
  /* Re-query the badge every time: cycling the foot re-renders the whole layer,
     so a reference held from before the click is detached and the next click
     goes nowhere — which silently produced four identical panels. */
  for (let i=0;i<cycles;i++){
    const b=d.querySelector('.field-wrap.on [data-stop="1"]');
    pe(b,'pointerdown',0,0,{shiftKey:true}); pe(b,'pointerup',0,0,{shiftKey:true});
  }
  d.getElementById('simSpeed').value='28';
  d.getElementById('playBtn').click();
  step(0); step(4000,120);
  const p=tf(items()[1]);
  return { label, cx:p.x, cy:p.y,
           html: layer('item-layer')+layer('path-layer')+layer('play-layer') };
}

setTimeout(()=>{
  const P=[];
  /* Top row: the same pass into a receiver turned a quarter turn at a time. The
     ball should follow the foot round, not stay put. */
  ['facing up (0°)','facing right (90°)','facing down (180°)','facing left (270°)']
    .forEach((l,i)=>P.push(panel(i,0,l)));
  /* Bottom row: the foot cycle on one stop. The pass comes in from the left into
     a player facing up, so the auto-pick is their left foot. */
  P.push(panel(0,0,'auto-picked: the near foot'));
  P.push(panel(0,1,'shift-click → the other foot'));
  P.push(panel(0,2,'again → either foot (centre)'));
  P.push(panel(0,3,'and again → back to the near foot'));

  /* The arrowheads on the path are markers defined in the app's own <defs>. Copy
     that block across or the composed sheet renders paths with no arrows — and,
     in a strict renderer, fails outright on the dangling marker reference. */
  const defs=[...svg().querySelectorAll('defs')].map(n=>n.outerHTML).join('');
  const HALFW=9;                       // half the window, in SVG units (3 = 1 yard)
  const PW=250, PH=250, IW=232, IH=196, PAD=16, cols=4;
  const rows=Math.ceil(P.length/cols), s=IW/(HALFW*2);
  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${cols*PW+PAD*2}" height="${rows*PH+PAD*2+34}" viewBox="0 0 ${cols*PW+PAD*2} ${rows*PH+PAD*2+34}">
  ${defs}
  <!-- .stop-hit is an invisible click target that the app makes transparent from
       its stylesheet. This sheet carries only the markup, so without the rule it
       would paint as a solid black disc over every stop. -->
  <style>.stop-hit{fill:transparent}</style>
  <defs>${P.map((p,i)=>`<clipPath id="cp${i}"><rect x="0" y="0" width="${IW}" height="${IH}"/></clipPath>`).join('')}</defs>
  <rect width="100%" height="100%" fill="#0f1c14"/>
  <text x="${PAD}" y="26" fill="#cfe8d6" font-family="sans-serif" font-size="17" font-weight="700">Player facing and footedness — real app markup, after the ball has arrived</text>`;
  P.forEach((p,i)=>{
    const gx=PAD+(i%cols)*PW, gy=PAD+34+Math.floor(i/cols)*PH;
    /* A clipped, scaled <g> rather than a nested <svg>: same picture, but it
       centres the receiver reliably in every renderer instead of relying on
       nested-viewBox handling. */
    out+=`<g transform="translate(${gx} ${gy})">
      <rect width="${PW-10}" height="${PH-10}" rx="8" fill="#16351f" stroke="#2f5c3c"/>
      <g transform="translate(9 9)" clip-path="url(#cp${i})">
        <rect width="${IW}" height="${IH}" fill="#2f7a44"/>
        <g transform="translate(${IW/2} ${IH/2}) scale(${s.toFixed(4)}) translate(${-p.cx} ${-p.cy})">${p.html}</g>
      </g>
      <text x="${(PW-10)/2}" y="${PH-20}" text-anchor="middle" fill="#cfe8d6"
            font-family="sans-serif" font-size="14">${p.label}</text>
    </g>`;
  });
  out+='</svg>';
  fs.writeFileSync('/sessions/gracious-epic-cerf/mnt/outputs/facing-check.svg', out);
  console.log('wrote facing-check.svg —', P.length, 'panels');
},400);
