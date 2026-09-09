/* t24 — training sessions: an ordered plan built out of saved setups.

   The claim this suite exists to hold down is that a session block is a REFERENCE
   to a saved setup, never a copy of one. Everything else follows from it: editing
   a drill updates every session that uses it, deleting a drill leaves a block that
   says so instead of a block that lies, and the plan is a separate document from
   the pitch — Clear, Undo and Print must all leave it alone, and it must leave the
   pitch alone in return.

   A suite that only checked "the block appeared and the total added up" would pass
   just as happily against an implementation that snapshotted the setup into the
   block, which is the design we explicitly rejected. So the load-bearing tests
   here are the ones that change a setup out from under a session and then look.

   Read through the DOM only, as in t21–t23. */
const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');

let rafQ=[],rafId=1,now=0,errs=[],printed=0;
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://e.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
  w.performance.now=()=>now;
  // jsdom has no print dialog; count the calls instead, and never block
  w.print=()=>{printed++;};
  w.requestAnimationFrame=cb=>{rafQ.push([rafId,cb]);return rafId++;};
  w.cancelAnimationFrame=id=>{rafQ=rafQ.filter(e=>e[0]!==id);};
}});
dom.virtualConsole.on('jsdomError',e=>errs.push(e.message));
const w=dom.window,d=w.document,$=i=>d.getElementById(i);

let pass=0,fail=0;
const ok=(m,c,x)=>{c?pass++:fail++;console.log(`  ${c?'ok  ':'FAIL'} ${m}${x!==undefined?`   [${x}]`:''}`);};
const head=t=>console.log('\n'+t);

const svg=()=>d.querySelector('.field-wrap.on svg');
const pe=(el,t,x,y)=>el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1}));
const click=(el,x,y)=>{pe(el,'pointerdown',x,y);pe(el,'pointerup',x,y);};
const arm=k=>{const b=d.querySelector(`.kit[data-kit="${k}"]`);if(!b.classList.contains('on'))b.click();};
const items=()=>d.querySelectorAll('.field-wrap.on .item').length;
const status=()=>$('status').textContent;

// --- the session strip, read as a coach would read it -----------------------
const blocks=()=>[...d.querySelectorAll('.sblock')];
const names=()=>blocks().map(b=>b.querySelector('.who').textContent.trim());
const at=()=>blocks().findIndex(b=>b.classList.contains('on'));
const goneAt=i=>blocks()[i].classList.contains('gone');
const clocks=()=>blocks().map(b=>b.querySelector('.clock').textContent.trim());
const total=()=>$('sesTotal').textContent.trim();
const go=i=>blocks()[i].querySelector('.who').click();
const move=(i,dir)=>blocks()[i].querySelector(`[data-mv][data-d="${dir}"]`).click();
const rm=i=>blocks()[i].querySelector('[data-rm]').click();
const setMins=(i,v)=>{const m=blocks()[i].querySelector('.mins');m.value=String(v);
                      m.dispatchEvent(new w.Event('input',{bubbles:true}));};
const setNotes=(i,v)=>{const t=blocks()[i].querySelector('textarea');t.value=v;
                       t.dispatchEvent(new w.Event('input',{bubbles:true}));};
const addDrill=n=>{if(n!=null)$('setupName').value=n;$('sesAdd').click();};

// --- setups, the things a block points at -----------------------------------
const save=n=>{$('setupName').value=n;$('saveSetup').click();};
const dropSetup=n=>{$('setupList').value=n;$('delSetup').click();};
// a drill of n cones, so that a loaded setup is identifiable by a head-count
function drill(name,n){
  $('modeSelect').click(); $('clearBtn').click();
  arm('coneOrange');
  for(let i=0;i<n;i++) click(svg(),80+i*22,90);
  save(name);
}
const cards=()=>d.querySelectorAll('#planSheet .card').length;

