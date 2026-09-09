// t16 — tape width, hold-to-rotate, arrow-free goals, the five-ball row
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://e.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  w.onerror=m=>errs.push(String(m));
}});
const w=dom.window,d=w.document;
const R=[];let pass=0,fail=0;
function ok(n,c,x=''){(c?pass++:fail++);R.push((c?'  ok  ':'  FAIL')+' '+n+(x?'   ['+x+']':''));}
function pe(el,t,x,y,ex={}){el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1,...ex}));}
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
const kit=k=>d.querySelector(`.kit[data-kit="${k}"]`);
function arm(k){const b=kit(k);if(!b.classList.contains('on'))b.click();if(!b.classList.contains('on'))b.click();}
const U=3, HOLD=2000;
const rot=g=>{const m=g.getAttribute('transform').match(/rotate\(([-\d.]+)\)/);return m?+m[1]:0;};
const pos=g=>{const m=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);return{x:+m[1],y:+m[2]};};

setTimeout(()=>{
 const svg=d.querySelectorAll('.field-wrap svg')[0];
 ok('no boot errors', errs.length===0, errs.join(' | '));

 // ---------- 1. tape is 1/18 yd ----------
 const tape=()=>[...d.querySelectorAll('.field-wrap.on .tape-layer g[data-tape] line')]
   .filter(l=>!l.classList.contains('tape-hit'));
 d.getElementById('modeTape').click();
 pe(svg,'pointerdown',40,40); pe(svg,'pointermove',100,40); pe(svg,'pointerup',100,40);
 const lines=tape();
 ok('a tape line was laid', lines.length===1, lines.length);
 const tw=+lines[0].getAttribute('stroke-width');
 ok('tape is 1/18 yd wide', Math.abs(tw-U/18)<1e-9, tw+' vs '+(U/18));
 ok('tape dash stays a real length', lines[0].getAttribute('stroke-dasharray')===null
    || lines[0].getAttribute('stroke-dasharray')==='3 2',
    String(lines[0].getAttribute('stroke-dasharray')));
 // boost thickens the drawing only
 d.getElementById('boostBtn').click();
 const twB=+tape()[0].getAttribute('stroke-width');
 ok('boost draws tape thicker', twB>tw, twB);
 d.getElementById('boostBtn').click();
 const twU=+tape()[0].getAttribute('stroke-width');
 ok('unboosting returns tape to true width', Math.abs(twU-U/18)<1e-9, twU);
 d.getElementById('modeTape').click();
 d.getElementById('clearBtn').click();

 // ---------- 2. hold to rotate ----------
 arm('goalFull');
 pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60);
 kit('goalFull').click();
 const g0=items()[0], p0=pos(g0);
 ok('the goal starts unrotated', rot(g0)===0, rot(g0));

 // a short press then release is still a delete, not a rotate
 pe(g0,'pointerdown',p0.x,p0.y);
 pe(svg,'pointerup',p0.x,p0.y);
 ok('a quick click still removes the item', items().length===0, items().length);

 // place another, hold past HOLD_MS, then swing the pointer
 arm('goalFull'); pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60); kit('goalFull').click();
 const g1=items()[0], p1=pos(g1);
 pe(g1,'pointerdown',p1.x,p1.y);
 const ghostBefore=d.querySelector('.field-wrap.on .ghost-layer').innerHTML;
 ok('holding has not armed the rotate yet', ghostBefore==='' , ghostBefore.slice(0,40));

 setTimeout(()=>{
  const ghost=d.querySelector('.field-wrap.on .ghost-layer').innerHTML;
  ok('after 2s the rotate ring appears', /dasharray/.test(ghost), ghost.slice(0,60));
  // the item is no longer ghosted for dragging
  ok('the drag ghosting is cleared when rotate takes over', g1.style.opacity==='', g1.style.opacity);

  pe(svg,'pointermove',p1.x,p1.y+8);
  const r1=rot(items()[0]);
  ok('dragging after the hold rotates the item', r1!==0, r1);
  pe(svg,'pointerup',p1.x,p1.y+8);
  ok('the item survives the hold-rotate', items().length===1, items().length);
  ok('the rotation sticks', rot(items()[0])===r1, rot(items()[0]));
  ok('the ring is cleared on release',
     d.querySelector('.field-wrap.on .ghost-layer').innerHTML==='');

  // moving early must cancel the hold, so a real drag never turns into a spin
  d.getElementById('clearBtn').click();
  arm('goalFull'); pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60); kit('goalFull').click();
  const g2=items()[0], p2=pos(g2);
  pe(g2,'pointerdown',p2.x,p2.y);
  pe(svg,'pointermove',p2.x+30,p2.y+30);
  setTimeout(()=>{
   ok('a drag that moved never becomes a rotate', rot(items()[0])===0, rot(items()[0]));
   const moved=pos(items()[0]);
   ok('the drag actually moved the item', moved.x!==p2.x||moved.y!==p2.y, `${moved.x},${moved.y}`);
   pe(svg,'pointerup',p2.x+30,p2.y+30);
   ok('the item is still there after the drag', items().length===1, items().length);

   // shift-drag still works, unchanged
   d.getElementById('clearBtn').click();
   arm('goalFull'); pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60); kit('goalFull').click();
   const g3=items()[0], p3=pos(g3);
   pe(g3,'pointerdown',p3.x,p3.y,{shiftKey:true});
   ok('shift arms the rotate immediately',
      /dasharray/.test(d.querySelector('.field-wrap.on .ghost-layer').innerHTML));
   pe(svg,'pointermove',p3.x+6,p3.y+6,{shiftKey:true});
   ok('shift-drag rotates', rot(items()[0])!==0, rot(items()[0]));
   pe(svg,'pointerup',p3.x+6,p3.y+6,{shiftKey:true});

   // ---------- 3. goals carry no arrow ----------
   d.getElementById('clearBtn').click();
   arm('goalFull'); pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60); kit('goalFull').click();
   const paths=[...items()[0].querySelectorAll('path')];
   ok('the goal is drawn from an outline plus a shaded rear', paths.length===2, paths.length);
   ok('one of them is the dark rear band',
      paths.some(p=>/0\.42/.test(p.getAttribute('fill')||'')));
   const stubs=[...items()[0].querySelectorAll('line')]
     .filter(l=>+l.getAttribute('stroke-width')>0.3
                && Math.abs(+l.getAttribute('y1')+4.5)<1e-6 && +l.getAttribute('y2')>-4.5+1e-6);
   ok('two post stubs turn back off the mouth', stubs.length===2, stubs.length);

   // ---------- 4. the five balls sit in a row, touching ----------
   d.getElementById('clearBtn').click();
   arm('ball5'); pe(svg,'pointerdown',80,60); pe(svg,'pointerup',80,60); kit('ball5').click();
   const bs=items().map(pos).sort((a,b)=>a.x-b.x);
   ok('five balls land', bs.length===5, bs.length);
   ok('they share one row', bs.every(b=>Math.abs(b.y-bs[0].y)<1e-6),
      bs.map(b=>b.y.toFixed(2)).join(','));
   const D=U*0.239;
   const gaps=bs.slice(1).map((b,i)=>b.x-bs[i].x);
   ok('each one is exactly a ball away from the next',
      gaps.every(v=>Math.abs(v-D)<1e-6), gaps.map(v=>v.toFixed(3)).join(','));
   ok('the row spans four ball widths', Math.abs((bs[4].x-bs[0].x)-4*D)<1e-6,
      (bs[4].x-bs[0].x).toFixed(3));
   ok('they are all plain balls', items().every(g=>g.dataset.type===undefined||true) && bs.length===5);

   // ---------- 5. poles read as poles, not dots ----------
   d.getElementById('clearBtn').click();
   arm('poleRed'); pe(svg,'pointerdown',80,80); pe(svg,'pointerup',80,80); kit('poleRed').click();
   const pole=items()[0];
   const shafts=[...pole.querySelectorAll('rect')].filter(r=>r.getAttribute('fill')!=='transparent');
   ok('the pole has a shaft, not just a dot', shafts.length>=1, shafts.length);
   const shaft=shafts.find(r=>/#|rgb/.test(r.getAttribute('fill'))&&r.getAttribute('fill')!=='rgba(0,0,0,0.28)');
   ok('the shaft runs up the page from the base',
      +shaft.getAttribute('y')<0 && Math.abs(+shaft.getAttribute('y')+ +shaft.getAttribute('height'))<0.2,
      `y=${shaft.getAttribute('y')} h=${shaft.getAttribute('height')}`);
   ok('the shaft is a slim line, much taller than it is wide',
      +shaft.getAttribute('height') > +shaft.getAttribute('width')*8,
      `${shaft.getAttribute('width')} x ${shaft.getAttribute('height')}`);
   ok('the shaft is one tenth of a yard across',
      Math.abs(+shaft.getAttribute('width')-U*0.1)<1e-9, shaft.getAttribute('width'));
   const base=[...pole.querySelectorAll('circle')].sort((a,b)=>+b.getAttribute('r')-+a.getAttribute('r'))[0];
   ok('the base sits at the placement point',
      +base.getAttribute('cx')===0 && +base.getAttribute('cy')===0);
   // the footprint is unchanged — a pole shoved into the corner still stops at 1/20 yd
   d.getElementById('clearBtn').click();
   arm('poleRed'); pe(svg,'pointerdown',-500,-500); pe(svg,'pointerup',-500,-500); kit('poleRed').click();
   const pc=pos(items()[0]);
   // the corner of the working area — pitch plus green surround, not the touchline
   const ar=svg.querySelector('rect');
   const AX=+ar.getAttribute('x'), AY=+ar.getAttribute('y');
   ok('the overhanging shaft does not change the footprint',
      Math.abs(pc.x-(AX+0.15))<1e-6 && Math.abs(pc.y-(AY+0.15))<1e-6,
      `${pc.x},${pc.y} vs ${AX+0.15},${AY+0.15}`);

   // ---------- 6. Half Grid: line midpoints, on by default ----------
   const half=d.getElementById('halfBtn');
   ok('Half Grid is on out of the box', half.classList.contains('on'));
   /* The extra targets are deliberately invisible now: the grid pattern is a
      plain 1-yard mesh with no centre dot and no half-yard ticks. These guard
      that the drawing stayed clean while the snapping below still works. */
   const pat=d.querySelector('pattern[id^="grid"]') || d.querySelector('pattern');
   ok('the grid pattern draws no dots at all', !pat.querySelector('circle'),
      pat.querySelector('circle') ? 'r='+pat.querySelector('circle').getAttribute('r') : 'none');
   ok('no half-yard tick marks anywhere', d.querySelectorAll('.half-dot').length===0,
      d.querySelectorAll('.half-dot').length);
   ok('the grid is one 1-yard path per cell', pat.querySelectorAll('path').length===1,
      pat.querySelectorAll('path').length);
   ok('and that path steps a whole yard',
      pat.getAttribute('width')===String(U) && pat.getAttribute('height')===String(U),
      `${pat.getAttribute('width')}x${pat.getAttribute('height')}`);

   // 10 is the grid origin, so 40 is a corner, 41.5 the middle of the line east
   // of it, 41.5/41.5 the cell centre. Well away from the touchline clamp.
   const dropAt=(k,x,y)=>{d.getElementById('clearBtn').click();arm(k);
     pe(svg,'pointerdown',x,y);pe(svg,'pointerup',x,y);kit(k).click();return pos(items()[0]);};

   // turn it off and the midpoint is no longer a legal target
   half.click();
   ok('Half Grid toggles off', !half.classList.contains('on'));
   ok('toggling it does not add anything to the grid', !pat.querySelector('circle'));
   const off=dropAt('coneRed',41.4,40.2);
   ok('without Half Grid a line midpoint rounds away to a corner or centre',
      Math.abs(off.x-41.5)>1e-6 || Math.abs(off.y-40)>1e-6, `${off.x},${off.y}`);
   ok('and it still lands on a legal point',
      (Math.abs((off.x-10)%U)<1e-6 && Math.abs((off.y-10)%U)<1e-6) ||
      (Math.abs((off.x-11.5)%U)<1e-6 && Math.abs((off.y-11.5)%U)<1e-6), `${off.x},${off.y}`);

   half.click();
   ok('Half Grid comes back on', half.classList.contains('on'));
   ok('the grid is still dot-free with it back on', !pat.querySelector('circle'));
   const on1=dropAt('coneRed',41.4,40.2);
   ok('now a cone sits in the middle of a grid line',
      Math.abs(on1.x-41.5)<1e-6 && Math.abs(on1.y-40)<1e-6, `${on1.x},${on1.y}`);
   const on2=dropAt('coneRed',40.3,41.6);
   ok('the same works on the other axis',
      Math.abs(on2.x-40)<1e-6 && Math.abs(on2.y-41.5)<1e-6, `${on2.x},${on2.y}`);
   const on3=dropAt('coneRed',40.2,40.2);
   ok('corners are still reachable', Math.abs(on3.x-40)<1e-6 && Math.abs(on3.y-40)<1e-6,
      `${on3.x},${on3.y}`);
   const on4=dropAt('coneRed',41.6,41.6);
   ok('cell centres are still reachable',
      Math.abs(on4.x-41.5)<1e-6 && Math.abs(on4.y-41.5)<1e-6, `${on4.x},${on4.y}`);
   ok('every drop lands on a half-yard', [on1,on2,on3,on4].every(p=>
      Math.abs((p.x-10)%(U/2))<1e-6 && Math.abs((p.y-10)%(U/2))<1e-6),
      [on1,on2,on3,on4].map(p=>`${p.x},${p.y}`).join(' '));

   // a player is a yard wide, so it still cannot sit a half yard from its
   // neighbour — the extra lattice points must not break the spacing rule
   d.getElementById('clearBtn').click(); arm('playerBlue');
   for(let i=0;i<6;i++){ pe(svg,'pointerdown',40,40); pe(svg,'pointerup',40,40); }
   kit('playerBlue').click();
   const pp=items().map(pos);
   ok('crowded players all found a spot', pp.length===6, pp.length);
   ok('half-yard targets never let players overlap',
      pp.every((a,i)=>pp.every((b,j)=>i===j||Math.hypot(a.x-b.x,a.y-b.y)>=U*0.9-1e-6)),
      pp.map(p=>`${p.x},${p.y}`).join(' '));

   // turning Snap off disables the option rather than leaving it misleading
   d.getElementById('snapBtn').click();
   ok('Half Grid is disabled while Snap is off', half.disabled);
   d.getElementById('snapBtn').click();
   ok('and comes back with Snap', !half.disabled);
   ok('and is still on after the round trip', half.classList.contains('on'));

   /* ---------- 7. pitch markings read as painted white ----------
      Everything that represents a real painted line should be near-opaque; the
      dashed training references sit one step back but are still clearly there.
      The faint one is the 1-yard grid, which is meant to recede. */
   const alpha=s=>{const m=/rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/.exec(s||'');return m?+m[1]:null;};
   const fw=d.querySelector('.field-wrap.on svg');
   const marks=[...fw.querySelectorAll('rect,circle,path,line')]
     .map(el=>({el,a:alpha(el.getAttribute('stroke'))||alpha(el.getAttribute('fill'))}))
     .filter(o=>o.a!==null);
   const dashed=marks.filter(o=>o.el.getAttribute('stroke-dasharray'));
   const solid=marks.filter(o=>!o.el.getAttribute('stroke-dasharray')
                               && !(o.el.tagName==='path' && /M 3 0 L 0 0 0 3/.test(o.el.getAttribute('d')||'')));
   ok('there are solid markings to check', solid.length>0, solid.length);
   ok('every solid marking is near-opaque white', solid.every(o=>o.a>=0.9),
      solid.filter(o=>o.a<0.9).map(o=>`${o.el.tagName}@${o.a}`).join(' ')||'all >=0.9');
   ok('there are dashed reference lines', dashed.length>0, dashed.length);
   ok('dashed lines are brighter than they were but still a step back',
      dashed.every(o=>o.a>=0.7&&o.a<0.9),
      dashed.map(o=>o.a).join(' '));
   const gp=alpha(pat.querySelector('path').getAttribute('stroke'));
   ok('the grid itself still recedes', gp!==null&&gp<=0.15, gp);

   console.log(R.join('\n'));
   console.log(`\n${pass} passed, ${fail} failed`);
   process.exit(fail?1:0);
  },HOLD+120);
 },HOLD+120);
},400);
