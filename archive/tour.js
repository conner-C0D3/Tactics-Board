/* tour.js — films a feature tour of the field planner.

   Every frame is the app's own pitch, cloned live out of the DOM. Nothing here
   draws a cone or a pass: it clicks the real buttons and photographs whatever
   comes out, so a broken feature shows up as a broken frame rather than as a
   nice picture of what the feature was supposed to do.

   Two clocks. `now` is the app's performance.now, which only advances when a
   beat asks for playback. Frames are emitted at FPS regardless, so a static beat
   (placing cones) and a moving one (a ball being played) cost the same on the
   timeline and the video runs at a steady speed either way.

   The pitch <svg> names its gradients and grid after the field, so every frame
   carries the same ids. One frame per file means no collision — but the caption
   band and the crop are composed around it here, not in the app. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path');
const OUT='/sessions/gracious-epic-cerf/mnt/outputs';
const DIR='/tmp/frames';   // scratch: the mounted outputs dir refuses deletes,
                           // so a re-run could not clear the last pass's frames
fs.rmSync(DIR,{recursive:true,force:true}); fs.mkdirSync(DIR,{recursive:true});
const html=fs.readFileSync(OUT+'/soccer-field-planner.html','utf8');

let rafQ=[],rafId=1,now=0;const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://e.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  w.performance.now=()=>now;
  w.print=()=>{};
  w.requestAnimationFrame=cb=>{rafQ.push([rafId,cb]);return rafId++;};
  w.cancelAnimationFrame=id=>{rafQ=rafQ.filter(e=>e[0]!==id);};
}});
dom.virtualConsole.on('jsdomError',e=>errs.push(e.message));
const w=dom.window,d=w.document,$=i=>d.getElementById(i);

/* ---------- driving the app ---------- */
const svg=()=>d.querySelector('.field-wrap.on svg');
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
const pe=(el,t,x,y,ex={})=>el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1,...ex}));
const click=(el,x,y,ex={})=>{pe(el,'pointerdown',x,y,ex);pe(el,'pointerup',x,y,ex);};
const drag=(x1,y1,x2,y2)=>{pe(svg(),'pointerdown',x1,y1);pe(svg(),'pointermove',x2,y2);pe(svg(),'pointerup',x2,y2);};
const arm=k=>{const b=d.querySelector(`.kit[data-kit="${k}"]`);if(b&&!b.classList.contains('on'))b.click();};
const fire=(id,v,ev)=>{$(id).value=String(v);$(id).dispatchEvent(new w.Event(ev||'change',{bubbles:true}));};
const it=i=>items()[i];                    // always fresh: renders replace the nodes

// client px are pitch units here, and a unit is a third of a yard
const YD=3;
const P=(ox,oy)=>(a,b)=>[ox+a*YD, oy+b*YD];

/* ---------- the film ---------- */
const FPS=30;
let frame=0, caption='', sub='';
const shots=[];

/* Take one photograph. The viewBox is whatever the app is showing, so a beat
   that zooms or rotates is captured as the app has it. */
function shoot(){
  const s=svg();
  shots.push({ n:frame, vb:s.getAttribute('viewBox'), body:s.innerHTML, cap:caption, sub });
  frame++;
}
// hold the current picture still for `sec` seconds of finished video
const hold=sec=>{ for(let i=0;i<Math.round(sec*FPS);i++) shoot(); };
const title=(c,s='')=>{ caption=c; sub=s; };
/* Run the app's own clock forward, photographing at FPS. Playback is the only
   thing that needs this; everything else is instantaneous to the app. */
function play(sec){
  const n=Math.round(sec*FPS), dt=1000/FPS;
  for(let i=0;i<n;i++){
    now+=dt;
    const q=rafQ; rafQ=[]; q.forEach(([,cb])=>cb(now));
    shoot();
  }
}
const stopSim=()=>{ if(!$('playBtn').textContent.includes('▶')) $('playBtn').click(); };

