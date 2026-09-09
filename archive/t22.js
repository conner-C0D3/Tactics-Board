/* t22 — when a run goes, how long it waits, and how hard it is run.

   t21 proved a run happens. This suite is about the run happening at the right
   MOMENT, which is the part a coach argues about: the third man goes when the
   ball reaches the second stop, half a second late, at a sprint.

   The assertion that carries the suite is the one where a run triggered off a
   later stop stands still while the ball travels its first leg. Nothing in the
   old ball-distance clock could express that — a run keyed to distance travelled
   started as soon as the ball did — so it is the single check that would go red
   if the shared seconds clock were quietly reverted.

   Everything is read through the DOM. The app's state is module-scoped and
   deliberately unreachable, so the test is held to the surface a coach has. */
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');

let rafQ=[],rafId=1,now=0,errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://e.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  w.performance.now=()=>now;              // a stubbed clock: runs are timed in seconds
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
const rclick=(el,x,y)=>el.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:x,clientY:y,button:2}));
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
const tf=g=>{const m=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)(?: rotate\(([-\d.]+)\))?/);
             return{x:+m[1],y:+m[2],rot:m[3]===undefined?0:+m[3]};};
const arm=k=>{const b=d.querySelector(`.kit[data-kit="${k}"]`);if(!b.classList.contains('on'))b.click();};
const wpHits=()=>[...d.querySelectorAll('.field-wrap.on .run-layer [data-wp]')];
const runPts=id=>wpHits().filter(c=>c.dataset.run===id)
  .sort((a,b)=>+a.dataset.wp-+b.dataset.wp)
  .map(c=>({x:+c.getAttribute('cx'),y:+c.getAttribute('cy')}));
const idOf=i=>items()[i].dataset.id;
const runOf=i=>runPts(idOf(i));
const stopBadges=()=>[...d.querySelectorAll('.field-wrap.on .path-layer [data-stop]')];

const $=id=>d.getElementById(id);
const panel=()=>$('runOpts');
const shown=()=>panel().style.display!=='none';
const trigOpts=()=>[...$('runTrig').options].map(o=>o.textContent);
const fire=(id,v)=>{const e=$(id);e.value=String(v);e.dispatchEvent(new w.Event('change',{bubbles:true}));};

const U=3;                                 // units per yard
function reset(){ $('modeSelect').click(); $('clearBtn').click(); }
function drop(kit,x,y){
  $('modeSelect').click();
  arm(kit);
  click(svg(),x,y);
  const b=d.querySelector(`.kit[data-kit="${kit}"]`); if(b.classList.contains('on')) b.click();
  return items()[items().length-1];
}
/* The stock drill for the timing checks: a passer on the left, a receiver in the
   middle, a third man on the right who runs straight up. Two ball legs, so a
   trigger on stop 2 has something to wait for that is measurably later than the
   kick. Returns the runner's home and their single waypoint. */
function drill(){
  reset();
  drop('playerBlue',60,200);              // 0 — passer
  drop('playerBlue',200,200);             // 1 — receiver
  drop('playerBlue',340,200);             // 2 — third man, the one who runs
  $('modeBall').click();
  click(items()[0],60,200);
  click(items()[1],200,200);
  click(items()[2],340,200);
  $('modeRun').click();
  click(items()[2],340,200);
  click(svg(),340,60);                    // straight up the screen
  return { home:tf(items()[2]), wp:runOf(2)[0] };
}
// how far the third man has moved from home, in yards
const goneYd=home=>{const p=tf(items()[2]);return Math.hypot(p.x-home.x,p.y-home.y)/U;};

