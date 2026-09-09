/* t17 — the pitch is cut to whole yards and every painted line lands on a grid
   line. This is what makes the penalty spot look centred: it sits on an
   intersection, not a third of the way across a square. */
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://e.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  w.onerror=m=>errs.push(String(m));
}});
const d=dom.window.document;
const R=[];let pass=0,fail=0;
function ok(n,c,x=''){(c?pass++:fail++);R.push((c?'  ok  ':'  FAIL')+' '+n+(x?'   ['+x+']':''));}
const U=3,O=10;
const on=v=>Math.abs(((v-O)/U)-Math.round((v-O)/U))<1e-9;   // on a 1-yard grid line
const yd=v=>(v-O)/U;

setTimeout(()=>{
 for (const svg of d.querySelectorAll('.field-wrap svg')){
  const key=svg.dataset.field;
  const off=[];
  const chk=(label,...vs)=>vs.forEach(v=>{ if(!on(v)) off.push(`${label}=${v} (${yd(v).toFixed(3)} yd)`); });

  /* The pitch is no longer the first rect — the grass and grid now cover the
     whole working area, surround included, and the touchline is drawn on top.
     Target it by class rather than by index. */
  const surf=svg.querySelector('rect.pitch');
  const x0=+surf.getAttribute('x'), y0=+surf.getAttribute('y');
  const wUnits=+surf.getAttribute('width'), hUnits=+surf.getAttribute('height');
  const x1=x0+wUnits, y1=y0+hUnits;

  /* Every pitch is turned on its side, so screen width and height are not the
     same thing as pitch width and length. Everything below is checked on the
     pitch's own axes: ACROSS runs goal line to goal line, ALONG runs goal to
     goal. A(x,y)/L(x,y) map a screen point back onto those axes. The expected
     orientation is written out per field rather than assumed, so turning one
     pitch back to portrait fails here instead of quietly redefining the test. */
  const LAND={big:true, small:true, game:true};
  const land=LAND[key];
  const A=(x,y)=> land ? y-y0 : x-x0;
  const L=(x,y)=> land ? x-x0 : y-y0;
  const AC= land ? hUnits : wUnits;      // across, i.e. the goal line
  const AL= land ? wUnits : hUnits;      // along, goal to goal
  const midA=AC/2;
  ok(`${key}: the pitch faces ${land?'sideways':'up the screen'}`,
     land===(wUnits>hUnits), `${wUnits/U} x ${hUnits/U} on screen`);

  ok(`${key}: width is a whole number of yards`, Number.isInteger(AC/U), (AC/U).toFixed(3)+' yd');
  ok(`${key}: length is a whole number of yards`, Number.isInteger(AL/U), (AL/U).toFixed(3)+' yd');
  const WANT={big:[68,108],small:[68,86],game:[70,118]};
  ok(`${key}: dimensions are ${WANT[key].join(' x ')} yd`,
     AC/U===WANT[key][0] && AL/U===WANT[key][1], `${AC/U} x ${AL/U}`);
  // an even length is what puts the halfway line on a grid line rather than
  // half a square off it
  ok(`${key}: the length is an even number of yards`, (AL/U)%2===0, (AL/U).toFixed(0));

  chk('touchlines',x0,x1); chk('goal lines',y0,y1);

  [...svg.querySelectorAll('rect')].slice(3).forEach((r,i)=>
    chk('box'+i, +r.getAttribute('x'), +r.getAttribute('x')+ +r.getAttribute('width'),
                 +r.getAttribute('y'), +r.getAttribute('y')+ +r.getAttribute('height')));
  [...svg.querySelectorAll('circle')].forEach((c,i)=>
    chk('circle'+i, +c.getAttribute('cx'), +c.getAttribute('cy')));
  [...svg.querySelectorAll('line')].forEach((l,i)=>
    chk('line'+i, +l.getAttribute('x1'), +l.getAttribute('y1'), +l.getAttribute('x2'), +l.getAttribute('y2')));
  /* The two Ds are the deliberate exception: their mouth is 15.5 yd, so the
     endpoints land on a quarter yard ACROSS the pitch. The distance ALONG that
     they spring from still has to be on a grid line — checked here. */
  /* d is "M x1 y1 A rx ry rot large sweep x2 y2", so the numbers land in a
     fixed order and the sweep flag can be read straight out of position 6. */
  const arcs=[...svg.querySelectorAll('path')].filter(p=>!p.closest('defs'))
    .map(p=>(p.getAttribute('d')||'').match(/-?[\d.]+/g)).filter(Boolean).map(m=>m.map(Number))
    .map(m=>({x1:m[0], y1:m[1], r:m[2], sweep:m[6], x2:m[7], y2:m[8], d:m.join(' ')}))
    .map(a=>({...a, a1:A(a.x1,a.y1), l1:L(a.x1,a.y1), a2:A(a.x2,a.y2), l2:L(a.x2,a.y2)}));
  arcs.forEach((a,i)=>chk('arc'+i+' springs from',
    land?a.x1:a.y1, land?a.x2:a.y2));
  ok(`${key}: every painted line sits on a grid line`, off.length===0, off.join(' · ')||'clean');

  // the marks that read as "centred" really are centred, on an intersection
  ok(`${key}: the centre of the pitch is a grid intersection`,
     on((x0+x1)/2) && on((y0+y1)/2), `${(x0+x1)/2},${(y0+y1)/2}`);
  const spots=[...svg.querySelectorAll('circle')].filter(c=>+c.getAttribute('r')<=1.5);
  const spotA=c=>A(+c.getAttribute('cx'), +c.getAttribute('cy'));
  const spotL=c=>L(+c.getAttribute('cx'), +c.getAttribute('cy'));
  ok(`${key}: three spots — two penalty, one centre`, spots.length===3, spots.length);
  ok(`${key}: every spot is dead centre across the pitch`,
     spots.every(c=>spotA(c)===midA), spots.map(spotA).join(','));
  // the solid centre line is the first <line>; ref-lines come after it in the DOM
  const cl=svg.querySelector('line');
  const half=L(+cl.getAttribute('x1'), +cl.getAttribute('y1'));
  ok(`${key}: the halfway line is halfway`, Math.abs(half-AL/2)<1e-9, half);
  ok(`${key}: and it lands on a grid line`, half/U===Math.round(half/U), `${half/U} yd`);
  const pk=spots.map(spotL).sort((a,b)=>a-b);
  // the two dashed cross-pitch lines split each half into equal thirds
  const cross=[...svg.querySelectorAll('.ref-lines line[data-cross]')]
    .map(l=>L(+l.getAttribute('x1'), +l.getAttribute('y1'))).sort((a,b)=>a-b);
  const allRefs=svg.querySelectorAll('.ref-lines line').length;
  if (key==='game'){
    // the Game Field is a match pitch — no training marks of any kind
    ok('game: no dashed lines anywhere', allRefs===0, allRefs);
  } else {
    ok(`${key}: the training corridors are still there`, allRefs>0, allRefs);
  }
  // cross/half/pk are already distances ALONG from the near goal line
  const q=v=>v/U;                                  // units -> yards, no origin
  if (key==='big'){
    ok('big: two dashed lines run across the pitch', cross.length===2, cross.map(q).join(','));
    const boxTop=18, boxBot=q(AL)-18;              // top of each 18-yard box, in yd
    ok('big: 18 yd from the 18-yard box to the dashed line',
       q(cross[0])-boxTop===18 && boxBot-q(cross[1])===18,
       `${q(cross[0])-boxTop} / ${boxBot-q(cross[1])}`);
    ok('big: 18 yd from the dashed line to halfway',
       q(half)-q(cross[0])===18 && q(cross[1])-q(half)===18,
       `${q(half)-q(cross[0])} / ${q(cross[1])-q(half)}`);
    ok('big: so each half is three equal 18 yd bands', q(half)===54, q(half)+' yd per half');
  } else {
    ok(`${key}: no cross-pitch dashed lines`, cross.length===0, cross.join(','));
  }

  /* The Game Field is the Main Field with more room: same 18-yard box and same
     goal area, but 2 yd wider and 10 yd longer, so the gap between the top of
     the 18 and halfway grows by exactly 5 yd on each side. */
  if (key==='game'){
    ok('game: 41 yd from the top of the 18 to halfway — 5 more than the main field',
       q(half)-18===41, `${q(half)-18} yd`);
    const box=[...svg.querySelectorAll('rect')][3];
    const bx=+box.getAttribute('x'), by=+box.getAttribute('y');
    const bw=+box.getAttribute('width'), bh=+box.getAttribute('height');
    const bA=A(bx,by), bAw=land?bh:bw, bLd=land?bw:bh;
    ok('game: the 18-yard box is the usual 40 x 18 yd',
       q(bAw)===40 && q(bLd)===18, `${q(bAw)} x ${q(bLd)}`);
    ok('game: 15 yd of grass between the touchline and the edge of the 18',
       q(bA)===15 && q(AC-bA-bAw)===15, `${q(bA)} / ${q(AC-bA-bAw)}`);
  }
  // the D is narrower than the 16 yd goal area, so the two do not sit flush
  const mouth=a=>Math.abs(a.a2-a.a1);
  ok(`${key}: two Ds`, arcs.length===2, arcs.length);
  ok(`${key}: each D mouth is 15.5 yd`,
     arcs.every(a=>Math.abs(q(mouth(a))-15.5)<1e-6),
     arcs.map(a=>q(mouth(a)).toFixed(4)).join(' / '));
  ok(`${key}: each D is centred on the pitch`,
     arcs.every(a=>Math.abs((a.a1+a.a2)/2-midA)<1e-9),
     arcs.map(a=>((a.a1+a.a2)/2)).join(','));
  ok(`${key}: the D is narrower than the 16 yd goal area`,
     arcs.every(a=>mouth(a) < 16*U - 1e-6),
     arcs.map(a=>q(mouth(a)).toFixed(2)+' vs 16').join(' / '));
  // the radius must be the one that actually produces that mouth off the box top
  ok(`${key}: the arc radius matches the mouth`,
     arcs.every(a=>Math.abs(a.r-Math.hypot(mouth(a)/2, 6*U))<1e-3),
     arcs.map(a=>`r=${a.r} want ${Math.hypot(mouth(a)/2,6*U).toFixed(4)}`).join(' / '));
  ok(`${key}: each D springs off the top of the 18-yard box`,
     arcs.every(a=>a.l1===a.l2) &&
     Math.abs(arcs[0].l1-18*U)<1e-9 && Math.abs(arcs[1].l1-(AL-18*U))<1e-9,
     arcs.map(a=>q(a.l1)+' yd').join(','));
  /* Both Ds have to bulge INTO the pitch. Swapping the axes for a landscape
     pitch reverses the winding, so this is the assertion that catches a sweep
     flag left at its portrait value — the D would balloon out behind the goal.
     Sweep 1 is clockwise in SVG's y-down space; work out which way that throws
     the apex for this arc's direction of travel and check it heads inward. */
  ok(`${key}: the Ds bulge into the pitch, not out behind the goal`,
     arcs.every(a=>{
       const dx=a.x2-a.x1, dy=a.y2-a.y1;
       /* In SVG's y-down space, "right of travel" is (-dy, dx). A clockwise arc
          (sweep 1) puts its centre on that side, so its apex is on the other —
          and a counter-clockwise arc is the mirror. */
       const nx = a.sweep ? dy : -dy;
       const ny = a.sweep ? -dx : dx;
       // that apex direction must point from this goal line toward the middle
       return (a.l1 < AL/2 ? 1 : -1) * L(nx+x0, ny+y0) > 0;
     }),
     arcs.map(a=>`sweep ${a.sweep}`).join(' / '));
  ok(`${key}: the penalty spots are 12 yd off each goal line`,
     q(pk[0])===12 && q(AL-pk[2])===12, `${q(pk[0])} / ${q(AL-pk[2])}`);

  /* ---------- the green surround outside the touchlines ----------
     Screen-relative, whichever way the pitch faces: main 3 yd each side, 15
     above, 10 below; small sided 2 each side, 2 above, 15 below; game 2 each
     side, 4 top and bottom. Every pitch is on its side, so left and right are
     behind the goals and the deep strips top and bottom run along the SIDELINES
     — checked explicitly below. */
  const PAD={big:{l:3,r:3,t:15,b:10}, small:{l:2,r:2,t:2,b:15}, game:{l:2,r:2,t:4,b:4}};
  const vb=svg.getAttribute('viewBox').split(/\s+/).map(Number);
  const [ax0,ay0,vbW,vbH]=vb, ax1=ax0+vbW, ay1=ay0+vbH;
  const p=PAD[key];
  ok(`${key}: ${p.l} yd of grass off the left touchline`, yd(x0)-yd(ax0)===p.l, (yd(x0)-yd(ax0))+' yd');
  ok(`${key}: ${p.r} yd off the right touchline`,          yd(ax1)-yd(x1)===p.r, (yd(ax1)-yd(x1))+' yd');
  ok(`${key}: ${p.t} yd past the top edge`,                yd(y0)-yd(ay0)===p.t, (yd(y0)-yd(ay0))+' yd');
  ok(`${key}: ${p.b} yd past the bottom edge`,             yd(ay1)-yd(y1)===p.b, (yd(ay1)-yd(y1))+' yd');
  /* The deepest strip on every pitch has to run along a sideline rather than sit
     behind a goal — that is the point of turning them all on their side. Work out
     which edge is deepest and check it is one of the two that face a sideline. */
  const deepest=Object.entries(p).sort((a,b)=>b[1]-a[1])[0][0];
  const sidelineEdges = land ? ['t','b'] : ['l','r'];
  ok(`${key}: the deepest strip (${p[deepest]} yd) runs along a sideline, not behind a goal`,
     sidelineEdges.includes(deepest), `deepest edge is ${deepest}, ${land?'landscape':'portrait'}`);
  // whole yards on every edge, so the surround tiles into complete grid squares
  ok(`${key}: the surround is whole grid squares`,
     [ax0,ay0,ax1,ay1].every(on), [ax0,ay0,ax1,ay1].join(','));

  /* Grass and grid have to reach the edge of that area. If either stopped at the
     touchline the surround would be a black margin rather than usable space. */
  const covers=r =>
    +r.getAttribute('x')===ax0 && +r.getAttribute('y')===ay0 &&
    +r.getAttribute('width')===vbW && +r.getAttribute('height')===vbH;
  const [grassR,gridR]=[...svg.querySelectorAll('rect')];
  ok(`${key}: the grass covers the whole area`, covers(grassR), grassR.getAttribute('fill'));
  ok(`${key}: the grid covers the whole area`,  covers(gridR),  gridR.getAttribute('fill'));
  // and the pattern is still anchored at the origin, so surround squares line up
  const pat=svg.querySelector('pattern');
  ok(`${key}: the grid still tiles from the 10,10 origin`,
     pat.getAttribute('x')==='10' && pat.getAttribute('y')==='10' &&
     +pat.getAttribute('width')===U,
     `${pat.getAttribute('x')},${pat.getAttribute('y')} step ${pat.getAttribute('width')}`);
 }

 console.log(R.join('\n'));
 console.log(`\n${pass} passed, ${fail} failed`);
 console.log('runtime errors:', errs.length?errs:'none');
 process.exit((fail||errs.length)?1:0);
},300);
