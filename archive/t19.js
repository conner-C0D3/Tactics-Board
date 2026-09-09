/* t19 — the Rotate button turns the pitch AND everything standing on it.
   A drill is drawn on a field; turning the field and leaving the cones behind
   would scramble it. So the test is mostly about what travels with the turn. */
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

const svg=()=>d.querySelector('.field-wrap.on svg');
const vb =()=>svg().getAttribute('viewBox').split(/\s+/).map(Number);
const items=()=>[...d.querySelectorAll('.field-wrap.on .item')].map(g=>g.getAttribute('transform'));
const tapes=()=>[...d.querySelectorAll('.field-wrap.on [data-tape] line')].slice(0,1)
  .map(l=>['x1','y1','x2','y2'].map(a=>+l.getAttribute(a)).join(','));
const stops=()=>[...d.querySelectorAll('.field-wrap.on [data-stop] circle')]
  .filter(c=>c.getAttribute('r')==='1.6').map(c=>`${c.getAttribute('cx')},${c.getAttribute('cy')}`);
const shot=()=>({vb:vb().join(' '), items:items().join('|'), tape:tapes().join('|'), stops:stops().join('|')});
const same=(a,b)=>a.vb===b.vb&&a.items===b.items&&a.tape===b.tape&&a.stops===b.stops;
const arm=k=>{const b=d.querySelector(`.kit[data-kit="${k}"]`);if(!b.classList.contains('on'))b.click();};
const rot=()=>d.getElementById('rotateBtn').click();
const xy=t=>{const m=t.match(/translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/);return{x:+m[1],y:+m[2],r:+m[3]};};
const U=3, ORIGIN=10;
const onHalf=v=>Math.abs(((v-ORIGIN)/(U/2))-Math.round((v-ORIGIN)/(U/2)))<1e-9;

