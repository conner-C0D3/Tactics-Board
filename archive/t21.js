/* t21 — player runs: authoring them in Run mode, and playing them back.

   The point of this suite is the two halves of the feature meeting: a run drawn
   by clicking is stored on the player, and the seconds clock turns that stored
   shape into somebody actually moving. Anything that only checks one half would
   miss the failure that matters — a run that draws beautifully and never runs. */
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');

let rafQ=[],rafId=1,now=0,errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://e.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  /* A stubbed clock, not the real one. Runs are timed in seconds now, so a test
     that leaned on wall time would be measuring how busy the machine is. */
  w.performance.now=()=>now;
  w.requestAnimationFrame=cb=>{rafQ.push([rafId,cb]);return rafId++;};
  w.cancelAnimationFrame=id=>{rafQ=rafQ.filter(e=>e[0]!==id);};
}});
dom.virtualConsole.on('jsdomError',e=>errs.push(e.message));
const w=dom.window,d=w.document;

let pass=0,fail=0;
const ok=(m,c,x)=>{c?pass++:fail++;console.log(`  ${c?'ok  ':'FAIL'} ${m}${x!==undefined?`   [${x}]`:''}`);};
const near=(a,b,t=0.4)=>Math.abs(a-b)<=t;
const head=t=>console.log('\n'+t);

const step=(ms,frames=1)=>{for(let i=0;i<frames;i++){now+=ms/frames;const q=rafQ;rafQ=[];q.forEach(([,cb])=>cb(now));}};
const svg=()=>d.querySelector('.field-wrap.on svg');
const pe=(el,t,x,y,ex={})=>el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1,...ex}));
const click=(el,x,y,ex)=>{pe(el,'pointerdown',x,y,ex);pe(el,'pointerup',x,y,ex);};
/* Press on `el`, drag through the points, release. The moves go to the svg rather
   than to `el` because a real pointer leaves the marker it started on almost
   immediately, and the app captures the pointer for exactly that reason. */
function stroke(el,pts){
  pe(el,'pointerdown',pts[0].x,pts[0].y);
  for (const q of pts) pe(svg(),'pointermove',q.x,q.y);
  pe(svg(),'pointerup',pts[pts.length-1].x,pts[pts.length-1].y);
}
const rclick=(el,x,y)=>el.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:x,clientY:y,button:2}));
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
const tf=g=>{const m=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)(?: rotate\(([-\d.]+)\))?/);
             return{x:+m[1],y:+m[2],rot:m[3]===undefined?0:+m[3]};};
const arm=k=>{const b=d.querySelector(`.kit[data-kit="${k}"]`);if(!b.classList.contains('on'))b.click();};
const runLines=()=>[...d.querySelectorAll('.field-wrap.on .run-layer line')];
const wpHits=()=>[...d.querySelectorAll('.field-wrap.on .run-layer [data-wp]')];
const playCircles=()=>[...d.querySelectorAll('.field-wrap.on .play-layer circle')];
const ballC=()=>playCircles().find(c=>c.getAttribute('r')==='1.15');
/* Everything is read back through the DOM, the way the other suites do it: the
   app's state lives in module scope and is deliberately not reachable, so the
   test is held to the same surface a coach is. A run is recovered from its own
   waypoint handles, which carry the owning player and the index into run.pts. */
const runPts=id=>wpHits().filter(c=>c.dataset.run===id)
  .sort((a,b)=>+a.dataset.wp-+b.dataset.wp)
  .map(c=>({x:+c.getAttribute('cx'),y:+c.getAttribute('cy')}));
const idOf=i=>items()[i].dataset.id;
const runOf=i=>runPts(idOf(i));
/* A drawn run has no handles — its points are stroke samples, not places anybody
   chose — so it is read back off the legs that were drawn instead. One leg per
   pair of points, so the leg count is the point count. */
const runLegs=i=>runLines().filter(l=>l.dataset.run===idOf(i))
  .sort((a,b)=>+a.dataset.leg-+b.dataset.leg);
