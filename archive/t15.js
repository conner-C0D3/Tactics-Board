// t15 — the equipment overhaul: true-scale kit, counts, boost, bundles
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
const cnt=k=>d.querySelector(`[data-cnt="${k}"]`).textContent;
const tf=i=>items()[i].getAttribute('transform');
const U=3;
// walk an absolute M/L/H/V path and return the points it visits
function pathPts(d){
  const toks=d.trim().match(/[MLHVZ]|-?[\d.]+/gi)||[];
  const pts=[]; let cmd='M', x=0, y=0, i=0;
  while(i<toks.length){
    if(/[MLHVZ]/i.test(toks[i])){ cmd=toks[i].toUpperCase(); i++; if(cmd==='Z') continue; }
    if(cmd==='H'){ x=+toks[i++]; }
    else if(cmd==='V'){ y=+toks[i++]; }
    else { x=+toks[i++]; y=+toks[i++]; }
    pts.push({x,y});
  }
  return pts;
}
// bounding box of a rendered item's visible geometry, in SVG units
function bbox(g){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  g.querySelectorAll('circle,rect,line,path').forEach(el=>{
    if(el.getAttribute('fill')==='transparent') return;      // grab ring
    const n=a=>+el.getAttribute(a);
    if(el.tagName==='circle'){const r=n('r');x0=Math.min(x0,n('cx')-r);x1=Math.max(x1,n('cx')+r);y0=Math.min(y0,n('cy')-r);y1=Math.max(y1,n('cy')+r);}
    if(el.tagName==='rect'){x0=Math.min(x0,n('x'));x1=Math.max(x1,n('x')+n('width'));y0=Math.min(y0,n('y'));y1=Math.max(y1,n('y')+n('height'));}
    if(el.tagName==='line'){x0=Math.min(x0,n('x1'),n('x2'));x1=Math.max(x1,n('x1'),n('x2'));y0=Math.min(y0,n('y1'),n('y2'));y1=Math.max(y1,n('y1'),n('y2'));}
    if(el.tagName==='path') pathPts(el.getAttribute('d')).forEach(p=>{
      x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);});
  });
  return {w:x1-x0,h:y1-y0};
}

