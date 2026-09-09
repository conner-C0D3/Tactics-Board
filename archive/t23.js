/* t23 — formations, units, and defensive shape that reacts to the ball.

   The claim this suite has to hold down is the one the whole module is built on:
   a policy may only apply a RIGID transform to a unit. So the assertion that
   matters most is not "the block moved" but "every member of the block moved by
   the same vector". A policy that quietly moved one defender would still look
   plausible on screen and would still pass a test that only checked the centroid.

   Everything is read through the DOM, as in t21 and t22 — the app's state is
   module-scoped and deliberately unreachable. */
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

let pass=0,fail=0;
const ok=(m,c,x)=>{c?pass++:fail++;console.log(`  ${c?'ok  ':'FAIL'} ${m}${x!==undefined?`   [${x}]`:''}`);};
const near=(a,b,t=0.4)=>Math.abs(a-b)<=t;
const head=t=>console.log('\n'+t);

const step=(ms,n=1)=>{for(let i=0;i<n;i++){now+=ms/n;const q=rafQ;rafQ=[];q.forEach(([,cb])=>cb(now));}};
const svg=()=>d.querySelector('.field-wrap.on svg');
const pe=(el,t,x,y)=>el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1}));
const click=(el,x,y)=>{pe(el,'pointerdown',x,y);pe(el,'pointerup',x,y);};
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
const tf=g=>{const m=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)(?: rotate\(([-\d.]+)\))?/);
             return{x:+m[1],y:+m[2],rot:m[3]===undefined?0:+m[3]};};
const hulls=()=>[...d.querySelectorAll('.field-wrap.on .unit-layer .unit')];
const unitNames=()=>[...d.querySelectorAll('.field-wrap.on .unit-layer text')].map(t=>t.textContent);
const unitOpts=()=>[...$('unitPick').options].map(o=>o.textContent);
const stops=()=>d.querySelectorAll('.field-wrap.on .path-layer [data-stop]').length;
const fire=(id,v,ev)=>{$(id).value=String(v);$(id).dispatchEvent(new w.Event(ev||'change',{bubbles:true}));};
const pickUnit=re=>{const o=[...$('unitPick').options].find(o=>re.test(o.textContent));
                    if(o) fire('unitPick',o.value); return !!o;};

const U=3;
const yd=v=>v/U;
function reset(){ $('modeSelect').click(); $('clearBtn').click(); }
// stamp a formation and hand back the players, in the order they were laid down
function stamp(code,side,end){
  reset();
  fire('formPick',code||'f442');
  fire('formSide',side||'playerBlue');
  fire('formEnd',end==null?0:end);
  $('stampForm').click();
  return items();
}
/* The back four of a stamped 4-4-2: the keeper is laid down first, then the back
   line, so they are items 1..4. Read by position rather than by unit membership
   because membership is exactly what a broken build would get wrong. */
const backFour=()=>items().slice(1,5).map(tf);
const spread=r=>Math.hypot(r[r.length-1].x-r[0].x, r[r.length-1].y-r[0].y);
// the vector each member has travelled from its resting place
const shifts=(a,b)=>a.map((p,i)=>({dx:b[i].x-p.x, dy:b[i].y-p.y}));
// are they all the same vector? this is the rigidity guarantee, in one line
const rigid=(s,t=0.02)=>s.every(v=>near(v.dx,s[0].dx,t)&&near(v.dy,s[0].dy,t));
// a two-stop ball path, in client coordinates
function ballPath(x1,y1,x2,y2){
  $('modeBall').click();
  click(svg(),x1,y1); click(svg(),x2,y2);
  $('modeSelect').click();
}
function setUnit(policy,amount,lag){
  if (policy!=null) fire('unitPolicy',policy);
  if (amount!=null) fire('unitAmt',amount,'input');
  if (lag!=null)    fire('unitLag',lag);
}

