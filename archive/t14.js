// t14 — box select: measure a grid area, build it in tape or cones
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
const st=()=>d.getElementById('status').textContent;
const dims=()=>d.getElementById('boxDims').textContent;
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
const tapes=()=>[...d.querySelectorAll('.field-wrap.on [data-tape] line:not(.tape-hit)')];
const sel=()=>d.querySelector('.field-wrap.on .sel-layer');
const selRect=()=>sel().querySelector('rect');
const xy=g=>{const m=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);return{x:+m[1],y:+m[2]};};
const U=3, ORIGIN=10;
function drawBox(svg,x1,y1,x2,y2){
  pe(svg,'pointerdown',x1,y1); pe(svg,'pointermove',x2,y2); pe(svg,'pointerup',x2,y2);
}

setTimeout(()=>{
 const svg=d.querySelectorAll('.field-wrap svg')[0];

 // ---------- 1. mode wiring ----------
 ok('Box button exists', !!d.getElementById('modeBox'));
 d.getElementById('modeBox').click();
 ok('box mode active', d.getElementById('modeBox').classList.contains('on'), st());
 ok('body carries the box-mode class', d.body.classList.contains('box-mode'));
 ok('build buttons start disabled',
    d.getElementById('boxTape').disabled && d.getElementById('boxCones').disabled);
 ok('readout starts empty', dims()==='no selection', dims());

 // ---------- 2. drag out 4 yd x 5 yd = 20 squares ----------
 // grid origin 10, 3 units per yard: x 22->34 is 4 yd, y 40->55 is 5 yd
 drawBox(svg,22,40,34,55);
 ok('selection rect drawn', !!selRect());
 const r=selRect();
 ok('rect covers exactly the dragged cells',
    +r.getAttribute('x')===22 && +r.getAttribute('y')===40 &&
    +r.getAttribute('width')===12 && +r.getAttribute('height')===15,
    `${r.getAttribute('x')},${r.getAttribute('y')} ${r.getAttribute('width')}x${r.getAttribute('height')}`);
 ok('readout says 4 x 5 yd and 20 squares', /4 × 5 yd · 20 squares/.test(dims()), dims());
 ok('the on-field chip says the same', /4 × 5 yd · 20 squares/.test(sel().textContent), sel().textContent.trim());
 ok('status echoes the size', /4 × 5 yd/.test(st()), st());
 ok('build buttons unlocked',
    !d.getElementById('boxTape').disabled && !d.getElementById('boxCones').disabled);

 // ---------- 3. off-grid drags still snap to whole squares ----------
 drawBox(svg,23.2,41.4,32.6,53.9);
 ok('corners snapped to the grid', /yd · \d+ squares/.test(dims()), dims());
 const r2=selRect();
 ok('every edge sits on a grid line',
    [+r2.getAttribute('x'),+r2.getAttribute('y')].every(v=>Math.abs((v-ORIGIN)/U-Math.round((v-ORIGIN)/U))<1e-9) &&
    [+r2.getAttribute('width'),+r2.getAttribute('height')].every(v=>Math.abs(v/U-Math.round(v/U))<1e-9),
    `${r2.getAttribute('x')},${r2.getAttribute('y')} ${r2.getAttribute('width')}x${r2.getAttribute('height')}`);

 // dragging right-to-left / bottom-to-top gives the same box
 drawBox(svg,34,55,22,40);
 const r3=selRect();
 ok('backwards drag normalises',
    +r3.getAttribute('x')===22 && +r3.getAttribute('y')===40 &&
    +r3.getAttribute('width')===12 && +r3.getAttribute('height')===15,
    `${r3.getAttribute('x')},${r3.getAttribute('y')} ${r3.getAttribute('width')}x${r3.getAttribute('height')}`);
 ok('still 4 x 5 · 20', /4 × 5 yd · 20 squares/.test(dims()), dims());

 // a click, or a sub-square sliver, is not a selection
 drawBox(svg,22,40,22.5,40.5);
 ok('a click does not make a box', !selRect() && dims()==='no selection', dims());
 ok('status explains why', /at least one square/.test(st()), st());

 // ---------- 4. build tape ----------
 drawBox(svg,22,40,34,55);
 d.getElementById('boxTape').click();
 const tl=tapes();
 ok('tape box is 4 lines', tl.length===4, tl.length);
 const seg=tl.map(l=>[+l.getAttribute('x1'),+l.getAttribute('y1'),+l.getAttribute('x2'),+l.getAttribute('y2')]);
 const has=(a,b,c,e)=>seg.some(s=>s[0]===a&&s[1]===b&&s[2]===c&&s[3]===e);
 ok('top edge', has(22,40,34,40), JSON.stringify(seg[0]));
 ok('right edge', has(34,40,34,55));
 ok('bottom edge', has(34,55,22,55));
 ok('left edge', has(22,55,22,40));
 ok('selection survives so you can also add cones', !!selRect());
 ok('tape uses the current tape colour',
    tl.every(l=>l.getAttribute('stroke')==='#facc15'), tl[0].getAttribute('stroke'));

 // ---------- 5. build cones ----------
 d.getElementById('clearBtn').click();
 ok('clear also drops the selection', !selRect() && dims()==='no selection', dims());
 d.getElementById('modeBox').click();
 drawBox(svg,22,40,34,55);
 d.getElementById('boxSpacing').value='1';
 d.getElementById('boxCones').click();
 // perimeter of a 4x5 box at 1 yd spacing = 2*(4+5) = 18 cones, corners included once
 ok('18 cones around a 4 x 5 box at 1 yd', items().length===18, items().length);
 const pts=items().map(xy);
 const corners=[[22,40],[34,40],[34,55],[22,55]];
 ok('a cone sits on each corner',
    corners.every(([cx,cy])=>pts.some(p=>Math.abs(p.x-cx)<1e-6&&Math.abs(p.y-cy)<1e-6)),
    JSON.stringify(pts.slice(0,4)));
 ok('no cone is inside the box',
    pts.every(p=>p.x===22||p.x===34||p.y===40||p.y===55),
    JSON.stringify(pts.filter(p=>!(p.x===22||p.x===34||p.y===40||p.y===55))));
 ok('no two cones share a spot',
    new Set(pts.map(p=>p.x+','+p.y)).size===pts.length);
 ok('cone type honours the dropdown',
    items().length>0 && items().every(g=>g.dataset.type==='coneOrange'),
    [...new Set(items().map(g=>g.dataset.type))].join(','));

 // wider spacing means fewer cones
 d.getElementById('clearBtn').click();
 d.getElementById('modeBox').click();
 drawBox(svg,22,40,34,55);
 d.getElementById('boxSpacing').value='5';
 d.getElementById('boxCone').value='coneLgWhite';
 d.getElementById('boxCones').click();
 ok('5 yd spacing lays far fewer cones', items().length>=4 && items().length<10, items().length);
 ok('the large cone was used', items().every(g=>g.dataset.type==='coneLgWhite'),
    [...new Set(items().map(g=>g.dataset.type))].join(','));
 ok('corners are still covered at coarse spacing',
    corners.every(([cx,cy])=>items().map(xy).some(p=>Math.abs(p.x-cx)<1e-6&&Math.abs(p.y-cy)<1e-6)),
    JSON.stringify(items().map(xy)));

 // ---------- 6. undo / clear / mode changes ----------
 const n=items().length;
 d.getElementById('undoBtn').click();
 ok('undo removes the cone ring', items().length===0, items().length);
 d.getElementById('redoBtn').click();
 ok('redo brings it back', items().length===n, items().length);

 ok('selection is not part of undo history', !!selRect());
 d.getElementById('boxClear').click();
 ok('the ✕ clears the selection', !selRect() && dims()==='no selection', dims());

 // leaving box mode drops the overlay
 drawBox(svg,22,40,34,55);
 ok('re-selected', !!selRect());
 d.getElementById('modeSelect').click();
 ok('switching modes clears the overlay', !selRect(), sel().innerHTML);
 ok('box-mode class removed', !d.body.classList.contains('box-mode'));

 // switching fields clears it too
 d.getElementById('modeBox').click();
 drawBox(svg,22,40,34,55);
 d.querySelectorAll('.tab')[1].click();
 ok('tab switch clears the selection', dims()==='no selection', dims());
 d.querySelectorAll('.tab')[0].click();

 // ---------- 7. Escape, and arming kit while in box mode ----------
 d.getElementById('modeBox').click();
 drawBox(svg,22,40,34,55);
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 ok('Esc clears the selection but stays in box mode',
    !selRect() && d.getElementById('modeBox').classList.contains('on'), st());
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 ok('a second Esc returns to select mode', d.getElementById('modeSelect').classList.contains('on'));

 d.getElementById('modeBox').click();
 d.querySelector('.kit[data-kit="coneOrange"]').click();
 ok('arming equipment leaves box mode', d.getElementById('modeSelect').classList.contains('on'), st());

 // ---------- 8. non-square boxes and snap off ----------
 d.getElementById('clearBtn').click();
 d.querySelector('.kit[data-kit="coneOrange"]').click();      // disarm
 d.getElementById('modeBox').click();
 drawBox(svg,22,40,25,43);
 ok('a single square reads 1 × 1 yd · 1 square', /1 × 1 yd · 1 square$/.test(dims()), dims());
 d.getElementById('boxCones').click();
 ok('a 1 yd box gets 4 corner cones at 5 yd spacing', items().length===4, items().length);

 d.getElementById('clearBtn').click();
 d.getElementById('modeBox').click();
 d.getElementById('snapBtn').click();                        // snap off
 drawBox(svg,22.4,40.7,34.1,55.2);
 ok('snap off measures the raw drag', /yd/.test(dims()) && !/squares/.test(dims()), dims());

 console.log(R.join('\n'));
 console.log(`\n${pass} passed, ${fail} failed`);
 console.log('runtime errors:', errs.length?errs:'none');
 if (fail||errs.length) process.exitCode=1;
},60);