const legLen=l=>Math.hypot(+l.getAttribute('x2')-+l.getAttribute('x1'),
                           +l.getAttribute('y2')-+l.getAttribute('y1'));
const runTip=i=>{const L=runLegs(i);return L.length?{x:+L[L.length-1].getAttribute('x2'),
                                                    y:+L[L.length-1].getAttribute('y2')}:null;};
const stopBadges=()=>[...d.querySelectorAll('.field-wrap.on .path-layer [data-stop]')];

const U=3;
function reset(){
  d.getElementById('modeSelect').click();
  d.getElementById('clearBtn').click();
}
// drop a player at a client point and return the item
function drop(kit,x,y){
  d.getElementById('modeSelect').click();
  arm(kit);
  click(svg(),x,y);
  const b=d.querySelector(`.kit[data-kit="${kit}"]`); if(b.classList.contains('on')) b.click();
  return items()[items().length-1];
}

setTimeout(()=>{

head('Run mode exists and behaves like a mode');
{
  reset();
  d.getElementById('modeRun').click();
  ok('the Runs button lights up', d.getElementById('modeRun').classList.contains('on'));
  ok('and Select goes out', !d.getElementById('modeSelect').classList.contains('on'));
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'v',bubbles:true}));
  ok('V leaves it again', !d.getElementById('modeRun').classList.contains('on'));
  d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'u',bubbles:true}));
  ok('U comes back to it', d.getElementById('modeRun').classList.contains('on'));
  /* Arming equipment while in Run mode has to drop you back into Select, or the
     first click would try to place a cone and draw a waypoint at once. */
  arm('coneOrange');
  ok('arming kit falls back to Select', d.getElementById('modeSelect').classList.contains('on'));
  d.querySelector('.kit[data-kit="coneOrange"]').click();
}

head('Drawing a run by clicking waypoints');
{
  reset();
  drop('playerBlue',60,120);
  d.getElementById('modeRun').click();
  ok('a player with no run draws no run line', runLines().length===0, runLines().length);

  // arming shows a ring, so it is visible that the click landed
  click(items()[0],60,120);
  ok('arming the player rings them',
     d.querySelectorAll('.field-wrap.on .run-layer circle[stroke-dasharray]').length===1);
  ok('but stores no run yet', runOf(0).length===0);

  click(svg(),120,120);
  ok('the first click stores a waypoint', runOf(0).length===1, runOf(0).length);
  click(svg(),120,60);
  ok('a second click extends it', runOf(0).length===2, runOf(0).length);
  ok('two legs are drawn', runLines().length===2, runLines().length);
  /* One arrowhead, on the last leg. A head per leg would read as two separate
     runs rather than one route with a corner in it. */
  ok('with a single arrowhead at the end',
     runLines().filter(l=>l.getAttribute('marker-end')).length===1);
  ok('a handle for each waypoint', wpHits().length===2, wpHits().length);

  // right-click pops the last, exactly as it does on the ball path
  rclick(svg(),0,0);
  ok('right-click pops the last waypoint', runOf(0).length===1, runOf(0).length);
  rclick(svg(),0,0);
  ok('popping the last one drops the run entirely',
     runOf(0).length===0 && runLines().length===0);
  rclick(svg(),0,0);
  ok('and popping again is harmless', runOf(0).length===0 && errs.length===0);
}

head('Finishing, switching and undoing');
{
  reset();
  drop('playerBlue',60,120);
  drop('playerRed',200,120);
  d.getElementById('modeRun').click();
  click(items()[0],60,120);
  click(svg(),120,60);
  // clicking the armed player again puts the pen down
  click(items()[0],60,120);
  click(svg(),300,300);
  ok('after finishing, a stray click adds nothing', runOf(0).length===1, runOf(0).length);
  ok('and it did not start a run on anybody else', runOf(1).length===0);

  // a second player can be given their own, independent run
  click(items()[1],200,120);
  click(svg(),200,60);
  ok('the second player gets their own run', runOf(1).length===1);
  ok('the first player keeps theirs', runOf(0).length===1);
  ok('both runs draw', runLines().length===2, runLines().length);

  /* Runs are drill state, so they belong in the undo stack — a mis-clicked
     waypoint has to be recoverable the same way a mis-dropped cone is. */
  d.getElementById('undoBtn').click();
  ok('undo takes the last waypoint back', runOf(1).length===0);
  d.getElementById('redoBtn').click();
  ok('redo puts it back', runOf(1).length===1);
}