setTimeout(()=>{

head('The run panel only appears when there is a run to talk about');
{
  reset();
  ok('hidden in Select mode with an empty field', !shown());
  drop('playerBlue',60,120);
  $('modeRun').click();
  ok('still hidden in Run mode with nobody armed', !shown());
  click(items()[0],60,120);
  ok('appears when a player is armed', shown());
  ok('and names who it is talking about', /Player/.test($('runWho').textContent),
     $('runWho').textContent);
  click(items()[0],60,120);               // clicking them again finishes the run
  ok('hides again when they are disarmed', !shown());

  /* Leaving the mode has to take the panel with it. The controls edit whoever is
     armed, and nobody is armed outside Run mode, so a panel left on screen would
     be three inputs wired to nothing. */
  click(items()[0],60,120);
  ok('armed again', shown());
  $('modeSelect').click();
  ok('leaving Run mode hides it', !shown());
  $('modeBall').click();
  ok('and it stays hidden in Ball mode', !shown());
}

head('The trigger list is built from the ball path that exists right now');
{
  reset();
  drop('playerBlue',60,120);
  $('modeRun').click();
  click(items()[0],60,120);
  /* No ball path at all. The run still has to be playable — a drill can be all
     movement and no ball — so the list says so rather than being empty. */
  ok('with no ball path there is one option', trigOpts().length===1, trigOpts().length);
  ok('and it reads "at the start"', trigOpts()[0]==='at the start', trigOpts()[0]);

  drill();
  ok('three stops on the path', stopBadges().length===3, stopBadges().length);
  ok('one trigger option per stop', trigOpts().length===3, trigOpts().length);
  /* "on the pass" rather than "at stop 1": stop 0 is where the ball starts, so
     waiting for it means going the instant the ball is struck, which is what a
     coach calls it. */
  ok('the first is named for the kick, not the stop',
     trigOpts()[0]==='on the pass', trigOpts()[0]);
  ok('the rest are numbered the way the badges are',
     trigOpts()[1]==='at stop 2' && trigOpts()[2]==='at stop 3', trigOpts().join(' / '));
  ok('and it starts on the pass', $('runTrig').value==='0', $('runTrig').value);
  ok('with no delay', +$('runDelay').value===0, $('runDelay').value);
  ok('at the default running speed', $('runSpeed').value==='6', $('runSpeed').value);
}

head('A run triggered off a later stop waits for the ball');
{
  /* THE assertion. The ball takes a measurable time to cross the first leg; a run
     keyed to stop 2 must not have moved a yard while that is happening, and must
     be well down the pitch once it has. The old distance-based clock could not
     tell those two moments apart. */
  const { home } = drill();
  fire('runTrig',1);                      // go when the ball reaches stop 2
  ok('the panel kept the choice', $('runTrig').value==='1');
  ok('and the status says so in words a coach uses',
     /stop 2/.test($('status').textContent), $('status').textContent);

  $('simSpeed').value='10';                // 10 yd/s — the first leg is ~46 yd
  $('playBtn').click();
  step(0);
  step(1200,60);                          // ball is still on leg one
  ok('the runner has not moved while the ball is in flight', goneYd(home)<0.3,
     goneYd(home).toFixed(2)+' yd');
  step(4000,200);
  ok('but goes once the ball gets there', goneYd(home)>8, goneYd(home).toFixed(1)+' yd');
  $('modeSelect').click();

  // and the control case: the same run on the pass is already moving at 1.2s
  const b=drill();
  $('simSpeed').value='10';
  $('playBtn').click();
  step(0);
  step(1200,60);
  ok('the same run set to go on the pass is already under way at that moment',
     goneYd(b.home)>4, goneYd(b.home).toFixed(1)+' yd');
  $('modeSelect').click();
}

head('Delay holds the runner past the cue');
{
  const a=drill();
  $('simSpeed').value='10';
  $('playBtn').click(); step(0); step(600,40);
  const plain=goneYd(a.home);
  $('modeSelect').click();

  const b=drill();
  fire('runDelay',0.5);
  ok('the delay is kept', +$('runDelay').value===0.5, $('runDelay').value);
  ok('and described in seconds', /0\.5/.test($('status').textContent), $('status').textContent);
  $('simSpeed').value='10';
  $('playBtn').click(); step(0); step(600,40);
  const held=goneYd(b.home);
  /* 0.6s in with half a second eaten by the delay, only 0.1s of running is left:
     about 0.6 yd at the default 6 yd/s, against 3.6 yd without it. */
  ok('half a second of delay costs half a second of ground',
     held<plain-2, `${held.toFixed(2)} yd vs ${plain.toFixed(2)} yd`);
  ok('but they do eventually go', held>=0 && (step(4000,200), goneYd(b.home)>8),
     goneYd(b.home).toFixed(1)+' yd');
  $('modeSelect').click();

  // a negative delay is a different drill, not a delay, so it is refused
  drill();
  fire('runDelay',-2);
  ok('a negative delay is clamped to none', +$('runDelay').value===0, $('runDelay').value);
}

head('Speed changes how much ground is covered');
{
  const mk=sp=>{
    const a=drill();
    if (sp!==6) fire('runSpeed',sp);
    $('playBtn').click(); step(0); step(500,40);
    const g=goneYd(a.home);
    $('modeSelect').click();
    return g;
  };
  const jog=mk(3), run=mk(6), sprint=mk(9);
  ok('a jog covers less than a run', jog<run-0.5, `${jog.toFixed(2)} vs ${run.toFixed(2)} yd`);
  ok('and a sprint more', sprint>run+0.5, `${sprint.toFixed(2)} vs ${run.toFixed(2)} yd`);
  /* Half a second at 9 yd/s is 4.5 yd. Checking the number, not just the order,
     so a speed that was applied as a multiplier on the wrong thing would show. */
  ok('a sprint is 9 yd/s on the nose', near(sprint,4.5,0.8), sprint.toFixed(2)+' yd');
  ok('a jog is 3 yd/s', near(jog,1.5,0.6), jog.toFixed(2)+' yd');

  // the panel reads back what was set, so re-arming a player shows their real speed
  drill();
  fire('runSpeed',9);
  click(items()[2],340,200);              // disarm
  click(items()[2],340,200);              // and arm again
  ok('the panel remembers the speed on the player', $('runSpeed').value==='9',
     $('runSpeed').value);
  ok('the run itself is untouched by any of this', runOf(2).length===1);
}

head('Timing survives the drill being edited underneath it');
{
  /* A stop deleted from under a trigger must clamp, not reset. Losing the timing
     on an unrelated edit is the kind of thing that makes a planner untrustworthy:
     you tidy the ball path and every run silently goes back to the kick. */
  drill();
  fire('runTrig',2);                      // the last stop
  ok('set to the last stop', $('runTrig').value==='2');
  $('modeBall').click();
  rclick(svg(),0,0);                      // pop the last stop off the path
  ok('the path is shorter', stopBadges().length===2, stopBadges().length);
  $('modeRun').click();
  click(items()[2],340,200);
  ok('the list shrank with it', trigOpts().length===2, trigOpts().length);
  ok('and the trigger clamped to the last surviving stop rather than resetting',
     $('runTrig').value==='1', $('runTrig').value);

  // undo has to put the timing back with everything else
  drill();
  fire('runTrig',1);
  fire('runDelay',0.75);
  $('undoBtn').click();
  $('modeRun').click();
  click(items()[2],340,200);
  ok('undo rolls the delay back', +$('runDelay').value===0, $('runDelay').value);
  ok('and leaves the trigger where it was', $('runTrig').value==='1', $('runTrig').value);
}

head('Timing is part of the drill, so it saves and loads');
{
  /* Trigger, delay and speed live on the item alongside the waypoints, so they
     should ride the existing save format with no special handling — that is the
     whole reason for putting them there rather than in a side table. */
  drill();
  fire('runTrig',1);
  fire('runDelay',0.5);
  fire('runSpeed',9);
  $('setupName').value='trigtest';
  $('saveSetup').click();
  reset();
  ok('the field really is empty again', items().length===0);
  $('setupList').value='trigtest';
  $('loadSetup').click();
  ok('the loaded drill still has the run', runOf(2).length===1, runOf(2).length);
  ok('and the ball path it was timed against', stopBadges().length===3, stopBadges().length);
  $('modeRun').click();
  click(items()[2],340,200);
  ok('the trigger came back', $('runTrig').value==='1', $('runTrig').value);
  ok('the delay came back', +$('runDelay').value===0.5, $('runDelay').value);
  ok('and so did the speed', $('runSpeed').value==='9', $('runSpeed').value);

  /* The real proof is not the panel reading back the right numbers but the
     loaded drill PLAYING the way it was written: waiting for stop 2, then half a
     second more, then going at a sprint. */
  const home=tf(items()[2]);
  $('modeSelect').click();
  $('simSpeed').value='10';
  $('playBtn').click(); step(0); step(1200,60);
  ok('a loaded run still waits for its cue', goneYd(home)<0.3, goneYd(home).toFixed(2)+' yd');
  step(4000,200);
  ok('and then runs', goneYd(home)>8, goneYd(home).toFixed(1)+' yd');
  $('modeSelect').click();
}

head('Two runners, two different cues, one drill');
{
  /* The reason the timing lives on the player and not on the mode: in a real
     pattern the second runner goes later than the first, and both are playing
     from the same clock. */
  reset();
  drop('playerBlue',60,200);
  drop('playerBlue',200,200);
  drop('playerBlue',340,200);
  $('modeBall').click();
  click(items()[0],60,200);
  click(items()[1],200,200);
  click(items()[2],340,200);
  $('modeRun').click();
  click(items()[1],200,200); click(svg(),200,60); click(items()[1],200,60);
  click(items()[2],340,200); click(svg(),340,60);
  fire('runTrig',1);                      // the third man waits for stop 2
  const h1=tf(items()[1]), h2=tf(items()[2]);
  $('simSpeed').value='10';
  $('playBtn').click(); step(0); step(1200,60);
  const g1=Math.hypot(tf(items()[1]).x-h1.x,tf(items()[1]).y-h1.y)/U;
  const g2=Math.hypot(tf(items()[2]).x-h2.x,tf(items()[2]).y-h2.y)/U;
  ok('the first runner is away on the pass', g1>4, g1.toFixed(1)+' yd');
  ok('while the second is still waiting for his cue', g2<0.3, g2.toFixed(2)+' yd');
  step(4000,200);
  const e1=Math.hypot(tf(items()[1]).x-h1.x,tf(items()[1]).y-h1.y)/U;
  const e2=Math.hypot(tf(items()[2]).x-h2.x,tf(items()[2]).y-h2.y)/U;
  ok('and by the end both have run', e1>8 && e2>8,
     `${e1.toFixed(1)} / ${e2.toFixed(1)} yd`);
  $('modeSelect').click();
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log('runtime errors:', errs.length?errs:'none');
},400);
