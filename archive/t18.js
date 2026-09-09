/* t18 — the Game Field is a first-class pitch, not a decoration: its own drawer
   of items, its own clamp bounds, and it round-trips through save/load. */
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
const ok=(n,c,x='')=>{c?pass++:fail++;R.push((c?'  ok  ':'  FAIL')+' '+n+(x?'   ['+x+']':''));};
const pe=(el,t,x,y,ex={})=>el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1,...ex}));
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')];
const tab=k=>d.querySelector(`.tab[data-field="${k}"]`);
const arm=k=>{const b=d.querySelector(`.kit[data-kit="${k}"]`);if(!b.classList.contains('on'))b.click();};
const xy=g=>{const m=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);return{x:+m[1],y:+m[2]};};

setTimeout(()=>{
 ok('three tabs, built from the field table',
    [...d.querySelectorAll('.tab')].map(t=>t.dataset.field).join(',')==='big,small,game',
    [...d.querySelectorAll('.tab')].map(t=>t.dataset.field).join(','));
 ok('the new tab is labelled Game Field',
    tab('game').querySelector('.name').textContent==='Game Field',
    tab('game').querySelector('.name').textContent);
 /* Every pitch is landscape and fit-to-view fills the window, so the name alone
    no longer distinguishes Main Field from Small Sided — the tab carries the
    yardage too, and it has to come from the field rather than be typed in. */
 const dim=k=>tab(k).querySelector('.dim').textContent;
 ok('each tab shows its own pitch size',
    dim('big')==='108 × 68 yd' && dim('small')==='86 × 68 yd' && dim('game')==='118 × 70 yd',
    ['big','small','game'].map(k=>`${k} "${dim(k)}"`).join(' · '));
 ok('and no two tabs read the same',
    new Set(['big','small','game'].map(k=>tab(k).textContent)).size===3);
 ok('Main Field is still the one you land on', tab('big').classList.contains('on'));

 tab('game').click();
 ok('switching tabs works', tab('game').classList.contains('on') && !tab('big').classList.contains('on'));
 ok('the status names the pitch', d.getElementById('status').textContent==='Game Field',
    d.getElementById('status').textContent);
 const svg=d.querySelector('.field-wrap.on svg');
 ok('the visible pitch is the game one', svg.dataset.field==='game', svg.dataset.field);

 arm('coneOrange');
 pe(svg,'pointerdown',40,40); pe(svg,'pointerup',40,40);
 ok('a cone drops on the game field', items().length===1, items().length);

 // each pitch keeps its own items
 tab('big').click();
 ok('the main field is untouched', d.querySelectorAll('.field-wrap.on .item').length===0);
 tab('small').click();
 ok('the small-sided field is untouched', d.querySelectorAll('.field-wrap.on .item').length===0);
 tab('game').click();
 ok('the game field kept its cone', items().length===1, items().length);

 /* Clamping uses this pitch's own bounds, not the main field's — and the bound
    is the working area, pitch plus green surround, since kit gets staged behind
    the goal. Read both areas off the grass rect rather than hardcoding. */
 const areaOf=k=>{
   const r=[...d.querySelectorAll('.field-wrap svg')].find(s=>s.dataset.field===k).querySelector('rect');
   return { x1:+r.getAttribute('x')+ +r.getAttribute('width'),
            y1:+r.getAttribute('y')+ +r.getAttribute('height') };
 };
 const GA=areaOf('game'), BA=areaOf('big');
 arm('coneOrange');
 pe(svg,'pointerdown',9999,9999); pe(svg,'pointerup',9999,9999);
 const c=xy(items()[1]);
 ok('a far drop clamps inside the game field area',
    c.x<=GA.x1 && c.y<=GA.y1, `${c.x},${c.y} vs ${GA.x1},${GA.y1}`);
 /* The game field reaches further right than the main field does, so a cone that
    ends up past the main field's right edge can only have been clamped against
    the game field's own bounds. Guard the premise so this cannot go vacuous if
    the two ever end up the same width. */
 ok('the game field is wider on screen than the main field, so this test can tell them apart',
    GA.x1>BA.x1, `${GA.x1} vs ${BA.x1}`);
 ok('and it clamps past the main field bounds, so it used its own',
    c.x>BA.x1, `${c.x} vs main right edge ${BA.x1}`);

 // save / load carries the new pitch
 d.getElementById('setupName').value='g1';
 d.getElementById('saveSetup').click();
 d.getElementById('clearBtn').click();
 ok('Clear empties the game field', items().length===0, items().length);
 d.getElementById('setupList').value='g1';
 d.getElementById('loadSetup').click();
 ok('save/load round-trips the game field', items().length===2, items().length);

 // undo / redo act on the game field like any other
 d.getElementById('undoBtn').click();
 const afterUndo=items().length;
 d.getElementById('redoBtn').click();
 ok('undo then redo returns the game field to 2 items',
    afterUndo!==2 && items().length===2, `${afterUndo} -> ${items().length}`);

 /* Fit-to-view divides by baseW/baseH, so the new pitch needs a sane, correctly
    proportioned box. jsdom reports a zero-size viewport, so check the numbers
    rather than clicking the button. */
 const G=w.FIELDS ? w.FIELDS.game : null;
 /* Measure the pitch, not the working area — the surrounds differ per field. Every
    pitch is turned on its side, so compare long edge to long edge and short to
    short rather than leaning on screen width meaning the same thing each time. */
 const dims=[...d.querySelectorAll('.field-wrap svg')].map(s=>{
   const r=s.querySelector('rect.pitch');
   const a=+r.getAttribute('width'), b=+r.getAttribute('height');
   return {k:s.dataset.field, w:+r.getAttribute('width'), h:+r.getAttribute('height'),
           long:Math.max(a,b), short:Math.min(a,b)};
 });
 const g=dims.find(x=>x.k==='game');
 ok('the game pitch lies on its side, like the others', g.w>g.h, `${g.w}x${g.h}`);
 ok('all three pitches face the same way', dims.every(x=>x.w>x.h),
    dims.map(x=>`${x.k} ${x.w}x${x.h}`).join(' · '));
 ok('it is the largest pitch of the three',
    dims.every(x=>x.k==='game' || (g.short>=x.short && g.long>x.long)),
    dims.map(x=>`${x.k} ${x.short}x${x.long}`).join(' · '));

 console.log(R.join('\n'));
 console.log(`\n${pass} passed, ${fail} failed`);
 console.log('runtime errors:', errs.length?errs:'none');
 process.exit((fail||errs.length)?1:0);
},400);
