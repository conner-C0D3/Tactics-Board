/* t25 — a ball can be played BACK to a player who is already in the path.

   The feature sounds like an addition but it was really the removal of an
   accident. The numbered stop badge is drawn on top of the player it belongs to,
   and a plain click used to DELETE the stop under it — so clicking a player who
   was already in the path took them out of it instead of passing to them, and a
   give-and-go was the one thing the app would not draw. This file pins down both
   halves of the fix: the gesture (a plain click always adds; right-click on a
   badge is what deletes) and the geometry (a stop on a player means wherever
   that player IS, so a return pass into a runner follows them). */
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');

let rafQ=[],rafId=1,now=0;const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://e.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  w.performance.now=()=>now;
  w.requestAnimationFrame=cb=>{rafQ.push([rafId,cb]);return rafId++;};
  w.cancelAnimationFrame=id=>{rafQ=rafQ.filter(e=>e[0]!==id);};
  w.onerror=m=>errs.push(String(m));
}});
const w=dom.window,d=w.document,$=i=>d.getElementById(i);
function step(ms,frames=1){
  for(let i=0;i<frames;i++){ now+=ms/frames; const q=rafQ; rafQ=[]; q.forEach(([,cb])=>cb(now)); }
}
const R=[];let pass=0,fail=0;
const ok=(n,c,x='')=>{c?pass++:fail++;R.push((c?'  ok  ':'  FAIL')+' '+n+(x?'   ['+x+']':''));};
const head=t=>R.push('','\x1b[1m'+t+'\x1b[0m');

const pe=(el,t,x,y,ex={})=>el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1,...ex}));
const click=(el,x,y,ex={})=>{pe(el,'pointerdown',x,y,ex);pe(el,'pointerup',x,y,ex);};
const rclick=(el,x,y)=>el.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:x,clientY:y,button:2}));
const svg=()=>d.querySelector('.field-wrap.on svg');
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
const arm=k=>{const b=d.querySelector(`.kit[data-kit="${k}"]`);if(!b.classList.contains('on'))b.click();};
const tf=g=>{const m=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/);
  return{x:+m[1],y:+m[2],r:+m[3]};};
const drop=(k,x,y)=>{arm(k);click(svg(),x,y);};
/* Look the players up fresh on every click. Adding a stop re-renders the field,
   which replaces every .item node, so a saved reference is detached by the next
   click — and an event dispatched on a detached node never reaches the svg, so
   the click is silently swallowed and the test passes for no reason. */
const A=()=>items()[0], B=()=>items()[1];

const STOP_OFF=2.4;
const badges=()=>[...d.querySelectorAll('.field-wrap.on [data-stop]')];
const stops=()=>[...d.querySelectorAll('.field-wrap.on [data-stop] circle')]
  .filter(c=>c.getAttribute('r')==='1.6')
  .map(c=>({x:+c.getAttribute('cx')+STOP_OFF, y:+c.getAttribute('cy')+STOP_OFF}));
const badge=i=>d.querySelector(`.field-wrap.on [data-stop="${i}"]`);
// the drawn dashed pass lines, one per leg
const legLines=()=>[...d.querySelectorAll('.field-wrap.on .path-layer line')];
const playCircles=()=>[...d.querySelectorAll('.field-wrap.on .play-layer circle')];
const ballC=()=>playCircles().find(c=>c.getAttribute('r')==='1.15');
const ballAt=()=>{const b=ballC();return b&&{x:+b.getAttribute('cx'),y:+b.getAttribute('cy')};};
const near=(a,b,e=1e-6)=>Math.abs(a-b)<e;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const status=()=>$('status').textContent.trim();
const reset=()=>{$('modeSelect').click();$('clearBtn').click();};