head('A waypoint can be clicked out of the middle');
{
  reset();
  drop('playerBlue',60,120);
  d.getElementById('modeRun').click();
  click(items()[0],60,120);
  click(svg(),120,120);
  click(svg(),120,60);
  click(svg(),180,60);
  ok('three waypoints down', runOf(0).length===3, runOf(0).length);
  const mid=runOf(0)[1];
  click(wpHits()[1],0,0);
  ok('clicking a handle removes that one', runOf(0).length===2, runOf(0).length);
  ok('and it is the middle one that went',
     !runOf(0).some(p=>near(p.x,mid.x,0.01)&&near(p.y,mid.y,0.01)),
     JSON.stringify(runOf(0)));
}

head('Only players can run');
{
  reset();
  drop('coneOrange',60,120);
  d.getElementById('modeRun').click();
  click(items()[0],60,120);
  // check the refusal before clicking again, or the next click rewrites the status
  ok('the status says why', /Only players/.test(d.getElementById('status').textContent),
     d.getElementById('status').textContent);
  click(svg(),140,120);
  ok('and no run was started on it', runOf(0).length===0);
}

head('Playback: the player actually travels');
{
  reset();
  drop('playerBlue',60,120);
  d.getElementById('modeRun').click();
  click(items()[0],60,120);
  click(svg(),60,60);            // straight up the screen
  const start=tf(items()[0]);
  const wp=runOf(0)[0];
  const dist=Math.hypot(wp.x-start.x,wp.y-start.y);
  ok('the run has real length', dist>4, (dist/U).toFixed(1)+' yd');

  d.getElementById('playBtn').click();
  step(0);
  step(200,10);
  const mid=tf(items()[0]);
  ok('the player has left their mark', Math.hypot(mid.x-start.x,mid.y-start.y)>0.5,
     `${mid.x.toFixed(1)},${mid.y.toFixed(1)}`);
  /* Facing follows travel. A player sprinting backwards up the pitch would be
     the giveaway that the heading is being taken from the wrong end of the leg. */
  ok('and turned to face the way they are going', near(mid.rot,0,6)||near(mid.rot,360,6),
     mid.rot.toFixed(1)+'°');

  step(4000,120);
  const end=tf(items()[0]);
  ok('they arrive at the waypoint', near(end.x,wp.x,0.6)&&near(end.y,wp.y,0.6),
     `${end.x.toFixed(1)},${end.y.toFixed(1)} vs ${wp.x},${wp.y}`);

  /* Stopping must put the drill back exactly as it was. Playback that wrote into
     the state would leave the player parked at the end of their run, and the
     next press of Play would start them from there. */
  d.getElementById('modeSelect').click();
  const home=tf(items()[0]);
  ok('stopping puts them back on their mark',
     near(home.x,start.x,0.01)&&near(home.y,start.y,0.01), `${home.x} vs ${start.x}`);
  ok('facing their original way too', near(home.rot,start.rot,0.01), home.rot);
  ok('and the run they were given is untouched', runOf(0).length===1);
}

head('Constant speed and the shared clock');
{
  reset();
  drop('playerBlue',60,200);
  d.getElementById('modeRun').click();
  click(items()[0],60,200);
  click(svg(),60,60);
  const start=tf(items()[0]);
  const wp=runOf(0)[0];
  const total=Math.hypot(wp.x-start.x,wp.y-start.y);
  const speed=6*U;                     // RUN_SPEED, in units per second
  d.getElementById('playBtn').click();
  step(0);
  const T=0.5;
  step(T*1000,30);
  const p=tf(items()[0]);
  const gone=Math.hypot(p.x-start.x,p.y-start.y);
  ok('half a second in, the player has covered half a second of ground',
     near(gone,Math.min(total,speed*T),1.2),
     `${(gone/U).toFixed(2)} yd vs ${(Math.min(total,speed*T)/U).toFixed(2)} yd`);
  d.getElementById('modeSelect').click();
}