setTimeout(()=>{
 const btn=d.getElementById('rotateBtn');
 ok('there is a Rotate button', !!btn, btn&&btn.textContent);

 // ---------- lay out a small drill: two bits of kit, a tape line, a ball path ----------
 arm('coneOrange');   pe(svg(),'pointerdown',40,40);  pe(svg(),'pointerup',40,40);
 arm('goalFull');     pe(svg(),'pointerdown',100,60); pe(svg(),'pointerup',100,60);
 d.getElementById('modeTape').click();
 pe(svg(),'pointerdown',60,70); pe(svg(),'pointermove',130,70); pe(svg(),'pointerup',130,70);
 d.getElementById('modeBall').click();
 pe(svg(),'pointerdown',70,100); pe(svg(),'pointerup',70,100);
 pe(svg(),'pointerdown',150,120); pe(svg(),'pointerup',150,120);
 d.getElementById('modeSelect').click();
 const start=shot();
 ok('the drill is on the pitch: 2 items, a tape line and 2 ball stops',
    items().length===2 && tapes().length===1 && stops().length===2,
    `${items().length} items / ${tapes().length} tape / ${stops().length} stops`);

 /* ---------- one quarter turn clockwise ----------
    The main field is landscape by default with 3 yd of grass off each goal line,
    15 above the top sideline and 10 below the bottom one. A clockwise turn stands
    it up and carries each strip of grass round with it: the 15 that was on top
    ends up on the right, the 10 that was below ends up on the left. */
 const [bx0,by0,bW,bH]=vb();
 rot();
 const [rx0,ry0,rW,rH]=vb();
 ok('the view turns on its side', rW===bH && rH===bW, `${bW}x${bH} -> ${rW}x${rH}`);
 ok('the pitch itself is still anchored at the 10,10 origin',
    +svg().querySelector('rect.pitch').getAttribute('x')===10 &&
    +svg().querySelector('rect.pitch').getAttribute('y')===10);
 const pr=svg().querySelector('rect.pitch');
 ok('and it now stands up the screen, 68 wide by 108 long',
    +pr.getAttribute('width')/U===68 && +pr.getAttribute('height')/U===108,
    `${+pr.getAttribute('width')/U}x${+pr.getAttribute('height')/U} yd`);
 // the surround travelled with the pitch rather than staying put on screen
 ok('the 10 yd strip that was below the pitch is now on its left',
    (10-rx0)/U===10, `${(10-rx0)/U} yd`);
 ok('the 3 yd strip that was off the left goal line is now above the pitch',
    (10-ry0)/U===3, `${(10-ry0)/U} yd`);
 ok('and the 15 yd strip that was above is now on the right',
    (rx0+rW-(10+68*U))/U===15, `${(rx0+rW-(10+68*U))/U} yd`);

 // ---------- everything on the pitch came with it ----------
 const before=start.items.split('|').map(xy), after=items().map(xy);
 ok('every item turned 90° on its own axis too',
    after.every((a,i)=>a.r===(before[i].r+90)%360), after.map(a=>a.r).join(','));
 /* A clockwise turn sends a point (u,v) measured from the old top-left corner to
    (H-v, u) in the new frame. Check the kit really followed that map rather than
    just sitting where it was. */
 ok('and each one landed where the turn sends it',
    after.every((a,i)=>{
      const u=before[i].x-bx0, v=before[i].y-by0;
      return Math.abs(a.x-(rx0+(bH-v)))<1e-9 && Math.abs(a.y-(ry0+u))<1e-9;
    }), after.map(a=>`${a.x},${a.y}`).join(' '));
 ok('the tape line turned with it', tapes().length===1 && tapes()[0]!==start.tape,
    tapes().join('|'));
 ok('the ball path stops turned with it',
    stops().length===2 && stops().join('|')!==start.stops, stops().join('|'));
 ok('nothing was knocked off the half-yard snap grid',
    after.every(a=>onHalf(a.x)&&onHalf(a.y)), after.map(a=>`${a.x},${a.y}`).join(' '));
 ok('and nothing was left outside the working area',
    after.every(a=>a.x>=rx0&&a.x<=rx0+rW&&a.y>=ry0&&a.y<=ry0+rH),
    `area ${rx0},${ry0} ${rW}x${rH}`);

 // ---------- the field is still live after the redraw ----------
 /* Rotating replaces the markings inside the <svg>. If it replaced the <svg>
    itself every pointer handler would go with it and the field would look right
    but do nothing, which is the failure this catches. */
 arm('coneRed'); pe(svg(),'pointerdown',50,50); pe(svg(),'pointerup',50,50);
 ok('kit can still be placed on a rotated field', items().length===3, items().length);
 const it=d.querySelector('.field-wrap.on .item');
 const t0=it.getAttribute('transform');
 pe(it,'pointerdown',40,40); pe(svg(),'pointermove',80,90); pe(svg(),'pointerup',80,90);
 ok('and kit can still be dragged on it',
    d.querySelector('.field-wrap.on .item').getAttribute('transform')!==t0,
    d.querySelector('.field-wrap.on .item').getAttribute('transform'));
 // put the extra cone and the drag back so the four-turn check below is clean
 d.getElementById('undoBtn').click();
 d.getElementById('undoBtn').click();

 // ---------- four turns is a full circle, exactly ----------
 const one=shot();
 rot(); rot(); rot();
 ok('four quarter turns come back to precisely where it started',
    same(shot(), start), `${shot().vb} vs ${start.vb}`);
 rot();
 ok('and a fifth turn matches the first',  same(shot(), one), shot().vb);

 // ---------- undo / redo know about the turn ----------
 d.getElementById('undoBtn').click();
 ok('undo takes the pitch back to its earlier orientation', same(shot(), start),
    `${shot().vb} vs ${start.vb}`);
 d.getElementById('redoBtn').click();
 ok('redo turns it again, kit and all', same(shot(), one), `${shot().vb} vs ${one.vb}`);

 // ---------- guides survive the redraw ----------
 d.getElementById('guidesBtn').click();          // hide them
 const hidden=()=>[...d.querySelectorAll('.field-wrap.on .ref-lines')]
   .every(g=>g.style.display==='none');
 ok('guides can be hidden', hidden());
 rot();
 ok('and stay hidden through a rotation', hidden(),
    [...d.querySelectorAll('.field-wrap.on .ref-lines')].map(g=>`"${g.style.display}"`).join(','));
 d.getElementById('guidesBtn').click();          // back on

 // ---------- rotation is per field ----------
 const mainVb=shot().vb;
 d.querySelector('.tab[data-field="game"]').click();
 const gameVb=vb().join(' ');
 rot();
 ok('rotating one pitch leaves the others alone', vb().join(' ')!==gameVb);
 d.querySelector('.tab[data-field="big"]').click();
 ok('the main field is exactly as it was left', shot().vb===mainVb, `${shot().vb} vs ${mainVb}`);

 // ---------- save / load carry the orientation ----------
 const saved=shot();
 d.getElementById('setupName').value='turned';
 d.getElementById('saveSetup').click();
 rot(); rot();                                   // leave it facing somewhere else
 ok('the pitch was moved off the saved orientation', shot().vb!==saved.vb);
 d.getElementById('setupList').value='turned';
 d.getElementById('loadSetup').click();
 ok('loading restores the orientation and everything on it', same(shot(), saved),
    `${shot().vb} vs ${saved.vb}`);

 // ---------- Clear empties the drawers without spinning the pitch back ----------
 const turned=shot().vb;
 d.getElementById('clearBtn').click();
 ok('Clear empties the field', items().length===0, items().length);
 ok('but leaves it facing the way you turned it', vb().join(' ')===turned,
    `${vb().join(' ')} vs ${turned}`);
 /* Clear has to record the orientation in the snapshot it pushes, not just leave
    the pitch alone on screen. If it wrote a default orientation into the state
    while the pitch stayed turned, the two would be out of step and the very next
    undo or redo would spin the field without being asked — which is what this
    round trip checks. */
 d.getElementById('undoBtn').click();
 ok('undoing the Clear brings the drill back onto the same pitch',
    vb().join(' ')===turned && items().length>0,
    `${vb().join(' ')} vs ${turned}, ${items().length} items`);
 d.getElementById('redoBtn').click();
 ok('and redoing it clears again without spinning the pitch back',
    vb().join(' ')===turned && items().length===0,
    `${vb().join(' ')} vs ${turned}, ${items().length} items`);

 console.log(R.join('\n'));
 console.log(`\n${pass} passed, ${fail} failed`);
 console.log('runtime errors:', errs.length?errs:'none');
 process.exit((fail||errs.length)?1:0);
},400);
