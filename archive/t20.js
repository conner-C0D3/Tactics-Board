/* t20 — players face a direction, and the ball is played to a named foot.
   The point of the feature is that a drill can say "played out to the left foot"
   and the picture shows it, so most of this is about whether the foot the ball
   goes to is really the foot on the correct side of a player facing that way. */
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');
const errs=[];
/* Deterministic clock + fake rAF. Playback is the whole point of the foot feature,
   so the test has to be able to say "the ball has now travelled exactly this far"
   rather than sleeping and hoping. Real timers make the sim assertions depend on
   how loaded the machine is, which is how they failed before. */
let rafQ=[], rafId=1, now=0;
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://e.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  w.performance.now=()=>now;
  w.requestAnimationFrame=cb=>{rafQ.push([rafId,cb]);return rafId++;};
  w.cancelAnimationFrame=id=>{rafQ=rafQ.filter(e=>e[0]!==id);};
  w.onerror=m=>errs.push(String(m));
}});
const w=dom.window,d=w.document;
function step(ms,frames=1){
  for(let i=0;i<frames;i++){
    now+=ms/frames;
    const q=rafQ; rafQ=[];
    q.forEach(([,cb])=>cb(now));
  }
}
const R=[];let pass=0,fail=0;
const ok=(n,c,x='')=>{c?pass++:fail++;R.push((c?'  ok  ':'  FAIL')+' '+n+(x?'   ['+x+']':''));};
const pe=(el,t,x,y,ex={})=>el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1,...ex}));
/* Right-clicking an item in select mode turns it a quarter turn — that is the
   app's own gesture, so the test turns players the way a coach would. */
const rclick=(el,x,y)=>el.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:x,clientY:y,button:2}));
const svg=()=>d.querySelector('.field-wrap.on svg');
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
const arm=k=>{const b=d.querySelector(`.kit[data-kit="${k}"]`);if(!b.classList.contains('on'))b.click();};
const tf=g=>{const m=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/);
  return{x:+m[1],y:+m[2],r:+m[3]};};

/* The badge for stop i is drawn at the resolved stop point offset by a constant,
   so reading badges back is the only way from the DOM to see exactly where the
   ball path decided a stop lives — centre of the player, or one of their feet. */
const STOP_OFF=2.4;
const stops=()=>[...d.querySelectorAll('.field-wrap.on [data-stop] circle')]
  .filter(c=>c.getAttribute('r')==='1.6')
  .map(c=>({x:+c.getAttribute('cx')+STOP_OFF, y:+c.getAttribute('cy')+STOP_OFF}));
const badge=i=>d.querySelector(`.field-wrap.on [data-stop="${i}"]`);
const near=(a,b,e=1e-6)=>Math.abs(a-b)<e;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// the play layer holds the foot highlight as well as the ball, so pick the ball out
const playCircles=()=>[...d.querySelectorAll('.field-wrap.on .play-layer circle')];
const ballC=()=>playCircles().find(c=>c.getAttribute('r')==='1.15');
const litC=()=>playCircles().filter(c=>c.getAttribute('fill')==='#fbbf24'||c.getAttribute('stroke')==='#fbbf24');

