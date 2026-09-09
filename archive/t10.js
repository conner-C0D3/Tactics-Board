// t10 — drill simulation: players, ball path, playback
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');
const errs=[];
let rafQ=[], rafId=1, now=0;
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  // deterministic clock + rAF so we can step the animation exactly
  w.performance.now=()=>now;
  w.requestAnimationFrame=cb=>{rafQ.push([rafId,cb]);return rafId++;};
  w.cancelAnimationFrame=id=>{rafQ=rafQ.filter(e=>e[0]!==id);};
  w.onerror=m=>errs.push(String(m));
}});
const w=dom.window,d=w.document;
const st=()=>d.getElementById('status').textContent;
function pe(el,t,x,y,ex={}){el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1,...ex}));}
function rclick(el,x,y){el.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:x,clientY:y,button:2}));}
// advance the animation by ms, draining the rAF queue one frame at a time
function step(ms,frames=1){
  for(let i=0;i<frames;i++){
    now+=ms/frames;
    const q=rafQ; rafQ=[];
    q.forEach(([,cb])=>cb(now));
  }
}
/* The play layer holds more than the ball: when the ball arrives at a named foot
   the receiving stud is lit up in the same layer, and that highlight is drawn
   first. Pick the ball out by its own radius rather than taking whichever circle
   happens to come first, or the "did it arrive" checks quietly start measuring
   the highlight instead — which sits on the player, not where the ball stopped. */
function ballXY(){
  const c=[...d.querySelectorAll('.field-wrap.on .play-layer circle')]
    .find(c=>c.getAttribute('r')==='1.15');
  return c?{x:+c.getAttribute('cx'),y:+c.getAttribute('cy')}:null;
}
/* Where the path actually decided each stop lives, read back from the numbered
   badges. A stop on a player may resolve to one of their feet rather than their
   middle, so the players' own coordinates are no longer the right yardstick for
   the ball: the badge is. */
const STOP_OFF=2.4;
const stopPts=()=>[...d.querySelectorAll('.field-wrap.on .path-layer [data-stop] circle')]
  .filter(c=>c.getAttribute('r')==='1.6')
  .map(c=>({x:+c.getAttribute('cx')+STOP_OFF, y:+c.getAttribute('cy')+STOP_OFF}));
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
// renderField() rebuilds the item layer on every mutation, so any cached node
// is detached and its events no longer bubble. Always re-query before clicking.
const at=i=>items()[i];
const xy=i=>{const m=at(i).getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);return{x:+m[1],y:+m[2]};};
function clickItem(i){ const p=xy(i); pe(at(i),'pointerdown',p.x,p.y); }
// the sidebar toggles, so click until the wanted kit is the armed one
function arm(k){ const b=d.querySelector(`.kit[data-kit="${k}"]`); if(!b.classList.contains('on')) b.click(); if(!b.classList.contains('on')) b.click(); }
const R=[]; let pass=0,fail=0;
function ok(name,cond,extra=''){ (cond?pass++:fail++); R.push((cond?'  ok  ':'  FAIL')+' '+name+(extra?'   ['+extra+']':'')); }