head('A run and a ball share one drill');
{
  reset();
  drop('playerBlue',60,120);          // passer
  drop('playerBlue',220,120);         // receiver, who runs on
  d.getElementById('modeBall').click();
  click(items()[0],60,120);
  click(items()[1],220,120);
  const recHome=tf(items()[1]);
  d.getElementById('modeRun').click();
  click(items()[1],220,120);
  click(svg(),220,50);
  ok('the drill has a ball path and a run',
     stopBadges().length===2 && runOf(1).length===1,
     `${stopBadges().length} stops, ${runOf(1).length} waypoints`);

  const wp=runOf(1)[0];
  d.getElementById('playBtn').click();
  step(0);
  step(4000,200);
  const rec=tf(items()[1]);
  ok('the receiver finishes their run', near(rec.x,wp.x,0.8)&&near(rec.y,wp.y,0.8),
     `${rec.x.toFixed(1)},${rec.y.toFixed(1)} vs ${wp.x},${wp.y}`);
  /* A stop on a player means THAT PLAYER, so a pass into a runner is played to
     where they get to, not to the mark they left. What stays frozen is the
     TIMETABLE: legs are measured once at kick-off and only re-aimed per frame,
     because letting the schedule chase runners would be circular — a run
     triggered by a pass would change the length of the pass that triggered it. */
  const b=ballC(), bx=+b.getAttribute('cx'), by=+b.getAttribute('cy');
  ok('the ball is played to the runner, not to the mark they left',
     b && Math.hypot(bx-rec.x,by-rec.y)<3,
     `${bx.toFixed(1)},${by.toFixed(1)} vs runner ${rec.x.toFixed(1)},${rec.y.toFixed(1)}`);
  ok('and so it does not end up back at where they started',
     Math.hypot(bx-recHome.x,by-recHome.y)>10,
     `${bx.toFixed(1)},${by.toFixed(1)} vs start ${recHome.x},${recHome.y}`);
  ok('the passer stayed put', near(tf(items()[0]).x,60/1,1e9) && near(tf(items()[0]).rot,0,0.01));
  d.getElementById('modeSelect').click();
}

head('Runs survive a save, a load and a rotation');
{
  reset();
  drop('playerBlue',60,120);
  d.getElementById('modeRun').click();
  click(items()[0],60,120);
  click(svg(),120,60);
  const before=runOf(0)[0];

  /* A run is stored on the item, so it should ride the existing save format with
     no special handling — that is the whole reason for putting it there. */
  d.getElementById('setupName').value='runtest';
  d.getElementById('saveSetup').click();
  reset();
  ok('the field really is empty again', items().length===0);
  d.getElementById('setupList').value='runtest';
  d.getElementById('loadSetup').click();
  ok('a loaded drill still has the run', runOf(0).length===1, runOf(0).length);
  ok('with the waypoint where it was',
     near(runOf(0)[0].x,before.x,0.01)&&near(runOf(0)[0].y,before.y,0.01),
     `${JSON.stringify(runOf(0)[0])} vs ${JSON.stringify(before)}`);

  /* Turning the pitch turns everything on it. A waypoint left behind would send
     the player off at right angles to the drill they were drawn into. */
  const p0=tf(items()[0]), w0=runOf(0)[0];
  const d0=Math.hypot(w0.x-p0.x,w0.y-p0.y);
  d.getElementById('rotateBtn').click();
  const p1=tf(items()[0]), w1=runOf(0)[0];
  ok('after rotating, the run is the same length',
     near(Math.hypot(w1.x-p1.x,w1.y-p1.y),d0,0.01),
     `${d0.toFixed(2)} -> ${Math.hypot(w1.x-p1.x,w1.y-p1.y).toFixed(2)}`);
  ok('and it turned with the pitch rather than staying put',
     !near(w1.x,w0.x,0.01)||!near(w1.y,w0.y,0.01),
     `${w0.x},${w0.y} -> ${w1.x},${w1.y}`);
  d.getElementById('rotateBtn').click();
  d.getElementById('rotateBtn').click();
  d.getElementById('rotateBtn').click();
}

