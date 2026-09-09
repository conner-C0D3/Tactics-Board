const {JSDOM}=require('jsdom'),fs=require('fs');
const html=fs.readFileSync('/sessions/gracious-epic-cerf/mnt/outputs/soccer-field-planner.html','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.com',beforeParse(w){
  w.SVGSVGElement.prototype.createSVGPoint=function(){return{x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}}};
  w.SVGSVGElement.prototype.getScreenCTM=function(){return{inverse(){return{}}}};
  w.Element.prototype.setPointerCapture=function(){};
}});
const w=dom.window,d=w.document;
const item=()=>d.querySelector('.field-wrap.on .item');
const tf=()=>item().getAttribute('transform');
function pe(el,t,x,y,ex={}){el.dispatchEvent(new w.PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,pointerId:1,...ex}));}
function drop(svg,type,x,y){const dt={data:{'text/plain':type},getData(k){return this.data[k]},setData(){}};
  const e=new w.Event('drop',{bubbles:true,cancelable:true});e.dataTransfer=dt;e.clientX=x;e.clientY=y;svg.dispatchEvent(e);}
function parse(){const m=tf().match(/translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/);return{x:+m[1],y:+m[2],r:+m[3]};}
function aabb(p,hw,hh){const t=p.r*Math.PI/180,c=Math.abs(Math.cos(t)),s=Math.abs(Math.sin(t));
  return{hw:hw*c+hh*s, hh:hw*s+hh*c};}
setTimeout(()=>{
 const svg=d.querySelectorAll('.field-wrap svg')[0];
 /* Read the bounds off the field itself rather than hardcoding them, so resizing
    cannot silently invalidate this test. Kit clamps to the whole working area —
    the pitch plus its green surround — not to the touchlines, so the first rect
    (the grass, which covers everything) is the right thing to measure. */
 const surf=svg.querySelector('rect');
 const LX=+surf.getAttribute('x'), TY=+surf.getAttribute('y');
 const RX=LX+ +surf.getAttribute('width');
 const BY=TY+ +surf.getAttribute('height');
 const out=[]; let bad=0;
 // goal near the top goal line, then rotate 90 -> must be pushed down inside the pitch
 d.getElementById('clearBtn').click();
 drop(svg,'goalFull',113,12);
 out.push(['placed near goal line',tf()]);
 item().dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
 let p=parse(); let b=aabb(p,12,3);
 out.push(['after 90 rot',tf(),'top edge y='+(p.y-b.hh).toFixed(1)+'/'+TY, (p.y-b.hh>=TY-0.01?'INSIDE':(bad++,'OUTSIDE'))]);

 // free rotate to ~45 in a corner, verify AABB containment
 d.getElementById('clearBtn').click();
 drop(svg,'goalFull',113,150);
 let g=item();
 pe(g,'pointerdown',125,150,{shiftKey:true});
 pe(svg,'pointermove',121.5,158.5);   // ~+45
 pe(svg,'pointerup',121.5,158.5);
 out.push(['free rotated',tf()]);
 // now drag it hard into the corner and confirm it stays inside at that angle
 g=item();
 pe(g,'pointerdown',112,151);
 pe(svg,'pointermove',400,400);
 pe(svg,'pointerup',400,400);
 p=parse(); b=aabb(p,12,3);
 out.push(['dragged to corner',tf(),
   'right edge x='+(p.x+b.hw).toFixed(1)+'/'+RX,
   'bottom edge y='+(p.y+b.hh).toFixed(1)+'/'+BY,
   (p.x+b.hw<=RX+0.01 && p.y+b.hh<=BY+0.01)?'INSIDE':(bad++,'OUTSIDE')]);
 out.forEach(r=>console.log(JSON.stringify(r)));
 console.log(bad?`${bad} containment failure(s)`:'all containment checks inside');
 process.exit(bad?1:0);
},400);