setTimeout(()=>{

head('Stamping a formation puts a team down and groups it');
{
  const its=stamp('f442');
  ok('eleven players', its.length===11, its.length);
  ok('one of them is a keeper',
     its.filter(i=>i.dataset.type==='keeper').length===1,
     its.filter(i=>i.dataset.type==='keeper').length);
  ok('and the other ten are the colour that was asked for',
     its.filter(i=>i.dataset.type==='playerBlue').length===10);
  ok('four units', unitOpts().length===4, unitOpts().join(', '));
  ok('named the way a coach would name them',
     unitOpts().join('|')==='Keeper|Back four|Midfield four|Front two', unitOpts().join('|'));
  ok('each unit is drawn', hulls().length===4, hulls().length);
  ok('with its name on the pitch', unitNames().join('|')===unitOpts().join('|'));

  /* Keys in the formation table are prefixed so they are not integer-like. An
     unprefixed "442" would be an array index to the engine and the menu would
     come back in numeric order with 3-4-3 at the top. */
  ok('the menu is in the order it was written, not numeric',
     [...$('formPick').options].map(o=>o.textContent).join(',')
       ==='4-4-2,4-3-3,4-2-3-1,3-5-2,3-4-3',
     [...$('formPick').options].map(o=>o.textContent).join(','));

  const b=backFour();
  ok('the back four stand on a line', b.every(p=>near(p.x,b[0].x,0.01)),
     b.map(p=>p.x.toFixed(0)).join(','));
  ok('spread across the pitch', yd(spread(b))>35, yd(spread(b)).toFixed(1)+' yd');
  ok('in front of their own goal, not on it', yd(b[0].x)>10 && yd(b[0].x)<30,
     yd(b[0].x).toFixed(0)+' yd from the corner');
}

head('Every template lays out a full side');
{
  const shape={f442:[1,4,4,2], f433:[1,4,3,3], f4231:[1,4,2,3,1], f352:[1,3,5,2], f343:[1,3,4,3]};
  for (const code in shape){
    const its=stamp(code);
    const want=shape[code].reduce((a,b)=>a+b,0);
    ok(`${$('formPick').selectedOptions[0].textContent} puts down ${want}`,
       its.length===want, its.length);
    ok(`  ...in ${shape[code].length} units`, unitOpts().length===shape[code].length,
       unitOpts().join(', '));
  }
}

head('Which goal a unit defends is derived, not configured');
{
  const a=stamp('f442',null,0), ax=backFour()[0].x;
  const b=stamp('f442',null,1), bx=backFour()[0].x;
  ok('stamping the other end puts the back four at the other end', bx>ax+100,
     `${yd(ax).toFixed(0)} yd vs ${yd(bx).toFixed(0)} yd`);
  ok('both are full sides', a.length===11 && b.length===11);
}

head('A policy may only move a unit rigidly');
{
  /* The guarantee, stated three ways. If any one of these fails the contract has
     been broken and the word "shape" no longer means anything. */
  for (const pol of ['slide','drop','block']){
    stamp('f442');
    pickUnit(/Back four/);
    setUnit(pol,0.8,0);
    ballPath(200,80,200,320);
    const rest=backFour();
    $('playBtn').click(); step(0); step(1500,60);
    const mid=backFour();
    const s=shifts(rest,mid);
    ok(`${pol}: every member travels the same vector`, rigid(s),
       s.map(v=>`${yd(v.dx).toFixed(1)},${yd(v.dy).toFixed(1)}`).join(' | '));
    ok(`${pol}: and the block actually moved`,
       Math.hypot(s[0].dx,s[0].dy)>1, yd(Math.hypot(s[0].dx,s[0].dy)).toFixed(1)+' yd');
    $('modeSelect').click();
  }
}

head('Each policy moves the way its name says');
{
  const run=(pol,a=0.8)=>{
    stamp('f442');
    pickUnit(/Back four/);
    setUnit(pol,a,0);
    // a ball that moves BOTH across the pitch and up it, so the two axes separate
    ballPath(150,60,150,300);
    const rest=backFour();
    $('playBtn').click(); step(0); step(1500,60);
    const mid=backFour();
    $('modeSelect').click();
    const s=shifts(rest,mid);
    /* One member's shift is the unit's translation plus whatever the squeeze did
       to that member. The MEAN shift is the translation alone, because a squeeze
       about the centroid cancels across the unit — so the mean is what to compare
       when a squeezing policy is in the mix. */
    const m=k=>s.reduce((a,v)=>a+v[k],0)/s.length;
    return { dx:s[0].dx, dy:s[0].dy, mdx:m('dx'), mdy:m('dy') };
  };
  /* The pitch is landscape, so across is screen-y and up the pitch is screen-x.
     A policy that had the axes crossed would still move the block, and would
     still look fine to a test that only measured distance. */
  const sl=run('slide');
  ok('slide goes across the pitch', Math.abs(sl.dy)>3, yd(sl.dy).toFixed(1)+' yd across');
  ok('and not up it', near(sl.dx,0,0.01), yd(sl.dx).toFixed(2)+' yd up');

  const dr=run('drop');
  ok('drop goes up and down the pitch', Math.abs(dr.dx)>3, yd(dr.dx).toFixed(1)+' yd up');
  ok('and not across it', near(dr.dy,0,0.01), yd(dr.dy).toFixed(2)+' yd across');

  const bl=run('block');
  ok('block does both', Math.abs(bl.dx)>3 && Math.abs(bl.dy)>3,
     `${yd(bl.dx).toFixed(1)} up, ${yd(bl.dy).toFixed(1)} across`);
  /* block is drop and slide added together, not a third thing with its own feel.
     Asserting the two components separately is what pins that down — a block
     that had drifted into its own arithmetic would still "do both". */
  ok('block pushes up exactly as far as drop does', near(bl.dx,dr.dx,0.01),
     `${yd(bl.dx).toFixed(2)} vs ${yd(dr.dx).toFixed(2)} yd`);
  ok('and across exactly as far as slide does', near(bl.mdy,sl.mdy,0.01),
     `${yd(bl.mdy).toFixed(2)} vs ${yd(sl.mdy).toFixed(2)} yd`);

  /* Depth is damped against width on purpose: a line shuffles across with the
     ball but does not march up the pitch to match, because the goal behind it
     does not move. press is the undamped comparison — it covers the whole
     offset — so the ratio between them is DEPTH_GAIN, exactly. */
  const pr=run('press',0.5), dp=run('drop',0.5);
  ok('a line pushes up 0.4 of what a press would cover',
     near(dp.dx/pr.dx,0.4,0.01), (dp.dx/pr.dx).toFixed(3));

  stamp('f442'); pickUnit(/Back four/); setUnit('hold',1,0);
  ballPath(150,60,150,300);
  const rest=backFour();
  $('playBtn').click(); step(0); step(1500,60);
  const h=shifts(rest,backFour())[0];
  ok('hold holds', near(h.dx,0,0.01)&&near(h.dy,0,0.01),
     `${h.dx.toFixed(2)},${h.dy.toFixed(2)}`);
  $('modeSelect').click();
}

head('Strength is a dial, and zero means nothing happens');
{
  const at=a=>{
    stamp('f442'); pickUnit(/Back four/); setUnit('block',a,0);
    ballPath(150,60,150,300);
    const rest=backFour();
    $('playBtn').click(); step(0); step(1500,60);
    const s=shifts(rest,backFour())[0];
    $('modeSelect').click();
    return Math.hypot(s.dx,s.dy);
  };
  const z=at(0), half=at(0.5), full=at(1);
  ok('at zero the block does not react at all', near(z,0,0.01), z.toFixed(2));
  ok('half reacts', half>2, yd(half).toFixed(1)+' yd');
  ok('and full reacts further still', full>half+2,
     `${yd(half).toFixed(1)} vs ${yd(full).toFixed(1)} yd`);
}

head('A block squeezes as the ball gets close, and only then');
{
  const sq=(bx,by)=>{
    stamp('f442'); pickUnit(/Back four/); setUnit('block',1,0);
    ballPath(bx,by,bx,by+8);          // a ball that essentially sits still
    const rest=spread(backFour());
    $('playBtn').click(); step(0); step(1500,60);
    const now=spread(backFour());
    $('modeSelect').click();
    return { rest, now };
  };
  // the back four sits around x=73 in world units; a ball on top of it is close
  const close=sq(95,110), far=sq(300,110);
  ok('with the ball on top of them the line tightens', close.now < close.rest-2,
     `${yd(close.rest).toFixed(1)} -> ${yd(close.now).toFixed(1)} yd`);
  ok('with the ball at the far end it stays at full width',
     near(far.now,far.rest,0.01), `${yd(far.rest).toFixed(1)} -> ${yd(far.now).toFixed(1)} yd`);
  /* Squeezing must not break rigidity either — it contracts about the unit's own
     centre, so the block is the same shape, smaller. */
  ok('and a squeezed line is still a straight line',
     (()=>{stamp('f442');pickUnit(/Back four/);setUnit('block',1,0);ballPath(95,110,95,118);
           $('playBtn').click();step(0);step(1500,60);
           const b=backFour();const r=b.every(p=>near(p.x,b[0].x,0.01));
           $('modeSelect').click();return r;})());
}

head('The reaction lag makes a defence chase rather than teleport');
{
  const withLag=l=>{
    stamp('f442'); pickUnit(/Back four/); setUnit('slide',0.9,l);
    /* The ball starts level with the back four and travels across, so the block's
       displacement only ever grows. Starting the ball out on a touchline would
       make it shrink as the ball came back to the middle, and a lagged unit would
       then be FURTHER from home than a sharp one — true, but not a lag test. */
    ballPath(150,110,150,340);
    const rest=backFour();
    $('playBtn').click(); step(0); step(700,40);
    const s=shifts(rest,backFour())[0];
    $('modeSelect').click();
    return Math.abs(s.dy);
  };
  const sharp=withLag(0), late=withLag(0.6);
  ok('a lagged unit is behind an unlagged one at the same moment', late<sharp-1,
     `${yd(late).toFixed(1)} vs ${yd(sharp).toFixed(1)} yd across`);
  ok('but it is moving, not frozen', late>0.1, yd(late).toFixed(2)+' yd');
}

head('An explicit run outranks the block a player stands in');
{
  stamp('f442');
  pickUnit(/Back four/);
  /* slide, at full strength: it drags the block a long way across the pitch and
     nowhere up it, so a run drawn up the pitch is unmistakably the player's own.
     press would drag them further still, but it also squeezes, and a squeeze
     moves each member by a different amount about the centre — the equal-vector
     test below would fail on a policy that is behaving perfectly. */
  setUnit('slide',1,0);
  const b0=backFour();
  // give the left-back a run of their own, straight across the pitch
  $('modeRun').click();
  const lb=items()[1];
  click(lb,b0[0].x,b0[0].y);
  click(svg(),b0[0].x+90,b0[0].y);
  $('modeSelect').click();
  ballPath(300,60,300,300);
  const rest=backFour();
  $('playBtn').click(); step(0); step(1500,80);
  const mid=backFour();
  const s=shifts(rest,mid);
  ok('the three without a run still move as one', rigid(s.slice(1)),
     s.slice(1).map(v=>`${yd(v.dx).toFixed(1)},${yd(v.dy).toFixed(1)}`).join(' | '));
  ok('and the one with a run does something different', !near(s[0].dx,s[1].dx,0.5),
     `${yd(s[0].dx).toFixed(1)} vs ${yd(s[1].dx).toFixed(1)} yd`);
  ok('travelling roughly where their run was drawn', s[0].dx>20, yd(s[0].dx).toFixed(1)+' yd');
  $('modeSelect').click();
}

head('A unit cannot be pushed off the pitch');
{
  stamp('f442');
  pickUnit(/Back four/);
  setUnit('press',1,0);
  // a ball in the far corner, which at full press would drag the block off the grass
  ballPath(330,20,336,24);
  $('playBtn').click(); step(0); step(2500,80);
  const b=backFour();
  /* The working area of the main pitch, surround included, is x 1..343 and
     y -35..244. Every member must still be inside it. */
  ok('every defender is still on the working area',
     b.every(p=>p.x>=0 && p.x<=344 && p.y>=-36 && p.y<=245),
     b.map(p=>`${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' | '));
  /* Clamping the offset rather than each player is what keeps the line straight
     at the edge. Clamping members individually would concertina them against the
     touchline and silently break rigidity exactly where it is most visible. */
  ok('and the line is still straight, not concertinaed against the edge',
     b.every(p=>near(p.x,b[0].x,0.01)), b.map(p=>p.x.toFixed(1)).join(','));
  $('modeSelect').click();
}

head('Watching a drill does not change it');
{
  stamp('f442');
  pickUnit(/Back four/);
  setUnit('block',0.8,0.2);
  ballPath(150,60,150,300);
  const rest=backFour();
  $('playBtn').click(); step(0); step(1500,60);
  const ws=shifts(rest,backFour())[0];
  ok('they are away from their marks mid-drill', Math.hypot(ws.dx,ws.dy)>1,
     yd(Math.hypot(ws.dx,ws.dy)).toFixed(1)+' yd');
  $('modeSelect').click();
  const home=backFour();
  ok('and back on them exactly when it stops',
     home.every((p,i)=>near(p.x,rest[i].x,0.01)&&near(p.y,rest[i].y,0.01)),
     home.map((p,i)=>`${(p.x-rest[i].x).toFixed(2)}`).join(','));
  ok('the units are still there', unitOpts().length===4);
}

head('Units are part of the drill: undo, rotate, save, load');
{
  stamp('f442');
  ok('stamping is one undoable step', unitOpts().length===4);
  $('undoBtn').click();
  ok('undo takes the whole formation away', items().length===0 && hulls().length===0,
     `${items().length} items, ${hulls().length} hulls`);
  $('redoBtn').click();
  ok('redo brings it back, units and all',
     items().length===11 && unitOpts().length===4,
     `${items().length} items, ${unitOpts().length} units`);

  pickUnit(/Back four/);
  setUnit('block',0.65,0.4);
  const before=backFour();
  $('rotateBtn').click();
  ok('rotating the pitch keeps the units', unitOpts().length===4, unitOpts().join(', '));
  const after=backFour();
  ok('and the back four is still a straight line, just turned',
     after.every(p=>near(p.y,after[0].y,0.01)) && !near(after[0].x,before[0].x,0.01),
     after.map(p=>`${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' | '));
  /* The axes come from the pitch, so a turned pitch has to redefine "across"
     with it. If pitchAxes read the old orientation the block would now slide up
     and down the pitch instead of across it. */
  pickUnit(/Back four/);
  setUnit('slide',0.9,0);
  ballPath(150,60,400,60);
  const rest=backFour();
  $('playBtn').click(); step(0); step(1500,60);
  const s=shifts(rest,backFour())[0];
  ok('and slide still means across, on the turned pitch',
     Math.abs(s.dx)>3 && near(s.dy,0,0.01),
     `${yd(s.dx).toFixed(1)} , ${yd(s.dy).toFixed(1)}`);
  $('modeSelect').click();
  $('rotateBtn').click(); $('rotateBtn').click(); $('rotateBtn').click();

  stamp('f433');
  pickUnit(/Back four/);
  setUnit('block',0.75,0.45);
  $('setupName').value='formtest';
  $('saveSetup').click();
  reset();
  ok('the field is empty again', items().length===0 && hulls().length===0);
  $('setupList').value='formtest';
  $('loadSetup').click();
  ok('a loaded setup has its players back', items().length===11, items().length);
  ok('and its units', unitOpts().length===4, unitOpts().join(', '));
  ok('with the settings they were given',
     (pickUnit(/Back four/), $('unitPolicy').value==='block'
       && near(+$('unitAmt').value,0.75,0.001) && near(+$('unitLag').value,0.45,0.001)),
     `${$('unitPolicy').value} / ${$('unitAmt').value} / ${$('unitLag').value}`);
  // and the loaded shape still reacts, which is the part that actually matters
  ballPath(150,60,150,300);
  const marks=backFour();
  $('playBtn').click(); step(0); step(1500,60);
  const ls=shifts(marks,backFour())[0];
  ok('and a loaded block still defends', Math.hypot(ls.dx,ls.dy)>2,
     `${yd(ls.dx).toFixed(1)},${yd(ls.dy).toFixed(1)} yd`);
  $('modeSelect').click();
}

head('Ungrouping a unit leaves the players standing');
{
  stamp('f442');
  pickUnit(/Front two/);
  $('unitDrop').click();
  ok('the unit is gone', unitOpts().length===3, unitOpts().join(', '));
  ok('the hull with it', hulls().length===3, hulls().length);
  ok('but all eleven players are still on the pitch', items().length===11, items().length);
  ok('and the status says so', /still there/.test($('status').textContent),
     $('status').textContent);
}

head('The panel is honest about having nothing to edit');
{
  reset();
  ok('with no units the unit controls are disabled',
     ['unitPick','unitPolicy','unitAmt','unitLag','unitDrop'].every(i=>$(i).disabled));
  ok('and the picker says so', /no units/.test($('unitPick').textContent),
     $('unitPick').textContent);
  ok('but a formation can always be stamped',
     !$('formPick').disabled && !$('stampForm').disabled);
  stamp('f442');
  ok('stamping enables them',
     ['unitPick','unitPolicy','unitAmt','unitLag','unitDrop'].every(i=>!$(i).disabled));
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log('runtime errors:', errs.length?errs:'none');
},400);