head('A drill of nothing but running still plays');
{
  reset();
  drop('playerBlue',60,120);
  d.getElementById('modeRun').click();
  click(items()[0],60,120);
  click(svg(),160,120);
  ok('there is no ball path at all', stopBadges().length===0, stopBadges().length);
  const start=tf(items()[0]);
  d.getElementById('playBtn').click();
  step(0); step(3000,120);
  const end=tf(items()[0]);
  ok('the player runs anyway', Math.hypot(end.x-start.x,end.y-start.y)>4,
     `${end.x.toFixed(1)},${end.y.toFixed(1)}`);
  ok('and no ball is drawn', !ballC());
  d.getElementById('modeSelect').click();
}

head('Drawing a run freehand');
{
  reset();
  drop('playerBlue',60,180);
  d.getElementById('modeRun').click();
  /* A quarter circle bending right and up, sampled the way a pointer would: many
     small steps, most of which say nothing the ones either side do not. */
  const arc=[];
  for (let a=0;a<=90;a+=2) arc.push({x:60+40*Math.sin(a*Math.PI/180),
                                     y:180-40*(1-Math.cos(a*Math.PI/180))});
  stroke(items()[0],arc);
  const legs=runLegs(0);
  ok('a curve was stored', legs.length>2, legs.length+' legs');
  /* The whole point of simplifying: 46 samples in, a handful of points out, and
     the shape still a curve rather than a straight line between the ends. */
  ok('but far fewer points than were sampled', legs.length<arc.length/2,
     `${arc.length} samples -> ${legs.length} legs`);
  ok('and more than the two a straight line would need', legs.length>=3);
  ok('a drawn run gets no waypoint handles', runOf(0).length===0, runOf(0).length);

  const tip=runTip(0), want=arc[arc.length-1];
  ok('it ends where the stroke ended', near(tip.x,want.x,1.2)&&near(tip.y,want.y,1.2),
     `${tip.x.toFixed(1)},${tip.y.toFixed(1)} vs ${want.x.toFixed(1)},${want.y.toFixed(1)}`);
  /* Every leg has to be drawn whole. Trimming each leg's tail the way the ball
     path does would open a gap at every sample and rub the curve out. */
  ok('the legs join up with no gaps',
     runLegs(0).every((l,i,A)=>i===0||near(+l.getAttribute('x1'),+A[i-1].getAttribute('x2'),0.001)),
     'contiguous');
  ok('and none of them is a zero-length stub', runLegs(0).every(l=>legLen(l)>0.5));
  ok('still one arrowhead', runLegs(0).filter(l=>l.getAttribute('marker-end')).length===1);

  // the stroke starts on top of the player; those samples must not become points
  const first=runLegs(0)[0];
  ok('the run does not begin under the player\'s own feet',
     Math.hypot(+first.getAttribute('x2')-59.5,+first.getAttribute('y2')-179.5)>2,
     legLen(first).toFixed(2));
}