setTimeout(()=>{
 const svg=d.querySelectorAll('.field-wrap svg')[0];
 ok('no boot errors', errs.length===0, errs.join(' | '));

 // ---------- 1. the kit list ----------
 const need=['goalFull','rebounder','miniWhite','miniOrange','manRed','manYellow',
   'coneRed','coneYellow','coneBlue','coneOrange','coneGreen','coneWhite',
   'coneLgWhite','coneLgNeon','coneLgBlue','coneLgGreen','coneLgRed',
   'poleRed','poleNeon','padRed','padWhite','padBlue','padYellow',
   'discRed','discWhite','discBlue','discYellow',
   'cornRed','cornWhite','cornBlue','cornYellow','ball','ball5'];
 const missing=need.filter(k=>!kit(k));
 ok('every new item is in the sidebar', missing.length===0, missing.join(','));
 ok('the old cone ids are gone', !kit('coneSmall')&&!kit('coneLarge')&&!kit('goalWhite'));
 ok('6 small cones + 5 large ones', d.querySelectorAll('.chips .kit[data-kit^="cone"]').length===11,
    d.querySelectorAll('.chips .kit[data-kit^="cone"]').length);
 ok('colour variants render as chips', kit('coneRed').classList.contains('chip'));
 ok('goals render as full tiles', !kit('goalFull').classList.contains('chip'));

 // ---------- 2. real dimensions (3 units = 1 yard) ----------
 d.getElementById('alignBtn').click();               // isolate from alignment
 const dims=[
   ['goalFull',   8,    3],
   ['rebounder',  8,    1],
   ['miniWhite',  2,    1.5],
   ['miniOrange', 2,    1.5],
   ['manRed',     1,    null],
   ['coneRed',    0.25, 0.25],
   ['coneLgRed',  0.5,  0.5],
   // a pole is drawn leaning up the page, so only its base width is to scale
   ['poleRed',    0.1,  null],
   ['padRed',     0.46, 0.11],
   ['discRed',    0.25, 0.25],
   ['cornRed',    0.38, 0.38],
   ['ball',       0.239,0.239],
 ];
 dims.forEach(([k,wYd,hYd])=>{
   d.getElementById('clearBtn').click();
   arm(k);
   pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60);
   const b=bbox(items()[0]);
   const okW=Math.abs(b.w-wYd*U)<0.35;                       // allow for stroke
   const okH=hYd===null||Math.abs(b.h-hYd*U)<0.35;
   ok(`${k} draws ${wYd}${hYd===null?'':' × '+hYd} yd`, okW&&okH,
      `${(b.w/U).toFixed(3)} × ${(b.h/U).toFixed(3)} yd`);
   kit(k).click();                                            // disarm
 });

 // ---------- 3. footprints drive clamping, not the icon ----------
 d.getElementById('clearBtn').click();
 arm('goalFull');
 // Kit clamps to the working area — pitch plus green surround — so read the
 // corner off the grass rect rather than assuming the touchline at 10,10.
 const area=svg.querySelector('rect');
 const AX=+area.getAttribute('x'), AY=+area.getAttribute('y');
 pe(svg,'pointerdown',-500,-500); pe(svg,'pointerup',-500,-500);   // shove it into the corner
 const g=items()[0].getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
 ok('an 8×3 goal is held a full half-footprint inside the corner',
    +g[1]>=AX+12-1e-6 && +g[2]>=AY+4.5-1e-6, `${g[1]},${g[2]} vs area ${AX},${AY}`);
 kit('goalFull').click();

 // ---------- 4. front / back reads on a one-way goal ----------
 const mouth=k=>{
   d.getElementById('clearBtn').click(); arm(k);
   pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60);
   const ls=[...items()[0].querySelectorAll('line')].filter(l=>+l.getAttribute('stroke-width')>0.3);
   kit(k).click();
   return ls;
 };
 const oneWay=mouth('goalFull');
 const front=oneWay.find(l=>+l.getAttribute('y1')<0 && +l.getAttribute('y1')===+l.getAttribute('y2'));
 const back =oneWay.find(l=>+l.getAttribute('y1')>0 && +l.getAttribute('y1')===+l.getAttribute('y2'));
 ok('the goal mouth is a solid crossbar', !!front && !front.getAttribute('stroke-dasharray'));
 ok('the back rail is dashed, so the facing is obvious',
    !back || !!back.getAttribute('stroke-dasharray'), back?back.getAttribute('stroke-dasharray'):'none');
 d.getElementById('clearBtn').click(); arm('goalFull');
 pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60);
 ok('a one-way goal tapers toward the back',
    (()=>{const p=items()[0].querySelector('path').getAttribute('d').match(/-?[\d.]+/g).map(Number);
          return Math.abs(p[4])<Math.abs(p[0])-0.5;})(),
    items()[0].querySelector('path').getAttribute('d').replace(/\s+/g,' ').slice(0,60));
 // The arrow is gone on purpose — facing now comes from the shape itself:
 // a shaded rear band plus two post stubs turning back off the mouth.
 ok('no goal carries a direction arrow',
    ![...items()[0].querySelectorAll('path')]
      .some(p=>/arrow|chevron/i.test(p.getAttribute('class')||'')));
 ok('the rear third of a one-way net is shaded',
    [...items()[0].querySelectorAll('path')]
      .some(p=>/rgba\(0,\s*0,\s*0,\s*0\.42\)/.test(p.getAttribute('fill')||'')),
    items()[0].querySelectorAll('path').length+' paths');
 ok('a one-way goal has two post stubs turning back off the mouth',
    [...items()[0].querySelectorAll('line')]
      .filter(l=>+l.getAttribute('stroke-width')>0.3
                 && Math.abs(+l.getAttribute('y1')+4.5)<1e-6 && +l.getAttribute('y2')>-4.5+1e-6)
      .length===2,
    [...items()[0].querySelectorAll('line')]
      .filter(l=>+l.getAttribute('stroke-width')>0.3
                 && Math.abs(+l.getAttribute('y1')+4.5)<1e-6 && +l.getAttribute('y2')>-4.5+1e-6).length);
 kit('goalFull').click();

 d.getElementById('clearBtn').click(); arm('rebounder');
 pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60);
 ok('a rebounder is symmetric — no front, no back',
    (()=>{const p=items()[0].querySelector('path').getAttribute('d').match(/-?[\d.]+/g).map(Number);
          return Math.abs(Math.abs(p[4])-Math.abs(p[0]))<1e-6;})());
 ok('a rebounder is one clean outline — no shading, no stubs',
    items()[0].querySelectorAll('path').length===1, items()[0].querySelectorAll('path').length);
 kit('rebounder').click();

 // ---------- 5. counts show, but never block ----------
 d.getElementById('clearBtn').click(); arm('miniWhite');
 ok('an unused item shows no count', cnt('miniWhite')==='', cnt('miniWhite'));
 for(let i=0;i<10;i++){ pe(svg,'pointerdown',40+i*9,60); pe(svg,'pointerup',40+i*9,60); }
 ok('all 10 were placed even though the bag holds 8', items().length===10, items().length);
 ok('the count says 10/8', cnt('miniWhite')==='10/8', cnt('miniWhite'));
 ok('going over the bag size is flagged',
    d.querySelector('[data-cnt="miniWhite"]').classList.contains('over'));
 ok('poles have no bag limit shown', (()=>{
    arm('poleRed'); pe(svg,'pointerdown',60,90); pe(svg,'pointerup',60,90);
    const c=cnt('poleRed'); kit('poleRed').click(); return c==='1'; })(), cnt('poleRed'));
 d.querySelectorAll('.tab')[1].click();
 ok('the tally follows the field you are looking at', cnt('miniWhite')==='', cnt('miniWhite'));
 d.querySelectorAll('.tab')[0].click();
 ok('and comes back', cnt('miniWhite')==='10/8', cnt('miniWhite'));

 // ---------- 6. icon boost ----------
 d.getElementById('clearBtn').click(); arm('coneRed');
 pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60);
 const before=items()[0].getAttribute('transform');
 ok('true scale by default', !/scale/.test(before), before);
 const b0=bbox(items()[0]);
 d.getElementById('boostBtn').click();
 ok('boost is on', d.getElementById('boostBtn').classList.contains('on'));
 ok('the cone icon is scaled up', /scale\(2\.6\)/.test(tf(0)), tf(0));
 ok('the shape itself is untouched — only the transform',
    Math.abs(bbox(items()[0]).w-b0.w)<1e-9, `${bbox(items()[0]).w} vs ${b0.w}`);
 // the true footprint still governs clamping
 pe(svg,'pointerdown',5,5); pe(svg,'pointerup',5,5);
 const c2=items()[1].getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
 ok('a boosted cone still clamps on its real footprint',
    +c2[1]<10+0.75 && +c2[2]<10+0.75, `${c2[1]},${c2[2]}`);
 // and the measuring box is unaffected
 kit('coneRed').click();
 d.getElementById('modeBox').click();
 pe(svg,'pointerdown',22,40); pe(svg,'pointermove',34,55); pe(svg,'pointerup',34,55);
 ok('boost does not disturb the box measurement',
    /4 × 5 yd · 20 squares/.test(d.getElementById('boxDims').textContent),
    d.getElementById('boxDims').textContent);
 d.getElementById('modeSelect').click();
 d.getElementById('boostBtn').click();
 ok('boost is off again', !/scale/.test(tf(0)), tf(0));

 // large kit is deliberately never boosted
 d.getElementById('clearBtn').click();
 d.getElementById('boostBtn').click();
 arm('goalFull'); pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60); kit('goalFull').click();
 ok('a full-size goal is never boosted', !/scale/.test(tf(0)), tf(0));
 arm('playerBlue'); pe(svg,'pointerdown',90,60); pe(svg,'pointerup',90,60); kit('playerBlue').click();
 ok('players are never boosted', !/scale/.test(tf(1)), tf(1));
 d.getElementById('boostBtn').click();

 // ---------- 7. the 5-ball bundle ----------
 d.getElementById('clearBtn').click(); arm('ball5');
 pe(svg,'pointerdown',60,60); pe(svg,'pointerup',60,60);
 ok('one drop lays five balls', items().length===5, items().length);
 ok('they are five ordinary balls, not one object',
    items().every(g=>g.dataset.type==='ball'),
    [...new Set(items().map(g=>g.dataset.type))].join(','));
 ok('no two land on the same spot',
    new Set(items().map(g=>g.getAttribute('transform'))).size===5);
 ok('the count is against Ball, not the bundle', cnt('ball')==='5'&&cnt('ball5')==='',
    `${cnt('ball')} / ${cnt('ball5')}`);
 d.getElementById('undoBtn').click();
 ok('undo takes the whole handful back', items().length===0, items().length);
 d.getElementById('redoBtn').click();
 ok('redo returns all five', items().length===5, items().length);
 // one ball can then be dragged off on its own
 kit('ball5').click();
 const t0=items()[1].getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
 pe(items()[1],'pointerdown',+t0[1],+t0[2]);
 pe(svg,'pointermove',100,100); pe(svg,'pointerup',100,100);
 ok('a ball from the bundle moves on its own', items().length===5 && /translate\(100 100\)/.test(tf(1)), tf(1));

 // row mode lays single balls, not five per stop
 d.getElementById('clearBtn').click();
 d.getElementById('modeRow').click();
 arm('ball5');
 d.getElementById('rowMode').value='count'; d.getElementById('rowVal').value='4';
 pe(svg,'pointerdown',40,100); pe(svg,'pointermove',80,100); pe(svg,'pointerup',80,100);
 ok('a row of the bundle is still one ball per stop', items().length===4, items().length);
 d.getElementById('modeSelect').click(); kit('ball5').click();

 // ---------- 8. the box tool drives off the live cone list ----------
 const opts=[...d.getElementById('boxCone').options].map(o=>o.value);
 ok('the box cone menu lists every cone', opts.length===11, opts.join(','));
 ok('it defaults to an orange cone', d.getElementById('boxCone').value==='coneOrange');
 d.getElementById('clearBtn').click();
 d.getElementById('modeBox').click();
 pe(svg,'pointerdown',22,40); pe(svg,'pointermove',34,55); pe(svg,'pointerup',34,55);
 d.getElementById('boxSpacing').value='1';
 d.getElementById('boxCone').value='coneLgNeon';
 d.getElementById('boxCones').click();
 ok('the box builds the cone you picked',
    items().length===18 && items().every(g=>g.dataset.type==='coneLgNeon'),
    `${items().length} × ${[...new Set(items().map(g=>g.dataset.type))].join(',')}`);
 d.getElementById('modeSelect').click();

 // ---------- 9. old setups still load ----------
 d.getElementById('clearBtn').click();
 w.localStorage.setItem('sfp.setups.v2', JSON.stringify({ legacy:{
   big:{ items:[{id:"i1",type:"coneSmall",x:40,y:40,rot:0},
                {id:"i2",type:"goalWhite",x:60,y:60,rot:0},
                {id:"i3",type:"coneLarge",x:70,y:70,rot:0},
                {id:"i4",type:"nonsense",x:80,y:80,rot:0}], tape:[], seq:[] },
   small:{ items:[], tape:[], seq:[] } }}));
 d.getElementById('setupList').innerHTML='<option value="legacy">legacy</option>';
 d.getElementById('setupList').value='legacy';
 d.getElementById('loadSetup').click();
 const types=items().map(g=>g.dataset.type);
 ok('old kit names are migrated, junk is dropped',
    types.length===3 && types.includes('coneOrange') && types.includes('goalFull') && types.includes('coneLgWhite'),
    types.join(','));

 console.log(R.join('\n'));
 console.log(`\n${pass} passed, ${fail} failed`);
 console.log('runtime errors:', errs.length?errs:'none');
 if (fail||errs.length) process.exitCode=1;
},60);
