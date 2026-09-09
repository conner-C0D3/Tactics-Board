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
const blocks=()=>[...d.querySelectorAll('.sblock')];
const items=()=>d.querySelectorAll('.field-wrap.on .item').length;
const save=n=>{$('setupName').value=n;$('saveSetup').click();};

setTimeout(()=>{
  // two drills
  $('clearBtn').click(); arm('coneOrange'); click(svg(),100,100); click(svg(),140,100);
  save('rondo');
  $('clearBtn').click(); arm('playerBlue'); click(svg(),200,80);
  save('finishing');

  $('sesAdd').click();                       // adds "finishing" (name in the box)
  $('setupName').value='rondo'; $('sesAdd').click();
  console.log('blocks:', blocks().length, blocks().map(b=>b.querySelector('.who').textContent).join(' | '));
  console.log('total:', $('sesTotal').textContent);

  // step through
  blocks()[0].querySelector('.who').click();
  console.log('drill 1 items:', items(), '|', $('status').textContent);
  $('sesNext').click();
  console.log('drill 2 items:', items(), '|', $('status').textContent);

  // reorder
  blocks()[1].querySelector('[data-mv][data-d="-1"]').click();
  console.log('after move:', blocks().map(b=>b.querySelector('.who').textContent).join(' | '),
              '| current chip:', blocks().findIndex(b=>b.classList.contains('on')));

  // minutes + notes
  const m=blocks()[0].querySelector('.mins'); m.value='25';
  m.dispatchEvent(new w.Event('input',{bubbles:true}));
  console.log('total after 25:', $('sesTotal').textContent,
              '| block2 clock:', blocks()[1].querySelector('.clock').textContent);

  // save / load the session
  $('sesName').value='tuesday'; $('sesSave').click();
  $('sesList').value='tuesday'; $('sesLoad').click();
  console.log('loaded:', blocks().length, $('sesTotal').textContent);

  // delete a setup -> block goes missing, plan survives
  $('setupList').value='rondo'; $('delSetup').click();
  console.log('missing:', blocks().filter(b=>b.classList.contains('gone')).length,
              '| still blocks:', blocks().length);

  // clear the pitch: the plan must not care
  $('clearBtn').click();
  console.log('after clear, blocks:', blocks().length);

  // print
  const before=items();
  $('sesPrint').click();
  console.log('print cards:', d.querySelectorAll('#planSheet .card').length,
              '| pitch untouched:', items()===before,
              '| sheet torn down:', d.getElementById('planSheet').innerHTML===''||'pending');
  console.log('errors:', errs.length?errs:'none');
},400);