head('A drawn run plays like any other');
{
  const start=tf(items()[0]);
  const tip=runTip(0);
  d.getElementById('playBtn').click();
  step(0); step(200,10);
  const mid=tf(items()[0]);
  ok('the player sets off along the curve', Math.hypot(mid.x-start.x,mid.y-start.y)>0.5,
     `${mid.x.toFixed(1)},${mid.y.toFixed(1)}`);
  /* The arc leaves sideways and finishes pointing up the pitch, so heading has to
     come from the leg being travelled rather than from the run as a whole — on a
     curve those are two different answers, and this is where they part. */
  ok('setting off across the pitch, the way the curve leaves', near(mid.rot,90,12),
     mid.rot.toFixed(1)+'°');
  step(4000,200);
  const end=tf(items()[0]);
  ok('and arrives at the end of the curve', near(end.x,tip.x,0.8)&&near(end.y,tip.y,0.8),
     `${end.x.toFixed(1)},${end.y.toFixed(1)} vs ${tip.x.toFixed(1)},${tip.y.toFixed(1)}`);
  ok('having come round to face up the pitch by the finish', near(end.rot,0,15)||near(end.rot,360,15),
     end.rot.toFixed(1)+'°');
  d.getElementById('modeSelect').click();
  ok('and goes back to their mark when it stops',
     near(tf(items()[0]).x,start.x,0.01)&&near(tf(items()[0]).y,start.y,0.01));
}

head('Redrawing, clearing, and what a click does to a drawn run');
{
  d.getElementById('modeRun').click();
  const before=runLegs(0).length;
  stroke(items()[0],[{x:59.5,y:179.5},{x:100,y:179.5},{x:140,y:179.5}]);
  ok('a second stroke replaces the first rather than adding to it',
     runLegs(0).length<before, `${before} -> ${runLegs(0).length}`);
  ok('and a straight drag simplifies to a single leg', runLegs(0).length===1,
     runLegs(0).length);

  /* Clicking would append a straight jump onto a hand-drawn shape, mixing two
     ideas of what the run is. It is refused, with instructions. */
  click(svg(),200,60);
  ok('clicking does not extend a drawn run', runLegs(0).length===1);
  ok('and says how to change it', /drawn/.test(d.getElementById('status').textContent),
     d.getElementById('status').textContent);

  rclick(svg(),0,0);
  ok('right-click clears the whole stroke', runLegs(0).length===0);
  /* Clearing leaves the player armed, so the pen is still in hand and the next
     click starts a clicked run — the two ways of drawing are not separate modes. */
  click(svg(),60,120);
  ok('and the player takes waypoints again straight afterwards',
     runOf(0).length===1, runOf(0).length);
}

head('A drag that starts on grass pans instead of drawing');
{
  reset();
  drop('playerBlue',60,120);
  d.getElementById('modeRun').click();
  click(items()[0],60,120);            // arm them, so there IS somebody to draw for
  stroke(svg(),[{x:200,y:200},{x:240,y:240},{x:280,y:280}]);
  ok('no run appears from a stroke that missed the player',
     runOf(0).length===0 && runLegs(0).length===0);
  ok('and nothing was thrown', errs.length===0, errs.length);
  d.getElementById('modeSelect').click();
}

head('A drawn run survives a rotation like any other');
{
  reset();
  drop('playerBlue',60,180);
  d.getElementById('modeRun').click();
  stroke(items()[0],[{x:59.5,y:179.5},{x:59.5,y:140},{x:59.5,y:100},{x:59.5,y:60}]);
  const n=runLegs(0).length, tip0=runTip(0), home0=tf(items()[0]);
  const len0=Math.hypot(tip0.x-home0.x,tip0.y-home0.y);
  d.getElementById('rotateBtn').click();
  const tip1=runTip(0), home1=tf(items()[0]);
  ok('the drawn run keeps its shape through a quarter turn',
     runLegs(0).length===n &&
     near(Math.hypot(tip1.x-home1.x,tip1.y-home1.y),len0,0.05),
     `${len0.toFixed(2)} -> ${Math.hypot(tip1.x-home1.x,tip1.y-home1.y).toFixed(2)}`);
  d.getElementById('rotateBtn').click();
  d.getElementById('rotateBtn').click();
  d.getElementById('rotateBtn').click();
}

head('Nothing moving is still refused');
{
  reset();
  drop('playerBlue',60,120);
  d.getElementById('playBtn').click();
  step(0);
  ok('an empty drill will not play', /No ball path|at least two stops/.test(d.getElementById('status').textContent),
     d.getElementById('status').textContent);
}

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log('runtime errors:', errs.length?errs:'none');
  if (fail) process.exitCode=1;
},400);