setTimeout(()=>{
  $('modeSelect').click(); $('clearBtn').click();
  const A=P(70,60);                       // the corner most drills are built from

  /* ---------- 1. placing equipment ---------- */
  title('Place equipment','pick it on the left, click the pitch');
  hold(1.2);
  arm('coneOrange');
  for (const [a,b] of [[0,0],[12,0],[12,12],[0,12]]){ click(svg(),...A(a,b)); hold(0.22); }
  hold(0.7);
  arm('playerBlue');
  for (const [a,b] of [[-3,-3],[15,-3],[15,15],[-3,15]]){ click(svg(),...A(a,b)); hold(0.2); }
  arm('playerRed'); click(svg(),...A(6,6));
  title('A rondo, four minutes old','12 × 12, four blue and one red');
  hold(1.6);

  /* ---------- 2. rows ---------- */
  $('modeSelect').click(); $('clearBtn').click();
  title('Row mode','drag a line of cones, spaced by the yard');
  hold(1.0);
  arm('coneYellow'); $('modeRow').click();
  fire('rowMode','gap'); fire('rowVal',4,'input');
  drag(...A(0,0), ...A(28,0));
  hold(0.9);
  fire('rowMode','count'); fire('rowVal',7,'input');
  arm('poleRed'); drag(...A(0,10), ...A(28,10));
  title('Or a fixed count','seven poles, evenly spread');
  hold(1.5);

  /* ---------- 3. tape ---------- */
  $('modeTape').click();
  title('Tape','draw the lines a drill needs');
  hold(0.8);
  drag(...A(0,-4), ...A(28,-4));
  hold(0.5);
  d.querySelector('#tapeOpts .swatch:not(.on)').click();
  $('dashBtn').click();
  drag(...A(14,-6), ...A(14,14));
  hold(1.5);

  /* ---------- 4. the box measure ---------- */
  $('modeSelect').click(); $('clearBtn').click();
  title('Box mode','drag out an area to measure it');
  hold(0.9);
  $('modeBox').click();
  pe(svg(),'pointerdown',...A(0,0));
  for (let k=1;k<=10;k++){ pe(svg(),'pointermove',...A(2.4*k,1.8*k)); shoot(); shoot(); }
  pe(svg(),'pointerup',...A(24,18));
  title('Box mode', $('boxDims').textContent.trim());
  hold(1.1);
  fire('boxSpacing',3);
  $('boxCones').click();
  title('Then build it','cones every 3 yards round the perimeter');
  hold(1.8);

  /* ---------- 5. ball path ---------- */
  $('modeSelect').click(); $('clearBtn').click();
  arm('playerBlue');
  const S=[[0,18],[10,0],[22,14],[30,0]];
  S.forEach(p=>click(svg(),...A(...p)));
  title('Ball Path','click players in the order the ball goes');
  hold(1.2);
  $('modeBall').click();
  for (let i=0;i<4;i++){ click(it(i),...A(...S[i])); hold(0.45); }
  hold(0.9);
  title('Playback','constant speed, so the timings are real');
  $('playBtn').click(); play(3.4);
  hold(0.6); stopSim();

  /* ---------- 6. feet ---------- */
  title('Named feet','shift-click a stop to say which foot');
  hold(1.0);
  const badge=i=>d.querySelector(`.field-wrap.on [data-stop="${i}"]`);
  click(badge(1),0,0,{shiftKey:true}); hold(0.7);
  click(badge(2),0,0,{shiftKey:true}); hold(0.7);
  title('Named feet','the ball is played to that foot, not the man');
  $('playBtn').click(); play(3.4);
  hold(0.5); stopSim();

  /* ---------- 7. the give-and-go ---------- */
  $('modeSelect').click(); $('clearBtn').click();
  arm('playerBlue'); click(svg(),...A(0,20)); click(svg(),...A(0,0));
  title('Give-and-go','click the same player twice to play it back');
  hold(1.2);
  $('modeBall').click();
  click(it(0),...A(0,20)); hold(0.5);
  click(it(1),...A(0,0));  hold(0.5);
  click(it(0),...A(0,20)); hold(1.0);
  $('modeRun').click();
  click(it(0),...A(0,20));
  click(svg(),...A(9,-6));
  $('modeSelect').click();
  title('Give-and-go','and he runs onto the return');
  hold(1.2);
  $('playBtn').click(); play(4.2);
  hold(0.8); stopSim();

  /* ---------- 8. runs ---------- */
  $('modeSelect').click(); $('clearBtn').click();
  arm('playerBlue'); click(svg(),...A(0,16));
  arm('coneOrange');
  for(let i=0;i<5;i++) click(svg(),...A(4+i*5,8));
  title('Runs','click a player, then click their waypoints');
  hold(1.1);
  $('modeRun').click();
  click(it(0),...A(0,16));
  for (const p of [[6,4],[13,12],[20,2],[27,10]]){ click(svg(),...A(...p)); hold(0.4); }
  click(it(0),...A(0,16));                    // click the player again to finish
  $('modeSelect').click();
  hold(0.8);
  $('playBtn').click(); play(3.6);
  hold(0.4); stopSim();

  /* ---------- 9. freehand runs ---------- */
  $('modeSelect').click(); $('clearBtn').click();
  arm('playerBlue'); click(svg(),...A(2,16));
  title('Or draw the run','drag from the player and sketch the shape');
  hold(1.1);
  $('modeRun').click();
  pe(it(0),'pointerdown',...A(2,16));
  for (let k=0;k<=26;k++){
    const t=k/26, x=2+t*28, y=16-10*Math.sin(t*Math.PI)-t*4;
    pe(svg(),'pointermove',...A(x,y));
    if(k%2===0) shoot();
  }
  pe(svg(),'pointerup',...A(30,2));
  $('modeSelect').click();
  hold(1.0);
  $('playBtn').click(); play(3.0);
  hold(0.4); stopSim();

  /* ---------- 10. triggers ---------- */
  $('modeSelect').click(); $('clearBtn').click();
  arm('playerBlue'); click(svg(),...A(0,20)); click(svg(),...A(24,20));
  $('modeBall').click(); click(it(0),...A(0,20)); click(it(1),...A(24,20));
  $('modeRun').click();
  click(it(1),...A(24,20)); click(svg(),...A(30,2)); click(it(1),...A(24,20));
  // hold the run until the ball leaves stop 1, then a beat later
  const trig=[...$('runTrig').options];
  if (trig.length) fire('runTrig', trig[trig.length-1].value);
  fire('runDelay',0.6,'input');
  $('modeSelect').click();
  title('Timed runs','a run can wait for a pass, then break');
  hold(1.6);
  $('playBtn').click(); play(4.0);
  hold(0.5); stopSim();

  /* ---------- 11. formations ---------- */
  $('modeSelect').click(); $('clearBtn').click();
  title('Stamp a formation','a whole side, in shape, in one click');
  hold(1.2);
  const f=[...$('formPick').options].find(o=>/442|4-4-2/i.test(o.value+o.textContent));
  fire('formPick', f? f.value : $('formPick').options[0].value);
  fire('formSide','playerBlue'); fire('formEnd',0);
  $('stampForm').click();
  hold(1.6);
  fire('formSide','playerRed'); fire('formEnd',1);
  $('stampForm').click();
  title('Both sides','eleven against eleven');
  hold(1.8);

  /* ---------- 12. reactive units ---------- */
  const back=[...$('unitPick').options].find(o=>/back four/i.test(o.textContent));
  if (back){
    fire('unitPick', back.value);
    const pol=[...$('unitPolicy').options].find(o=>/block|shape|slide/i.test(o.value+o.textContent));
    if (pol) fire('unitPolicy', pol.value);
    fire('unitAmt',0.75,'input'); fire('unitLag',0.3);
  }
  $('modeBall').click();
  click(svg(),...P(0,0)(60,30)); click(svg(),...P(0,0)(150,64)); click(svg(),...P(0,0)(60,95));
  $('modeSelect').click();
  title('The back four reacts','it holds its line and slides with the ball');
  hold(1.6);
  $('playBtn').click(); play(5.0);
  hold(0.9); stopSim();

  /* ---------- 13. save a drill, build a session, print the plan ----------

     A title card claiming the app saves drills would be exactly the thing this
     script exists not to do. So this beat actually saves two setups under
     names, actually adds them to the session with minutes and coaching points,
     and actually clicks Print plan — and then photographs the sheet the app
     built, cards and all.

     The session strip and the sheet are DOM outside the pitch, and the framing
     for this film is the pitch. So the strip is not filmed; the plan is, as a
     held still at the end, because the plan is the thing a coach walks onto the
     grass holding. */
  const saveAs=name=>{ $('setupName').value=name;
                       $('setupName').dispatchEvent(new w.Event('input',{bubbles:true}));
                       $('saveSetup').click(); };

  $('modeSelect').click(); $('clearBtn').click();
  title('Save a drill by name','the pitch, the path and the runs, kept together');
  hold(0.8);
  arm('coneOrange');
  for (const [a,b] of [[0,0],[12,0],[12,12],[0,12]]) click(svg(),...A(a,b));
  arm('playerBlue');
  for (const [a,b] of [[-3,-3],[15,-3],[15,15],[-3,15]]) click(svg(),...A(a,b));
  arm('playerRed'); click(svg(),...A(6,6));
  $('modeBall').click();
  click(it(0),...A(-3,-3)); click(it(2),...A(15,15)); click(it(1),...A(15,-3));
  $('modeSelect').click();
  saveAs('Rondo 4v1');
  hold(1.6);

  $('clearBtn').click();
  title('Then another','each one saved under its own name');
  hold(0.6);
  arm('playerBlue'); click(svg(),...A(0,18)); click(svg(),...A(18,4));
  arm('coneYellow');
  for (let k=0;k<5;k++) click(svg(),...A(4*k,12));
  $('modeBall').click();
  click(it(0),...A(0,18)); click(it(1),...A(18,4)); click(it(0),...A(0,18));
  $('modeRun').click(); click(it(0),...A(0,18)); click(svg(),...A(12,-2));
  $('modeSelect').click();
  saveAs('Finishing off the one-two');
  hold(1.6);

  /* Build the evening. sesAdd takes whatever is named in the toolbar, so the
     name has to go back in the box before each add. */
  title('Line them up as a session','minutes and coaching points per drill');
  hold(0.6);
  $('sesName').value='Tuesday — passing and finishing';
  $('setupName').value='Rondo 4v1'; $('sesAdd').click();
  $('setupName').value='Finishing off the one-two'; $('sesAdd').click();
  const mins=[...d.querySelectorAll('[data-mins]')], notes=[...d.querySelectorAll('[data-notes]')];
  /* The strip listens on `input`, not `change` — it keeps the running clock in
     step with every keystroke rather than waiting for a box to be left. Firing
     `change` set the values and told the app nothing, and the plan printed
     fifteen minutes a drill with "No coaching points" under both. */
  const setv=(el,v)=>{ el.value=v; el.dispatchEvent(new w.Event('input',{bubbles:true})); };
  if (mins[0]) setv(mins[0],12); if (mins[1]) setv(mins[1],18);
  if (notes[0]) setv(notes[0],'Two touch. Reds press the nearest man.');
  if (notes[1]) setv(notes[1],'Play it back first time, then run onto the return.');
  hold(1.4);

  /* Print, and photograph what the app put on the sheet. window.print is
     stubbed, so the sheet stays in the DOM to be read. */
  $('sesPrint').click();
  const sheet=d.getElementById('planSheet');
  const plan={ title:(d.getElementById('sesName').value||'Training session'),
               sub:(sheet.querySelector('.sub')||{}).textContent||'',
               cards:[...sheet.querySelectorAll('.card')].map(c=>({
                 svg:(c.querySelector('svg')||{}).outerHTML||'',
                 h:(c.querySelector('h2')||{}).textContent||'',
                 meta:(c.querySelector('.meta')||{}).textContent||'',
                 note:(c.querySelector('p')||{}).textContent||'' })) };
  fs.writeFileSync(OUT+'/plan.json',JSON.stringify(plan));

  /* Plan frames carry no pitch. They are marked so the compositor lays out a
     sheet instead of trying to crop grass that is not there. */
  title('Print the plan','every drill, in order, with its clock');
  for (let i=0;i<Math.round(5.5*FPS);i++){
    shots.push({ n:frame++, kind:'plan', vb:null, body:'', cap:caption, sub });
  }
  console.log('plan cards:',plan.cards.length, plan.cards.map(c=>c.h).join(' | '));
  console.log('plan sub:',plan.sub);

  const out={fps:FPS,frames:shots.length,shots:shots.map(s=>({n:s.n,vb:s.vb,cap:s.cap,sub:s.sub,kind:s.kind}))};
  shots.forEach(s=>fs.writeFileSync(path.join(DIR,`f${String(s.n).padStart(5,'0')}.svgbody`),
                                    JSON.stringify({vb:s.vb,body:s.body,cap:s.cap,sub:s.sub,kind:s.kind||'pitch'})));
  fs.writeFileSync(OUT+'/tour-manifest.json',JSON.stringify(out.shots.map(s=>({n:s.n,cap:s.cap,sub:s.sub,kind:s.kind||'pitch'}))));
  console.log('frames:',shots.length,'=',(shots.length/FPS).toFixed(1),'s');
  console.log('errors:',errs.length?errs.slice(0,4):'none');
},400);