setTimeout(()=>{
 // ---------- the marker itself is directional ----------
 arm('playerBlue'); pe(svg(),'pointerdown',60,80); pe(svg(),'pointerup',60,80);
 const g0=items()[0];
 ok('a player is drawn as a shaped body, not a bare circle', !!g0.querySelector('path'));
 const studs=[...g0.querySelectorAll('circle[fill-opacity]')];
 ok('with two foot studs on it', studs.length===2, studs.length);
 ok('the studs sit either side of straight ahead, level with each other',
    near(+studs[0].getAttribute('cy'), +studs[1].getAttribute('cy')) &&
    +studs[0].getAttribute('cx') < 0 && +studs[1].getAttribute('cx') > 0,
    studs.map(s=>`${s.getAttribute('cx')},${s.getAttribute('cy')}`).join(' '));
 /* At rot 0 a player faces up the screen, which is negative y — the same
    convention the mannequin uses. The studs are in front of the centre. */
 ok('and in front of the player, so the marker faces -y at rot 0',
    +studs[0].getAttribute('cy') < 0, studs[0].getAttribute('cy'));

 // ---------- lay out a pass so the receiver gets a foot ----------
 d.getElementById('clearBtn').click();
 arm('playerBlue');
 pe(svg(),'pointerdown',60,120); pe(svg(),'pointerup',60,120);   // passer
 pe(svg(),'pointerdown',160,120); pe(svg(),'pointerup',160,120); // receiver
 ok('two players down', items().length===2, items().length);
 const A=tf(items()[0]), B=tf(items()[1]);
 ok('both are facing their default direction', A.r===0 && B.r===0, `${A.r},${B.r}`);

 d.getElementById('modeBall').click();
 pe(items()[0],'pointerdown',60,120); pe(items()[0],'pointerup',60,120);
 ok('the first stop sits on the passer, not on a foot',
    stops().length===1 && near(stops()[0].x,A.x) && near(stops()[0].y,A.y),
    JSON.stringify(stops()[0]));

 pe(items()[1],'pointerdown',160,120); pe(items()[1],'pointerup',160,120);
 ok('a second stop was added', stops().length===2, stops().length);
 const s1=stops()[1];
 ok('and it is NOT the middle of the receiver — the ball went to a foot',
    !(near(s1.x,B.x)&&near(s1.y,B.y)), `${s1.x},${s1.y} vs centre ${B.x},${B.y}`);
 /* The pass comes in from the left, so the nearer foot is the receiver's left —
    which, for a player facing up the screen, is on the -x side of them. */
 ok('the auto-picked foot is the one nearer the incoming pass',
    s1.x < B.x, `${s1.x} vs ${B.x}`);
 ok('the foot is in front of the receiver, not behind', s1.y < B.y, `${s1.y} vs ${B.y}`);
 const footR=dist(s1,B);
 ok('and it sits outside the body, where a ball at your feet actually is',
    footR>1.4, footR.toFixed(3));

 // ---------- shift-click cycles which foot ----------
 pe(badge(1),'pointerdown',0,0,{shiftKey:true}); pe(badge(1),'pointerup',0,0,{shiftKey:true});
 const s2=stops()[1];
 ok('shift-click moved the stop to the other foot',
    !(near(s2.x,s1.x)&&near(s2.y,s1.y)) && stops().length===2, `${s2.x},${s2.y}`);
 ok('the two feet are mirror images about the way the player faces',
    near(s2.x-B.x, -(s1.x-B.x), 1e-9) && near(s2.y-B.y, s1.y-B.y, 1e-9),
    `L ${(s1.x-B.x).toFixed(3)},${(s1.y-B.y).toFixed(3)}  R ${(s2.x-B.x).toFixed(3)},${(s2.y-B.y).toFixed(3)}`);
 ok('and both are the same distance from the player', near(dist(s2,B), footR, 1e-9),
    `${dist(s2,B).toFixed(4)} vs ${footR.toFixed(4)}`);
 pe(badge(1),'pointerdown',0,0,{shiftKey:true}); pe(badge(1),'pointerup',0,0,{shiftKey:true});
 ok('a third shift-click returns the stop to either foot — the centre',
    near(stops()[1].x,B.x) && near(stops()[1].y,B.y), JSON.stringify(stops()[1]));
 pe(badge(1),'pointerdown',0,0,{shiftKey:true}); pe(badge(1),'pointerup',0,0,{shiftKey:true});
 ok('and it cycles round to the left foot again',
    near(stops()[1].x,s1.x) && near(stops()[1].y,s1.y), JSON.stringify(stops()[1]));
 /* Deleting a stop is right-click on its badge. It used to be a plain click, but
    the badge overlaps the player it belongs to, so that made a ball played back
    to the same player the one pass the app could not draw. */
 rclick(badge(0),0,0);
 ok('right-click on a badge removes the stop', stops().length===1, stops().length);
 d.getElementById('undoBtn').click();
 ok('undo brings it back', stops().length===2, stops().length);

 // ---------- the foot follows the player, rather than being frozen ----------
 d.getElementById('modeSelect').click();
 const before=stops()[1], rec=()=>tf(items()[1]);
 pe(items()[1],'pointerdown',160,120); pe(svg(),'pointermove',160,90); pe(svg(),'pointerup',160,90);
 const moved=rec();
 ok('the receiver actually moved', !near(moved.y,B.y), `${B.y} -> ${moved.y}`);
 ok('the foot travelled with them, keeping the same offset',
    near(stops()[1].x-moved.x, before.x-B.x, 1e-6) &&
    near(stops()[1].y-moved.y, before.y-B.y, 1e-6),
    `${(stops()[1].x-moved.x).toFixed(3)},${(stops()[1].y-moved.y).toFixed(3)}`);

 /* ---------- turning the player turns their feet ----------
    This is the assertion that would catch feet being stored as world coordinates
    instead of derived from the player's own rotation: a stored foot would stay
    put while the body spun underneath it. */
 const p0=rec(), off0={x:stops()[1].x-p0.x, y:stops()[1].y-p0.y};
 rclick(items()[1],p0.x,p0.y);
 const p1=rec();
 ok('right-click turns the player a quarter turn', (p1.r-p0.r+360)%360===90, `${p0.r} -> ${p1.r}`);
 const off1={x:stops()[1].x-p1.x, y:stops()[1].y-p1.y};
 /* A 90° clockwise turn sends an offset (u,v) to (-v,u) in screen space. */
 ok('the foot turned with the player, by exactly the same 90°',
    near(off1.x,-off0.y,1e-6) && near(off1.y,off0.x,1e-6),
    `${off0.x.toFixed(3)},${off0.y.toFixed(3)} -> ${off1.x.toFixed(3)},${off1.y.toFixed(3)}`);
 ok('and stayed the same distance out', near(Math.hypot(off1.x,off1.y),Math.hypot(off0.x,off0.y),1e-9));

 // ---------- the simulation plays the ball to the foot ----------
 d.getElementById('simSpeed').value='28';          // 28 yd/s -> 84 units/s
 const end=stops()[stops().length-1];
 const legLen=dist(stops()[0],end);
 d.getElementById('playBtn').click();
 step(0);
 ok('the ball appears at the first stop when play starts',
    ballC() && near(+ballC().getAttribute('cx'),stops()[0].x,0.6), ballC()&&ballC().getAttribute('cx'));
 /* Early in a long pass the receiving foot must NOT be lit: the highlight is
    meant to read as "this is the foot it arrives on", not glow across the pitch
    from the moment the ball leaves. */
 step(120,8);
 const midLeft=legLen-(84*(now/1000));
 ok('the ball is in flight, still well short of the foot', midLeft>9, midLeft.toFixed(1));
 ok('and the foot is not lit yet, that far out', litC().length===0, litC().length);

 // run it to the end
 step(2500,80);
 const ball=ballC();
 ok('the ball is still on the field after the run', !!ball, playCircles().length+' circles');
 ok('and it came to rest on the foot, not the middle of the player',
    ball && near(+ball.getAttribute('cx'),end.x,0.01) && near(+ball.getAttribute('cy'),end.y,0.01),
    ball?`${ball.getAttribute('cx')},${ball.getAttribute('cy')} vs ${end.x.toFixed(2)},${end.y.toFixed(2)}`:'no ball');
 const lit=litC();
 ok('the receiving foot is lit up on the marker', lit.length>0, lit.length);
 if (lit.length){
   const f=lit.find(c=>c.getAttribute('fill')==='#fbbf24');
   const p=tf(items()[1]);
   ok('the highlight is on the player, over the stud rather than out at the ball',
      Math.hypot(+f.getAttribute('cx')-p.x, +f.getAttribute('cy')-p.y) < 1.4,
      Math.hypot(+f.getAttribute('cx')-p.x, +f.getAttribute('cy')-p.y).toFixed(3));
   ok('and on the same side as the foot the ball went to',
      Math.sign(+f.getAttribute('cx')-p.x)===Math.sign(end.x-p.x),
      `${(+f.getAttribute('cx')-p.x).toFixed(2)} vs ${(end.x-p.x).toFixed(2)}`);
 }

 // ---------- the whole-pitch Rotate button carries feet too ----------
 const relBefore={x:end.x-tf(items()[1]).x, y:end.y-tf(items()[1]).y};
 d.getElementById('rotateBtn').click();
 const pr=tf(items()[1]), sr=stops()[stops().length-1];
 ok('rotating the pitch turns the foot with everything else',
    near(sr.x-pr.x, -relBefore.y, 1e-6) && near(sr.y-pr.y, relBefore.x, 1e-6),
    `${(sr.x-pr.x).toFixed(3)},${(sr.y-pr.y).toFixed(3)}`);
 d.getElementById('rotateBtn').click();
 d.getElementById('rotateBtn').click();
 d.getElementById('rotateBtn').click();
 const s4=stops()[stops().length-1];
 ok('and four turns put the foot back exactly where it was',
    near(s4.x,end.x,1e-9) && near(s4.y,end.y,1e-9),
    `${s4.x.toFixed(4)},${s4.y.toFixed(4)} vs ${end.x.toFixed(4)},${end.y.toFixed(4)}`);

 // ---------- save / load keeps the foot ----------
 d.getElementById('setupName').value='feet';
 d.getElementById('saveSetup').click();
 d.getElementById('clearBtn').click();
 ok('Clear empties the drill', stops().length===0, stops().length);
 d.getElementById('setupList').value='feet';
 d.getElementById('loadSetup').click();
 const sl=stops()[stops().length-1];
 ok('loading brings the drill back', stops().length===2, stops().length);
 ok('and the ball still goes to the same foot',
    sl && near(sl.x,end.x,1e-9) && near(sl.y,end.y,1e-9),
    sl?`${sl.x.toFixed(4)},${sl.y.toFixed(4)} vs ${end.x.toFixed(4)},${end.y.toFixed(4)}`:'no stop');

 /* ---------- a drill saved before feet existed still plays ----------
    Old setups have stops with no foot at all. Those must resolve to the middle
    of the player exactly as they always did, rather than defaulting to a foot
    and quietly moving every stop in every drill anyone saved. */
 const raw=JSON.parse(w.localStorage.getItem('sfp.setups.v2')||'{}');
 const k=Object.keys(raw)[0];
 for (const fk in raw[k]) (raw[k][fk].seq||[]).forEach(n=>{ delete n.foot; });
 raw.legacy=raw[k]; delete raw[k];
 w.localStorage.setItem('sfp.setups.v2', JSON.stringify(raw));
 // reload the list the way the app does, then load the doctored setup
 const sel=d.getElementById('setupList');
 if (![...sel.options].some(o=>o.value==='legacy')){
   const o=d.createElement('option'); o.value='legacy'; o.textContent='legacy'; sel.appendChild(o);
 }
 sel.value='legacy';
 d.getElementById('loadSetup').click();
 const legacy=stops();
 const pl=items().map(g=>tf(g));
 ok('a footless drill loads',(legacy.length===2), legacy.length);
 ok('and every stop sits on the middle of its player, as it used to',
    legacy.every(s=>pl.some(p=>near(s.x,p.x,1e-9)&&near(s.y,p.y,1e-9))),
    legacy.map(s=>`${s.x.toFixed(2)},${s.y.toFixed(2)}`).join(' | '));
 // and a footless drill still animates, all the way to the player's centre
 d.getElementById('playBtn').click();
 step(0); step(3000,90);
 const lb=ballC();
 ok('a footless drill still plays to the end',
    lb && pl.some(p=>near(+lb.getAttribute('cx'),p.x,0.01)&&near(+lb.getAttribute('cy'),p.y,0.01)),
    lb?`${lb.getAttribute('cx')},${lb.getAttribute('cy')}`:'no ball');
 ok('with no foot lit, because no stop names one', litC().length===0, litC().length);

 console.log(R.join('\n'));
 console.log(`\n${pass} passed, ${fail} failed`);
 console.log('runtime errors:', errs.length?errs:'none');
 process.exit((fail||errs.length)?1:0);
},400);
