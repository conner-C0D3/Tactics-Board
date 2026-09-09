// t12 — the narrow snap lattice: grid corners AND cell centres, never edge
// midpoints. That is what you get with Half Grid OFF, so this test turns it off
// first; the default (Half Grid on, midpoints legal) is covered in t16.
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
const U=3, O=10;
// classify a coordinate against the origin-10 lattice
const kind=v=>{const t=(v-O)/U, f=Math.abs(t-Math.round(t));
  return f<1e-6?'corner':Math.abs(f-0.5)<1e-6?'centre':'off-lattice';};

setTimeout(()=>{
 const svg=d.querySelectorAll('.field-wrap svg')[0];
 d.getElementById('alignBtn').click();            // align off — isolate the grid
 ok('align disabled for this test', !d.getElementById('alignBtn').classList.contains('on'));
 d.getElementById('halfBtn').click();             // narrow the lattice back down
 ok('Half Grid off for this test', !d.getElementById('halfBtn').classList.contains('on'));
 arm('coneOrange');

 // drop right on a corner and right on a centre; both must be honoured exactly
 const cases=[
   ['exact corner',            40,   70,   'corner', 'corner'],
   ['exact centre',            41.5, 71.5, 'centre', 'centre'],
   ['just past a corner',      40.4, 70.4, 'corner', 'corner'],
   ['just short of a centre',  41.2, 71.2, 'centre', 'centre'],
   ['nearer the centre',       41.0, 71.0, 'centre', 'centre'],
   ['nearer the corner',       40.6, 70.6, 'corner', 'corner'],
 ];
 cases.forEach(([label,px,py,wx,wy],i)=>{
   pe(svg,'pointerdown',px,py); pe(svg,'pointerup',px,py);
   const p=xy(i);
   ok(label, kind(p.x)===wx && kind(p.y)===wy,
      `(${px},${py}) -> (${p.x},${p.y}) = ${kind(p.x)}/${kind(p.y)}`);
 });

 // the key property: an edge midpoint (corner on one axis, centre on the other)
 // must never be produced by a free drop
 d.getElementById('clearBtn').click(); arm('coneOrange');
 let edgeMid=0, offLattice=0, n=0;
 for (let a=0;a<12;a++) for (let b=0;b<12;b++){
   const px=40+a*0.37, py=70+b*0.41;
   pe(svg,'pointerdown',px,py); pe(svg,'pointerup',px,py);
   const p=xy(items().length-1); n++;
   const kx=kind(p.x), ky=kind(p.y);
   if (kx==='off-lattice'||ky==='off-lattice') offLattice++;
   else if (kx!==ky) edgeMid++;
   d.getElementById('undoBtn').click();
 }
 ok('no drop lands off the lattice', offLattice===0, `${offLattice}/${n}`);
 ok('no drop lands on an edge midpoint', edgeMid===0, `${edgeMid}/${n}`);

 // both lattices are actually reachable across that sweep
 d.getElementById('clearBtn').click(); arm('coneOrange');
 const seen=new Set();
 for (let a=0;a<12;a++) for (let b=0;b<12;b++){
   pe(svg,'pointerdown',40+a*0.37,70+b*0.41); pe(svg,'pointerup',40+a*0.37,70+b*0.41);
   seen.add(kind(xy(items().length-1).x)); d.getElementById('undoBtn').click();
 }
 ok('both corners and centres are reachable', seen.has('corner')&&seen.has('centre'), [...seen].join(','));

 // ---------- centres survive a move, a rotation and a row ----------
 d.getElementById('clearBtn').click(); arm('coneOrange');
 pe(svg,'pointerdown',41.5,71.5); pe(svg,'pointerup',41.5,71.5);
 ok('placed on a centre', kind(xy(0).x)==='centre'&&kind(xy(0).y)==='centre', JSON.stringify(xy(0)));
 arm('coneOrange');   // disarm so the drag moves rather than places
 if (d.querySelector('.kit[data-kit="coneOrange"]').classList.contains('on')) d.querySelector('.kit[data-kit="coneOrange"]').click();
 pe(items()[0],'pointerdown',41.5,71.5);
 pe(svg,'pointermove',62.6,92.4);
 pe(svg,'pointerup',62.6,92.4);
 const mv=xy(0);
 ok('drag also lands on the lattice', kind(mv.x)!=='off-lattice'&&kind(mv.y)!=='off-lattice', JSON.stringify(mv)+` ${kind(mv.x)}/${kind(mv.y)}`);
 ok('drag does not produce an edge midpoint', kind(mv.x)===kind(mv.y), `${kind(mv.x)}/${kind(mv.y)}`);

 // rotation re-clamps but must not knock it off the lattice
 items()[0].dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2}));
 const rt=xy(0);
 ok('90 rotation keeps the lattice', kind(rt.x)!=='off-lattice'&&kind(rt.y)!=='off-lattice', JSON.stringify(rt));

 // ---------- tape and ball stops snap the same way ----------
 d.getElementById('clearBtn').click();
 d.getElementById('modeTape').click();
 pe(svg,'pointerdown',41.4,71.4); pe(svg,'pointermove',71.4,71.4); pe(svg,'pointerup',71.4,71.4);
 const tl=d.querySelector('.field-wrap.on [data-tape] line');
 ok('tape endpoints snap to the lattice',
    kind(+tl.getAttribute('x1'))!=='off-lattice' && kind(+tl.getAttribute('y1'))!=='off-lattice',
    `${tl.getAttribute('x1')},${tl.getAttribute('y1')}`);

 d.getElementById('modeBall').click();
 pe(svg,'pointerdown',41.4,101.4);
 const badge=d.querySelector('.field-wrap.on .path-layer [data-stop] circle');
 // badge sits STOP_OFF (2.4) units up-left of the stop, so add it back
 const bx=+badge.getAttribute('cx')+2.4, by=+badge.getAttribute('cy')+2.4;
 ok('ball stop on grass snaps to the lattice',
    kind(bx)!=='off-lattice'&&kind(by)!=='off-lattice'&&kind(bx)===kind(by),
    `${bx.toFixed(2)},${by.toFixed(2)} = ${kind(bx)}/${kind(by)}`);

 // ---------- snap off = free placement ----------
 d.getElementById('clearBtn').click();
 d.getElementById('modeSelect').click();
 d.getElementById('snapBtn').click();
 arm('coneOrange');
 pe(svg,'pointerdown',41.37,71.42); pe(svg,'pointerup',41.37,71.42);
 const fr=xy(0);
 ok('snap off places freely', Math.abs(fr.x-41.4)<0.01 && Math.abs(fr.y-71.4)<0.01, JSON.stringify(fr));

 /* ---------- the grid stays clean ----------
    Cell centres are live snap targets (everything above proves it) but they are
    no longer marked — a dot at every centre turned the pitch into graph paper. */
 ok('the grid draws no centre dots',
    !d.querySelector('pattern circle'),
    d.querySelector('pattern circle') ? 'r='+d.querySelector('pattern circle').getAttribute('r') : 'none');

 console.log(R.join('\n'));
 console.log(`\n${pass} passed, ${fail} failed`);
 console.log('runtime errors:', errs.length?errs:'none');
 if (fail||errs.length) process.exitCode=1;
},60);