setTimeout(()=>{

/* ============================================================
   The gesture
   ============================================================ */
head('Clicking a player already in the path passes to them again');
{
  reset();
  drop('playerBlue',60,120);          // A
  drop('playerBlue',200,120);         // B
  $('modeBall').click();
  click(A(),60,120);
  ok('one stop after the first click', stops().length===1, stops().length);
  click(B(),200,120);
  ok('two after the second', stops().length===2, stops().length);

  /* This is the assertion the whole feature exists for. Before the fix this
     click landed on stop 1's badge, which sits on top of A, and removed it —
     so the count went DOWN and the give-and-go could not be drawn at all. */
  click(A(),60,120);
  ok('and clicking A again adds a third stop rather than deleting the first',
     stops().length===3, stops().length);
  ok('so a give-and-go is three numbered badges', badges().length===3, badges().length);
  ok('and two dashed passes between them', legLines().length===2, legLines().length);

  /* A-B-A is a there-and-back, so the third stop is on the same player as the
     first. It is not necessarily the same POINT — each visit picks its own foot
     from the direction the ball came in — but it is within a stride of A. */
  const s=stops(), a=tf(A());
  ok('the last stop is back on the player the ball started with',
     dist(s[2],a)<3 && dist(s[0],a)<3,
     `${s[2].x.toFixed(1)},${s[2].y.toFixed(1)} vs A ${a.x},${a.y}`);
  ok('and it is a different point from the first, because the ball comes back in on the other side',
     dist(s[0],s[2])>0.5, dist(s[0],s[2]).toFixed(3));

  ok('the hint teaches the new gesture', /right-click/i.test(status()), status());
}

head('A player can be in the path as often as the drill needs');
{
  reset();
  drop('playerBlue',60,120);
  drop('playerBlue',200,120);
  $('modeBall').click();
  for (let i=0;i<3;i++){ click(A(),60,120); click(B(),200,120); }
  ok('six clicks alternating between two players make six stops',
     stops().length===6, stops().length);
  ok('with a pass drawn for every leg', legLines().length===5, legLines().length);
}

head('Deleting a stop moved to right-click on its badge');
{
  reset();
  drop('playerBlue',60,120);
  drop('playerBlue',200,120);
  $('modeBall').click();
  click(A(),60,120); click(B(),200,120); click(A(),60,120);
  ok('three stops to start with', stops().length===3, stops().length);

  rclick(badge(1),0,0);
  ok('right-clicking the middle badge removes that stop', stops().length===2, stops().length);
  ok('and the survivors renumber from 1',
     badges().map(b=>b.dataset.stop).join(',')==='0,1',
     badges().map(b=>b.dataset.stop).join(','));
  ok('the status names the stop that went', /Stop 2 removed/.test(status()), status());
  $('undoBtn').click();
  ok('undo puts it back', stops().length===3, stops().length);

  /* Right-clicking empty grass still pops the last stop, which is the older
     gesture and the one that matches Run mode. Both had to keep working. */
  rclick(svg(),300,40);
  ok('right-clicking off the path still pops the last stop', stops().length===2, stops().length);
  $('undoBtn').click();

  /* Alt is not a deleting modifier, whatever it might look like: alt-drag pans
     the pitch from anywhere, so an alt-press never reaches the ball tool at all.
     Asserting it here stops anyone re-introducing alt-click as a second way to
     delete and finding it silently dead. */
  const n0=stops().length;
  click(badge(0),0,0,{altKey:true});
  ok('alt-click on a badge does nothing — alt belongs to panning',
     stops().length===n0, `${n0} -> ${stops().length}`);
}

head('Shift-click on a badge still names the foot');
{
  reset();
  drop('playerBlue',60,120);
  drop('playerBlue',200,120);
  $('modeBall').click();
  click(A(),60,120); click(B(),200,120); click(A(),60,120);
  const before=stops();
  click(badge(2),0,0,{shiftKey:true});
  const after=stops();
  ok('shift-clicking the return stop moves it to the other foot',
     dist(before[2],after[2])>0.5 && after.length===3,
     `${before[2].x.toFixed(2)},${before[2].y.toFixed(2)} -> ${after[2].x.toFixed(2)},${after[2].y.toFixed(2)}`);
  ok('and leaves the first stop on the same player alone',
     near(before[0].x,after[0].x,1e-9) && near(before[0].y,after[0].y,1e-9),
     `${after[0].x},${after[0].y}`);
  click(badge(2),0,0,{shiftKey:true}); click(badge(2),0,0,{shiftKey:true});
  ok('three shifts cycle back round to where it started',
     dist(stops()[2],before[2])<1e-9, JSON.stringify(stops()[2]));
  ok('and the status says which foot', /foot/.test(status()), status());
}

head('Each visit picks its own foot from the pass coming in');
{
  reset();
  drop('playerBlue',120,60);          // A, up the pitch
  drop('playerBlue',120,180);         // B, down the pitch
  $('modeBall').click();
  click(A(),120,60);                    // stop 1: no pass in yet, so the centre
  click(B(),120,180);
  click(A(),120,60);                    // stop 3: the ball arrives from below
  const s=stops(), a=tf(A());
  ok('the opening stop sits on the player centre, having no pass to receive',
     dist(s[0],a)<1e-6, `${s[0].x},${s[0].y} vs ${a.x},${a.y}`);
  ok('but the return stop is out on a foot',
     dist(s[2],a)>1.4, dist(s[2],a).toFixed(3));
}

head('A stop on a player is played to where that player IS');
{
  reset();
  drop('playerBlue',60,120);          // A, the passer, stays put
  drop('playerBlue',200,120);         // B, who plays it back and then runs on
  $('modeBall').click();
  click(A(),60,120); click(B(),200,120); click(A(),60,120);

  // A runs onto the return pass instead of standing still to receive it
  $('modeRun').click();
  click(A(),60,120);
  click(svg(),60,40);
  const wp={x:tf(A()).x, y:40};
  $('modeSelect').click();

  $('playBtn').click();
  step(0);
  step(6000,300);
  const a=tf(A()), b=ballAt();
  ok('the passer has made their run', Math.abs(a.y-wp.y)<1.2, `${a.y.toFixed(1)} vs ${wp.y}`);
  ok('and the ball is played into them, not to the spot they left',
     b && dist(b,a)<3, b&&`${b.x.toFixed(1)},${b.y.toFixed(1)} vs ${a.x.toFixed(1)},${a.y.toFixed(1)}`);
  ok('which is well clear of where the move began',
     b && Math.abs(b.y-120)>10, b&&b.y.toFixed(1));
}

/* The measured length of the ball path, which the app reports when the drill
   finishes. This is the only window onto what buildLegs decided at kick-off, and
   it is the number that would move if the schedule ever started chasing runners
   instead of merely re-aiming at them. */
const played=()=>{const m=/Drill complete — ([\d.]+) yd/.exec(status());return m&&+m[1];};
const playOut=()=>{$('playBtn').click(); step(0); step(9000,450); return played();};

head('Re-aiming a leg does not re-time it');
{
  /* The endpoints move but the schedule does not. Letting the timetable chase
     runners would be circular — a run triggered by a pass would change the
     length of the pass that triggered it — so legs are measured once at kick-off
     and only re-aimed per frame. The observable consequence is that the path is
     the same length whether or not the receiver runs off it. */
  reset();
  drop('playerBlue',60,120); drop('playerBlue',200,120);
  $('modeBall').click();
  click(A(),60,120); click(B(),200,120); click(A(),60,120);
  $('modeSelect').click();
  const still=playOut();

  $('modeRun').click(); click(A(),60,120); click(svg(),60,40);
  $('modeSelect').click();
  const running=playOut();
  ok('the drill completes both times', still!=null && running!=null, `${still} / ${running}`);
  ok('and the ball path measures the same whether the receiver runs or stands',
     still!=null && running!=null && Math.abs(still-running)<0.05, `${still} vs ${running}`);
}

head('Restarting mid-drill replays the same drill');
{
  /* Now that a stop resolves to a LIVE pose, rebuilding the path while an old
     sim is still posing people would measure the new one from wherever the last
     one happened to leave everybody — pressing Restart would quietly redraw the
     drill a little shorter each time. simStop has to come before buildLegs. */
  reset();
  drop('playerBlue',60,120); drop('playerBlue',200,120);
  $('modeBall').click();
  click(A(),60,120); click(B(),200,120); click(A(),60,120);
  $('modeRun').click(); click(B(),200,120); click(svg(),200,50);
  $('modeSelect').click();

  const first=playOut();
  $('restartBtn').click(); step(0); step(9000,450);   // restart from a posed pitch
  const second=played();
  $('restartBtn').click(); step(0); step(9000,450);
  const third=played();
  ok('a restart measures the same drill, not the one left posed on the pitch',
     first!=null && second!=null && third!=null &&
     Math.abs(first-second)<1e-6 && Math.abs(first-third)<1e-6,
     `${first} / ${second} / ${third}`);
}

head('A return pass survives a save, a load and a rotation');
{
  reset();
  drop('playerBlue',60,120); drop('playerBlue',200,120);
  $('modeBall').click();
  click(A(),60,120); click(B(),200,120); click(A(),60,120);
  $('modeSelect').click();
  const before=stops();

  $('setupName').value='give and go';
  $('saveSetup').click();
  reset();
  ok('the pitch really is clear again', stops().length===0 && items().length===0);
  $('setupList').value='give and go';
  $('loadSetup').click();
  ok('the loaded drill still has three stops', stops().length===3, stops().length);
  ok('with the third back on the first player',
     dist(stops()[2],tf(items()[0]))<3, JSON.stringify(stops()[2]));
  ok('and every stop where it was',
     before.every((p,i)=>dist(p,stops()[i])<1e-6),
     stops().map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));

  /* Stops on players are stored as references, so a rotation moves them by
     moving the players — nothing about the path itself needs rotating. The test
     is that the return stop is still on the same player afterwards. */
  $('rotateBtn').click();
  ok('a rotation keeps all three stops', stops().length===3, stops().length);
  ok('and the return stop is still on the player it names',
     dist(stops()[2],tf(items()[0]))<3,
     `${JSON.stringify(stops()[2])} vs ${JSON.stringify(tf(items()[0]))}`);
  $('rotateBtn').click(); $('rotateBtn').click(); $('rotateBtn').click();
}

head('Deleting a player takes every visit to them out of the path');
{
  reset();
  drop('playerBlue',60,120); drop('playerBlue',200,120);
  $('modeBall').click();
  click(A(),60,120); click(B(),200,120); click(A(),60,120); click(B(),200,120);
  ok('four stops across two players', stops().length===4, stops().length);
  $('modeSelect').click();
  /* Deleting A has to clear BOTH of A's stops. A path that resolved one and not
     the other would renumber wrongly and draw a pass to nothing. In select mode
     a press-and-release that never moves is the delete gesture. */
  click(A(),60,120);
  ok('the player is gone', items().length===1, items().length);
  ok('and both of their visits went with them, leaving the other two',
     stops().length===2, stops().length);
  ok('the badges renumber from 1 with no gap',
     badges().map(b=>b.dataset.stop).join(',')==='0,1',
     badges().map(b=>b.dataset.stop).join(','));
  /* Both survivors are on the one remaining player, and both visits chose the
     same foot because the ball came in from the same side each time — so they
     land on the same point and the app draws no pass between them. A line here
     would be a pass from a player to themselves, going nowhere. */
  ok('both survivors sit on the player who is left',
     stops().every(p=>dist(p,tf(A()))<3), stops().map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
  ok('and no pass is drawn between two stops in the same place',
     legLines().length===0, legLines().length);
  $('undoBtn').click();
  ok('undo brings the player and all four stops back',
     items().length===2 && stops().length===4, `${items().length} items, ${stops().length} stops`);
}

  const t=`\n${pass} passed, ${fail} failed`;
  console.log(R.join('\n')+'\n'+t);
  console.log('runtime errors:', errs.length?errs:'none');
},400);
