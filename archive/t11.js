// t11 — pan while zoomed in
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
const R=[]; let pass=0,fail=0;
function ok(n,c,x=''){(c?pass++:fail++);R.push((c?'  ok  ':'  FAIL')+' '+n+(x?'   ['+x+']':''));}
function pe(el,t,x,y,ex={}){el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1,...ex}));}

setTimeout(()=>{
 const vp=d.getElementById('viewport'), inner=d.getElementById('inner');
 const svg=d.querySelectorAll('.field-wrap svg')[0];

 // jsdom has no layout, so give the viewport a real scrollable model:
 // a 500x400 window over content sized by inner.style.width/height.
 let SL=0, ST=0;
 const VW=500, VH=400;
 const cw=()=>parseInt(inner.style.width)||360, ch=()=>parseInt(inner.style.height)||648;
 Object.defineProperty(vp,'clientWidth',{get:()=>VW});
 Object.defineProperty(vp,'clientHeight',{get:()=>VH});
 Object.defineProperty(vp,'scrollLeft',{
   get:()=>SL, set:v=>{ SL=Math.max(0,Math.min(v,Math.max(0,cw()-VW))); }});
 Object.defineProperty(vp,'scrollTop',{
   get:()=>ST, set:v=>{ ST=Math.max(0,Math.min(v,Math.max(0,ch()-VH))); }});
 vp.getBoundingClientRect=()=>({left:150,top:80,width:VW,height:VH,right:650,bottom:480});
 Object.defineProperty(inner,'offsetLeft',{get:()=>0});
 Object.defineProperty(inner,'offsetTop',{get:()=>0});

 // ---------- zoom in far enough that the field overflows the viewport ----------
 for (let i=0;i<12;i++) vp.dispatchEvent(new w.WheelEvent('wheel',{deltaY:-100,clientX:400,clientY:280,bubbles:true,cancelable:true}));
 const zl=d.getElementById('zoomLbl').textContent;
 ok('scroll wheel zoomed in', parseInt(zl)>100, zl);
 ok('content now overflows the viewport', cw()>VW && ch()>VH, `${cw()}x${ch()} vs ${VW}x${VH}`);

 vp.scrollLeft=200; vp.scrollTop=150;
 const l0=vp.scrollLeft, t0=vp.scrollTop;

 // ---------- drag empty grass with nothing armed ----------
 pe(svg,'pointerdown',400,280);
 pe(svg,'pointermove',340,230);
 ok('body gets the panning class', d.body.classList.contains('panning'));
 ok('pan follows the mouse 1:1',
    vp.scrollLeft===l0+60 && vp.scrollTop===t0+50,
    `${l0}->${vp.scrollLeft}, ${t0}->${vp.scrollTop}`);
 pe(svg,'pointerup',340,230);
 ok('panning class cleared on release', !d.body.classList.contains('panning'));
 ok('pan does not create anything', d.querySelectorAll('.field-wrap.on .item').length===0);

 // ---------- pan must not fire when a kit is armed (that's a place) ----------
 const l1=vp.scrollLeft;
 d.querySelector('.kit[data-kit="coneOrange"]').click();
 ok('armed class drives the cursor', d.body.classList.contains('armed'));
 pe(svg,'pointerdown',400,280); pe(svg,'pointermove',300,280); pe(svg,'pointerup',300,280);
 ok('armed click places instead of panning',
    d.querySelectorAll('.field-wrap.on .item').length===1 && vp.scrollLeft===l1,
    `items=${d.querySelectorAll('.field-wrap.on .item').length} scrollLeft ${l1}->${vp.scrollLeft}`);

 // ---------- alt-drag pans even with a kit armed ----------
 const l2=vp.scrollLeft, n2=d.querySelectorAll('.field-wrap.on .item').length;
 pe(svg,'pointerdown',400,280,{altKey:true});
 pe(svg,'pointermove',360,280,{altKey:true});
 pe(svg,'pointerup',360,280,{altKey:true});
 ok('alt-drag pans and places nothing',
    vp.scrollLeft===l2+40 && d.querySelectorAll('.field-wrap.on .item').length===n2,
    `scrollLeft ${l2}->${vp.scrollLeft}, items ${n2}->${d.querySelectorAll('.field-wrap.on .item').length}`);

 // ---------- middle-drag pans in tape mode ----------
 d.getElementById('modeTape').click();
 const l3=vp.scrollLeft, tapes=()=>d.querySelectorAll('.field-wrap.on [data-tape]').length;
 pe(svg,'pointerdown',400,280,{button:1});
 pe(svg,'pointermove',330,280);
 pe(svg,'pointerup',330,280);
 ok('middle-drag pans inside tape mode', vp.scrollLeft===l3+70, `${l3}->${vp.scrollLeft}`);
 ok('middle-drag drew no tape', tapes()===0, tapes());

 // ---------- alt-drag on top of equipment pans, does not move the item ----------
 d.getElementById('modeSelect').click();
 const item=d.querySelector('.field-wrap.on .item');
 const tf0=item.getAttribute('transform');
 const l4=vp.scrollLeft;
 pe(item,'pointerdown',400,280,{altKey:true});
 pe(svg,'pointermove',370,280,{altKey:true});
 pe(svg,'pointerup',370,280,{altKey:true});
 ok('alt-drag over an item pans, item stays put',
    vp.scrollLeft===l4+30 && d.querySelector('.field-wrap.on .item').getAttribute('transform')===tf0,
    `${tf0} / scrollLeft ${l4}->${vp.scrollLeft}`);

 /* ---------- dragging an item still moves it (no alt) ----------
    The cone was placed at 400,280, which is off the working area, so it is sitting
    clamped in the bottom-right corner. Drag it back toward the middle of the pitch:
    nudging it further out would clamp to the same corner and the transform would
    not change, which looks exactly like a broken drag. */
 const l5=vp.scrollLeft;
 const it2=d.querySelector('.field-wrap.on .item');
 pe(it2,'pointerdown',400,280);
 pe(svg,'pointermove',200,150);
 pe(svg,'pointerup',200,150);
 ok('plain item drag still moves the item, not the view',
    d.querySelector('.field-wrap.on .item').getAttribute('transform')!==tf0 && vp.scrollLeft===l5,
    d.querySelector('.field-wrap.on .item').getAttribute('transform'));

 // ---------- pan clamps at the edges ----------
 pe(svg,'pointerdown',400,280);
 pe(svg,'pointermove',400+9999,280+9999);
 pe(svg,'pointerup',400+9999,280+9999);
 ok('pan clamps to 0 at the top-left', vp.scrollLeft===0 && vp.scrollTop===0, `${vp.scrollLeft},${vp.scrollTop}`);

 // ---------- keyboard nudge + fit ----------
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
 ok('arrow key nudges the view', vp.scrollLeft===60, vp.scrollLeft);
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'0',bubbles:true}));
 ok('0 fits to view', /Fit to view/.test(d.getElementById('status').textContent), d.getElementById('status').textContent);

 console.log(R.join('\n'));
 console.log(`\n${pass} passed, ${fail} failed`);
 console.log('runtime errors:', errs.length?errs:'none');
 if (fail||errs.length) process.exitCode=1;
},60);