setTimeout(()=>{
console.log('t24 — training sessions');

head('A session is built out of setups that already exist');
{
  drill('rondo',2);
  drill('finishing',5);
  drill('shape',8);

  $('setupName').value=''; $('setupList').value='';
  addDrill();
  ok('an unnamed drill is refused', blocks().length===0, status());

  addDrill('nosuchdrill');
  ok('and so is one that was never saved', blocks().length===0, status());
  ok('with a message that says what to do about it',
     /save/i.test(status()), status());

  addDrill('rondo'); addDrill('finishing'); addDrill('shape');
  ok('three saved drills make a three-block plan', blocks().length===3, blocks().length);
  ok('in the order they were added',
     names().join(',')==='rondo,finishing,shape', names().join(','));
  ok('each starting at the default fifteen minutes',
     blocks().every(b=>+b.querySelector('.mins').value===15));
  ok('and the total says so', total()==='3 drills · 45 min', total());
}

head('Minutes are the coach\'s, and the running order is arithmetic');
{
  setMins(0,20);
  ok('a block takes the minutes it is given',
     +blocks()[0].querySelector('.mins').value===20);
  ok('the total follows immediately', total()==='3 drills · 50 min', total());
  ok('and so do the start times', clocks()[1]==='starts 20 min in', clocks()[1]);
  ok('the first drill always starts at zero', clocks()[0]==='starts 0 min in', clocks()[0]);

  setMins(0,50); setMins(1,30);
  ok('an hour and a half reads as a coach says it',
     total()==='3 drills · 1h 35', total());
  ok('and a start time past the hour does too',
     clocks()[2]==='starts 1h 20 in', clocks()[2]);

  setMins(0,-5);
  ok('minutes cannot go negative', clocks()[1]==='starts 0 min in', clocks()[1]);
  setMins(0,9999);
  /* Read the NEXT block's start time, not the total: the total also carries the
     other two drills, so a broken clamp and a working one would both show
     something over four hours there. The input itself is no good either — it
     holds whatever was typed, since the strip is deliberately not re-rendered
     mid-keystroke. What the block is worth to the plan is the start it pushes
     the following drill to. */
  ok('nor past a four-hour drill', clocks()[1]==='starts 4h 00 in', clocks()[1]);
  setMins(0,15); setMins(1,15);
  ok('and back to a sane plan', total()==='3 drills · 45 min', total());

  /* Typing in the minutes box must not redraw the strip: a re-render would
     replace the input under the caret and the next keystroke would land
     nowhere. Identity of the node is the only way to see this from outside. */
  const box=blocks()[1].querySelector('.mins');
  setMins(1,16);
  ok('typing minutes does not rebuild the box being typed in',
     blocks()[1].querySelector('.mins')===box);
  setMins(1,15);
}

head('Coaching points belong to the block');
{
  setNotes(1, 'two touch, near foot\nswitch after 4 passes');
  ok('notes are kept as typed',
     blocks()[1].querySelector('textarea').value.split('\n').length===2);
  const t=blocks()[1].querySelector('textarea');
  setNotes(1, t.value+' ');
  ok('and typing them does not rebuild the textarea either',
     blocks()[1].querySelector('textarea')===t);
  setNotes(1, 'two touch, near foot');
}

head('Stepping through the plan puts each drill on the pitch');
{
  go(0);
  ok('clicking a block loads its drill', items()===2, items());
  ok('the block is marked current', at()===0, at());
  ok('and the status counts you in', /Drill 1 of 3/.test(status()), status());
  ok('Prev is dead on the first drill', $('sesPrev').disabled);

  $('sesNext').click();
  ok('Next moves on', at()===1 && items()===5, `${at()} / ${items()}`);
  $('sesNext').click();
  ok('and on', at()===2 && items()===8, `${at()} / ${items()}`);
  ok('Next is dead on the last drill', $('sesNext').disabled);

  $('sesPrev').click();
  ok('Prev goes back', at()===1 && items()===5, `${at()} / ${items()}`);
  go(0); go(2);
  ok('and any block can be jumped to directly', at()===2 && items()===8, items());

  ok('the setup name box follows the drill on the pitch',
     $('setupName').value==='shape', $('setupName').value);
}

head('A block points at a setup — it is not a copy of one');
{
  /* The whole design in one section. Edit the drill, and every plan that uses
     it is current; a copy-on-add implementation passes every other test in this
     file and fails right here. */
  go(0);
  arm('coneOrange');
  click(svg(),200,200); click(svg(),220,200);
  save('rondo');
  ok('a drill can be re-saved with more in it', items()===4, items());

  go(1); go(0);
  ok('and the session serves the new version, not the old',
     items()===4, items());
  ok('without the plan changing shape', blocks().length===3, blocks().length);
}

head('Reordering moves the drill, and the highlight goes with it');
{
  go(2);
  ok('the third drill is current', at()===2 && names()[2]==='shape');
  move(2,-1);
  ok('moving it earlier reorders the plan',
     names().join(',')==='rondo,shape,finishing', names().join(','));
  ok('and the highlight follows the drill, not the slot', at()===1, at());
  ok('start times are recomputed for the new order',
     clocks()[2]==='starts 30 min in', clocks()[2]);

  go(0);
  move(1,-1);
  ok('a drill moved onto the current one swaps the highlight',
     names().join(',')==='shape,rondo,finishing' && at()===1,
     `${names().join(',')} / ${at()}`);

  ok('the first block cannot move earlier',
     blocks()[0].querySelector('[data-mv][data-d="-1"]').disabled);
  ok('nor the last later',
     blocks()[2].querySelector('[data-mv][data-d="1"]').disabled);

  move(0,1);
  ok('and back to where we were', names().join(',')==='rondo,shape,finishing',
     names().join(','));
}

head('Removing a block leaves the setup alone');
{
  go(1);
  const before=$('setupList').options.length;
  rm(1);
  ok('the block goes', blocks().length===2 && names().join(',')==='rondo,finishing',
     names().join(','));
  ok('the current drill is cleared, since it is no longer in the plan',
     at()===-1, at());
  ok('the saved setup is untouched', $('setupList').options.length===before, before);
  ok('and the status makes that clear', /untouched/.test(status()), status());
  ok('the pitch is not cleared out from under you', items()===8, items());

  go(1);
  rm(0);
  ok('removing an earlier block shifts the highlight down with it',
     at()===0 && names().join(',')==='finishing', `${at()} / ${names().join(',')}`);

  addDrill('rondo'); addDrill('shape');
  ok('the plan is back to three', blocks().length===3, names().join(','));
}

head('A deleted setup leaves a block that says so');
{
  /* The alternative — silently dropping the block — loses the coach's minutes
     and notes for a drill they may be about to re-save under the same name. */
  setNotes(1,'keep me');
  dropSetup('rondo');
  ok('the plan keeps all three blocks', blocks().length===3, blocks().length);
  ok('the orphan is flagged', goneAt(1), names().join(' | '));
  ok('and labelled in the strip', /missing/.test(names()[1]), names()[1]);
  ok('its notes survive', blocks()[1].querySelector('textarea').value==='keep me');
  ok('the others are fine', !goneAt(0) && !goneAt(2));

  go(1);
  ok('clicking a missing drill says so rather than doing nothing',
     /not saved any more/.test(status()), status());
  ok('and leaves the pitch as it was', items()>0, items());
  ok('while still marking the block you asked for', at()===1, at());

  drill('rondo',3);
  ok('re-saving under the same name repairs the block', !goneAt(1), names()[1]);
  go(1);
  ok('and it serves the new drill', items()===3, items());
}

head('The plan is a different document from the pitch');
{
  const n=blocks().length, t=total();
  $('clearBtn').click();
  ok('Clear empties the pitch', items()===0, items());
  ok('and does not touch the plan', blocks().length===n && total()===t, total());

  const before=names().join(',');
  $('undoBtn').click(); $('undoBtn').click(); $('undoBtn').click();
  ok('Undo does not walk back through session edits',
     names().join(',')===before, names().join(','));
  ok('the plan is still whole after undo', blocks().length===n, blocks().length);

  /* And the converse: editing the plan must not push anything onto the pitch's
     history either, or Undo would spend its first few presses undoing edits it
     cannot see. Measured as depth: redo back to the top, then make three
     session edits, and check Undo is still exactly one press from the top. */
  while(!$('redoBtn').disabled) $('redoBtn').click();
  ok('redo returns to the top of the pitch history', $('redoBtn').disabled);
  setMins(0,17); setNotes(0,'noise'); move(0,1); move(0,1);
  ok('none of that went on the pitch history', $('redoBtn').disabled);
  $('undoBtn').click();
  ok('and one Undo still undoes the last thing done to the PITCH',
     items()>0, items());
  ok('with the plan untouched by it', blocks().length===n, blocks().length);
  setMins(0,15); setNotes(0,'');
}

head('Sessions are saved, loaded and deleted by name');
{
  $('sesName').value='';
  $('sesSave').click();
  ok('a session needs a name', /name/i.test(status()), status());

  $('sesName').value='tuesday';
  $('sesSave').click();
  ok('and then it saves', /Saved session/.test(status()), status());
  ok('appearing in the list',
     [...$('sesList').options].some(o=>o.value==='tuesday'));

  const keep={names:names().join(','),total:total()};
  rm(0); rm(0); rm(0);
  ok('the plan can be emptied', blocks().length===0, blocks().length);
  ok('and an empty plan is not worth saving',
     ($('sesName').value='thursday', $('sesSave').click(),
      /not worth saving/.test(status())), status());
  ok('Print is disabled with nothing to print', $('sesPrint').disabled);

  $('sesList').value='tuesday'; $('sesLoad').click();
  ok('loading brings the whole plan back',
     names().join(',')===keep.names, names().join(','));
  ok('minutes and all', total()===keep.total, total());
  ok('notes and all', blocks()[1].querySelector('textarea').value==='keep me');
  ok('with nothing yet on the pitch from it', at()===-1, at());
  ok('and the name box filled in', $('sesName').value==='tuesday');

  /* A saved session is a snapshot of the plan, not a live view of it: changing
     the plan afterwards must not rewrite the file. */
  setMins(0,45);
  $('sesList').value='tuesday'; $('sesLoad').click();
  ok('a saved session is not edited by later changes to the plan',
     +blocks()[0].querySelector('.mins').value===15,
     blocks()[0].querySelector('.mins').value);

  $('sesName').value='wednesday'; $('sesSave').click();
  ok('two sessions can coexist',
     [...$('sesList').options].filter(o=>o.value).length===2,
     [...$('sesList').options].map(o=>o.value).join(','));
  $('sesList').value='wednesday'; $('sesDel').click();
  ok('and one can be deleted',
     [...$('sesList').options].map(o=>o.value).join(',')===',tuesday',
     [...$('sesList').options].map(o=>o.value).join(','));
  ok('without disturbing the plan on screen', blocks().length===3, blocks().length);
}

head('A session loaded against missing setups still reads');
{
  dropSetup('shape');
  $('sesList').value='tuesday'; $('sesLoad').click();
  ok('the blocks all load', blocks().length===3, blocks().length);
  ok('the ones with no setup are flagged',
     blocks().filter(b=>b.classList.contains('gone')).length===1,
     names().join(' | '));
  ok('and the status counts them', /1 drill is missing/.test(status()), status());
  drill('shape',8);
  $('sesList').value='tuesday'; $('sesLoad').click();
  ok('re-saving the setup makes the session whole again',
     blocks().every(b=>!b.classList.contains('gone')), names().join(' | '));
}

head('Printing the plan leaves the live pitch exactly as it was');
{
  /* Print has to put all three drills on the pitch to photograph them. That is
     the most destructive thing in the feature, so it is worth being specific
     about what has to come back. */
  go(0);
  const liveItems=items(), liveAt=at(), liveName=$('setupName').value;
  arm('coneOrange'); click(svg(),240,240);
  const dirty=items();

  const p0=printed;
  $('sesPrint').click();
  ok('one card per drill', cards()===3, cards());
  ok('the sheet is titled with the session', /tuesday/.test($('planSheet').innerHTML));
  ok('each card carries a picture of its pitch',
     d.querySelectorAll('#planSheet .card .pic svg').length===3,
     d.querySelectorAll('#planSheet .card .pic svg').length);
  ok('the notes are on the sheet', /keep me/.test($('planSheet').innerHTML));
  ok('and the running order', /starts 15 min in/.test($('planSheet').innerHTML));
  ok('the print dialog was actually asked for', printed===p0+1, printed-p0);

  ok('the unsaved work on the pitch survives printing', items()===dirty,
     `${items()} vs ${dirty}`);
  ok('including the cone that was never saved to a setup', dirty===liveItems+1);
  ok('the plan is still where it was', at()===liveAt, at());
  ok('and the setup name box too', $('setupName').value===liveName, $('setupName').value);
  ok('the strip is intact', blocks().length===3, blocks().length);

  /* The selection box and the drag ghost are tools, not part of the drill, and
     a printout with a stray marquee on it looks like a mistake in the plan. */
  const tools=[...d.querySelectorAll('#planSheet .sel-layer, #planSheet .ghost-layer')];
  ok('every card has its tool layers', tools.length>=3, tools.length);
  ok('and every one of them is empty',
     tools.every(l=>l.innerHTML===''), tools.filter(l=>l.innerHTML!=='').length);
  ok('the printed pitches carry no fixed pixel size, so they scale to the page',
     [...d.querySelectorAll('#planSheet .pic svg')].every(s=>!s.hasAttribute('width')));
}

head('A printed pitch is cropped to the drill on it');
{
  /* A rondo in one corner has no business printing as a full pitch: at card
     size a cone would be under a pixel. The crop is the difference between a
     plan a coach can read on the touchline and three green rectangles. */
  const vb=()=>[...d.querySelectorAll('#planSheet .pic svg')]
                 .map(s=>s.getAttribute('viewBox').split(/\s+/).map(Number));

  // a tight drill: a dozen cones inside a few yards
  $('modeSelect').click(); $('clearBtn').click();
  arm('coneOrange');
  for(let i=0;i<4;i++) for(let j=0;j<3;j++) click(svg(),140+i*9,140+j*9);
  save('tight');
  // and a sprawling one: kit at both ends
  $('clearBtn').click();
  arm('coneOrange');
  click(svg(),30,30); click(svg(),330,240); click(svg(),180,120);
  save('sprawl');

  while(blocks().length) rm(0);
  addDrill('tight'); addDrill('sprawl');
  $('sesPrint').click();
  const [tight,wide]=vb();
  ok('the tight drill prints zoomed in', tight[2]<wide[2],
     `${tight[2].toFixed(0)} vs ${wide[2].toFixed(0)} units`);
  ok('and the sprawling one gets the whole pitch', wide[2]>200, wide[2].toFixed(0));
  ok('but never zoomed past legibility — 26 yards is the floor',
     tight[2]>=26*3-0.01, (tight[2]/3).toFixed(1)+' yd');
  ok('both keep the pitch\'s aspect, so the cards line up down the page',
     Math.abs(tight[2]/tight[3]-wide[2]/wide[3])<0.01,
     `${(tight[2]/tight[3]).toFixed(3)} vs ${(wide[2]/wide[3]).toFixed(3)}`);
  ok('a cropped card says it is a detail',
     /detail/.test(d.querySelectorAll('#planSheet .meta')[0].textContent),
     d.querySelectorAll('#planSheet .meta')[0].textContent);
  ok('and a whole-pitch one does not',
     !/detail/.test(d.querySelectorAll('#planSheet .meta')[1].textContent),
     d.querySelectorAll('#planSheet .meta')[1].textContent);

  /* The window must contain the drill, or the crop has hidden the very thing
     it was cropping to. Read the printed items back out of the card. */
  const inside=(i)=>{
    const [x,y,cw,ch]=vb()[i];
    return [...d.querySelectorAll('#planSheet .card')[i].querySelectorAll('.item')]
      .map(g=>g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/))
      .every(m=>+m[1]>=x && +m[1]<=x+cw && +m[2]>=y && +m[2]<=y+ch);
  };
  ok('every cone in the tight drill is inside the window it printed', inside(0));
  ok('and every one in the sprawling drill too', inside(1));

  while(blocks().length) rm(0);
  addDrill('finishing'); addDrill('rondo'); addDrill('shape');
  $('sesList').value='tuesday'; $('sesLoad').click();
}

head('The sheet is torn down afterwards');
{
  setTimeout(()=>{
    ok('the plan sheet is emptied once printing is over',
       $('planSheet').innerHTML==='', $('planSheet').innerHTML.length);
    ok('and the body is out of print mode',
       !d.body.classList.contains('printing-plan'));

    head('The strip is honest when there is nothing in it');
    rm(0); rm(0); rm(0);
    ok('an empty plan says so', total()==='empty', total());
    ok('Prev, Next and Print are all dead',
       $('sesPrev').disabled && $('sesNext').disabled && $('sesPrint').disabled);
    ok('and the strip carries its own instructions',
       $('sesBlocks').children.length===0);

    console.log(`\n${pass} passed, ${fail} failed`);
    console.log('runtime errors:', errs.length?errs:'none');
  },1400);
}
},400);
