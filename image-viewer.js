(function(){
 'use strict';
 let dialog,stage,img,title,counter,prev,next,zoomOut,zoomIn,fit,loading,items=[],index=0,scale=1,callback,returnFocus,oldOverflow,touch,pinchStart,pinched=false,chromeHidden=false,tapTimer=0,lastTap=0,suppressClickUntil=0;
 const distance=ts=>Math.hypot(ts[0].clientX-ts[1].clientX,ts[0].clientY-ts[1].clientY);
 function swipeDirection(start,end){const dx=end.x-start.x,dy=end.y-start.y;if(end.time-start.time>1000||Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.4)return 0;return dx<0?1:-1;}
 function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
 function button(text,fn,label){const b=el('button',text);b.type='button';b.onclick=fn;if(label)b.setAttribute('aria-label',label);return b;}
 function mount(){
  if(dialog)return;dialog=el('dialog',undefined,'image-lightbox');dialog.setAttribute('aria-label','이미지 전체 화면 보기');
  const top=el('div',undefined,'lightbox-top');title=el('div',undefined,'lightbox-title');const close=button('닫기 ✕',()=>dialog.close(),'이미지 확대 닫기');top.append(title,close);
  stage=el('div',undefined,'lightbox-stage');stage.tabIndex=0;stage.setAttribute('aria-label','확대 이미지 · 좌우로 넘기기');img=el('img');img.draggable=false;loading=el('p','이미지를 불러오고 있습니다…','lightbox-loading');stage.append(img,loading);
  const controls=el('div',undefined,'lightbox-controls');prev=button('← 이전',()=>move(-1),'확대 이미지 이전');counter=el('span',undefined,'lightbox-counter');counter.setAttribute('aria-live','polite');next=button('다음 →',()=>move(1),'확대 이미지 다음');controls.append(prev,counter,next);
  const tools=el('div',undefined,'lightbox-tools');zoomOut=button('−',()=>setScale(scale/1.4),'이미지 축소');fit=button('화면 맞춤',()=>setScale(1));zoomIn=button('＋',()=>setScale(scale*1.4),'이미지 확대');tools.append(zoomOut,fit,zoomIn);
  const hint=el('p','한 번 터치하면 버튼 숨김·표시 · 좌우로 넘기기 · 두 손가락으로 확대','lightbox-hint');dialog.append(top,stage,controls,tools,hint);document.body.append(dialog);
  img.onload=()=>{loading.hidden=true;size();};img.onerror=()=>{loading.hidden=false;loading.textContent='이미지를 불러오지 못했습니다. 닫고 새로고침해 주세요.';};
  dialog.addEventListener('close',()=>{clearTimeout(tapTimer);lastTap=0;document.body.style.overflow=oldOverflow;returnFocus?.focus?.({preventScroll:true});touch=null;});
  dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();});
  stage.addEventListener('touchstart',e=>{pinched=e.touches.length>1;if(e.touches.length===2){pinchStart={distance:distance(e.touches),scale};touch=null;}else if(e.touches.length===1){touch={x:e.touches[0].clientX,y:e.touches[0].clientY,time:Date.now(),left:stage.scrollLeft,max:stage.scrollWidth-stage.clientWidth,scale};}},{passive:true});
  stage.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinchStart){pinched=true;e.preventDefault();setScale(pinchStart.scale*distance(e.touches)/Math.max(1,pinchStart.distance));}},{passive:false});
  stage.addEventListener('touchend',e=>{if(e.touches.length)return;pinchStart=null;if(pinched)suppressClickUntil=Date.now()+500;if(touch&&!pinched&&e.changedTouches.length===1){const end={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY,time:Date.now()};if(Math.hypot(end.x-touch.x,end.y-touch.y)>10)suppressClickUntil=Date.now()+500;const direction=swipeDirection(touch,end);const allowed=touch.scale<=1.02||(direction===1&&touch.left>=touch.max-5)||(direction===-1&&touch.left<=5);if(direction&&allowed)move(direction);}touch=null;pinched=false;},{passive:true});
  stage.addEventListener('touchcancel',()=>{touch=null;pinchStart=null;pinched=false;},{passive:true});
  stage.addEventListener('click',()=>{const now=Date.now();if(now<suppressClickUntil)return;clearTimeout(tapTimer);if(lastTap&&now-lastTap<300){lastTap=0;setScale(scale>1?1:2);return;}lastTap=now;tapTimer=setTimeout(()=>{lastTap=0;if(dialog.open)setChrome(!chromeHidden);},300);});
  addEventListener('resize',()=>{if(dialog.open)size();});
  addEventListener('keydown',e=>{if(!dialog.open)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();move(e.key==='ArrowRight'?1:-1);}if(e.key==='+'||e.key==='='){e.preventDefault();setScale(scale*1.4);}if(e.key==='-'){e.preventDefault();setScale(scale/1.4);}},true);
 }
 function setChrome(hidden){chromeHidden=hidden;dialog.classList.toggle('controls-hidden',hidden);if(hidden)stage.focus({preventScroll:true});requestAnimationFrame(size);}
 function size(){if(!img.naturalWidth||!stage.clientWidth||!stage.clientHeight)return;const ratio=Math.min((stage.clientWidth-12)/img.naturalWidth,(stage.clientHeight-12)/img.naturalHeight);img.style.width=Math.max(1,Math.round(img.naturalWidth*ratio*scale))+'px';img.style.height=Math.max(1,Math.round(img.naturalHeight*ratio*scale))+'px';stage.dataset.zoomed=String(scale>1.02);fit.textContent=scale>1.02?'화면 맞춤 ('+Math.round(scale*100)+'%)':'화면 맞춤';zoomOut.disabled=scale<=1;zoomIn.disabled=scale>=5;}
 function setScale(value){scale=Math.max(1,Math.min(5,value));size();if(scale===1){stage.scrollLeft=0;stage.scrollTop=0;}}
 function show(){const item=items[index];scale=1;stage.scrollLeft=0;stage.scrollTop=0;title.textContent=item.title||'교재 요약 이미지';counter.textContent=(index+1)+' / '+items.length;prev.disabled=index===0;next.disabled=index===items.length-1;loading.textContent='이미지를 불러오고 있습니다…';loading.hidden=false;img.alt=item.title||'교재 요약 이미지';img.src=item.src;if(img.complete&&img.naturalWidth){loading.hidden=true;size();}callback?.(index);}
 function move(step){if(index+step<0||index+step>=items.length)return;index+=step;show();}
 function open(nextItems,start=0,onChange){if(!nextItems?.length)return;mount();clearTimeout(tapTimer);lastTap=0;suppressClickUntil=0;items=nextItems;index=Math.max(0,Math.min(start,items.length-1));callback=onChange;if(!dialog.open){returnFocus=document.activeElement;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();}setChrome(false);show();stage.focus({preventScroll:true});}
 window.TextbookImageViewer={open,isOpen:()=>!!dialog?.open,swipeDirection};
})();
