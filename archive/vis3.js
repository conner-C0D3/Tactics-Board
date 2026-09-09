/* vis3.js — a picture of the printed session plan.

   The sheet the app builds is HTML, which cairosvg cannot render, so this
   redraws the sheet's LAYOUT in SVG. Everything in it is still read out of the
   real thing: each pitch is the actual <svg> the print path cloned, and every
   line of text is read off the real card in the real #planSheet. Nothing here
   knows what a drill is — if the print path photographed the wrong pitch, or
   restored state halfway through and printed drill 2 three times, the pictures
   would show it.

   Each card's pitch carries the app's own gradient and grid ids, named after
   the pitch, so three cards on one sheet would be three copies of the same id;
   suffix them per card or a strict renderer resolves every reference to
   whichever came first. */
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');

let rafQ=[],rafId=1,now=0,errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://e.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  w.performance.now=()=>now;
  w.print=()=>{};
  w.requestAnimationFrame=cb=>{rafQ.push([rafId,cb]);return rafId++;};
  w.cancelAnimationFrame=id=>{rafQ=rafQ.filter(e=>e[0]!==id);};
}});
dom.virtualConsole.on('jsdomError',e=>errs.push(e.message));
const w=dom.window,d=w.document,$=i=>d.getElementById(i);

const svg=()=>d.querySelector('.field-wrap.on svg');
const pe=(el,t,x,y)=>el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1}));
const click=(el,x,y)=>{pe(el,'pointerdown',x,y);pe(el,'pointerup',x,y);};
const arm=k=>{const b=d.querySelector(`.kit[data-kit="${k}"]`);if(!b.classList.contains('on'))b.click();};
const fire=(id,v,ev)=>{$(id).value=String(v);$(id).dispatchEvent(new w.Event(ev||'change',{bubbles:true}));};
const blocks=()=>[...d.querySelectorAll('.sblock')];
const save=n=>{$('setupName').value=n;$('saveSetup').click();};
const add=n=>{$('setupName').value=n;$('sesAdd').click();};
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const uniq=(h,n)=>h.replace(/id="([\w-]+)"/g,`id="$1_c${n}"`).replace(/url\(#([\w-]+)\)/g,`url(#$1_c${n})`);

/* Three drills that look nothing like each other, so a sheet that printed the
   same pitch three times is obvious at a glance rather than on inspection.

   The harness makes client pixels equal pitch units, and a unit is a third of a
   yard — so a 12-yard square is 36 apart, not 120. Getting that wrong is what
   made the first run of this sheet look broken: the "rondo" was 47 yards across,
   the crop could not tighten on it, and the cones printed as specks. */
const YD = 3, O = [110, 120];                 // a yard, and where the drills sit
const P = (a, b) => [O[0] + a * YD, O[1] + b * YD];
function drills(){
  // 1. a rondo: a 12-yard square of cones, four round it and one inside
  $('modeSelect').click(); $('clearBtn').click();
  arm('coneOrange');
  [[0,0],[12,0],[12,12],[0,12]].forEach(p=>click(svg(),...P(...p)));
  arm('playerBlue');
  [[-2,-2],[14,-2],[14,14],[-2,14],[6,6]].forEach(p=>click(svg(),...P(...p)));
  save('rondo 4v1');

  // 2. a shooting drill: a gate of cones and a ball switched, then played in
  $('clearBtn').click();
  arm('coneOrange');
  for(let i=0;i<6;i++) click(svg(),...P(i*4, 20));
  arm('playerBlue');
  click(svg(),...P(0,8)); click(svg(),...P(18,2));
  $('modeBall').click();
  click(svg(),...P(0,8)); click(svg(),...P(18,2)); click(svg(),...P(26,-4));
  $('modeSelect').click();
  save('finishing off the switch');

  // 3. a stamped 4-4-2 holding a block — the busiest thing the app draws
  $('clearBtn').click();
  fire('formPick','f442'); fire('formSide','playerBlue'); fire('formEnd',0);
  $('stampForm').click();
  const o=[...$('unitPick').options].find(o=>/Back four/.test(o.textContent));
  if(o){ fire('unitPick',o.value); fire('unitPolicy','block');
         fire('unitAmt',0.6,'input'); fire('unitLag',0.35); }
  $('modeBall').click();
  click(svg(),210,45); click(svg(),125,200);
  $('modeSelect').click();
  save('11v11 defensive shape');
}

setTimeout(()=>{
  drills();
  add('rondo 4v1'); add('finishing off the switch'); add('11v11 defensive shape');
  const M=[18,25,30];
  blocks().forEach((b,i)=>{const m=b.querySelector('.mins');m.value=String(M[i]);
                           m.dispatchEvent(new w.Event('input',{bubbles:true}));});
  const N=['4v1 in a 12x12 square. Two touch. Defender presses the ball, not the man.',
           'Switch, then in behind. First touch across the body — do not check back.',
           'Back four holds its line and slides. Nobody breaks the line to chase.'];
  blocks().forEach((b,i)=>{const t=b.querySelector('textarea');t.value=N[i];
                           t.dispatchEvent(new w.Event('input',{bubbles:true}));});
  $('sesName').value='Tuesday — pressing';
  $('sesPrint').click();

  const sheet=$('planSheet');
  const title=sheet.querySelector('h1').textContent;
  const sub=sheet.querySelector('.sub').textContent;
  const cards=[...sheet.querySelectorAll('.card')].map(c=>({
    h:c.querySelector('h2').textContent,
    meta:c.querySelector('.meta').textContent,
    note:(c.querySelector('p')||{textContent:''}).textContent,
    pitch:c.querySelector('.pic svg')
  }));

  /* Wrap a long coaching point by width, in the same characters-per-line the
     printed sheet gets — SVG has no text flow, so this is done by hand. */
  const wrap=(s,n)=>{const out=[];let l='';
    for(const wd of String(s).split(/\s+/)){
      if((l+' '+wd).trim().length>n){out.push(l.trim());l=wd;} else l+=' '+wd;}
    if(l.trim())out.push(l.trim());return out;};

  const PAD=26, PW=330, GAP=18, TXT=430, W=PAD*2+PW+GAP+TXT, ROW=240;
  const H=PAD+66+cards.length*ROW+PAD;
  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <style>.stop-hit{fill:transparent}</style>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${PAD}" y="${PAD+18}" font-family="sans-serif" font-size="20" font-weight="700" fill="#111">${esc(title)}</text>
  <text x="${PAD}" y="${PAD+38}" font-family="sans-serif" font-size="12.5" fill="#555">${esc(sub)}</text>`;

  cards.forEach((c,i)=>{
    const y=PAD+62+i*ROW;
    const [vx,vy,vw,vh]=c.pitch.getAttribute('viewBox').split(/\s+/).map(Number);
    const ph=Math.round(PW*vh/vw), s=PW/vw;
    out+=`<line x1="${PAD}" y1="${y-10}" x2="${W-PAD}" y2="${y-10}" stroke="#ddd"/>
    <g transform="translate(${PAD} ${y})">
      <g clip-path="url(#cc${i})"><g transform="scale(${s.toFixed(5)}) translate(${-vx} ${-vy})">${uniq(c.pitch.innerHTML,i)}</g></g>
      <rect width="${PW}" height="${ph}" fill="none" stroke="#ccc"/>
    </g>
    <defs><clipPath id="cc${i}"><rect width="${PW}" height="${ph}"/></clipPath></defs>
    <text x="${PAD+PW+GAP}" y="${y+14}" font-family="sans-serif" font-size="15" font-weight="700" fill="#111">${esc(c.h)}</text>
    <text x="${PAD+PW+GAP}" y="${y+32}" font-family="sans-serif" font-size="11.5" fill="#555">${esc(c.meta)}</text>`;
    wrap(c.note,54).forEach((ln,k)=>{
      out+=`<text x="${PAD+PW+GAP}" y="${y+54+k*17}" font-family="sans-serif" font-size="13" fill="#222">${esc(ln)}</text>`;});
  });
  out+='</svg>';
  fs.writeFileSync('/sessions/gracious-epic-cerf/mnt/outputs/plan-check.svg',out);
  console.log('wrote plan-check.svg —',cards.length,'cards');
  console.log('metas:',cards.map(c=>c.meta).join('  ||  '));
  console.log('errors:',errs.length?errs:'none');
},400);