setTimeout(()=>{
 const svg=d.querySelectorAll('.field-wrap svg')[0];

 // ---------- 1. players exist and auto-number ----------
 ok('Players group in sidebar', !!d.querySelector('.kit[data-kit="playerBlue"]'));
 arm('playerBlue');
 pe(svg,'pointerdown',40,40); pe(svg,'pointerup',40,40);
 pe(svg,'pointerdown',100,40); pe(svg,'pointerup',100,40);
 pe(svg,'pointerdown',160,40); pe(svg,'pointerup',160,40);
 arm("playerRed");
 pe(svg,'pointerdown',40,150); pe(svg,'pointerup',40,150);
 const nums=items().map(g=>g.querySelector('text').textContent);
 ok('4 players placed', items().length===4, items().length);
 ok('blue numbered 1,2,3 and red restarts at 1', nums.join(',')==='1,2,3,1', nums.join(','));

 // number reuse after delete: remove blue #2, next blue should be 2
 const p2=xy(1);
 pe(at(1),'pointerdown',p2.x,p2.y); pe(at(1),'pointerup',p2.x,p2.y);   // click w/o move = delete
 ok('player deleted', items().length===3, items().length);
 // pending is currently playerRed, so a single click swaps the armed kit to blue
 arm('playerBlue');
 pe(svg,'pointerdown',100,60); pe(svg,'pointerup',100,60);
 const reused=items().map(g=>g.querySelector('text').textContent).join(',');
 ok('4 players again', items().length===4, items().length);
 ok('lowest free number reused', reused.split(',').filter(n=>n==='2').length===1, reused);

 // ---------- 2. ball path mode ----------
 d.getElementById('clearBtn').click();
 arm('playerBlue');
 // three players on a straight horizontal line at y=90: x = 40, 100, 160
 pe(svg,'pointerdown',40,90);  pe(svg,'pointerup',40,90);
 pe(svg,'pointerdown',100,90); pe(svg,'pointerup',100,90);
 pe(svg,'pointerdown',160,90); pe(svg,'pointerup',160,90);
 const P=[xy(0),xy(1),xy(2)];
 ok('3 players for the drill', items().length===3);

 d.getElementById('modeBall').click();
 ok('ball mode active', d.getElementById('modeBall').classList.contains('on'), st());
 clickItem(0);
 ok('stop 1 = start', /Stop 1/.test(st()), st());
 clickItem(1);
 clickItem(2);
 const badges=[...d.querySelectorAll('.field-wrap.on .path-layer [data-stop]')];
 ok('3 numbered stop badges', badges.length===3, badges.length);
 const segs=[...d.querySelectorAll('.field-wrap.on .path-layer line')];
 ok('2 path segments', segs.length===2, segs.length);
 ok('segments carry arrowheads', segs.every(l=>/marker-end/.test(l.outerHTML)));

 // right-click pops the last stop, then re-add it
 rclick(svg,10,10);
 ok('right-click removes last stop',
    d.querySelectorAll('.field-wrap.on .path-layer [data-stop]').length===2,
    st());
 clickItem(2);
 ok('stop re-added', d.querySelectorAll('.field-wrap.on .path-layer [data-stop]').length===3);

 // a free point on the grass is also a valid stop
 pe(svg,'pointerdown',160,160);
 ok('free grass point accepted', d.querySelectorAll('.field-wrap.on .path-layer [data-stop]').length===4);
 rclick(svg,10,10);  // drop it again, back to the 3-player line

 // ---------- 3. path follows a dragged player ----------
 const before=d.querySelector('.field-wrap.on .path-layer line').getAttribute('y2');
 d.getElementById('modeSelect').click();
 pe(at(1),'pointerdown',P[1].x,P[1].y);
 pe(svg,'pointermove',P[1].x,P[1].y+50);
 pe(svg,'pointerup',P[1].x,P[1].y+50);
 const after=d.querySelector('.field-wrap.on .path-layer line').getAttribute('y2');
 ok('dragged player actually moved', Math.abs(xy(1).y-P[1].y)>10, JSON.stringify(xy(1)));
 ok('path re-routes when a player moves', before!==after, `y2 ${before} -> ${after}`);

 // put it back on the line for clean distance maths
 pe(at(1),'pointerdown',P[1].x,P[1].y+50);
 pe(svg,'pointermove',P[1].x,P[1].y);
 pe(svg,'pointerup',P[1].x,P[1].y);
 ok('player restored to the line', Math.abs(xy(1).y-P[1].y)<0.01, JSON.stringify(xy(1)));

 // ---------- 4. playback ----------
 const pts=stopPts();
 ok('three resolved stops to fly between', pts.length===3, pts.length);
 const total=Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y)+Math.hypot(pts[2].x-pts[1].x,pts[2].y-pts[1].y);
 d.getElementById('simSpeed').value='16';         // 16 yd/s -> 48 units/s
 d.getElementById('playBtn').click();
 ok('play button flips to Pause', /Pause/.test(d.getElementById('playBtn').textContent), d.getElementById('playBtn').textContent);
 step(0);                                          // first frame: dt 0
 const b0=ballXY();
 ok('ball rendered at stop 1', b0 && Math.abs(b0.x-pts[0].x)<0.6 && Math.abs(b0.y-pts[0].y)<0.6, JSON.stringify(b0));

 // run for half the journey
 const halfMs=(total/48)*1000/2;
 step(halfMs, Math.ceil(halfMs/16));
 const bh=ballXY();
 ok('ball is between the stops mid-run', bh && bh.x>pts[0].x+1 && bh.x<pts[2].x-1, JSON.stringify(bh));
 /* Walk the legs to find where constant speed puts the ball, rather than
    interpolating straight from the first stop to the last. The stops are no
    longer collinear now that one of them can sit on a foot, so a straight-line
    estimate would be measuring the kink in the path, not the speed. */
 function along(dist){
   let left=dist;
   for (let i=1;i<pts.length;i++){
     const a=pts[i-1], b=pts[i], len=Math.hypot(b.x-a.x,b.y-a.y);
     if (left<=len) return {x:a.x+(b.x-a.x)*(left/len), y:a.y+(b.y-a.y)*(left/len)};
     left-=len;
   }
   return pts[pts.length-1];
 }
 const expected=along(total/2);
 ok('constant-speed position within 1 unit',
    Math.hypot(bh.x-expected.x,bh.y-expected.y)<1.0,
    `got ${bh.x.toFixed(2)},${bh.y.toFixed(2)} want ${expected.x.toFixed(2)},${expected.y.toFixed(2)}`);

 // pause holds position
 d.getElementById('playBtn').click();
 const bp=ballXY(); step(500,30);
 const bp2=ballXY();
 ok('pause freezes the ball', bp.x===bp2.x, `${bp.x} vs ${bp2.x}`);
 ok('button reads Play while paused', /Play/.test(d.getElementById('playBtn').textContent));

 // resume and finish
 d.getElementById('playBtn').click();
 step(halfMs*1.3, Math.ceil(halfMs/16)+20);
 const bf=ballXY();
 ok('ball lands on the final stop', bf && Math.abs(bf.x-pts[2].x)<0.6 && Math.abs(bf.y-pts[2].y)<0.6, JSON.stringify(bf));
 ok('completion status', /complete/i.test(st()), st());

 // restart rewinds
 d.getElementById('restartBtn').click(); step(0);
 const br=ballXY();
 ok('restart returns to stop 1', br && Math.abs(br.x-pts[0].x)<0.6, JSON.stringify(br));

 // speed actually changes distance covered per second
 d.getElementById('restartBtn').click(); step(0); step(200,12);
 const slowRef=ballXY().x;
 d.getElementById('simSpeed').value='28';
 d.getElementById('restartBtn').click(); step(0); step(200,12);
 const fastRef=ballXY().x;
 ok('fast covers more ground than normal', fastRef>slowRef, `${slowRef.toFixed(2)} vs ${fastRef.toFixed(2)}`);

 // ---------- 5. teardown paths ----------
 d.querySelectorAll('.tab')[1].click();
 ok('tab switch stops the sim', !d.querySelector('.field-wrap.on .play-layer circle'));
 d.querySelectorAll('.tab')[0].click();
 ok('path survives the tab round-trip', d.querySelectorAll('.field-wrap.on .path-layer [data-stop]').length===3);

 d.getElementById('modeBall').click();
 d.getElementById('clearPath').click();
 ok('Clear Path empties the path', d.querySelector('.field-wrap.on .path-layer').innerHTML==='');
 ok('players survive Clear Path', items().length===3, items().length);
 d.getElementById('undoBtn').click();
 ok('undo restores the path', d.querySelectorAll('.field-wrap.on .path-layer [data-stop]').length===3);

 // play with fewer than two stops must not throw
 d.getElementById('clearBtn').click();
 d.getElementById('playBtn').click();
 ok('play with no path is a no-op', /No ball path|two stops/i.test(st()), st());

 // ---------- 6. save / load round-trip ----------
 arm('playerBlue');
 pe(svg,'pointerdown',40,90); pe(svg,'pointerup',40,90);
 pe(svg,'pointerdown',160,90); pe(svg,'pointerup',160,90);
 d.getElementById('modeBall').click();
 clickItem(0); clickItem(1);
 d.getElementById('setupName').value='drill1';
 d.getElementById('saveSetup').click();
 d.getElementById('clearBtn').click();
 d.getElementById('setupList').value='drill1';
 d.getElementById('loadSetup').click();
 ok('loaded setup restores the path',
    d.querySelectorAll('.field-wrap.on .path-layer [data-stop]').length===2,
    st());
 d.getElementById('playBtn').click(); step(0);
 ok('loaded path is playable', !!ballXY());

 console.log(R.join('\n'));
 console.log(`\n${pass} passed, ${fail} failed`);
 console.log('runtime errors:', errs.length?errs:'none');
 if (fail || errs.length) process.exitCode=1;
},60);
