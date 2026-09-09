// t13 — players fit their cell and never overlap each other
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
const xy=i=>{const m=items()[i].getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);return{x:+m[1],y:+m[2]};};
function arm(k){const b=d.querySelector(`.kit[data-kit="${k}"]`);if(!b.classList.contains('on'))b.click();if(!b.classList.contains('on'))b.click();}
const U=3, HALF=1.5, ORIGIN=10;
const PR=1.4;                              // must match PLAYER_R in the app
const all=()=>items().map((_,i)=>xy(i));
function minSep(){
  const p=all(); let m=Infinity;
  for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++) m=Math.min(m,Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y));
  return m;
}
/* With Half Grid on (the default) every half-yard point is legal, including the
   edge midpoints where the two axes disagree. Mixed parity is therefore fine
   here; what still must hold is that nothing lands off the half-yard grid. */
const onLattice=p=>{
  const t=v=>{const k=(v-ORIGIN)/U,f=Math.abs(k-Math.round(k));
    return f<1e-6?'corner':Math.abs(f-0.5)<1e-6?'centre':'off';};
  return t(p.x)!=='off' && t(p.y)!=='off';
};

setTimeout(()=>{
 const svg=d.querySelectorAll('.field-wrap svg')[0];
 d.getElementById('alignBtn').click();               // isolate the grid from alignment
 ok('align off for this test', !d.getElementById('alignBtn').classList.contains('on'));

 /* ---------- 1. the marker fits inside one 1-yard cell ----------
    The body is a teardrop now, not a circle, so its reach has to be measured
    rather than read off an r attribute. Sample the two cubic sides properly and
    take the true furthest point: a convex-hull bound would read 1.58 here and
    condemn a shape that never actually leaves 1.4. This matters because players
    are spaced 2 × PLAYER_R apart, so any part of the glyph that escapes that
    radius can collide with the next player when the two face each other. */
 arm('playerBlue');
 pe(svg,'pointerdown',40,70); pe(svg,'pointerup',40,70);
 const body=items()[0].querySelector('path');
 const nums=body.getAttribute('d').match(/-?\d*\.?\d+/g).map(Number);
 const cube=(p0,c1,c2,p3)=>{                 // furthest point on one cubic from the origin
   let m=0;
   for(let i=0;i<=200;i++){
     const t=i/200, u=1-t;
     const x=u*u*u*p0[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*p3[0];
     const y=u*u*u*p0[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*p3[1];
     m=Math.max(m,Math.hypot(x,y));
   }
   return m;
 };
 // d = M 0 -1.40  C .. .. p3  A rx ry rot laf sf x y  C .. .. p3  Z
 const tip=[nums[0],nums[1]];
 const side1=cube(tip,[nums[2],nums[3]],[nums[4],nums[5]],[nums[6],nums[7]]);
 const arcR=nums[8];
 const back=[nums[13],nums[14]];
 const side2=cube(back,[nums[15],nums[16]],[nums[17],nums[18]],[nums[19],nums[20]]);
 const sw=+body.getAttribute('stroke-width');
 const reach=Math.max(side1,side2,arcR,Math.hypot(...tip));
 ok('the whole marker, nose and all, fits the half-cell',
    reach+sw/2 <= HALF+1e-9, `reach=${reach.toFixed(3)} +stroke/2=${(reach+sw/2).toFixed(3)} vs ${HALF}`);
 ok('and it reaches no further than the footprint the spacing assumes',
    reach <= PR+1e-6, `${reach.toFixed(4)} vs ${PR}`);
 /* Guard against the shape quietly shrinking: if the body pulled well inside 1.4
    the check above would pass while players drifted apart on screen. */
 ok('while still filling that footprint', reach > PR-0.02, reach.toFixed(4));
 // the glyph has to actually point somewhere, or facing is not visible at all
 ok('the body is asymmetric front to back, so facing reads',
    Math.abs(nums[1]) > 0 && nums[1] < 0 && Math.abs(nums[1]+PR) < 1e-9,
    `tip y=${nums[1]}`);
 ok('and it carries two foot studs',
    items()[0].querySelectorAll('circle[fill-opacity]').length===2,
    items()[0].querySelectorAll('circle[fill-opacity]').length);

 // ---------- 2. dropping on an occupied square bumps to the next free one ----------
 const p0=xy(0);
 pe(svg,'pointerdown',40,70); pe(svg,'pointerup',40,70);     // same spot again
 ok('second player was still placed', items().length===2, items().length);
 const p1=xy(1);
 ok('second player did not stack', !(Math.abs(p1.x-p0.x)<1e-6 && Math.abs(p1.y-p0.y)<1e-6), JSON.stringify(p1));
 ok('bumped player is still on the lattice', onLattice(p1), JSON.stringify(p1));
 ok('bump respects the minimum gap', Math.hypot(p1.x-p0.x,p1.y-p0.y) >= 2*PR-1e-9, minSep().toFixed(3));

 // ---------- 3. a dense sweep never produces an overlap ----------
 d.getElementById('clearBtn').click(); arm('playerBlue');
 for(let a=0;a<6;a++) for(let b=0;b<6;b++){
   const px=40+a*0.9, py=70+b*0.9;
   pe(svg,'pointerdown',px,py); pe(svg,'pointerup',px,py);
 }
 ok('36 players placed', items().length===36, items().length);
 ok('no two players overlap', minSep() >= 2*PR-1e-9, `min separation ${minSep().toFixed(3)} vs ${2*PR}`);
 ok('every player sits on the lattice', all().every(onLattice),
    all().filter(p=>!onLattice(p)).map(p=>`${p.x},${p.y}`).join(' ') || 'all good');

 // ---------- 4. dragging onto an occupied square also bumps ----------
 d.getElementById('clearBtn').click(); arm('playerBlue');
 pe(svg,'pointerdown',40,70);  pe(svg,'pointerup',40,70);
 pe(svg,'pointerdown',70,70);  pe(svg,'pointerup',70,70);
 const A=xy(0), B=xy(1);
 ok('two players, far apart', items().length===2 && Math.hypot(A.x-B.x,A.y-B.y)>10, `${JSON.stringify(A)} ${JSON.stringify(B)}`);
 d.querySelector('.kit[data-kit="playerBlue"]').click();       // disarm so the drag moves
 pe(items()[1],'pointerdown',B.x,B.y);
 pe(svg,'pointermove',A.x,A.y);
 pe(svg,'pointerup',A.x,A.y);
 const B2=xy(1);
 ok('dragged player did not land on top', Math.hypot(B2.x-A.x,B2.y-A.y) >= 2*PR-1e-9,
    `${JSON.stringify(B2)} vs ${JSON.stringify(A)} = ${Math.hypot(B2.x-A.x,B2.y-A.y).toFixed(3)}`);
 ok('dragged player stayed on the lattice', onLattice(B2), JSON.stringify(B2));
 ok('the stationary player never moved', Math.abs(xy(0).x-A.x)<1e-9 && Math.abs(xy(0).y-A.y)<1e-9, JSON.stringify(xy(0)));

 // ---------- 5. a row of players fans out instead of stacking ----------
 d.getElementById('clearBtn').click();
 d.getElementById('modeRow').click();
 arm('playerBlue');
 d.getElementById('rowMode').value='count';
 d.getElementById('rowVal').value='8';
 pe(svg,'pointerdown',40,100); pe(svg,'pointermove',52,100); pe(svg,'pointerup',52,100);
 ok('row placed 8 players', items().length===8, items().length);
 ok('no overlap inside a tight row', minSep() >= 2*PR-1e-9, `min separation ${minSep().toFixed(3)}`);

 // ---------- 6. equipment is deliberately unaffected ----------
 d.getElementById('clearBtn').click();
 d.getElementById('modeSelect').click();
 arm('coneOrange');
 pe(svg,'pointerdown',40,70); pe(svg,'pointerup',40,70);
 pe(svg,'pointerdown',40,70); pe(svg,'pointerup',40,70);
 const c0=xy(0), c1=xy(1);
 ok('cones may still share a square', Math.abs(c0.x-c1.x)<1e-6 && Math.abs(c0.y-c1.y)<1e-6,
    `${JSON.stringify(c0)} ${JSON.stringify(c1)}`);

 // ---------- 7. snap off keeps free placement ----------
 d.getElementById('clearBtn').click();
 d.getElementById('snapBtn').click();
 arm('playerBlue');
 pe(svg,'pointerdown',41.37,71.42); pe(svg,'pointerup',41.37,71.42);
 const fr=xy(0);
 ok('snap off places a player freely', Math.abs(fr.x-41.4)<0.01 && Math.abs(fr.y-71.4)<0.01, JSON.stringify(fr));

 console.log(R.join('\n'));
 console.log(`\n${pass} passed, ${fail} failed`);
 console.log('runtime errors:', errs.length?errs:'none');
 if (fail||errs.length) process.exitCode=1;
},60);
