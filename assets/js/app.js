(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const clamp = (n,a=0,b=1) => Math.min(b,Math.max(a,n));
  const confettiDisabled = (function () { try { return new URLSearchParams(location.search).get('confetti') === '0'; } catch (e) { return false; } })();
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motion = { get matches() { return motionQuery.matches || (typeof preferences === 'object' && preferences !== null && preferences.motion === 'reduce'); } };
  const instrument = $('earningsCard');
  let frame=0, latest=null, lastTime=0, lastDigitTime=0, lastPulseSecond=-1, lastPixelTime=0;
  let amountShown=0, amountFrom=0, amountTarget=0, tweenStart=0, tweenDuration=0;
  let lastSignature='', lastFormatted='', lastTemplate='', lastCurrency='', lastPeriod='', lastProgress=0, numDecimals=2;
  let milestoneDay='', milestonesHit=new Set();
  const milestoneParam = (function () { try { return new URLSearchParams(location.search).get('milestone'); } catch (e) { return null; } })();
  const defaultMilestones = milestoneParam === null ? [10, 20, 50, 100, 200, 500, 1000]
    : (milestoneParam === '0' || milestoneParam === '') ? []
    : milestoneParam.split(',').map(Number).filter(n => n > 0 && n < 1e12).slice(0, 50);
  const MILESTONE_MSG={10:'一杯蜜雪冰城到手',20:'一顿早饭钱有了',50:'一顿像样的外卖',100:'一张电影票',200:'一顿火锅',500:'一双球鞋',1000:'一次周末短途'};
  let digitSlots=[], numberShape='', compactDivisor=1, compactUnit='';
  let canvasWidth=0,canvasHeight=0,canvasRatio=1,chartPlan=null,planKey='';
  let audioContext=null, audioReady=false, focusMode=false, fitKey='';
  let previousActualAmount=null, lastMilestone=-1;
  const segmentCount=40;
  const segments=[];
  const segContainer=$('segmentBars');
  for(let i=0;i<segmentCount;i++){
    const slot=document.createElement('span');slot.className='segment-bar';
    const fill=document.createElement('span');slot.appendChild(fill);segContainer.appendChild(slot);
    segments.push({slot,fill});
  }

  function setText(id,text){const e=$(id);if(e && e.textContent!==String(text))e.textContent=String(text);}
  function icon(name){return '<svg class="icon" aria-hidden="true"><use href="#icon-'+name+'"/></svg>';}
  function shapeOf(text){return text.replace(/\d/g,'#');}
  function renderNumber(value,instant=false){
    const num=Math.max(0,Number.isFinite(value)?value:0)/compactDivisor;
    const formatted=num.toLocaleString('en-US',{minimumFractionDigits:numDecimals,maximumFractionDigits:numDecimals});
    if(formatted===lastFormatted && !instant)return;
    const shape=shapeOf(formatted);
    if(shape!==numberShape){
      const frag=document.createDocumentFragment();digitSlots=[];let decimal=false;
      for(const c of formatted){
        if(c==='.'){decimal=true;const mark=document.createElement('span');mark.className='num-mark small';mark.textContent='.';frag.appendChild(mark);continue;}
        if(c===','){const mark=document.createElement('span');mark.className='num-mark comma';mark.textContent=',';frag.appendChild(mark);continue;}
        const n=Number(c);const slot=document.createElement('span');slot.className='digit-slot'+(decimal?' small':'');slot.setAttribute('aria-hidden','true');
        const inner=document.createElement('span');inner.className='digit-inner';
        for(let i=0;i<30;i++){const digit=document.createElement('span');digit.textContent=String(i%10);inner.appendChild(digit);}
        const position=10+n;inner.style.transition='none';inner.style.transform='translateY(-'+(position*1.08)+'em)';
        slot.appendChild(inner);frag.appendChild(slot);digitSlots.push({inner,n,position,reset:null});
      }
      $('earningsNumber').replaceChildren(frag);numberShape=shape;
      requestAnimationFrame(()=>{for(const item of digitSlots)item.inner.style.transition='';});
      fitKey='';
    } else {
      const digits=formatted.replace(/\D/g,'');
      for(let i=0;i<digits.length;i++){
        const n=Number(digits[i]), item=digitSlots[i];
        if(item.n===n)continue;
        if(item.reset)clearTimeout(item.reset);
        if(instant || motion.matches){item.position=10+n;item.inner.style.transition='none';}
        else {
          if(item.position>=20){item.position-=10;item.inner.style.transition='none';item.inner.style.transform='translateY(-'+(item.position*1.08)+'em)';item.inner.getBoundingClientRect();}
          item.inner.style.transition='';item.position+=((n-item.n+10)%10);
        }
        item.n=n;item.inner.style.transform='translateY(-'+(item.position*1.08)+'em)';
        item.reset=setTimeout(()=>{if(item.position>=20){item.position=10+item.n;item.inner.style.transition='none';item.inner.style.transform='translateY(-'+(item.position*1.08)+'em)';}},310);
      }
    }
    lastFormatted=formatted;
    $('earningsNumber').setAttribute('aria-label',formatted+(compactUnit||latest?.unit||''));
    $('amountArea').setAttribute('aria-label',(latest?.symbol||'¥')+' '+formatted+(compactUnit||latest?.unit||''));
    if(latest)$('amountArea').title=latest.symbol+' '+latest.amount.toLocaleString('en-US',{maximumFractionDigits:numDecimals,minimumFractionDigits:numDecimals})+(latest.fun?' · 趣味倍率':'');
    fitAmount();
  }

  function fitAmount(){
    const stage=$('amountArea');if(!stage)return;
    const template=document.body.dataset.template||'charge';
    const key=numberShape+'|'+template+'|'+window.innerWidth+'|'+focusMode+'|'+(latest?.symbol||'')+'|'+(compactUnit||latest?.unit||'');
    if(key===fitKey)return;fitKey=key;
    stage.style.fontSize='';
    const size=parseFloat(getComputedStyle(stage).fontSize);
    let room=stage.clientWidth;
    if(template==='meter' && window.innerWidth>760)room-=240;
    const natural=Array.from(stage.children).filter(c=>getComputedStyle(c).display!=='none').reduce((s,c)=>s+c.getBoundingClientRect().width,0)+Math.max(0,stage.children.length-1)*6;
    if(natural>room && room>0)stage.style.fontSize=Math.max(30,size*(room-4)/natural)+'px';
  }

  function chooseCompact(amount){
    compactDivisor=1;compactUnit='';
    if(window.__noCompact){setText('moneyUnit',latest.unit);return;}
    const raw=amount*(latest.fun?1e8:1);
    const choices=[[1e24,'亿亿亿'],[1e20,'万亿亿'],[1e16,'亿亿'],[1e12,'万亿'],[1e8,'亿'],[1e4,'万']];
    if(latest.fun && amount<1e7){compactUnit='亿';}
    else if(raw>=1e7 || latest.fun){
      const selected=choices.find(([value])=>raw>=value&&(!latest.fun||value>=1e8));
      if(selected){compactDivisor=selected[0]/(latest.fun?1e8:1);compactUnit=selected[1];}
    }
    setText('moneyUnit',compactUnit||latest.unit);
  }

  function applyTemplate(name,animate=true){
    if(lastTemplate===name)return;
    lastTemplate=name;document.body.dataset.template=name;
    document.querySelectorAll('[data-template]').forEach(button=>{if(button.tagName!=='BUTTON')return;const on=button.dataset.template===name;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',String(on));});
    const buttons=[...document.querySelectorAll('.template-switch button')];const selected=buttons.find(b=>b.dataset.template===name);
    if(selected){const base=buttons[0].offsetLeft;$('templateSlider').style.width=selected.offsetWidth+'px';$('templateSlider').style.transform='translateX('+(selected.offsetLeft-base)+'px)';}
    if(animate && !motion.matches){instrument.classList.remove('template-changing');void instrument.offsetWidth;instrument.classList.add('template-changing');setTimeout(()=>instrument.classList.remove('template-changing'),330);}
    fitKey='';planKey='';
    requestAnimationFrame(()=>{resizeCanvas();fitAmount();if(latest)drawPixel(performance.now());});
    document.querySelector('meta[name=theme-color]').setAttribute('content',getComputedStyle(document.body).getPropertyValue('--bg').trim());
  }

  function confettiBurst(){
    if(window.__vibrate&&navigator.vibrate)navigator.vibrate([40,50,80]);
    const host=$('energyStage')||instrument;if(!host)return;
    const cv=document.createElement('canvas');cv.className='confetti-canvas';
    const r=host.getBoundingClientRect();cv.width=Math.max(2,r.width);cv.height=Math.max(2,r.height);
    host.appendChild(cv);const c2=cv.getContext('2d');if(!c2){cv.remove();return;}
    const colors=['#5ae593','#ff8a52','#4de3ff','#eeb58e','#ffd166','#ff5f56','#38bdf8'];
    const ps=[];for(let i=0;i<90;i++){ps.push({x:cv.width/2+(Math.random()-.5)*60,y:cv.height*.4,vx:(Math.random()-.5)*7,vy:-Math.random()*7-3,g:.16+Math.random()*.1,w:4+Math.random()*5,h:6+Math.random()*8,rot:Math.random()*Math.PI,vr:(Math.random()-.5)*.3,c:colors[i%colors.length],life:1});}
    const start=performance.now();
    (function frame(t){const el=(t-start)/1000;c2.clearRect(0,0,cv.width,cv.height);let alive=false;
    for(const q of ps){q.vy+=q.g;q.x+=q.vx;q.y+=q.vy;q.rot+=q.vr;q.life=Math.max(0,1-el/2.4);
    if(q.life>0&&q.y<cv.height+20)alive=true;c2.save();c2.globalAlpha=q.life;c2.translate(q.x,q.y);c2.rotate(q.rot);c2.fillStyle=q.c;c2.fillRect(-q.w/2,-q.h/2,q.w,q.h);c2.restore();}
    if(alive)requestAnimationFrame(frame);else cv.remove();})(start);
  }

  function update(data){
    const tick=performance.now();const state=window.SalaryApp?.getState();
    if(window.__dirDown&&data.snapshot){
      const monthly=data.period==='month';
      const total=monthly?((state&&state.config&&state.config.salary)||0):data.snapshot.daySalary;
      const got=monthly?data.snapshot.monthEarned:data.snapshot.todayEarned;
      const rest=(total-got)*((data.currency&&data.currency.rate)||1);
      data.displayAmount=data.fun?rest/1e8:rest;
    }
    const signature=data.currency.code+'|'+data.currency.rate+'|'+data.period+'|'+(data.demo?'demo':'real')+'|'+state?.config.salary+'|'+data.snapshot.workdays+'|'+data.snapshot.hoursPerDay+'|'+data.snapshot.dayKey;
    const changed=signature!==lastSignature;
    latest=data;lastTime=tick;
    numDecimals=Math.min(6,Math.max(0,Math.round(data.decimals||2)));
    const template=state?.preferences.template||'charge';
    applyTemplate(template,Boolean(lastTemplate));
    chooseCompact(data.displayAmount);
    if(changed){amountFrom=lastSignature?amountShown:(window.__count?0:data.displayAmount);amountTarget=data.displayAmount;tweenStart=tick;tweenDuration=(motion.matches||window.__noTween)?0:(window.__count&&!lastSignature?1500:560);lastSignature=signature;}
    else if(!tweenDuration){amountTarget=data.displayAmount;}
    const curChanged=lastCurrency!==data.currency.code;
    if(curChanged){
      if(lastCurrency && data.fun && !motion.matches){instrument.classList.add('fun-entry');setTimeout(()=>instrument.classList.remove('fun-entry'),600);}
      lastCurrency=data.currency.code;
      $('richQuickButton').classList.toggle('is-active',data.fun);
      $('richQuickButton').setAttribute('aria-pressed',String(data.fun));
      $('richQuickButton').querySelector('span').textContent=data.fun?'回到人民币':'亿万富翁';
    }
    instrument.classList.toggle('is-working',data.working);
    instrument.classList.toggle('is-fun',data.fun);
    instrument.classList.toggle('is-month',data.period==='month');
    const p=clamp(data.progress);
    if(p>=1&&lastProgress<1&&data.snapshot&&data.snapshot.todayEarned>0&&!motion.matches&&!confettiDisabled&&!window.__noConfetti)confettiBurst();
    lastProgress=p;
    const ml=window.__milestones===undefined?defaultMilestones:window.__milestones;
    if(ml.length&&data.snapshot&&data.working){
      const dk=data.snapshot.dayKey;
      if(dk!==milestoneDay){milestoneDay=dk;milestonesHit=new Set();}
      const earn=data.snapshot.todayEarned||0;
      for(const m of ml){if(earn>=m&&!milestonesHit.has(m)){milestonesHit.add(m);const mText='已入账 '+(data.symbol||'¥')+m.toLocaleString('en-US')+(MILESTONE_MSG[m]?' · '+MILESTONE_MSG[m]:'');if(window.__vibrate&&navigator.vibrate)navigator.vibrate(40);if(window.__notify&&window.Notification&&Notification.permission==='granted'){try{new Notification('薪动',{body:mText});}catch(e){}}if(window.SalaryApp&&window.SalaryApp.toast)window.SalaryApp.toast(mText);break;}}
    }
    if(window.__earnTarget&&data.snapshot){
      const eb=$('earnBadge');
      if(eb){
        const earnRate=(data.currency&&data.currency.rate)||1;
        const earnedDisp=(data.snapshot.todayEarned||0)*earnRate*(data.fun?1e-8:1);
        const rem=Math.max(0,window.__earnTarget-earnedDisp);
        const rateDisp=data.secondRate*(data.fun?1e-8:1);
        eb.hidden=false;
        if(rem<=0){setText('earnLeft','✓');}
        else if(!rateDisp){setText('earnLeft','—');}
        else{const secs=Math.ceil(rem/rateDisp),hh=Math.floor(secs/3600),mm=Math.floor(secs%3600/60),ss2=secs%60;
          setText('earnLeft',hh+':'+String(mm).padStart(2,'0')+':'+String(ss2).padStart(2,'0'));}
        setText('earnTargetText','到手 '+(data.symbol||'¥')+window.__earnTarget+(data.unit||''));
      }
    }
    if(window.__msNext&&data.snapshot){
      const mb=$('msBadge');if(mb){
        const nxt=(ml.length?ml:[10,20,50,100,200,500,1000]).find(m2=>m2>(data.snapshot.todayEarned||0));
        if(nxt){mb.hidden=false;const rate2=(data.currency&&data.currency.rate)||1;
          setText('msLeft',(data.symbol||'¥')+((nxt-(data.snapshot.todayEarned||0))*rate2).toFixed(1));
          setText('msName',MILESTONE_MSG[nxt]?' · '+MILESTONE_MSG[nxt]:'');}
        else mb.hidden=true;
      }
    }
    setText('chargePercent',(p*100).toFixed(1)+'%');
    setText('pigPercent',(p*100).toFixed(1)+'%');
    setText('neonPercent',(p*100).toFixed(1)+'%');
    setText('paperPercent',(p*100).toFixed(1)+'%');
    setText('monoPercent',(p*100).toFixed(1)+'%');
    const na=$('neonArc');if(na)na.style.strokeDashoffset=String(100*(1-p));
    const pp=$('paperPath');if(pp)pp.style.strokeDashoffset=String(100*(1-p));
    const mf=$('monoFill');if(mf)mf.style.width=(p*100)+'%';
    const tb=$('termBar');if(tb){const blocks=20,full=Math.round(p*blocks);tb.textContent='['+'█'.repeat(full)+'░'.repeat(blocks-full)+'] '+(p*100).toFixed(1)+'%';}
    setText('ecgPercent',(p*100).toFixed(1)+'%');
    const ep=$('ecgPulse');if(ep)ep.style.strokeDashoffset=String(100*(1-p));
    setText('wavePercent',(p*100).toFixed(1)+'%');
    const wf=$('waveFill');if(wf)wf.style.height=(p*100)+'%';
    setText('thermPercent',(p*100).toFixed(1)+'%');
    const tfl=$('thermFill');if(tfl)tfl.style.height=(p*100)+'%';
    setText('receiptPercent',(p*100).toFixed(1)+'%');
    const rcp=$('receiptPaper');if(rcp)rcp.style.height=(p*100)+'%';
    setText('sandPercent',(p*100).toFixed(1)+'%');
    const stf=$('sandTop');if(stf)stf.style.height=((1-p)*100)+'%';
    const sfl=$('sandFill');if(sfl)sfl.style.height=(p*100)+'%';
    setText('dialPercent',(p*100).toFixed(1)+'%');
    const dh=$('dialHand');if(dh)dh.style.transform='rotate('+(p*360)+'deg)';
    setText('trailPercent',(p*100).toFixed(1)+'%');
    const td=$('trailDone');if(td){const L=td.getTotalLength();td.style.strokeDasharray=String(L);td.style.strokeDashoffset=String(L*(1-p));}
    const tfg=$('trailFlag');if(tfg){const tp=$('trailDone');if(tp){try{const pt=tp.getPointAtLength(tp.getTotalLength()*p);tfg.style.left=(pt.x/640*100)+'%';tfg.style.top=(pt.y/300*100)+'%';}catch(_){}}}
    setText('metroPercent',(p*100).toFixed(1)+'%');
    const mf2=$('metroFill');if(mf2)mf2.style.width=(p*100)+'%';
    const mt=$('metroTrain');if(mt)mt.style.left='calc('+(p*100)+'% - 14px)';
    const ms2=document.querySelectorAll('.metro-stop');ms2.forEach((el,i)=>el.classList.toggle('on',p*100>=(i/(ms2.length-1))*100-0.01));
    setText('liftPercent',(p*100).toFixed(1)+'%');
    const lf=$('liftFloor');if(lf)lf.textContent=(1+Math.min(7,Math.floor(p*8)))+'F';
    const ldr=document.querySelector('.lift-doors');if(ldr)ldr.classList.toggle('open',p>=0.999);
    const la=$('liftArrow');if(la)la.classList.toggle('off',!data.working);
    setText('eclipsePercent',(p*100).toFixed(1)+'%');
    const em=$('eclipseMoon');if(em)em.style.left='calc('+(-30+p*160)+'% - 55px)';
    const ec=document.querySelector('.eclipse-corona');if(ec)ec.style.opacity=String(Math.max(0,(p-0.5)*2));
    const ft=(p*100).toFixed(1).padStart(4,'0');
    const f1=$('flapT1'),f2=$('flapT2'),f3=$('flapT3');
    if(f1)f1.textContent=ft[0];if(f2)f2.textContent=ft[1];if(f3)f3.textContent=ft[3];
    setText('vinylPercent',(p*100).toFixed(1)+'%');
    const va=$('vinylArm');if(va)va.style.transform='rotate('+(-18+p*30)+'deg)';
    const vd=$('vinylDisc');if(vd)vd.classList.toggle('spin',!!data.working);
    setText('constPercent',(p*100).toFixed(1)+'%');
    const cl=$('constLine');if(cl){const L2=cl.getTotalLength();cl.style.strokeDasharray=String(L2);cl.style.strokeDashoffset=String(L2*(1-p));}
    const cs=document.querySelectorAll('.const-star');cs.forEach((el,i)=>el.classList.toggle('lit',p*100>=(i/(cs.length-1))*100));
    setText('plantPercent',(p*100).toFixed(1)+'%');
    const ps=$('plantStem');if(ps)ps.style.height=(p*130)+'px';
    const pb=$('plantBloom');if(pb)pb.classList.toggle('open',p>=0.85);
    setText('shadowPercent',(p*100).toFixed(1)+'%');
    const sp=$('shadowPuppet');if(sp)sp.style.left='calc('+(6+p*82)+'% - 18px)';
    const ss=$('shadowSun');if(ss)ss.style.left='calc('+(10+p*80)+'% - 14px)';
    setText('tidePercent',(p*100).toFixed(1)+'%');
    const tw=$('tideWater');if(tw)tw.style.height=(8+p*84)+'%';
    setText('rocketPercent',(p*100).toFixed(1)+'%');
    const rb=$('rocketBody');if(rb)rb.style.bottom=(p*66)+'%';
    const rf=$('rocketFlame');if(rf)rf.style.opacity=String(data.working?0.9:0.2);
    setText('balloonPercent',(p*100).toFixed(1)+'%');
    const bc=$('balloonCraft');if(bc)bc.style.bottom='calc('+(p*62)+'% + 24px)';
    const bb=$('balloonBurner');if(bb)bb.style.opacity=String(data.working?0.9:0.25);
    setText('aquaPercent',(p*100).toFixed(1)+'%');
    const aw=$('aquaWater');if(aw)aw.style.height=(14+p*70)+'%';
    setText('kitePercent',(p*100).toFixed(1)+'%');
    const kc=$('kiteCraft');if(kc){kc.style.bottom=(14+p*62)+'%';kc.style.right=(18+p*52)+'%';}
    const kl=$('kiteLine');if(kl){const kx=140+p*52*0.4,ky=80-p*62*0.42;kl.setAttribute('d','M100 170 Q'+(100+kx*0.5+8)+' '+((170+ky)/2)+' '+kx+' '+ky);}
    setText('fallsPercent',(p*100).toFixed(1)+'%');
    const fd=$('fallsDrop');if(fd)fd.style.height=(p*82)+'%';
    const fp=$('fallsPool');if(fp)fp.style.height=(4+p*22)+'%';
    setText('toastPercent',(p*100).toFixed(1)+'%');
    const tb2=$('toastBread');if(tb2)tb2.style.bottom='calc('+(p>=0.999?58:14)+'% )';
    const tv=$('toastLever');if(tv)tv.style.top=(30+p*52)+'%';
    setText('emberPercent',(p*100).toFixed(1)+'%');
    const ef=$('emberFire');if(ef)ef.style.transform='scale('+(0.3+p*0.9)+')';
    setText('cablePercent',(p*100).toFixed(1)+'%');
    const cc=$('cableCar');if(cc){cc.style.left=(p*82)+'%';cc.style.top='calc('+(46-p*30)+'% - 8px)';}
    setText('hivePercent',(p*100).toFixed(1)+'%');
    const hc=document.querySelectorAll('.hive-cell');hc.forEach((el,i)=>el.classList.toggle('fill',p*hc.length>=i+0.5));
    setText('lanternPercent',(p*100).toFixed(1)+'%');
    const ll=$('lanternLamp');if(ll)ll.style.bottom=(8+p*62)+'%';
    const abv=Math.round(p*100);for(let ri=0;ri<3;ri++){const rod=document.getElementById('abRod'+ri);if(!rod)break;const dv=ri===0?Math.floor(abv/100):ri===1?Math.floor(abv/10)%10:abv%10;const hv=rod.querySelector('.ab-heaven');if(hv)hv.classList.toggle('on',dv>=5);const ers=rod.querySelectorAll('.ab-earth');ers.forEach((b,j)=>{const on=j<dv%5;b.classList.toggle('on',on);b.style.top=(on?42+j*18:94+j*18)+'px';});}
    const fw=$('ferrisWheel');if(fw)fw.setAttribute('transform','rotate('+(p*360).toFixed(1)+' 120 95)');
    setText('ferrisPercent',(p*100).toFixed(1)+'%');
    const fcs=document.querySelectorAll('.fer-cab');fcs.forEach((c,i)=>c.classList.toggle('lit',i<Math.round(p*fcs.length)));
    const gs=$('globeSnow');if(gs)gs.style.height=(6+p*58)+'%';
    setText('globePercent',(p*100).toFixed(1)+'%');
    const smp=document.getElementById('seismoPath');if(smp){const sl=smp.getTotalLength();smp.style.strokeDasharray=sl;smp.style.strokeDashoffset=sl*(1-p);const np=smp.getPointAtLength(sl*p);const nd=document.getElementById('seismoNeedle');if(nd){nd.setAttribute('cx',np.x);nd.setAttribute('cy',np.y);}}
    setText('seismoPercent',(p*100).toFixed(1)+'%');
    const tws=document.querySelectorAll('.terr-water');tws.forEach((w,i)=>{w.style.height=(clamp(p*tws.length-i,0,1)*100)+'%';});
    const ca=$('craneArm');if(ca)ca.style.top=(8+p*52)+'%';
    const ct=$('craneToy');if(ct)ct.classList.toggle('grabbed',p>=0.999);
    setText('cranePercent',(p*100).toFixed(1)+'%');
    const sreels=[['slotR1','slotR2','slotR3']];const symH=44;
    for(let sr=0;sr<3;sr++){const rl=document.getElementById('slotR'+(sr+1));if(!rl)break;const stop=Math.min(4,Math.floor(p*(4+sr*0.34)));rl.style.transform='translateY('+(-stop*symH)+'px)';}
    setText('slotsPercent',(p*100).toFixed(1)+'%');
    const dts=document.querySelectorAll('.dom-tile');dts.forEach((t,i)=>{const f=clamp(p*dts.length-i,0,1);t.style.transform='rotate('+(f*-72)+'deg)';});
    const mts=document.querySelectorAll('.mt-stick');mts.forEach((m,i)=>{m.classList.toggle('lit',p*mts.length>=i+0.5);m.classList.toggle('burnt',p*mts.length>=i+1);});
    const pks=document.querySelectorAll('.pop-kernel');pks.forEach((k,i)=>k.classList.toggle('popped',p*pks.length>=i+0.5));
    const tstack=document.getElementById('tetrisStack');
    if(tstack){const rows=6,cols=6;const filled=Math.floor(p*rows*cols);let html='';for(let i=0;i<rows*cols;i++){html+='<i class="'+(i<filled?'tb on':'tb')+'"></i>';}if(tstack.childElementCount!==rows*cols||tstack.dataset.f!=filled){tstack.dataset.f=filled;tstack.innerHTML=html;}}
    const tp=$('tetrisPiece');if(tp)tp.style.top=(8+ (p%0.1667)/0.1667*40)+'%';
    const fb=$('fishBobber');if(fb)fb.style.top=(30+p*34)+'%';
    const fl=$('fishLine');if(fl)fl.style.height=(14+p*34)+'%';
    const ff=$('fishFish');if(ff){ff.style.bottom=(4+p*30)+'%';ff.style.opacity=p>0.35?1:0;}
    const pc=$('potClay');if(pc){pc.style.width=(70-p*22)+'px';pc.style.height=(30+p*80)+'px';pc.style.borderRadius=p>0.7?'46% 46% 30% 30%/30% 30% 20% 20%':p>0.35?'48% 48% 40% 40%/25% 25% 30% 30%':'50% 50% 45% 45%/40% 40% 40% 40%';}
    const skr=$('sparkStick');if(skr)skr.style.height=(10+(1-p)*70)+'px';
    const st=$('sparkTip');if(st)st.style.opacity=p>=0.999?0:1;
    const op=$('oriPaper');if(op){const stage=p<0.33?0:p<0.66?1:2;op.className='ori-paper s'+stage;}
    const tt=$('typewriterText');if(tt){const msg='今日已入账 '+(data.symbol||'¥')+((data.snapshot&&data.snapshot.todayEarned)||0).toFixed(2);tt.textContent=msg.slice(0,Math.round(msg.length*p));}
    const ab1=$('auroraB1'),ab2=$('auroraB2'),ab3=$('auroraB3');
    if(ab1)ab1.style.opacity=clamp(p*2.4,0,0.75);
    if(ab2)ab2.style.opacity=clamp(p*2-0.5,0,0.65);
    if(ab3)ab3.style.opacity=clamp(p*1.7-0.8,0,0.55);
    const cb=$('catBody'),cf=$('catFace'),cz=$('catZzz'),ctl=$('catTail');
    if(cf)cf.textContent=p>=0.85?'=^･ω･^=':p>=0.5?'-ω-':'ᴥ';
    if(cz)cz.style.opacity=p<0.85?1:0;
    if(cb)cb.style.transform='translateX(-50%) scaleY('+(0.82+p*0.3)+')';
    if(ctl)ctl.style.transform='rotate('+(p*40-20)+'deg)';
    const pd=$('prayerDrum');if(pd)pd.style.transform='rotate('+(p*720)+'deg)';
    const pkys=document.querySelectorAll('.pi-key');pkys.forEach((k,i)=>k.classList.toggle('hit',p*pkys.length>=i+0.5));
    const fjs=document.querySelectorAll('.fj-fly');fjs.forEach((f,i)=>f.classList.toggle('in',p*fjs.length>=i+0.5));
    const lb1=$('lavaB1'),lb2=$('lavaB2'),lb3=$('lavaB3');
    if(lb1)lb1.style.bottom=(8+clamp(p*2,0,1)*50)+'%';
    if(lb2)lb2.style.bottom=(8+clamp(p*2-0.5,0,1)*58)+'%';
    if(lb3)lb3.style.bottom=(8+clamp(p*1.6-0.9,0,1)*64)+'%';
    const ks=$('knitScarf');if(ks)ks.style.height=(8+p*92)+'px';
    const jf=$('juiceFill');if(jf)jf.style.height=(6+p*72)+'%';
    const jo=$('juiceOrange');if(jo){jo.style.top=(10-p*8)+'%';jo.style.opacity=p>0.6?0.25:1;}
    document.querySelectorAll('.rain-arc').forEach((a,i)=>{a.style.opacity=String(clamp(p*5-i*0.7,0,0.85));});
    ['bnB1','bnB2','bnB3','bnB4'].forEach((id,i)=>{const b=$(id);if(b){const f=clamp(p*4-i,0,1);b.style.transform='scale('+(0.3+f*0.7)+') rotate('+(-20+f*20)+'deg)';b.style.opacity=String(0.3+f*0.7);}});
    const vds=document.querySelectorAll('.vend-item');vds.forEach((v,i)=>{v.style.opacity=String(p*vds.length>=i+1?0.15:1);});
    const vdp=$('vendDrop');if(vdp){vdp.style.top=p>=0.999?'72%':'12%';vdp.style.opacity=p>0.5?1:0;}
    const lb=$('lhBeam');if(lb)lb.style.transform='rotate('+(p*360)+'deg)';
    const lfog=$('lhFog');if(lfog)lfog.style.opacity=String(0.75-p*0.7);
    const tmb=$('tmBelt');if(tmb)tmb.style.backgroundPosition=(p*600)+'px 0';
    setText('tmPercent',(p*5).toFixed(2));
    const od=$('ovenDough');if(od){od.style.transform='scale('+(0.5+p*0.6)+')';od.style.background='hsl(38,'+(60+p*20)+'%,'+(72-p*28)+'%)';}
    const ol=$('ovenLight');if(ol)ol.style.opacity=String(0.4+p*0.5);
    const ww=$('wishWater');if(ww)ww.style.height=(30+p*55)+'%';
    const wc=$('wishCoin');if(wc){wc.style.top=(12+p*46)+'%';wc.style.opacity=p>0.8?0:1;}
    const ws=$('wishSparkle');if(ws)ws.style.opacity=p>0.6?1:0;
    ['scT1','scT2','scT3'].forEach((id,i)=>{const t=$(id);if(t){const f=clamp(p*3-i,0,1);t.style.transform='scaleY('+f+')';t.style.opacity=String(0.15+f*0.85);}});
    const sf=$('scFlag');if(sf)sf.style.opacity=p>=0.85?1:0;
    const ib=$('inkBlot');if(ib){ib.style.transform='translate(-50%,-50%) scale('+(0.15+p*1.1)+')';ib.style.opacity=String(0.25+p*0.65);}
    const ip=$('inkPool');if(ip)ip.style.opacity=String(clamp(p*1.6-0.5,0,0.5));
    const ib2=$('inkBrush');if(ib2){ib2.style.top=(8+p*30)+'%';ib2.style.opacity=p>0.9?0:0.9;}
    const cw=$('cndWax');if(cw)cw.style.height=(90-p*64)+'px';
    const cp=$('cndPool');if(cp){cp.style.width=(30+p*60)+'px';cp.style.opacity=String(0.2+p*0.8);}
    const swg=$('swgSeat');if(swg)swg.style.transform='rotate('+((0.15+p*0.7)*Math.sin(tick/900))+'rad)';
    const gk=$('gchKnob');if(gk)gk.style.transform='rotate('+(p*540)+'deg)';
    const gb=$('gchDrop');if(gb){gb.style.top=p>0.75?'72%':'30%';gb.style.opacity=p>0.5?1:0;}
    const gbs=document.querySelectorAll('.gch-ball');gbs.forEach((b,i)=>b.style.opacity=String(p*gbs.length>=i+1?0.2:1));
    const sw=$('srfWave');if(sw)sw.style.height=(20+p*60)+'%';
    const sc=$('srfCrest');if(sc)sc.style.height=(14+p*40)+'%';
    const ssf=$('srfSurfer');if(ssf)ssf.style.bottom=(8+p*58)+'%';
    const sfm=$('srfFoam');if(sfm)sfm.style.opacity=String(p*0.8);
    const sm=$('scpMoon');if(sm)sm.style.transform='translate(-50%,-50%) scale('+(0.5+p*1.2)+')';
    const btb=$('btlBottle');if(btb){btb.style.left='calc('+(6+p*66)+'% )';btb.style.transform='rotate('+(-14+p*14+Math.sin(tick/1400)*4)+'deg)';}
    const pnb=$('pnbBall');if(pnb){pnb.style.top=(4+p*80)+'%';pnb.style.left=(46+Math.sin(tick/700)*(8+p*14))+'%';}
    const ltf=$('ltsFlower');if(ltf){ltf.style.bottom=(8+p*38)+'%';const open=clamp(p*1.5,0,1);ltf.querySelectorAll('.lts-petal').forEach((pt,i)=>{pt.style.transform='rotate('+(-50+i*25)*(open)+'deg) scale('+(0.4+open*0.8)+')';pt.style.opacity=String(0.4+open*0.6);});}
    const lst=$('ltsStem');if(lst)lst.style.height=(8+p*38)+'%';
    const rmb=$('rmnBroth');if(rmb)rmb.style.height=(10+p*62)+'%';
    const rn=$('rmnNoodles');if(rn)rn.style.opacity=p>0.15?1:0;
    const re=$('rmnEgg');if(re)re.style.opacity=p>0.7?1:0;
    const rs=$('rmnSteam');if(rs)rs.style.opacity=p>0.5?1:0;
    const g1=$('gerG1');if(g1)g1.style.transform='rotate('+(p*360)+'deg)';
    const g2=$('gerG2');if(g2)g2.style.transform='rotate('+(-p*540)+'deg)';
    const g3=$('gerG3');if(g3)g3.style.transform='rotate('+(p*720)+'deg)';
    const gh=$('gerHand');if(gh)gh.style.transform='rotate('+(p*360)+'deg)';
    const ivf=$('ivdFleet');if(ivf)ivf.style.top=(2+p*46)+'%';
    document.querySelectorAll('.mn-cell').forEach((c,i)=>{c.classList.toggle('is-open',p*20>=i+1);c.classList.toggle('is-flag',p>=0.999&&i===19);});
    const sfg=$('shwFigure');if(sfg){sfg.style.left='calc('+(4+p*82)+'% )';sfg.style.opacity=String(0.35+p*0.55);}
    const ssu=$('shwSun');if(ssu)ssu.style.top=(60-p*34)+'%';
    const spl=$('sprPlant');if(spl){spl.style.height=(p*100)+'px';spl.style.opacity=p>0.02?1:0;}
    const spf=$('sprFlower');if(spf)spf.style.opacity=p>0.8?1:0;
    const ttk=$('trlToken');if(ttk){const cell=Math.min(11,Math.floor(p*12));ttk.style.left='calc(8% + '+cell+' * 7.5%)';ttk.style.top=(cell<6?'18%':'58%');}
    document.querySelectorAll('.trl-cell').forEach((c,i)=>{c.classList.toggle('is-done',p*12>i);});
    const mjt=$('mjTile');if(mjt)mjt.style.transform='rotateY('+(p*180)+'deg)';
    const mjf=$('mjFront');if(mjf)mjf.style.opacity=p>0.5?1:0;
    const sbm=$('sclBeam');if(sbm)sbm.style.transform='rotate('+(-14+p*20)+'deg)';
    ['sclC1','sclC2','sclC3'].forEach((id,i)=>{const c=$(id);if(c)c.style.opacity=p*3>=i+1?1:0;});
    const tp1=$('trfP1');if(tp1)tp1.style.transform='rotate(-8deg) translateY('+(p>0.33?'-140%':'0')+')';
    const tp2=$('trfP2');if(tp2)tp2.style.transform='rotate(6deg) translateY('+(p>0.66?'-140%':'0')+')';
    const tp3=$('trfP3');if(tp3)tp3.style.transform='rotate(-5deg) translateY('+(p>=0.999?'-140%':'0')+')';
    const wb=$('wmlBlades');if(wb)wb.style.transform='rotate('+(tick*0.02*(0.3+p))+'deg)';
    const gsk=$('grlSkewer');if(gsk){gsk.style.transform='rotateX('+(p*720)+'deg)';gsk.style.filter='saturate('+(0.6+p*0.9)+') brightness('+(1-p*0.15)+')';}
    const gsm=$('grlSesame');if(gsm)gsm.style.opacity=p>0.8?1:0;
    const dsh=$('dckShip');if(dsh)dsh.style.left='calc('+(58-p*38)+'% )';
    const dlt=$('dckLight');if(dlt)dlt.style.opacity=p>0.85?1:0.15;
    const cnd=$('cpsNeedle');if(cnd)cnd.style.transform='translate(-50%,-100%) rotate('+(-120+p*120+Math.sin(tick/600)*(1-p)*18)+'deg)';
    const sbs=$('sbmSub');if(sbs)sbs.style.top=(8+p*46)+'%';
    const sbw=$('sbmWater');if(sbw)sbw.style.height=(30+p*40)+'%';
    const sbc=$('sbmChest');if(sbc){sbc.style.bottom=(4+p*22)+'%';sbc.style.opacity=p>0.7?1:0.4;}
    const sbl=$('sbmLight');if(sbl)sbl.style.opacity=p>0.5?1:0.2;
    const idp=$('iclDrip');if(idp)idp.style.opacity=String(0.3+p*0.7);
    const iw=$('iclWord');if(iw)iw.style.opacity=String(clamp(p*1.4,0,1));
    const ipl=$('iclPool');if(ipl)ipl.style.width=(10+p*60)+'%';
    document.querySelectorAll('.icl-spike').forEach((sp,i)=>{sp.style.transform='scaleY('+clamp(1-p*1.8,0.15,1)+')';});
    ['snmB1','snmB2','snmB3'].forEach((id,i)=>{const b=$(id);if(b){const f=clamp(p*3-i,0,1);b.style.transform='scale('+f+')';b.style.opacity=String(f);}});
    const ssc=$('snmScarf');if(ssc)ssc.style.opacity=p>0.85?1:0;
    const lcf=$('lttCoffee');if(lcf)lcf.style.height=(20+p*60)+'%';
    const lat=$('lttArt');if(lat){lat.style.opacity=p>0.6?1:0;lat.style.transform='translateX(-50%) scale('+clamp((p-0.6)*3,0,1)+')';}
    const ljg=$('lttJug');if(ljg){ljg.style.opacity=clamp((p-0.3)*4,0,1)*clamp((0.75-p)*8,0,1);ljg.style.transform='rotate('+(p>0.3?-30:0)+'deg)';}
    const trn=$('trnTrain');if(trn)trn.style.left='calc('+(70-p*60)+'% )';
    const tpf=$('trnPuff');if(tpf)tpf.style.opacity=clamp(p*3,0,1)*clamp((0.95-p)*6,0,1);
    const iv1=$('ivyV1');if(iv1)iv1.style.height=clamp(p*1.4,0,1)*130+'px';
    const iv2=$('ivyV2');if(iv2)iv2.style.height=clamp(p*1.8-0.5,0,1)*95+'px';
    const iv3=$('ivyV3');if(iv3)iv3.style.height=clamp(p*2-1,0,1)*70+'px';
    ['ivyL1','ivyL2','ivyL3','ivyL4'].forEach((id,i)=>{const l=$(id);if(l)l.style.opacity=p*4>=i+1?1:0;});
    const fbl=$('frgBlade');if(fbl){fbl.style.width=(30+p*70)+'px';fbl.style.background='linear-gradient(#f8c048,#e07020, #f8c048)';fbl.style.boxShadow='0 0 '+(4+p*16)+'px rgba(248,160,60,'+(0.3+p*0.5)+')';}
    const fhm=$('frgHammer');if(fhm)fhm.style.transform='rotate('+(-40+((tick/350)%1)*40)+'deg)';
    const fsp=$('frgSparks');if(fsp)fsp.style.opacity=String(0.4+p*0.6);
    const fgl=$('frgGlow');if(fgl)fgl.style.opacity=String(0.3+p*0.6);
    const tsy=$('tghSyrup');if(tsy)tsy.style.height=clamp(p*1.2,0,1)*86+'%';
    const tsh=$('tghShine');if(tsh)tsh.style.opacity=p>0.7?1:0;
    const dbb=$('dgbBoat');if(dbb)dbb.style.left='calc('+(6+p*60)+'% )';
    const ddr=$('dgbDrum');if(ddr)ddr.style.transform='scale('+(1+Math.abs(Math.sin(tick/300))*0.15)+')';
    const mtp=$('milTop');if(mtp)mtp.style.transform='translateX(-50%) rotate('+(tick*0.04*(0.4+p))+'deg)';
    const mhd=$('milHandle');if(mhd)mhd.style.transform='rotate('+(tick*0.04*(0.4+p))+'deg)';
    const mfl=$('milFlour');if(mfl){mfl.style.width=(16+p*64)+'%';mfl.style.height=(4+p*10)+'px';}
    const lnd=$('ldyDrum');if(lnd)lnd.style.transform='translateX(-50%) rotate('+(tick*0.05*(0.4+p))+'deg)';
    ['ldyB1','ldyB2','ldyB3'].forEach((id,i)=>{const b=$(id);if(b)b.style.opacity=p*3>=i+1?1:0;});
    const myf=$('myuFish');if(myf)myf.style.transform='scale('+(1+((tick/800)%1<0.12?0.06:0))+')';
    const mys=$('myuStick');if(mys)mys.style.transform='rotate('+(-20+((tick/800)%1<0.12?16:0))+'deg)';
    const mym=$('myuMerit');if(mym){const r=(tick/800)%1;mym.style.opacity=r<0.5?1-r*2:0;mym.style.transform='translateY('+(-r*30)+'px)';}
    ['sshP1','sshP2','sshP3'].forEach((id,i)=>{const pl=$(id);if(pl){const gone=p*3>=i+1;pl.style.left='calc('+((6+p*88+i*2)%92)+'% )';pl.querySelector('.ssh-food').style.opacity=gone?0:1;}});
    const sch=$('sshChop');if(sch){sch.style.bottom=p>0.3?(30+p*20)+'%':'30%';sch.style.opacity=p>0.3?1:0;}
    const mml=$('mlwMallow');if(mml){mml.style.transform='rotate('+(tick*0.05*(0.4+p))+'deg)';mml.style.background='hsl(38,'+(30+p*40)+'%,'+(88-p*40)+'%)';}
    const msk=$('mlwSmoke');if(msk)msk.style.opacity=p>0.6?1:0;
    const ttp=$('tpsTop');if(ttp)ttp.style.transform='rotate('+Math.sin(tick/260)*(1-p)*24+'deg)';
    const tpb=$('tpsBlur');if(tpb)tpb.style.opacity=String(0.2+p*0.7);
    const fj1=$('ftnJ1');if(fj1)fj1.style.height=(14+p*66)+'px';
    const fj2=$('ftnJ2');if(fj2)fj2.style.height=(10+p*46)+'px';
    const fj3=$('ftnJ3');if(fj3)fj3.style.height=(10+p*46)+'px';
    const fmt=$('ftnMist');if(fmt)fmt.style.opacity=String(clamp(p*1.3,0,0.8));
    const ssl=$('sldSled');if(ssl){ssl.style.left='calc('+(8+p*64)+'% )';ssl.style.transform='translateY('+(-p*30)+'px) rotate('+(6-p*8)+'deg)';}
    const ssp=$('sldSpray');if(ssp)ssp.style.opacity=String(clamp(p*1.5,0,1)*clamp((0.98-p)*8,0,1));
    const slf=$('sldFlag');if(slf)slf.style.opacity=p>=0.999?1:0.25;
    const kwh=$('kldWheel');if(kwh)kwh.style.transform='translate(-50%,-50%) rotate('+(tick*0.03*(0.5+p))+'deg) scale('+(0.5+p*0.7)+')';
    const gpt=$('gftPot');if(gpt)gpt.style.transform='rotate('+(-clamp((p-0.2)*3,0,1)*38)+'deg)';
    const gst=$('gftStream');if(gst)gst.style.opacity=clamp((p-0.25)*4,0,1)*clamp((0.9-p)*10,0,1);
    ['gftC1','gftC2','gftC3'].forEach((id,i)=>{const cp=$(id);if(cp){const f=clamp(p*3-i,0,1);cp.querySelector('b').style.height=f*16+'px';}});
    ['jgwP1','jgwP2','jgwP3','jgwP4','jgwP5','jgwP6'].forEach((id,i)=>{const pc=$(id);if(pc){const on=p*6>=i+1;pc.classList.toggle('is-in',on);}});
    const srl=$('scrL');if(srl)srl.style.left='calc(50% - '+(8+p*52)+'px)';
    const srr=$('scrR');if(srr)srr.style.right='calc(50% - '+(8+p*52)+'px)';
    const ssh2=$('scrSheet');if(ssh2)ssh2.style.width=(20+p*104)+'px';
    const pum=$('prsUmb');if(pum){pum.style.transform='translateX(-50%) scale('+(0.3+p*0.7)+') rotate('+(tick*0.02*(0.3+p))+'deg)';pum.style.opacity=String(0.3+p*0.7);}
    const sld2=$('stmLid');if(sld2){sld2.style.bottom='calc(12% + '+(78+p*36)+'px)';sld2.style.transform='rotate('+(-p*30)+'deg)';}
    ['stmB1','stmB2','stmB3'].forEach((id,i)=>{const b=$(id);if(b){const f=clamp(p*3-i,0,1);b.style.transform='scale('+f+')';b.style.opacity=String(f);}});
    const ssm=$('stmSteam');if(ssm)ssm.style.opacity=String(clamp(p*1.4,0,1));
    const hbr=$('htpBroth');if(hbr){hbr.style.background='radial-gradient(circle at 50% 30%,hsl(8,'+(60+p*30)+'%,'+(38-p*8)+'%),hsl(10,70%,'+(24-p*6)+'%))';}
    ['htpF1','htpF2','htpF3'].forEach((id,i)=>{const f=$(id);if(f){f.style.opacity=p*3>=i+1?1:0;f.style.transform='translateY('+Math.sin(tick/500+i)*4+'px)';}});
    const hbb=$('htpBub');if(hbb)hbb.style.opacity=String(0.3+p*0.7);
    const wwl=$('wwnWheel');if(wwl)wwl.style.transform='translate(-50%,-50%) rotate('+(tick*0.03*(0.4+p))+'deg)';
    const wdp=$('wwnDrop');if(wdp)wdp.style.opacity=String(0.3+p*0.7);
    ['fckC1','fckC2','fckC3','fckC4','fckC5','fckC6'].forEach((id,i)=>{const c=$(id);if(c){const boom=p*6>=i+1;c.classList.toggle('is-boom',boom);}});
    const fcf=$('fckConfetti');if(fcf)fcf.style.opacity=String(clamp(p*1.5,0,1));
    const sgp=$('sgaPath');if(sgp){const L=sgp.getTotalLength?sgp.getTotalLength():600;sgp.style.strokeDasharray=L;sgp.style.strokeDashoffset=L*(1-p);}
    const sgs=$('sgaSpoon');if(sgs)sgs.style.left='calc('+(20+p*60)+'% )';
    const sgk=$('sgaStick');if(sgk)sgk.style.opacity=p>0.85?1:0;
    const slb=$('slgBand');if(slb)slb.style.transform='scaleY('+(1+clamp(p,0,0.9)*0.8)+')';
    const sls=$('slgStone');if(sls){const fly=clamp((p-0.85)/0.15,0,1);sls.style.left='calc(30% + '+fly*55+'% )';sls.style.opacity=p>0.7?1:0;}
    const slc=$('slgCan');if(slc)slc.style.transform='rotate('+(p>=0.999?78:0)+'deg)';
    const bdl=$('bdrL');if(bdl)bdl.style.transform='rotate('+(-30+((tick/900)%1<0.15?30:0))+'deg)';
    const bdr=$('bdrR');if(bdr)bdr.style.transform='rotate('+(30-((tick/900)%1<0.15?30:0))+'deg)';
    const bdm=$('bdrDrum');if(bdm)bdm.style.transform='translateX(-50%) scale('+(1+((tick/900)%1<0.15?0.05:0))+')';
    ['bdrW1','bdrW2'].forEach((id,i)=>{const w=$(id);if(w){const r=(tick/900+i*0.5)%1;w.style.transform='translate(-50%,-50%) scale('+(1+r*1.6)+')';w.style.opacity=String((1-r)*0.5);}});
    const foh=$('fofHead');if(foh){const hues=[0,300,210,130,40];const h=hues[Math.min(4,Math.floor(p*5))];foh.style.filter='hue-rotate('+h+'deg)';}
    const fof=$('fofFan');if(fof){const st=Math.floor(p*5)%1;fof.style.left=st<0.5?"-10%":"110%";}
    const ldl=$('ldnLion');if(ldl){const step=Math.floor(p*4);const xs=[18,38,58,78];const ys=[0,30,60,90];ldl.style.left='calc('+(xs[Math.min(3,step)])+'% - 40px)';ldl.style.bottom=(10+ys[Math.min(3,step)])+'%';}
    const chs=$('chnSand');if(chs)chs.style.transform='rotate('+Math.sin(tick/400)*6+'deg)';
    const chh=$('chnShovel');if(chh)chh.style.transform='rotate('+(-25+Math.sin(tick/400)*20)+'deg)';
    const icc=$('iscCarve');if(icc)icc.style.clipPath='inset('+(100-p*100)+'% 0 0 0)';
    const ich=$('iscChisel');if(ich)ich.style.top=(8+p*50)+'%';
    const zod=$('zoeDrum');if(zod)zod.style.transform='translateX(-50%) rotate('+(tick*0.04*(0.3+p))+'deg)';
    const stt=$('stkStone');if(stt){const hop=Math.floor(p*5);const xs=[8,24,40,56,72];const bounce=Math.abs(Math.sin((p*5-hop)*Math.PI))*22;stt.style.left=xs[Math.min(4,hop)]+'%';stt.style.bottom='calc(30% + '+bounce+'px)';stt.style.opacity=p>=0.999?0:1;}
    ['stkR1','stkR2','stkR3','stkR4','stkR5'].forEach((id,i)=>{const r=$(id);if(r){const on=p*5>=i+1;const grow=clamp(p*5-i,0,1);r.style.opacity=on?String((1-grow)*0.7):0;r.style.transform='translateX(-50%) scale('+(1+grow*2)+')';}});
    const plp=$('polPhoto');if(plp){plp.style.opacity=String(0.15+p*0.85);plp.style.filter='blur('+((1-p)*6)+'px) contrast('+(60+p*40)+'%)';}
    const sswp=$('sswPlank');if(sswp)sswp.style.transform='translateX(-50%) rotate('+(-12+p*24)+'deg)';
    const nt1=$('ntbT1');if(nt1){const on1=p>0.15;nt1.style.opacity=on1?1:0.08;nt1.style.textShadow=on1?'0 0 8px #f048a0,0 0 20px #f048a0,0 0 40px #f048a0':'none';}
    const nt2=$('ntbT2');if(nt2){const on2=p>0.6;nt2.style.opacity=on2?1:0.08;nt2.style.textShadow=on2?'0 0 8px #38c8f0,0 0 20px #38c8f0,0 0 40px #38c8f0':'none';}
    const bbh=$('bblSphere');if(bbh){const d=14+p*86;bbh.style.width=d+'px';bbh.style.height=d+'px';bbh.style.opacity=String(0.4+p*0.6);}
    ['bblF1','bblF2','bblF3'].forEach((id,i)=>{const f=$(id);if(f){const on=p*3>i+1;f.style.opacity=on?0.85:0;f.style.bottom=(20+i*18+p*30)+'%';}});
    const pzp=$('pzaPie');if(pzp)pzp.style.left='calc(8% + '+Math.min(p,0.35)/0.35*34+'%)';
    const pzc=$('pzaCheese');if(pzc){const melt=clamp((p-0.4)/0.5,0,1);pzc.style.borderRadius=(50-melt*30)+'% '+(50-melt*30)+'% '+(50-melt*30)+'% '+(50-melt*30)+'%';pzc.style.background='radial-gradient(circle at 50% 45%,hsl(45,'+(80+melt*15)+'%,'+(58+melt*10)+'%),hsl(35,80%,48%))';}
    const sgb=$('sgmBlob');if(sgb){const d2=18+p*58;sgb.style.width=d2+'px';sgb.style.height=d2+'px';}
    ['sgmEarL','sgmEarR','sgmTail'].forEach(id=>{const e=$(id);if(e)e.style.opacity=p>0.55?1:0;});
    const slm=$('sltLamp');if(slm){slm.style.bottom=(10+p*55)+'%';slm.style.transform='translateX(-50%) scale('+(1-p*0.35)+')';}
    const slg=$('sltGlow');if(slg)slg.style.opacity=String(0.3+p*0.7);
    ['c1','c2','c3','c4','c5','c6','c7','c8'].forEach((c,i)=>{const el=document.querySelector('.cin-coin.'+c);if(el)el.style.opacity=p*8>=i+1?1:0.12;});
    const sdt=$('sdaTrickle');if(sdt)sdt.style.opacity=p<0.9?0.9:0;
    const sdp=$('sdaPile');if(sdp){sdp.style.transform='scale('+(0.2+p*0.8)+')';sdp.style.opacity=String(0.3+p*0.7);}
    const rtd=$('rtlDrum');if(rtd)rtd.style.transform='translateX(-50%) rotate('+Math.sin(tick/160)*(8+p*30)+'deg)';
    const rbl=$('rtlBl');if(rbl)rbl.style.left='calc(50% - '+(30+Math.abs(Math.sin(tick/160))*30)+'px)';
    const rbr=$('rtlBr');if(rbr)rbr.style.right='calc(50% - '+(30+Math.abs(Math.sin(tick/160))*30)+'px)';
    const rtf=$('rtsFly');if(rtf){const t=p%0.35/0.35;const seg=Math.floor(p/0.35);if(seg<3&&t<0.9){rtf.style.left=(8+([24,50,76][seg]-8)*t)+'%';rtf.style.bottom=(60-Math.sin(t*Math.PI)*35)+'%';rtf.style.opacity=1;}else rtf.style.opacity=0;}
    ['rtsR1','rtsR2','rtsR3'].forEach((id,i)=>{const r=$(id);if(r){const on=p>(i+1)*0.32;r.style.opacity=on?0.95:0;r.style.bottom=on?'18%':'60%';}});
    const ikh=$('ikjHead');if(ikh)ikh.style.left=(8+((tick/1400)%1)*76)+'%';
    const ikp=$('ikjPaper');if(ikp)ikp.style.height=(12+p*76)+'px';
    const iki=$('ikjImg');if(iki)iki.style.clipPath='inset('+(100-p*100)+'% 0 0 0)';
    const gwt=$('gwnTea');if(gwt){const fill=clamp(p/0.4,0,1);gwt.style.height=(fill*72)+'%';gwt.style.background='hsl(140,'+(20+p*30)+'%,'+(30-p*8)+'%)';}
    ['gwnL1','gwnL2','gwnL3'].forEach((id,i)=>{const l=$(id);if(l){const sink=clamp((p-0.4)/0.6,0,1);l.style.top=(10+sink*(60+i*6))+'%';l.style.opacity=p>0.15?1:0;}});
    const gwl=$('gwnLid');if(gwl)gwl.style.transform='translateX(-50%) rotate('+(p>=0.98?-18:0)+'deg) translateY('+(p>=0.98?-14:0)+'px)';
    const dsl=$('dblStickL');if(dsl)dsl.style.transform='rotate('+(-14+Math.sin(tick/220)*(4+p*10))+'deg)';
    const dsr=$('dblStickR');if(dsr)dsr.style.transform='rotate('+(14-Math.sin(tick/220)*(4+p*10))+'deg)';
    const dbc=$('dblCup');if(dbc)dbc.style.transform='translateX(-50%) translateY('+Math.sin(tick/110)*-10*(0.3+p)+'px) rotate('+(tick*0.05*(0.5+p))+'deg)';
    const sth=$('sthPath');if(sth){sth.style.opacity=p>0.02?1:0.15;sth.style.clipPath='inset(0 '+(100-p*100)+'% 0 0)';}
    const stn=$('sthNeedle');if(stn){stn.style.left=(18+p*62)+'%';stn.style.top=(62-Math.sin(p*Math.PI*3)*22)+'%';}
    const tps=[[8,-40,60,-25],[12,-20,44,0],[14,10,30,15],[16,42,42,30],[10,60,62,20],[18,-52,50,45],[20,24,70,-30]];
    tps.forEach((cfg,i)=>{const e=$('tgmP'+(i+1));if(e){const on=clamp(p*7-i,0,1);e.style.opacity=String(0.15+on*0.85);e.style.transform='translate('+(cfg[0]*(1-on))+'px,'+(cfg[1]*(1-on))+'px) rotate('+cfg[3]+'deg)';}});
    const knc=$('kntCord');if(knc){knc.style.opacity=p>0.02?1:0.1;knc.style.clipPath='inset(0 '+(100-p*100)+'% 0 0)';}
    const rbt=$('rbgText');if(rbt)rbt.style.opacity=String(0.08+p*0.92);
    const rbd=$('rbgDab');if(rbd){rbd.style.left=(20+((tick/700)%1)*60)+'%';rbd.style.top=(20+((tick/1100)%1)*50)+'%';rbd.style.opacity=p<0.97?0.9:0;}
    const lmc=$('lomCloth');if(lmc)lmc.style.height=(p*78)+'%';
    const lms=$('lomShuttle');if(lms){lms.style.left=(6+((tick/600)%1)*88)+'%';lms.style.top=(10+p*72)+'%';}
    for(let mi=1;mi<=16;mi++){const t=document.querySelector('.msc-tile.t'+mi);if(t){const on=p*16>=mi;t.style.transform='rotateY('+(on?0:90)+'deg)';t.style.opacity=on?1:0.25;}}
    const sst=$('seaStamp');if(sst){const dip=clamp((p-0.4)/0.3,0,1);sst.style.top='calc(12% + '+dip*30+'%)';}
    const spr=$('seaPrint');if(spr){const rev=clamp((p-0.7)/0.3,0,1);spr.style.opacity=String(rev);spr.style.transform='translate(-50%,-50%) scale('+(1.4-rev*0.4)+')';}
    const ggm=$('gogMallet');if(ggm){const sw=(tick/900)%1<0.2;ggm.style.transform='rotate('+(sw?30:-12)+'deg)';}
    const ggd=$('gogDisc');if(ggd)ggd.style.transform='translate(-50%,-50%) scale('+(1+((tick/900)%1<0.2?0.04:0))+')';
    ['gogW1','gogW2'].forEach((id,i)=>{const w=$(id);if(w){const r=(tick/900+i*0.5)%1;w.style.transform='translate(-50%,-50%) scale('+(0.6+r*1.8)+')';w.style.opacity=String((1-r)*0.4*(0.4+p*0.6));}});
    const bzm=$('bzhMallet');if(bzm){const bz=Math.min(2,Math.floor(p*3));bzm.style.left=(18+bz*30)+'%';}
    ['bzhB1','bzhB2','bzhB3'].forEach((id,i)=>{const b=$(id);if(b){const hit=p*3>=i+1;b.style.filter=hit?'brightness(1.5)':'none';b.style.transform=hit?'rotate('+Math.sin(tick/120)*(4-p*1.2)+'deg)':'none';}});
    const zpk=$('zthPick');if(zpk)zpk.style.left=(14+p*70)+'%';
    ['zthR1','zthR2'].forEach((id,i)=>{const r=$(id);if(r){const rr=(tick/800+i*0.5)%1;r.style.transform='scaleX('+(1+rr*2.4)+')';r.style.opacity=String((1-rr)*0.5*(0.3+p*0.7));}});
    const grt=$('grdTop');if(grt)grt.style.transform='translate(-50%,-50%) rotate('+(tick*0.02*(0.3+p))+'deg)';
    const gra=$('grdArm');if(gra)gra.style.transform='rotate('+(tick*0.02*(0.3+p))+'deg)';
    const grf=$('grdFlour');if(grf)grf.style.width=(10+p*80)+'%';
    const cpt=$('cptToy');if(cpt){cpt.style.bottom=(18+p*58)+'%';cpt.style.transform='translateX(-50%) scaleY('+(1-p*0.15)+')';}
    const cpl=$('cptHL');if(cpl)cpl.style.opacity=p>0.3?0:1;
    const cpr=$('cptHR');if(cpr)cpr.style.opacity=p>0.3?0:1;
    const pcl=$('pctL');if(pcl)pcl.style.transform='rotateY('+((1-p)*-80)+'deg)';
    const pcr=$('pctR');if(pcr)pcr.style.transform='rotateY('+((1-p)*80)+'deg)';
    const hlh=$('hulHoop');if(hlh){hlh.style.transform='translate(-50%,-50%) rotate('+(tick*0.06*(0.4+p))+'deg) scaleY(0.32)';hlh.style.left='calc(50% + '+Math.sin(tick/300)*(6+p*10)+'px)';}
    const rows=[['rbkR1',0.66],['rbkR2',0.33],['rbkR3',0]];
    rows.forEach(([id,th])=>{const r=$(id);if(r){const done=p>th;r.style.transform='translateX('+(done?0:(id==='rbkR1'?-1:id==='rbkR2'?1:-1)*14)+'px)';r.querySelectorAll('i').forEach(c=>c.style.background=done?'#e0c030':'linear-gradient(145deg,#d84838,#4898d8)');}});
    ['nstD4','nstD3','nstD2','nstD1'].forEach((id,i)=>{const d=$(id);if(d){const on=p*4>=i+1;d.style.opacity=on?1:0.15;d.style.transform='translate(-50%,0) scale('+(on?1:0.6)+')';}});
    const ncp=$('nstCap');if(ncp)ncp.style.top=p>=0.98?'-16%':'10%';
    const cst=$('curStone');if(cst){cst.style.left=(10+p*72)+'%';cst.style.bottom=(18+Math.sin(p*Math.PI)*14)+'%';}
    ['jugB1','jugB2','jugB3'].forEach((id,i)=>{const b=$(id);if(b){const ph=(tick/500+i*0.66)%2;const hgt=Math.abs(Math.sin(ph*Math.PI))*70*(0.4+p*0.6);const lr=Math.cos(ph*Math.PI)*24;b.style.left='calc(50% + '+lr+'%)';b.style.bottom=(30+hgt)+'%';}});
    const jal=$('jugArmL');if(jal)jal.style.transform='rotate('+Math.sin(tick/250)*20*(0.3+p)+'deg)';
    const jar=$('jugArmR');if(jar)jar.style.transform='rotate('+Math.sin(tick/250+1)*-20*(0.3+p)+'deg)';
    const yst=$('yoyString');if(yst)yst.style.height=(10+p*72)+'%';
    const ydc=$('yoyDisc');if(ydc)ydc.style.top=(8+p*64)+'%';
    const pnw=$('pnwWheel');if(pnw)pnw.style.transform='translate(-50%,-50%) rotate('+(tick*0.05*(0.2+p*2))+'deg)';
    const mbb=$('mrbBall');if(mbb){const seg=p*3;const pts=[[7,14],[50,43],[30,64],[92,89]];const idx=Math.min(2,Math.floor(seg));const t=seg-idx;const x=pts[idx][0]+(pts[idx+1][0]-pts[idx][0])*t;const y=pts[idx][1]+(pts[idx+1][1]-pts[idx][1])*t;mbb.style.left=x+'%';mbb.style.top=y+'%';}
    const obx=$('omkBox');if(obx)obx.style.transform='translateX(-50%) rotate('+Math.sin(tick/130)*(p<0.9?6:0)+'deg)';
    const opp=$('omkPaper');if(opp){opp.style.bottom=p>=0.9?'calc(50% + 20px)':'-60px';opp.style.opacity=p>=0.9?1:0;}
    const drt=$('drtDart');if(drt){const fly=clamp(p/0.9,0,1);drt.style.left=(8+fly*62)+'%';drt.style.top=(60-fly*(30+Math.sin(p*Math.PI)*10))+'%';}
    const pnd=$('pntDonkey');if(pnd){pnd.style.transform='translateX(-50%) rotate('+Math.sin(tick/400)*(p<0.9?4:0)+'deg)';pnd.style.opacity=p>=0.98?0.35:1;}
    const pnc=$('pntCrack');if(pnc)pnc.style.opacity=p>0.6?(p-0.6)*2.5:0;
    const pbt=$('pntBat');if(pbt)pbt.style.transform='rotate('+((tick/700)%1<0.25?-30:10)+'deg)';
    ['pntC1','pntC2','pntC3','pntC4'].forEach((id,i)=>{const c=$(id);if(c){const on=p>=0.98;c.style.opacity=on?1:0;c.style.transform=on?'translateY('+(20+i*8)+'px)':'none';}});
    const kbl=$('kdmBall');if(kbl){const land=clamp((p-0.75)/0.25,0,1);kbl.style.top=(70-p*55+ (land>0?0:Math.sin(tick/300)*6*(1-p)))+'%';}
    for(let ti=1;ti<=6;ti++){const tr=document.querySelector('.vbx-tier.t'+ti);if(tr)tr.style.opacity=p*6>=ti?1:0.15;}
    const vrn=$('vbxRunner');if(vrn){const jump=clamp((p-0.85)/0.15,0,1);vrn.style.left=(14+p*70)+'%';vrn.style.bottom=(20+jump*45-jump*jump*10)+'%';}
    const stl=$('stlPoleL');if(stl)stl.style.transform='translateY('+Math.max(0,Math.sin(tick/350))*-8*(0.3+p)+'px)';
    const spr2=$('stlPoleR');if(spr2)spr2.style.transform='translateY('+Math.max(0,Math.sin(tick/350+Math.PI))*-8*(0.3+p)+'px)';
    const sst2=$('stlSteps');if(sst2)sst2.style.width=(p*80)+'%';
    const jph=$('jrpPath');if(jph){const sw=Math.sin(tick/180);jph.setAttribute('d','M40 10 Q'+(100+sw*8)+' '+(60+Math.abs(sw)*55)+' 160 10');jph.style.opacity=0.4+p*0.6;}
    for(let pi=1;pi<=3;pi++){const pl=$('pltP'+pi);if(pl){const on=p*3>=pi-1;pl.style.opacity=on?1:0.15;pl.style.transform='translateX(-50%) rotate('+Math.sin(tick/250+pi)*14+'deg)';}}
    const twk=$('trpWalker');if(twk){twk.style.left=(10+p*78)+'%';twk.style.transform='rotate('+Math.sin(tick/400)*6*(1-p*0.6)+'deg)';}
    const sgn=$('shkGun');if(sgn)sgn.style.transform='rotate('+((tick/900)%1<0.12?-18:-8)+'deg)';
    const sck=$('shkCork');if(sck){const shot=clamp((p-0.9)/0.1,0,1);sck.style.left=(20+shot*60)+'%';sck.style.opacity=shot>0&&shot<1?1:0;}
    for(let si=1;si<=3;si++){const pr=$('shkP'+si);if(pr)pr.style.opacity=p*3>=si?0.15:1;}
    const fkwParts=['fkwBrowL','fkwBrowR','fkwEyeL','fkwEyeR','fkwNose','fkwMouth','fkwCheekL','fkwCheekR'];fkwParts.forEach((id,i)=>{const el=$(id);if(el){const on=p*(fkwParts.length+1)>=i+1;el.style.opacity=on?1:0;el.style.transform=on?'':'translate('+(i%2?20:-20)+'px,'+((i*13)%40-20)+'px) rotate('+((i*37)%60-30)+'deg)';}});
    const kgb=$('kgmBig');if(kgb)kgb.style.opacity=p>0.15?1:0;
    const kgs=$('kgmSmall');if(kgs)kgs.style.opacity=p>0.5?1:0;
    const kgo=$('kgmOrange');if(kgo){const drop=clamp((p-0.8)/0.2,0,1);kgo.style.opacity=p>0.8?1:0;kgo.style.transform='translateX(-50%) translateY('+((1-drop)*-40)+'px)';}
    const hgr=$('hgtRacket');if(hgr)hgr.style.transform='rotate('+((tick/650)%1<0.18?-28:8)+'deg)';
    const hgs=$('hgtShuttle');if(hgs){const bh=Math.abs(Math.sin(tick/450))*55*(0.3+p*0.7);hgs.style.bottom=(30+bh)+'%';hgs.style.transform='rotate('+(tick/4)%360+'deg)';}
    const sk1=$('shgAtk1');if(sk1)sk1.style.transform='translate('+(-p*140)+'px,'+(p*60)+'px)';
    const sk2=$('shgAtk2');if(sk2)sk2.style.transform='translate('+(p*120)+'px,'+(p*80)+'px)';
    const sk3=$('shgAtk3');if(sk3)sk3.style.transform='translateY('+(p*40)+'px)';
    const smt=$('shgMate');if(smt){smt.style.opacity=p>=0.99?1:0;smt.style.transform=p>=0.99?'scale(1.15)':'scale(0.6)';}
    for(let ki=1;ki<=6;ki++){const kc=$('krtC'+ki);if(kc){const taken=p*6>=ki;kc.style.opacity=taken?0:1;kc.style.transform=taken?'translateY(-70px) rotate(20deg)':'';}}
    const khd=$('krtHand');if(khd){const ph=(tick/700)%1;khd.style.opacity=ph<0.3?0.9:0;khd.style.transform='translate('+(30+((tick/8)%90))+'px,-10px)';}
    const suiSizes=[26,40,58,80];
    for(let si2=1;si2<=4;si2++){const fr=$('suiF'+si2);if(fr){const lv=clamp(p*4-si2+1,0,1);const sz=suiSizes[si2-1]*(0.4+lv*0.6);fr.style.width=sz+'px';fr.style.height=sz+'px';fr.style.opacity=lv>0?1:0;}}
    const smy=$('smoYou');if(smy)smy.style.left=(26+p*20)+'%';
    const smf=$('smoFoe');if(smf){const shove=clamp((p-0.6)/0.4,0,1);smf.style.left=(58+shove*30)+'%';smf.style.opacity=shove>=1?0:1;}
    for(let gi=1;gi<=4;gi++){const gf=$('gfsF'+gi);if(gf){const caught=p*4>=gi;gf.style.opacity=caught?0:1;gf.style.left=caught?'':(20+((tick/(14+gi*4)+gi*17)%60))+'%';gf.style.top=caught?'':(30+Math.sin(tick/500+gi)*20)+'%';}}
    const gpo=$('gfsPoi');if(gpo)gpo.style.left=(15+((tick/10)%70))+'%';
    for(let ni=1;ni<=3;ni++){const nc=$('nrnC'+ni);if(nc){const lift=clamp(p*3-ni+1,0,1);nc.style.transform='translateY('+(-lift*80)+'%)';nc.style.opacity=1-lift*0.5;}}
    const vlv=$('vlcLava');if(vlv)vlv.style.height=(clamp(p*1.4,0,1)*100)+'%';
    const vfl=$('vlcFlow');if(vfl)vfl.style.height=(clamp((p-0.4)/0.6,0,1)*70)+'%';
    const vsm=$('vlcSmoke');if(vsm)vsm.style.height=(p*60)+'px';
    for(let vi=1;vi<=3;vi++){const vr=$('vlcR'+vi);if(vr){const burst=clamp((p-0.85)/0.15,0,1);vr.style.opacity=burst>0?1-burst*0.5:0;vr.style.transform='translate('+((vi-2)*burst*50)+'px,'+(-burst*70)+'px)';}}
    const asb=$('abySub');if(asb)asb.style.top=(12+p*62)+'%';
    const abm=$('abyBeam');if(abm)abm.style.height=(30+p*50)+'%';
    for(let ai=1;ai<=4;ai++){const ad=$('abyD'+ai);if(ad){const seen=p>(ai-1)*0.22+0.1;ad.style.opacity=seen?0.9:0.12;}}
    const adp=$('abyDepth');if(adp)adp.textContent=Math.round(p*1090)+'m';
    const cpp=$('chrPupa');if(cpp){cpp.style.opacity=p<0.75?1:0;cpp.style.transform='rotate('+Math.sin(tick/300)*5*p+'deg)';}
    const cfl=$('chrFly');if(cfl){const hatch=clamp((p-0.7)/0.3,0,1);cfl.style.opacity=hatch>0?1:0;cfl.style.left=(50+(1-hatch)*0)+'%';cfl.style.top=(60-hatch*35)+'%';cfl.style.transform='translateX(-50%) scaleY('+(0.5+hatch*0.5)+')';}
    const otp=$('oysTop');if(otp)otp.style.transform='translateX(-50%) rotate('+(-clamp(p,0,1)*55)+'deg)';
    const opr=$('oysPearl');if(opr){const ps=8+p*22;opr.style.width=ps+'px';opr.style.height=ps+'px';}
    const osh=$('oysShine');if(osh)osh.style.opacity=p>0.8?(p-0.8)*5:0;
    for(let ti2=1;ti2<=4;ti2++){const tn=$('anfT'+ti2);if(tn)tn.style.height=(clamp(p*4-ti2+1,0,1)*(30+ti2*8))+'%';}
    for(let ai2=1;ai2<=3;ai2++){const an=$('anfA'+ai2);if(an){an.style.top=(20+((tick/(20+ai2*8)+ai2*30)%60))+'%';an.style.left=(30+ai2*14+Math.sin(tick/400+ai2)*6)+'%';}}
    for(let pi2=1;pi2<=8;pi2++){const pt=$('snfP'+pi2);if(pt){const on=p*8>=pi2;pt.style.opacity=on?1:0;pt.style.transform='rotate('+((pi2-1)*45)+'deg) translateY(-36px) scale('+(on?1:0.3)+')';}}
    const mam=$('mtrArm');if(mam)mam.style.transform='rotate('+Math.sin(tick/(260-p*160))*38+'deg)';
    const mwt=$('mtrWt');if(mwt)mwt.style.top=(50-p*26)+'%';
    const mtk=$('mtrTick');if(mtk)mtk.style.opacity=Math.abs(Math.sin(tick/(260-p*160)))>0.92?1:0;
    const mbm=$('mtrBpm');if(mbm)mbm.textContent='♩='+Math.round(60+p*120);
    const sa1=$('splA1');if(sa1)sa1.style.transform='translate(-50%,-50%) rotate('+((tick/40)%360)+'deg) scale('+(0.3+p*0.7)+')';
    const sa2=$('splA2');if(sa2)sa2.style.transform='translate(-50%,-50%) rotate('+(180+(tick/40)%360)+'deg) scale('+(0.3+p*0.7)+')';
    for(let st2=1;st2<=4;st2++){const ss=$('splS'+st2);if(ss)ss.style.opacity=p>(st2-1)*0.25?0.9:0.1;}
    for(let ci=1;ci<=4;ci++){const ct=$('cctT'+ci);if(ct){const lv=clamp(p*4-ci+1,0,1);ct.style.opacity=lv>0?1:0.18;ct.style.width=(lv*100)+'%';}
    const cn=$('cctN'+ci);if(cn)cn.style.opacity=p*4>=ci?1:0.2;}
    const cch=$('cctChip');if(cch)cch.style.boxShadow=p>=0.99?'0 0 18px rgba(72,200,120,.9)':'none';
    const dlf=$('dwbLeaf');if(dlf)dlf.style.transform='rotate('+(-clamp(p,0,1)*78)+'deg)';
    const dbt=$('dwbBoat');if(dbt)dbt.style.left=(18+clamp((p-0.7)/0.3,0,1)*60)+'%';
    const war=$('wvnArrow');if(war)war.style.transform='translateX(-50%) rotate('+(tick/90)%360+'deg)';
    const bhr=$('bbnHour');if(bhr)bhr.style.transform='rotate('+(p*360)+'deg)';
    const bmn=$('bbnMin');if(bmn)bmn.style.transform='rotate('+((tick/8)%360)+'deg)';
    const ttb=$('tscTube');if(ttb)ttb.style.transform='rotate('+(-20+Math.sin(tick/700)*8*(0.3+p*0.7))+'deg)';
    const tcm=$('tscComet');if(tcm){const pass=clamp((p-0.85)/0.15,0,1);tcm.style.left=(90-pass*70)+'%';tcm.style.opacity=pass>0&&pass<1?1:0;}
    const tmn=$('tscMoon');if(tmn){tmn.style.opacity=p>0.5?1:0.3;tmn.style.transform='translateX(-50%) scale('+(0.6+p*0.4)+')';}
    const awt=$('aqmWater');if(awt)awt.style.height=(clamp(p*1.2,0,1)*100)+'%';
    const afi=$('aqmFish');if(afi){afi.style.opacity=p>0.5?1:0;afi.style.left=(15+((tick/25)%70))+'%';}
    const agr=$('aqmGrass');if(agr)agr.style.opacity=p>0.8?1:0;
    const tms=$('trrMoss');if(tms)tms.style.width=(20+p*80)+'%';
    for(let ti3=1;ti3<=3;ti3++){const tp=$('trrP'+ti3);if(tp)tp.style.height=(clamp(p*3-ti3+1,0,1)*(24+ti3*8))+'px';}
    const ncu=$('nstCup');if(ncu)ncu.style.opacity=p>0.1?1:0;
    for(let ni2=1;ni2<=3;ni2++){const eg=$('nstE'+ni2);if(eg){eg.style.opacity=p>(0.55+ni2*0.12)?1:0;}}
    const slf2=$('srdLoaf');if(slf2){const rise=0.6+clamp(p*1.3,0,1)*0.4;slf2.style.transform='translateX(-50%) scale('+rise+')';slf2.style.background='radial-gradient(circle at 50% 30%,'+(['#e8d8b0','#d8b070','#b07830'][p<0.4?0:p<0.8?1:2])+',#8a5c28)';}
    for(let fi=1;fi<=4;fi++){const fb=$('fmnB'+fi);if(fb){const by=((tick/(16+fi*6)+fi*25)%80);fb.style.bottom=(by*p)+'%';fb.style.opacity=p>0.15?(1-by/100):0;}}
    const fms=$('fmnMash');if(fms)fms.style.height=(30+p*40)+'%';
    const arcPos=[[14,30],[16,46],[15,58],[12,49]];
    for(let ai3=1;ai3<=4;ai3++){const ar=$('arcA'+ai3);if(ar){const hit=p*4>=ai3;ar.style.opacity=hit?1:0;if(hit){ar.style.left=arcPos[ai3-1][0]+'%';ar.style.top=arcPos[ai3-1][1]+'%';}}}
    const bbl=$('bkbBall');if(bbl){const shot=clamp((p-0.6)/0.4,0,1);const drib=Math.abs(Math.sin(tick/220))*26;bbl.style.left=shot>0?(26+shot*52)+'%':'26%';bbl.style.bottom=shot>0?(20+Math.sin(shot*Math.PI)*52)+'%':(18+drib)+'%';}
    const bsw=$('bkbSwish');if(bsw)bsw.style.opacity=p>=0.99?1:0;
    const pwt=$('pdlWatch');if(pwt)pwt.style.transform='translateX(-50%) rotate('+Math.sin(tick/(400-p*200))*(8+p*22)+'deg)';
    const psp=$('pdlSpiral');if(psp){psp.style.transform='translate(-50%,-50%) rotate('+((tick/14)%360)+'deg)';psp.style.opacity=p>0.85?0.9:0.35;}
    const zrd=$('zplRider');if(zrd){zrd.style.left=(12+p*68)+'%';zrd.style.top=(14+p*30)+'%';}
    for(let ch=1;ch<=3;ch++){const ch2=$('crsH'+ch);if(ch2){const bob=Math.sin(tick/400+ch*2.1)*(4+p*10);ch2.style.top=(44+bob)+'%';ch2.style.left=(18+((tick/60+ch*33)%64))+'%';}
    const clt=$('crsL'+ch);if(clt)clt.style.opacity=(tick/300+ch)%1.5<0.75?1:0.25;}
    for(let gi2=1;gi2<=4;gi2++){const gt=$('skiG'+gi2);if(gt){const passed=p*4>=gi2;gt.style.opacity=passed?0.25:1;}}
    const skr2=$('skiRider');if(skr2){skr2.style.left=(50+Math.sin(tick/450)*18)+'%';skr2.style.top=(16+p*52)+'%';}
    for(let fi2=1;fi2<=6;fi2++){const fb2=$('ffyF'+fi2);if(fb2){const lit=p*6>=fi2;fb2.style.opacity=lit?(0.4+Math.abs(Math.sin(tick/300+fi2))*0.6):0.15;fb2.style.left=(18+((tick/(30+fi2*7)+fi2*14)%64))+'%';fb2.style.top=(20+Math.sin(tick/600+fi2*1.7)*18)+'%';}}
    const fg2=$('ffyGlow');if(fg2)fg2.style.opacity=p*0.5;
    const msh=$('mphShadow');if(msh)msh.style.transform='translateX('+(52-p*104)+'%)';
    const mlb=$('mphLabel');if(mlb)mlb.textContent=['新月','三日月','上弦','満月'][Math.min(3,Math.floor(p*3.99))];
    const tst=$('tptStream');if(tst)tst.style.opacity=p>0.15&&p<0.9?1:0;
    const tta=$('tptTea');if(tta)tta.style.height=(clamp((p-0.15)/0.75,0,1)*82)+'%';
    const tpt=$('tptPot');if(tpt)tpt.style.transform='translateX(-50%) rotate('+(p>0.15?-18:0)+'deg)';
    for(let ri=1;ri<=6;ri++){const rd=$('spwR'+ri);if(rd)rd.style.opacity=p*6>=ri?1:0.08;}
    for(let qi=1;qi<=3;qi++){const qr=$('spwQ'+qi);if(qr)qr.style.opacity=p*3>=qi+2?0.85:0.08;}
    const sps=$('spwSpider');if(sps)sps.style.top=(12+p*40)+'%';
    const stl3=$('snlTrail');if(stl3)stl3.style.width=(p*62)+'%';
    const sbd=$('snlBody');if(sbd)sbd.style.left=(14+p*62)+'%';
    const hbd=$('hmbBird');if(hbd){const hop=Math.floor(p*2.99);hbd.style.left=(24+hop*26)+'%';hbd.style.top=(30+Math.sin(tick/160)*4)+'%';}
    const krp=$('koiRipple');if(krp)krp.style.opacity=0.2+p*0.6;
    const kfd=$('koiFood');if(kfd)kfd.style.opacity=p>0.3?1:0;
    for(let cs=1;cs<=6;cs++){const st2=$('cstS'+cs);if(st2){const on=clamp(p*6-cs+1,0,1);st2.style.opacity=on;st2.style.transform='scale('+(0.4+on*0.6)+')';}}
    for(let cl2=1;cl2<=5;cl2++){const ln=$('cstL'+cl2);if(ln){const on2=clamp(p*6-cl2,0,1);ln.style.strokeDasharray='70';ln.style.strokeDashoffset=70*(1-on2);}}
    for(let sp2=1;sp2<=5;sp2++){const pl=$('solP'+sp2);if(pl){const orbit=28+sp2*17;const ang=Math.PI*2*(sp2*0.13+tick/(9000+sp2*3000))*(1-p*0.85)+Math.PI/2;pl.style.left='calc(50% + '+(Math.cos(ang)*orbit*1.05)+'px)';pl.style.top='calc(50% + '+(Math.sin(ang)*orbit*0.55)+'px)';pl.style.opacity=0.3+clamp(p*5-sp2+1,0,1)*0.7;}}
    for(let bs=1;bs<=5;bs++){const sg=$('bmbS'+bs);if(sg){const on3=clamp(p*5-bs+1,0,1);sg.style.opacity=on3>0?1:0;sg.style.height=(on3*22)+'px';}}
    const blf=$('bmbLeaf');if(blf){blf.style.opacity=p>0.92?1:0;blf.style.transform='rotate('+(-25+Math.sin(tick/800)*10)+'deg)';}
    const gL=$('geoL'),gR=$('geoR');const gop=clamp(p*1.4-0.25,0,1);if(gL)gL.style.transform='translateX('+(-gop*16)+'px) rotate('+(-gop*14)+'deg)';if(gR)gR.style.transform='translateX('+(gop*16)+'px) rotate('+(gop*14)+'deg)';
    for(let gg=1;gg<=5;gg++){const gm=$('geoG'+gg);if(gm){const on4=clamp(p*5-gg+0.4,0,1);gm.style.opacity=on4;gm.style.transform='scale('+(0.3+on4*0.7)+')';}}
    for(let mr=1;mr<=4;mr++){const rg=$('mdlR'+mr);if(rg){const on5=clamp(p*4-mr+1,0,1);rg.style.strokeDasharray=Math.ceil(6.3*(20+mr*20))+'';rg.style.strokeDashoffset=Math.ceil(6.3*(20+mr*20))*(1-on5);}}
    const mc=$('mdlC');if(mc){mc.style.opacity=p>0.95?1:0;}
    const cA=$('ctpArm'),cS=$('ctpStone'),cF=$('ctpFly');const wind=clamp(p/0.85,0,1);if(cA)cA.style.transform='rotate('+(-30+wind*25-(p>0.85?(p-0.85)/0.15*55:0))+'deg)';if(cS)cS.style.opacity=wind>0.2?1:0;if(cF){const fly=p>0.85?(p-0.85)/0.15:0;cF.style.opacity=fly>0&&fly<1?1:0;cF.style.transform='translate('+(fly*160)+'px,'+(-fly*90+fly*fly*60)+'px)';}
    for(let sb=1;sb<=7;sb++){const bl=$('skrB'+sb);if(bl){const on6=clamp(p*7-sb+1,0,1);bl.style.opacity=on6;bl.style.transform='scale('+(0.3+on6*0.7)+')';}}
    for(let sp3=1;sp3<=2;sp3++){const pt=$('skrP'+sp3);if(pt){const dr=(tick/(1800+sp3*500)+sp3*0.5)%1;pt.style.opacity=p>0.9?Math.sin(dr*Math.PI):0;pt.style.transform='translate('+(dr*60)+'px,'+(dr*80)+'px) rotate('+(dr*240)+'deg)';}}
    const iS=$('incStick'),iE=$('incEmber'),iM=$('incSmoke');if(iS)iS.style.height=(90*(1-p))+'px';if(iE)iE.style.opacity=p<1?1:0;if(iM)iM.style.opacity=p>0.05&&p<0.98?0.5:0;
    const ash=p>0.4?1:0;const a1=$('incAsh1'),a2=$('incAsh2');if(a1)a1.style.opacity=ash;if(a2)a2.style.opacity=p>0.75?1:0;
    for(let pf=1;pf<=5;pf++){const fl=$('pgdF'+pf);if(fl){const on7=clamp(p*5-pf+1,0,1);fl.style.opacity=on7>0.05?1:0;fl.style.transform='translateY('+((1-on7)*30)+'px)';}}
    const pgs=$('pgdSpire');if(pgs)pgs.style.opacity=p>0.95?1:0;
    const rsw=$('rdrSweep');if(rsw)rsw.style.transform='rotate('+((tick/20)%360)+'deg)';
    for(let rb=1;rb<=5;rb++){const bl2=$('rdrB'+rb);if(bl2){const on8=clamp(p*5-rb+1,0,1);bl2.style.opacity=on8;bl2.style.transform='scale('+(0.5+on8*0.5)+')';}}
    const rT=$('rvrTrack'),rB=$('rvrBody');if(rT)rT.style.width=(p*70)+'%';if(rB)rB.style.left=(12+p*58)+'%';
    const bg=$('icbBerg');if(bg)bg.style.bottom=(8+p*18)+'%';
    const cT=$('cmtTail'),cH=$('cmtHead');if(cT){cT.style.width=(30+p*55)+'%';cT.style.opacity=0.3+p*0.7;}if(cH){cH.style.right=(8+p*55)+'%';cH.style.opacity=0.4+p*0.6;}
    for(let nb=1;nb<=3;nb++){const g2=$('nblG'+nb);if(g2){const st4=clamp(p*1.2-(nb-1)*0.25,0,1);g2.style.transform='translate(-50%,-50%) scale('+(1.4-st4*0.7)+')';g2.style.opacity=0.7-st4*0.35;}}
    const nS=$('nblStar');if(nS){nS.style.opacity=clamp(p*1.3-0.4,0,1);nS.style.transform='translate(-50%,-50%) scale('+(0.2+clamp(p*1.3-0.4,0,1)*0.8)+')';}
    for(let tb=1;tb<=4;tb++){const bd=$('trnB'+tb);if(bd){const on9=clamp(p*4-tb+1,0,1);bd.style.opacity=on9;bd.style.transform='translateX('+(Math.sin(tick/(300+tb*80)+tb)*8*on9)+'px)';}}
    for(let td=1;td<=2;td++){const db=$('trnD'+td);if(db){const sw=(tick/(600+td*200))%(Math.PI*2);db.style.opacity=p>0.5?0.8:0;db.style.transform='translate('+(Math.cos(sw)*30)+'px,'+(Math.sin(sw*2)*8)+'px)';}}
    for(let rp=1;rp<=6;rp++){const pt2=$('rseP'+rp);if(pt2){const on10=clamp(p*6-rp+1,0,1);pt2.style.opacity=on10;pt2.style.transform='rotate('+(rp*60)+'deg) translateY('+(-14*on10)+'px) scale('+(0.3+on10*0.7)+')';}}
    const rC=$('rseCore');if(rC)rC.style.opacity=p>0.15?1:0;
    for(let df=1;df<=6;df++){const fl2=$('dndF'+df);if(fl2){const on11=clamp(p*6-df+1,0,1);fl2.style.opacity=0.9-on11*0.9;fl2.style.transform='rotate('+(df*60)+'deg) translate('+(on11*26+Math.sin(df*2.1+tick/700)*4*on11)+'px,'+(-on11*20)+'px)';}}
    for(let cp=1;cp<=5;cp++){const pc=$('chsP'+cp);if(pc){const on12=clamp(p*5-cp+1,0,1);pc.style.opacity=on12;pc.style.transform='translateY('+((1-on12)*16)+'px)';}}
    const cK=$('chsK');if(cK)cK.style.opacity=clamp(p*1.2,0,1)*0.35;
    const sS=$('snrSun'),sG=$('snrGlow'),sK=$('snrSky');if(sS)sS.style.bottom=(8+p*52)+'%';if(sG)sG.style.opacity=p*0.5;if(sK)sK.style.opacity=0.4+p*0.6;
    const mM=$('mnrMoon'),mS=$('mnrStars');if(mM)mM.style.bottom=(6+p*50)+'%';if(mS)mS.style.opacity=0.3+p*0.7;
    for(let bb=1;bb<=4;bb++){const bl3=$('blsB'+bb);if(bl3){const on13=clamp(p*4-bb+1,0,1);bl3.style.opacity=1-on13;bl3.style.transform='translate('+(on13*(bb%2?28:-24))+'px,'+(on13*(bb<3?-18:20))+'px) scale('+(1-on13*0.6)+')';}}
    const bC=$('blsCue');if(bC)bC.style.transform='translateX('+(-20+p*14)+'px) rotate(-8deg)';
    const gB=$('glfBall'),gA=$('glfArc');if(gB){gB.style.left='calc(18% + '+p*66+'%)';gB.style.opacity=p>=1?0:1;}if(gA){gA.style.strokeDasharray='90';gA.style.strokeDashoffset=90*(1-p);gA.style.opacity=p>0&&p<1?1:0;}
    const wB=$('bwlBall');if(wB){wB.style.left='calc(8% + '+clamp(p/0.7,0,1)*72+'%)';wB.style.opacity=p<0.75?1:0;}
    for(let wp=1;wp<=6;wp++){const pn=$('bwlP'+wp);if(pn){const on14=clamp(p*6-wp-0.4,0,1);pn.style.transform='rotate('+(on14*(wp%2?70:-70))+'deg) translateY('+(on14*8)+'px)';pn.style.opacity=1-on14*0.8;}}
    for(let mg=1;mg<=4;mg++){const gr=$('mdwG'+mg);if(gr){const on15=clamp(p*4-mg+1,0,1);gr.style.height=(on15*34)+'px';gr.style.transform='rotate('+(Math.sin(tick/(600+mg*120)+mg)*5)+'deg)';}}
    for(let mf=1;mf<=2;mf++){const fw=$('mdwFl'+mf);if(fw){const on16=clamp(p*2-mf*0.6-0.35,0,1);fw.style.opacity=on16;fw.style.transform='scale('+(0.3+on16*0.7)+')';}}
    const gJ=$('gysJet');const jet=p>0.55?(p-0.55)/0.45:0;if(gJ){gJ.style.height=(jet*110)+'px';gJ.style.opacity=jet>0?1:0;}for(let gd=1;gd<=2;gd++){const dr2=$('gysD'+gd);if(dr2){const drp=(tick/(500+gd*300))%1;dr2.style.opacity=jet>0.5?1-drp:0;dr2.style.transform='translate('+((gd?14:-16)*(1+drp))+'px,'+(drp*40)+'px)';}}
    for(let vg=1;vg<=3;vg++){const gp=$('vnyG'+vg);if(gp){const st5=clamp(p*3-vg+1,0,1);gp.style.background=st5>=1?'radial-gradient(circle at 35% 30%,#b070e0,#6838a0)':st5>0?'radial-gradient(circle at 35% 30%,#a89850,#786828)':'radial-gradient(circle at 35% 30%,#6a9848,#486c2c)';gp.style.transform='scale('+(0.4+st5*0.6)+')';}}
    for(let rc=1;rc<=3;rc++){const cr=$('refC'+rc);if(cr){const on17=clamp(p*3-rc+1,0,1);cr.style.height=(on17*(26+rc*10))+'px';}}
    const rF=$('refFish');if(rF){rF.style.left=(20+(tick/120)%55)+'%';rF.style.opacity=p>0.6?1:0;}
    for(let ff=1;ff<=3;ff++){const fm=$('fplF'+ff);if(fm){const on18=clamp(p*3-ff+1,0,1);fm.style.opacity=on18;fm.style.transform='scaleY('+(0.3+on18*(0.7+Math.sin(tick/(140+ff*60))*0.12))+')';}}
    for(let fs=1;fs<=2;fs++){const sp4=$('fplS'+fs);if(sp4){const fsr=(tick/(400+fs*250))%1;sp4.style.opacity=p>0.7?Math.sin(fsr*Math.PI):0;sp4.style.transform='translate('+((fs?14:-10)*fsr)+'px,'+(-fsr*50)+'px)';}}
    const oP=$('onsPool');if(oP){oP.style.opacity=0.4+p*0.6;oP.style.transform='scaleX('+(0.6+p*0.4)+')';}
    for(let os=1;os<=3;os++){const st6=$('onsS'+os);if(st6){const stp=(tick/(1400+os*400)+os*0.33)%1;st6.style.opacity=p>0.3?Math.sin(stp*Math.PI)*0.5:0;st6.style.transform='translate('+((os-2)*24)+'px,'+(-stp*55)+'px)';}}
    const iT=$('iskTrace'),iK=$('iskSkater');if(iT){iT.style.strokeDasharray='600';iT.style.strokeDashoffset=600*(1-p);}if(iK){const fig=p*Math.PI*2;iK.style.left='calc(50% + '+(Math.sin(fig)*40)+'%)';iK.style.top='calc(50% + '+(Math.sin(fig*2)*18)+'%)';iK.style.opacity=p>0.02?1:0;}
    for(let jt=1;jt<=3;jt++){const tb2=$('jkbT'+jt);if(tb2)tb2.style.opacity=clamp(p*3-jt+1,0,1);}
    const jD=$('jkbDisc');if(jD){jD.style.transform='rotate('+(tick/8)%360+'deg)';jD.style.opacity=p>0.6?1:0.25;}
    const jA=$('jkbArch');if(jA)jA.style.opacity=0.25+clamp(p*1.2,0,1)*0.75;
    const mL=$('msxLid'),mD=$('msxDancer');if(mL)mL.style.transform='rotateX('+(-clamp(p/0.4,0,1)*70)+'deg)';if(mD){const dn=p>0.4?1:0;mD.style.opacity=dn;mD.style.transform='rotate('+((tick/15)*(dn))+'deg)';}
    const bW=$('bthWater');if(bW)bW.style.height=(p*58)+'px';
    for(let bb2=1;bb2<=3;bb2++){const bub=$('bthB'+bb2);if(bub){const bst=(tick/(900+bb2*300)+bb2*0.4)%1;bub.style.opacity=p>0.5?Math.sin(bst*Math.PI)*0.8:0;bub.style.transform='translate('+(bb2*20-30)+'px,'+(-bst*26)+'px)';}}
    const dD=$('dveDiver'),dB=$('dveBoard'),dR=$('dveRip');const dv=clamp((p-0.6)/0.4,0,1);if(dD){dD.style.bottom=(58-dv*38)+'%';dD.style.transform='rotate('+(dv*200)+'deg)';dD.style.opacity=p>0.05?1:0;}if(dB)dB.style.transform='translateY('+(p<0.6?Math.sin(tick/300)*2*(1-p):0)+'px)';if(dR){dR.style.opacity=dv>0.9?(dv-0.9)*10:0;dR.style.transform='scale('+(0.5+dv)+')';}
    const oS=$('obvShut'),oT=$('obvScope');if(oS)oS.style.transform='translateY('+(-clamp(p/0.5,0,1)*26)+'px)';if(oT){oT.style.opacity=p>0.45?1:0;oT.style.transform='rotate('+(-20+p*40)+'deg)';}
    const dP=$('dkrPhoto');if(dP){dP.style.filter='brightness('+(0.3+clamp(p*1.4-0.3,0,1)*0.7)+') saturate('+clamp(p*1.6-0.4,0,1)+')';dP.style.opacity=0.15+clamp(p*1.2,0,1)*0.85;}
    const pB=$('prjBeam'),pSc=$('prjScreen');if(pB)pB.style.opacity=p*0.85;if(pSc)pSc.style.opacity=0.3+clamp(p*1.2,0,1)*0.7;
    for(let pr=1;pr<=2;pr++){const rl=$('prjR'+pr);if(rl)rl.style.transform='rotate('+((tick/(6+pr*4))*(p>0.1?1:0))%360+'deg)';}
    for(let ts=1;ts<=5;ts++){const st7=$('trkS'+ts);if(st7)st7.style.opacity=clamp(p*5-ts+1,0,1);}
    const tH=$('trkHiker'),tF=$('trkFlag');if(tH){const tpos=clamp(p*1.05,0,1);tH.style.left=(22+tpos*52)+'%';tH.style.bottom=(20+tpos*46)+'%';}if(tF)tF.style.opacity=p>=0.99?1:0;
    const hS=$('hrbShip'),hG=$('hrbGull');if(hS)hS.style.left=(78-p*44)+'%';if(hG){const ga=tick/900;hG.style.transform='translate('+(Math.sin(ga)*30)+'px,'+(Math.cos(ga*1.4)*10)+'px)';hG.style.opacity=p>0.4?1:0;}
    for(let ss=1;ss<=6;ss++){const st8=$('stcS'+ss);if(st8)st8.style.opacity=clamp(p*6-ss+1,0,1);}
    const sL=$('stcLamp');if(sL)sL.style.opacity=p>=0.99?1:0;
    const bG=$('bkyGlow'),bB=$('bkyBread');if(bG)bG.style.opacity=p*0.9;if(bB){bB.style.transform='scale('+(0.5+clamp(p*1.2,0,1)*0.5)+')';bB.style.background=p>0.75?'radial-gradient(ellipse at 40% 30%,#e0a848,#8a4c14)':'radial-gradient(ellipse at 40% 30%,#e8dcc0,#b8a878)';}
    for(let bs2=1;bs2<=2;bs2++){const st9=$('bkyS'+bs2);if(st9){const bst2=(tick/(1000+bs2*400)+bs2*0.5)%1;st9.style.opacity=p>0.8?Math.sin(bst2*Math.PI)*0.6:0;st9.style.transform='translateY('+(-bst2*30)+'px)';}}
    const cK2=$('cst2K');if(cK2)cK2.style.height=(clamp(p/0.5,0,1)*60)+'px';
    for(let ct=1;ct<=2;ct++){const tw=$('cst2T'+ct);if(tw)tw.style.opacity=clamp(p*2.5-ct-0.2,0,1);}
    const cF=$('cst2F'),cF2=$('cst2F2');if(cF)cF.style.opacity=p>0.7?1:0;if(cF2)cF2.style.opacity=p>0.92?1:0;
    const vB=$('vygBoat'),vL=$('vygLand'),vSl=$('vygSail');if(vB)vB.style.left=(-12+p*82)+'%';if(vL)vL.style.opacity=p>0.55?1:0;if(vSl)vSl.style.transform='rotate('+Math.sin(tick/1200)*4+'deg)';
    const sSt=$('sunSteam'),sM=$('sunMerc');if(sSt)sSt.style.opacity=clamp(p*1.3,0,1)*0.7;if(sM)sM.style.height=(clamp(p*1.1,0,1)*62)+'px';
    const tW=$('tpWater');if(tW)tW.style.height=(8+clamp(p*1.15,0,1)*52)+'%';
    for(let tc=1;tc<=3;tc++){const cr=$('tpC'+tc);if(cr){cr.style.opacity=clamp(p*3-tc+1,0,1);cr.style.transform='translateY('+Math.sin(tick/900+tc)*3+'px)';}}
    const jW=$('jzWater');if(jW)jW.style.height=(10+clamp(p*1.2,0,1)*58)+'%';
    for(let jb=1;jb<=4;jb++){const bb2=$('jzB'+jb);if(bb2){const jbp=(tick/(600+jb*150)+jb*0.37)%1;bb2.style.opacity=p>0.35?Math.sin(jbp*Math.PI)*0.8:0;bb2.style.transform='translateY('+(-jbp*40)+'px)';}}
    for(let ms=1;ms<=6;ms++){const st10=$('mvS'+ms);if(st10)st10.style.opacity=clamp(p*6-ms+1,0,1);}
    const mP=$('mvPlay');if(mP)mP.style.opacity=p*0.95;
    for(let lb=1;lb<=8;lb++){const bk=$('libB'+lb);if(bk)bk.style.opacity=clamp(p*8-lb+1,0,1);}
    const lLp=$('libLamp');if(lLp)lLp.style.opacity=p>=0.99?1:0;
    const mzP=$('mzPath'),mzD=$('mzDot');if(mzP){const mLen=620;mzP.style.strokeDasharray=mLen;mzP.style.strokeDashoffset=mLen*(1-p);}
    if(mzD){const t2=clamp(p,0,1);const seg=[[16,116,16,70],[16,70,52,70],[52,70,52,34],[52,34,96,34],[96,34,96,100],[96,100,136,100],[136,100,136,66],[136,66,184,66],[184,66,184,116]];const li=Math.min(Math.floor(t2*seg.length),seg.length-1);const f=t2*seg.length-li;const sg=seg[li];mzD.setAttribute('cx',sg[0]+(sg[2]-sg[0])*f);mzD.setAttribute('cy',sg[1]+(sg[3]-sg[1])*f);}
    for(let gp=1;gp<=3;gp++){const pl2=$('ghP'+gp);if(pl2)pl2.style.height=(clamp(p*3-gp+1,0,1)*44)+'px';}
    for(let gf=1;gf<=2;gf++){const fl3=$('ghF'+gf);if(fl3)fl3.style.opacity=clamp(p*4-gf-1.5,0,1);}
    const cW=$('cnvWheel');if(cW)cW.style.transform='rotate('+(p*360)+'deg)';
    const cL=$('cnvLights');if(cL)cL.style.opacity=0.25+clamp(p*1.5,0,1)*0.75;
    const bS=$('bchSea'),bSn=$('bchSun');if(bS)bS.style.height=(14+clamp(p*1.1,0,1)*22)+'%';if(bSn)bSn.style.top=(16-p*8)+'px';
    for(let bs3=1;bs3<=3;bs3++){const sh=$('bchS'+bs3);if(sh)sh.style.opacity=clamp(p*3-bs3+1,0,1);}
    const bSt=$('bchSt');if(bSt)bSt.style.opacity=p>0.9?1:0;
    const wS=$('wfStream'),wM=$('wfMist');if(wS)wS.style.height=(clamp(p*1.2,0,1)*78)+'%';if(wM)wM.style.opacity=p>0.6?(p-0.6)*2:0;
    const dSu=$('dstSun'),dC=$('dstCamel'),dO=$('dstOasis');if(dSu)dSu.style.left=(10+p*70)+'%';if(dC)dC.style.left=(15+p*55)+'%';if(dO)dO.style.opacity=p>0.8?(p-0.8)*5:0;
    for(let rd=1;rd<=5;rd++){const dr=$('rnD'+rd);if(dr){const rdp=(tick/(1400+rd*300)+rd*0.21)%1;dr.style.top=(rdp*82)+'%';dr.style.opacity=p>0.1?Math.sin(rdp*Math.PI):0;}}
    const rP=$('rnPool');if(rP)rP.style.width=(10+clamp(p*1.1,0,1)*86)+'%';
    const cvT=$('cvTorch'),cLt=$('cvLight');if(cvT)cvT.style.opacity=0.4+clamp(p*2,0,1)*0.6;if(cLt)cLt.style.opacity=clamp(p*1.3,0,1)*0.55;
    for(let cs=1;cs<=3;cs++){const stl=$('cvS'+cs);if(stl)stl.style.opacity=clamp(p*3-cs+1,0,1);const gm=$('cvG'+cs);if(gm)gm.style.opacity=clamp(p*3-cs-0.5,0,1);}
    for(let gb=1;gb<=5;gb++){const bd2=$('grdB'+gb);if(bd2){const bp=clamp(p*5-gb+1,0,1);bd2.style.transform='scale('+(0.3+bp*0.7)+')';bd2.style.opacity=bp;}}
    const gBe=$('grdBee');if(gBe){const bt=tick/1100;gBe.style.left=(20+Math.sin(bt)*28)+'%';gBe.style.top=(30+Math.cos(bt*1.3)*16)+'%';gBe.style.opacity=p>0.5?1:0;}
    const lM=$('lkMoon'),lR=$('lkRefl');if(lM)lM.style.top=(30-p*18)+'px';if(lR)lR.style.opacity=clamp(p*1.4,0,1)*0.7;
    for(let lr=1;lr<=2;lr++){const rp2=$('lkR'+lr);if(rp2){const lrp=(tick/(1600+lr*500)+lr*0.4)%1;rp2.style.width=(10+lrp*60)+'%';rp2.style.opacity=p>0.2?(1-lrp)*0.5:0;}}
    const bSp=$('brSpan');if(bSp)bSp.style.width=(clamp(p*1.25,0,1)*72)+'%';
    for(let bp2=1;bp2<=4;bp2++){const ps=$('brP'+bp2);if(ps)ps.style.opacity=clamp(p*4-bp2+1,0,1);}
    for(let ml=1;ml<=5;ml++){const ln2=$('mkL'+ml);if(ln2)ln2.style.opacity=clamp(p*5-ml+1,0,1);}
    for(let ms2=1;ms2<=3;ms2++){const stl2=$('mkSt'+ms2);if(stl2)stl2.style.opacity=clamp(p*3-ms2-0.3,0,1);}
    const sBo=$('stmBolt'),sBo2=$('stmBolt2'),sRa=$('stmRain'),sGl=$('stmGlow');const sf=(tick/2400)%1;
    if(sBo)sBo.style.opacity=p>0.3&&(sf>0.45&&sf<0.52)?1:0;if(sBo2)sBo2.style.opacity=p>0.6&&(sf>0.72&&sf<0.78)?1:0;
    if(sRa)sRa.style.opacity=clamp(p*1.2,0,1)*0.6;if(sGl)sGl.style.opacity=p>0.3&&(sf>0.45&&sf<0.55)?0.6:0;
    const rvF=$('rvFlow');if(rvF){rvF.style.strokeDasharray='14 10';rvF.style.strokeDashoffset=-(tick/28);rvF.style.opacity=clamp(p*1.3,0,1);}
    const rLf=$('rvLeaf');if(rLf){const lv=clamp(p,0,1);const lx=lv*300+10;const ly=40+Math.sin(lv*6)*30+lv*40;rLf.setAttribute('cx',lx);rLf.setAttribute('cy',Math.min(ly,150));rLf.style.opacity=p>0.05?1:0;}
    const cL2=$('cynLight'),cR=$('cynRiver');if(cL2)cL2.style.opacity=clamp(p*1.4,0,1)*0.75;if(cR)cR.style.opacity=clamp(p*3-2,0,1);
    const dSk=$('dwSky'),dSu2=$('dwSun');if(dSk)dSk.style.opacity=clamp(p*1.3,0,1);if(dSu2)dSu2.style.bottom=(12+p*40)+'%';
    for(let db=1;db<=2;db++){const bd3=$('dwB'+db);if(bd3){const dbp=(tick/(2000+db*600)+db*0.3)%1;bd3.style.left=(100-dbp*120)+'%';bd3.style.opacity=p>0.5?Math.sin(dbp*Math.PI):0;}}
    const cW2=$('cbWin');if(cW2)cW2.style.opacity=0.15+clamp(p*1.5,0,1)*0.85;
    for(let cs2=1;cs2<=2;cs2++){const sm=$('cbSm'+cs2);if(sm){const csp=(tick/(1800+cs2*500)+cs2*0.4)%1;sm.style.opacity=p>0.3?Math.sin(csp*Math.PI)*0.5:0;sm.style.transform='translate('+csp*24+'px,'+(-csp*46)+'px) scale('+(0.6+csp)+')';}}
    const oC=$('ocCrane');if(oC){oC.style.left=(8+p*72)+'%';oC.style.top=(62-p*30)+'%';}
    for(let ow=1;ow<=2;ow++){const wg=$('ocW'+ow);if(wg)wg.style.transform='rotate('+(Math.sin(tick/300)*(ow==1?-1:1)*22)+'deg)';}
    for(let jj=1;jj<=3;jj++){const jl=$('jfJ'+jj);if(jl){const jp=(tick/(2600+jj*700)+jj*0.3)%1;jl.style.top=(64-jp*40)+'%';jl.style.opacity=clamp(p*3-jj+1,0,1)*Math.sin(jp*Math.PI+0.3);}}
    for(let ss2=1;ss2<=4;ss2++){const st11=$('shrS'+ss2);if(st11)st11.style.opacity=clamp(p*4-ss2+1,0,1);}
    const sLn=$('shrL'),sLn2=$('shrL2');if(sLn)sLn.style.opacity=p>0.7?1:0.15;if(sLn2)sLn2.style.opacity=p>0.9?1:0.15;
    for(let sf2=1;sf2<=4;sf2++){const fk=$('snwF'+sf2);if(fk){const sfp=(tick/(2200+sf2*400)+sf2*0.25)%1;fk.style.top=(sfp*88)+'%';fk.style.left=(10+sf2*22+Math.sin(tick/900+sf2)*6)+'%';fk.style.opacity=0.4+clamp(p,0,1)*0.6;}}
    const sMn=$('snwMan');if(sMn){const mp=clamp(p*1.2,0,1);sMn.style.transform='scale('+mp+')';sMn.style.opacity=mp;}
    const dSu3=$('dkSun'),dSt=$('dkStars');if(dSu3)dSu3.style.bottom=(60-p*38)+'%';if(dSt)dSt.style.opacity=clamp(p*1.5-0.5,0,1)*0.8;
    for(let db2=1;db2<=4;db2++){const bl4=$('dkB'+db2);if(bl4)bl4.style.opacity=0.4+clamp(p*2-db2*0.3,0,1)*0.6;}
    for(let hs=1;hs<=6;hs++){const sk4=$('hvS'+hs);if(sk4){const hsp=clamp(p*6-hs+1,0,1);sk4.style.height=(14+hsp*36)+'px';sk4.style.transform='rotate('+Math.sin(tick/800+hs)*4+'deg)';}}
    const hCr=$('hvCrow');if(hCr)hCr.style.opacity=p>0.85?1:0;
    const pBt=$('piBoat'),pRp=$('piRope');if(pBt)pBt.style.left=(70-p*22)+'%';if(pRp)pRp.style.opacity=p>0.92?1:0;
    const vM=$('vlMist'),vR=$('vlRiver');if(vM)vM.style.opacity=1-clamp(p*1.3,0,1);if(vR)vR.style.opacity=clamp(p*1.5-0.4,0,1);
    const vR3=$('vlR3');if(vR3)vR3.style.opacity=clamp(p*2-0.5,0,1);
    for(let mr2=1;mr2<=4;mr2++){const rd2=$('mrR'+mr2);if(rd2){rd2.style.opacity=clamp(p*4-mr2+1,0,1);rd2.style.transform='rotate('+Math.sin(tick/900+mr2)*5+'deg)';}}
    const mF=$('mrFly'),mFr=$('mrFrog');if(mF){const mfa=tick/800;mF.style.left=(30+Math.sin(mfa)*26)+'%';mF.style.top=(34+Math.cos(mfa*1.6)*14)+'%';mF.style.opacity=p>0.6?(0.4+Math.abs(Math.sin(tick/300))*0.6):0;}
    if(mFr)mFr.style.opacity=p>0.9?1:0;
    for(let gb2=1;gb2<=3;gb2++){const bg2=$('glB'+gb2);if(bg2){const gbp=clamp(p*3-gb2+1,0,1);bg2.style.opacity=gbp;bg2.style.transform='translateY('+Math.sin(tick/1400+gb2)*3+'px)';}}
    const gSh=$('glShine');if(gSh)gSh.style.opacity=p>0.5?(0.3+Math.abs(Math.sin(tick/1000))*0.4):0;
    const fSh=$('fjShip'),fWk=$('fjWake');if(fSh)fSh.style.left=(14+p*66)+'%';if(fWk)fWk.style.opacity=clamp(p*1.5,0,1)*0.6;
    const fSn=$('fjSnow');if(fSn)fSn.style.opacity=clamp(p*1.2,0,1)*0.8;
    const tCL=$('thCL'),tCR=$('thCR'),tSp=$('thSpot'),tFg=$('thFig');if(tCL)tCL.style.left=(-clamp(p*1.4,0,1)*26)+'%';if(tCR)tCR.style.right=(-clamp(p*1.4,0,1)*26)+'%';
    if(tSp)tSp.style.opacity=clamp(p*2-0.8,0,1);if(tFg)tFg.style.opacity=clamp(p*3-1.6,0,1);
    const cFg=$('ciFlag'),cRg=$('ciRing');if(cFg)cFg.style.opacity=clamp(p*2-0.5,0,1);if(cRg)cRg.style.opacity=clamp(p*2-1,0,1);
    for(let cb2=1;cb2<=3;cb2++){const b2=$('ciBall'+(cb2==1?'':cb2));if(b2){const cbp=(tick/(900+cb2*200)+cb2*0.33)%1;b2.style.top=(64-Math.sin(cbp*Math.PI)*46)+'%';b2.style.left=(34+cb2*10+Math.cos(cbp*Math.PI)*10)+'%';b2.style.opacity=p>0.6?1:0;}}
    for(let sk5=1;sk5<=5;sk5++){const sk6=$('stK'+sk5);if(sk6)sk6.style.opacity=clamp(p*5-sk5+1,0,1);}
    const sBr=$('stBrush');if(sBr){const sbr=(tick/1600)%1;sBr.style.left=(20+sbr*50)+'%';sBr.style.opacity=p>0.1&&p<0.95?1:0;}
    const kSp=$('ktSoup');if(kSp)kSp.style.height=(clamp(p*1.3,0,1)*56)+'%';
    for(let kb=1;kb<=3;kb++){const bb3=$('ktB'+kb);if(bb3){const kbp=(tick/(700+kb*200)+kb*0.3)%1;bb3.style.opacity=p>0.5?Math.sin(kbp*Math.PI)*0.8:0;bb3.style.transform='translateY('+(-kbp*26)+'px)';}}
    for(let ks=1;ks<=2;ks++){const sm2=$('ktS'+ks);if(sm2){const kst=(tick/(1400+ks*400)+ks*0.5)%1;sm2.style.opacity=p>0.6?Math.sin(kst*Math.PI)*0.5:0;sm2.style.transform='translateY('+(-kst*34)+'px)';}}
    const kLp=$('ktLamp');if(kLp)kLp.style.opacity=p>0.8?1:0.2;
    for(let wg2=1;wg2<=3;wg2++){const gr2=$('wsG'+wg2);if(gr2){gr2.style.transform='rotate('+((tick/(3-wg2+1))*30*(wg2%2?1:-1))%360+'deg)';gr2.style.opacity=clamp(p*3-wg2+1,0,1);}}
    const wLp=$('wsLamp');if(wLp)wLp.style.opacity=p>0.85?1:0;
    const bY=$('byYacht');if(bY)bY.style.left=(8+p*70)+'%';
    const bBd=$('byBirds');if(bBd){bBd.style.opacity=p>0.5?1:0;bBd.style.transform='translate('+Math.sin(tick/1100)*14+'px,'+Math.cos(tick/900)*6+'px)';}
    const gDr=$('gtDoor'),gFl=$('gtFlag');if(gDr)gDr.style.width=(14+clamp(p*1.6,0,1)*34)+'px';if(gFl)gFl.style.opacity=clamp(p*2-0.8,0,1);
    for(let gw=1;gw<=2;gw++){const wn=$('gtW'+gw);if(wn)wn.style.opacity=clamp(p*3-gw,0,1);}
    const dF=$('djFig'),dSc=$('djScroll'),dBd=$('djBoard');if(dF)dF.style.opacity=clamp(p*2,0,1);if(dSc)dSc.style.height=(clamp(p*3-1,0,1)*70)+'px';if(dBd)dBd.style.opacity=p>0.7?1:0.15;
    const dAr=$('djArm');if(dAr)dAr.style.transform='rotate('+(-40+clamp(p*2-1,0,1)*40)+'deg)';
    for(let ab=1;ab<=3;ab++){const bd4=$('avB'+ab);if(bd4)bd4.style.opacity=clamp(p*3-ab+1,0,1);}
    const aF=$('avFly');if(aF){const af=tick/1000;aF.style.left=(30+Math.cos(af)*30)+'%';aF.style.top=(24+Math.sin(af*1.4)*12)+'%';aF.style.opacity=p>0.6?1:0;}
    for(let at=1;at<=3;at++){const tr=$('apT'+at);if(tr)tr.style.opacity=clamp(p*3-at+1,0,1);}
    for(let abe=1;abe<=3;abe++){const be2=$('apBe'+abe);if(be2){const abp=tick/(700+abe*250);be2.style.left=(20+Math.cos(abp+abe*2)*30)+'%';be2.style.top=(40+Math.sin(abp*1.5+abe)*18)+'%';be2.style.opacity=p>0.4?1:0;}}
    const lFs=$('lgFish'),lRy=$('lgRay');if(lFs)lFs.style.left=(10+((tick/2400)%1)*70)+'%';if(lRy){lRy.style.left=(80-p*60)+'%';lRy.style.opacity=p>0.4?1:0;}
    const lPm=$('lgPalm');if(lPm)lPm.style.opacity=clamp(p*2-0.4,0,1);
    for(let gs=1;gs<=2;gs++){const sh2=$('gdShaft'+(gs==1?'':gs));if(sh2)sh2.style.opacity=clamp(p*2-gs+0.5,0,1)*0.6;}
    for(let gm2=1;gm2<=2;gm2++){const mu=$('gdM'+gm2);if(mu)mu.style.opacity=clamp(p*3-gm2,0,1);}
    const gDr2=$('gdDeer');if(gDr2)gDr2.style.opacity=clamp(p*2-1,0,1);
    const cT2=$('cv2Tide'),cB2=$('cv2Boat');if(cT2)cT2.style.height=(20+p*30)+'%';if(cB2)cB2.style.left=(76-p*30)+'%';
    const cSt2=$('cv2Star');if(cSt2)cSt2.style.opacity=p>0.85?1:0;
    const pJ=$('pzJet');if(pJ)pJ.style.height=(clamp(p*1.3,0,1)*52)+'px';
    for(let pg=1;pg<=3;pg++){const pg2=$('pzP'+pg);if(pg2){pg2.style.opacity=clamp(p*3-pg,0,1);pg2.style.transform='translateX('+Math.sin(tick/1400+pg)*4+'px)';}}
    const rCw=$('rnCow'),rCw2=$('rnCow2'),rSn=$('rnSun');
    if(rCw){rCw.style.opacity=clamp(p*2,0,1);rCw.style.left=(12+p*8)+'%';}
    if(rCw2){rCw2.style.opacity=clamp(p*2-0.8,0,1);rCw2.style.left=(48+p*10)+'%';}
    if(rSn)rSn.style.top=(46-p*30)+'%';
    const bDr=$('bnDoor'),bHn=$('bnHen'),bHy=$('bnHay');
    if(bDr)bDr.style.transform='perspective(80px) rotateY('+(-p*70)+'deg)';
    if(bHn){bHn.style.opacity=clamp(p*3-1.4,0,1);bHn.style.left=(44+p*22)+'%';}
    if(bHy)bHy.style.opacity=clamp(p*2-0.6,0,1);
    const pBs=$('prBison');if(pBs){pBs.style.opacity=clamp(p*2-0.5,0,1);pBs.style.left=(70-p*26)+'%';}
    for(let pw=1;pw<=3;pw++){const wv=$('prW'+pw);if(wv){wv.style.opacity=clamp(p*2-pw*0.4,0,1);wv.style.transform='skewX('+(Math.sin(tick/1600+pw)*6)+'deg)';}}
    const tvW=$('tvWin');if(tvW)tvW.style.opacity=clamp(p*2-0.3,0,1);
    for(let tm=1;tm<=2;tm++){const mf=$('tvF'+tm);if(mf)mf.style.height=(clamp(p*2-tm+0.6,0,1)*22)+'px';}
    const tLp=$('tvLamp');if(tLp)tLp.style.opacity=clamp(p*2-1,0,1);
    for(let aa=1;aa<=4;aa++){const ar=$('acA'+aa);if(ar)ar.style.opacity=clamp(p*4-aa+1,0,1);}
    const aLp=$('acLamp');if(aLp){aLp.style.left=(8+clamp(p*1.1,0,1)*82)+'%';aLp.style.opacity=p>0.15?1:0;}
    for(let cc=1;cc<=3;cc++){const cd=$('cpC'+cc);if(cd)cd.style.opacity=clamp(p*3-cc+0.5,0,1);}
    const cRs=$('cpRose');if(cRs)cRs.style.opacity=clamp(p*2-0.8,0,1);
    const cBl=$('cpBell');if(cBl)cBl.style.transform='rotate('+(Math.sin(tick/900)*8*clamp(p*2,0,1))+'deg)';
    const tTm=$('trTram');if(tTm)tTm.style.left=(8+p*36)+'%';
    const tpS1=$('tpSmoke'),tpS2=$('tpSmoke2');
    if(tpS1)tpS1.style.opacity=clamp(p*2,0,1)*0.7;
    if(tpS2)tpS2.style.opacity=clamp(p*2-0.8,0,1)*0.7;
    const tpLt=$('tpLant');if(tpLt){tpLt.style.opacity=clamp(p*2-0.5,0,1);tpLt.style.transform='translateX(-50%) rotate('+Math.sin(tick/1100)*5+'deg)';}
    for(let cb=1;cb<=3;cb++){const br=$('clB'+cb);if(br)br.style.opacity=clamp(p*3-cb+0.5,0,1);}
    const cTc=$('clTorch');if(cTc)cTc.style.opacity=clamp(p*1.5,0,1);
    const gBt=$('gnBoat');if(gBt)gBt.style.left=(78-p*52)+'%';
    const gLp=$('gnLamp');if(gLp)gLp.style.opacity=clamp(p*2-0.6,0,1);
    for(let rc=1;rc<=3;rc++){const cl3=$('rtC'+rc);if(cl3){cl3.style.opacity=clamp(p*3-rc+0.5,0,1);cl3.style.transform='rotate('+Math.sin(tick/1300+rc)*6+'deg)';}}
    const rBd=$('rtBird');if(rBd)rBd.style.opacity=clamp(p*2-1.2,0,1);
    const bWv=$('bwWave');if(bWv)bWv.style.height=(10+p*14)+'px';
    const bGl=$('bwGull');if(bGl){const bgt=tick/1800;bGl.style.left=(20+((bgt)%1)*60)+'%';bGl.style.top=(16+Math.sin(bgt*6.28)*8)+'%';bGl.style.opacity=p>0.5?1:0;}
    const bPs=$('bwPost');if(bPs)bPs.style.opacity=clamp(p*2-0.4,0,1);
    const dSg=$('dnSign');if(dSg)dSg.style.opacity=0.4+clamp(p*1.5,0,1)*0.6*(Math.sin(tick/300)>-0.7?1:0.4);
    const dSt=$('dnSteam');if(dSt)dSt.style.opacity=clamp(p*2-0.5,0,1)*0.8;
    const dStl=$('dnStool');if(dStl)dStl.style.opacity=clamp(p*2-1,0,1);
    const bPl=$('bbPole');if(bPl)bPl.style.backgroundPosition='0 '+(-tick/8*clamp(p,0,1))+'px';
    const bSc=$('bbSci');if(bSc){bSc.style.opacity=clamp(p*2-0.8,0,1);bSc.style.transform='rotate('+(Math.sin(tick/500)*20)+'deg)';}
    for(let gf=1;gf<=3;gf++){const fr=$('gaF'+gf);if(fr){fr.style.opacity=clamp(p*3-gf+0.5,0,1);const ik=fr.querySelector('i');if(ik)ik.style.opacity=clamp(p*3-gf,0,1);}}
    const gSp=$('gaSpot');if(gSp)gSp.style.opacity=clamp(p*1.5-0.3,0,1)*0.5;
    for(let mr2=1;mr2<=3;mr2++){const rb2=$('muR'+mr2);if(rb2)rb2.style.opacity=clamp(p*3-mr2+0.5,0,1);}
    const mSk=$('muSkull');if(mSk)mSk.style.opacity=clamp(p*3-2,0,1);
    const mSp=$('muSpot');if(mSp)mSp.style.opacity=clamp(p*1.5-0.2,0,1)*0.5;
    const sHd=$('stHand');if(sHd)sHd.style.transform='rotate('+(-90+p*180)+'deg)';
    const sTn=$('stTrain');if(sTn)sTn.style.left=(-30+p*45)+'%';
    for(let kb=1;kb<=4;kb++){const bl4=$('kpB'+kb);if(bl4){bl4.style.opacity=clamp(p*2-kb*0.3,0,1);bl4.style.transform='skewX('+(Math.sin(tick/1700+kb)*8)+'deg)';}}
    const kFs=$('kpFish');if(kFs){const kf2=tick/2600;kFs.style.left=(75-((kf2)%1)*55)+'%';kFs.style.opacity=p>0.4?1:0;}
    const fCr=$('fnCar');if(fCr){fCr.style.left=(14+p*56)+'%';fCr.style.top=(74-p*40)+'%';}
    for(let mm=1;mm<=3;mm++){const mt=$('mrM'+mm);if(mt)mt.style.opacity=clamp(p*3-mm+0.5,0,1);}
    const mGl=$('mrGlint');if(mGl)mGl.style.opacity=clamp(p*2-0.4,0,1)*0.7;
    const mBy=$('mrBuoy');if(mBy){mBy.style.opacity=clamp(p*2-1,0,1);mBy.style.top=(60+Math.sin(tick/1400)*3)+'%';}
    for(let ps=1;ps<=4;ps++){const st8=$('plS'+ps);if(st8)st8.style.opacity=clamp(p*4-ps+0.5,0,1);}
    const pOb=$('plOrb');if(pOb){pOb.style.opacity=clamp(p*2-1,0,1);pOb.style.left=(30+p*40)+'%';}
    const dDr2=$('dpDoor');if(dDr2)dDr2.style.height=(64-p*50)+'px';
    const dCr=$('dpCar');if(dCr){dCr.style.opacity=clamp(p*2-0.6,0,1);const ll=dCr.querySelectorAll('.dp-light');ll.forEach(e=>e.style.opacity=clamp(p*2-1.2,0,1));}
    const aBm=$('atBeam');if(aBm)aBm.style.opacity=clamp(p*1.6,0,1)*0.4;
    for(let ap=1;ap<=3;ap++){const pl2=$('atP'+ap);if(pl2){pl2.style.opacity=clamp(p*3-ap+0.3,0,1);pl2.style.height=(8+clamp(p*2-ap*0.3,0,1)*16)+'px';}}
    const aPn=$('atPond');if(aPn)aPn.style.opacity=clamp(p*2-0.8,0,1);
    const sH2=$('sbHead');if(sH2){sH2.style.opacity=clamp(p*2-0.3,0,1);sH2.style.top=(30-p*10)+'px';}
    const sH3=$('sbHead2');if(sH3){sH3.style.opacity=clamp(p*2-1.2,0,1);sH3.style.top=(30-p*8)+'px';}
    const sLt=$('sbLant');if(sLt)sLt.style.opacity=clamp(p*2-0.5,0,1);
    const eCb=$('evCab'),eNm=$('evNum'),eDr=$('evDoorR');
    if(eCb){eCb.style.bottom=(16+p*64)+'px';}
    if(eNm)eNm.textContent=String(1+Math.floor(p*3));
    if(eDr)eDr.style.transform='translateX('+(p>0.95?14:0)+'px)';
    const bFr=$('bcFire');if(bFr){bFr.style.opacity=clamp(p*1.6,0,1);bFr.style.height=(8+p*18)+'px';}
    for(let bs=1;bs<=2;bs++){const sk2=$('bcSp'+bs);if(sk2){sk2.style.opacity=p>0.4?1:0;sk2.style.top=(34-((tick/(900+bs*300))%1)*30)+'%';}}
    const dSn2=$('duSun');if(dSn2){dSn2.style.top=(20+p*30)+'%';dSn2.style.opacity=0.5+p*0.5;}
    const dCm=$('duCamel');if(dCm)dCm.style.left=(12+p*62)+'%';
    const dDs=$('duDust');if(dDs)dDs.style.opacity=clamp(p*2-0.5,0,1)*0.5;
    const cHn2=$('coHen');if(cHn2){cHn2.style.left=(16+p*30)+'%';cHn2.style.top=(62-p*8)+'%';}
    for(let ce=1;ce<=2;ce++){const eg=$('coE'+ce);if(eg)eg.style.opacity=clamp(p*3-ce-0.5,0,1);}
    const sCl=$('smClimber');if(sCl){sCl.style.left=(30+p*40)+'%';sCl.style.top=(78-p*40)+'%';}
    const sFl=$('smFlag');if(sFl){sFl.style.opacity=clamp(p*2-1.2,0,1);sFl.style.transform='skewX('+Math.sin(tick/700)*10+'deg)';}
    const sSn2=$('smSun');if(sSn2)sSn2.style.opacity=clamp(p*2-0.6,0,1);
    const bLf=$('bkLeaf');if(bLf){const blf2=tick/3200;bLf.style.left=(8+((blf2)%1)*80)+'%';bLf.style.top=(56+Math.sin(blf2*9)*3)+'%';}
    for(let bst=1;bst<=3;bst++){const st9=$('bkS'+bst);if(st9)st9.style.opacity=clamp(p*3-bst+0.5,0,1);}
    const tSj=$('thShoji');if(tSj)tSj.style.transform='translateX('+(p*34)+'px)';
    const tSm=$('thSteam');if(tSm)tSm.style.opacity=clamp(p*2-0.4,0,1)*0.8;
    const sFl2=$('syFlame');if(sFl2)sFl2.style.height=(8+p*16)+'px';
    const sHm=$('syHammer');if(sHm)sHm.style.transform='rotate('+(-30+Math.abs(Math.sin(tick/600))*30*clamp(p,0,1))+'deg)';
    for(let ssp=1;ssp<=2;ssp++){const sk3=$('sySp'+ssp);if(sk3){sk3.style.opacity=p>0.5?1:0;sk3.style.left=(44+ssp*8+Math.sin(tick/400+ssp)*6)+'%';sk3.style.top=(52-((tick/(800+ssp*400))%1)*24)+'%';}}
    const kDg=$('knDog');if(kDg){kDg.style.opacity=clamp(p*2-0.3,0,1);kDg.style.left=(58-p*18)+'%';}
    const kBw=$('knBowl');if(kBw){kBw.style.opacity=clamp(p*2-0.8,0,1);const kk=kBw.querySelector('i');if(kk)kk.style.height=(p*8)+'px';}
    const kBn=$('knBone');if(kBn)kBn.style.opacity=clamp(p*3-1.8,0,1);
    for(let lp2=1;lp2<=3;lp2++){const pd=$('lpP'+lp2);if(pd)pd.style.opacity=clamp(p*3-lp2+0.5,0,1);}
    const lBl=$('lpBloom');if(lBl)lBl.style.opacity=clamp(p*3-2,0,1);
    const lFr=$('lpFrog');if(lFr){lFr.style.opacity=clamp(p*2-1,0,1);lFr.style.top=(48-Math.abs(Math.sin(tick/800))*10*p)+'%';}
    for(let gr2=1;gr2<=3;gr2++){const rg=$('gvR'+gr2);if(rg)rg.style.opacity=clamp(p*3-gr2+0.3,0,1);}
    const gGw=$('gvGlow');if(gGw){gGw.style.opacity=clamp(p*1.6-0.4,0,1)*0.6;gGw.style.left=(30+Math.cos(tick/2000)*16)+'%';}
    const jBc=$('jyBeacon');if(jBc)jBc.style.opacity=p>0.5?(Math.sin(tick/500)>0?1:0.2):0;
    const jFm=$('jyFoam');if(jFm)jFm.style.width=(20+p*40)+'%';
    const jBd=$('jyBird');if(jBd){const jbt=tick/2000;jBd.style.left=(15+((jbt)%1)*65)+'%';jBd.style.top=(20+Math.sin(jbt*6.28)*6)+'%';jBd.style.opacity=p>0.6?1:0;}
    const cTn=$('cmTent');if(cTn)cTn.style.opacity=clamp(p*2,0,1);
    const cFm=$('cmFlame');if(cFm)cFm.style.height=(6+p*14)+'px';
    const cSk=$('cmSmoke');if(cSk)cSk.style.opacity=clamp(p*2-0.8,0,1)*0.6;
    for(let cs=1;cs<=3;cs++){const s10=$('cmS'+cs);if(s10)s10.style.opacity=clamp(p*3-cs+0.3,0,1);}
    const bDr3=$('bhDoor');if(bDr3)bDr3.style.transform='translateX('+(p*36)+'px)';
    const bRw=$('bhRow');if(bRw){bRw.style.opacity=clamp(p*2-0.8,0,1);bRw.style.left=(50+p*26)+'%';}
    for(let ib=1;ib<=3;ib++){const bl5=$('igB'+ib);if(bl5)bl5.style.opacity=clamp(p*3-ib+0.5,0,1);}
    const iAu=$('igAur');if(iAu){iAu.style.opacity=clamp(p*2-0.6,0,1)*0.5;iAu.style.transform='skewX('+(Math.sin(tick/2400)*8)+'deg)';}
    for(let mA=1;mA<=3;mA++){const ar2=$('moA'+mA);if(ar2)ar2.style.opacity=clamp(p*3-mA+0.5,0,1);}
    const mBl=$('moBell');if(mBl)mBl.style.transform='rotate('+(Math.sin(tick/1000)*7*clamp(p*2,0,1))+'deg)';
    const ySm=$('yuSmoke');if(ySm)ySm.style.opacity=clamp(p*2,0,1)*0.7;
    const yDr=$('yuDoor');if(yDr)yDr.style.transform='rotate('+(p*40)+'deg)';
    for(let pt3=1;pt3<=3;pt3++){const tr2=$('pdT'+pt3);if(tr2)tr2.style.opacity=clamp(p*3-pt3+0.4,0,1);}
    const pSn3=$('pdSun');if(pSn3)pSn3.style.opacity=clamp(p*2-0.5,0,1);
    const pEg=$('pdEgret');if(pEg){const pet=tick/2800;pEg.style.left=(70-((pet)%1)*50)+'%';pEg.style.top=(24+Math.sin(pet*6.28)*6)+'%';pEg.style.opacity=p>0.5?1:0;}
    const sFl3=$('siFill');if(sFl3)sFl3.style.height=(p*70)+'%';
    const sGr=$('siGrain');if(sGr)sGr.style.opacity=p<0.98?1:0;
    for(let dh=1;dh<=3;dh++){const hl=$('dcH'+dh);if(hl)hl.style.opacity=clamp(p*3-dh+0.5,0,1);}
    const dDv=$('dcDove');if(dDv){dDv.style.opacity=clamp(p*2-0.8,0,1);dDv.style.left=(76-p*32)+'%';}
    const cGt=$('cyGate');if(cGt)cGt.style.transform='translateX('+(-p*10)+'px)';
    for(let cb2=1;cb2<=2;cb2++){const bm=$('cyBl'+cb2);if(bm)bm.style.opacity=clamp(p*3-cb2-0.5,0,1);}
    for(let op=1;op<=2;op++){const pm2=$('oaP'+op);if(pm2)pm2.style.opacity=clamp(p*2-op*0.4,0,1);}
    const oMr=$('oaMirage');if(oMr)oMr.style.opacity=clamp(p*2-0.8,0,1)*0.4;
    const mSn4=$('msSun');if(mSn4){mSn4.style.top=(50-p*24)+'%';mSn4.style.opacity=0.4+p*0.6;}
    const mHw=$('msHawk');if(mHw){const mh=tick/2200;mHw.style.left=(40+Math.cos(mh)*24)+'%';mHw.style.top=(26+Math.sin(mh)*10)+'%';mHw.style.opacity=p>0.4?1:0;}
    const cMt=$('crMeteor');if(cMt){const cmt=(tick/3400)%1.6;cMt.style.left=(cmt<1?10+cmt*50:-20)+'%';cMt.style.top=(cmt<1?8+cmt*26:0)+'%';cMt.style.opacity=cmt<1&&p>0.6?1:0;}
    for(let cs2=1;cs2<=2;cs2++){const s11=$('crS'+cs2);if(s11)s11.style.opacity=clamp(p*2-cs2*0.5,0,1);}
    const qBl=$('qrBlock');if(qBl){qBl.style.left=(24+p*40)+'%';qBl.style.top=(44+p*10)+'%';}
    const qPl=$('qrPile');if(qPl)qPl.style.width=(20+p*40)+'px';
    const fLd=$('fdLadle');if(fLd)fLd.style.transform='rotate('+(-p*30)+'deg)';
    const fPr=$('fdPour');if(fPr)fPr.style.opacity=clamp(p*2-0.6,0,1);
    const fMd=$('fdMold');if(fMd)fMd.style.opacity=clamp(p*2-0.9,0,1);
    for(let fe=1;fe<=2;fe++){const em=$('fdEm'+fe);if(em){em.style.opacity=p>0.3?1:0;em.style.top=(58-((tick/(900+fe*350))%1)*26)+'%';}}
    const mPr2=$('mtPress');if(mPr2)mPr2.style.top=(14+p*26)+'px';
    for(let mc2=1;mc2<=3;mc2++){const cn=$('mtC'+mc2);if(cn)cn.style.opacity=clamp(p*3-mc2+0.3,0,1);}
      const wlBk=$('wlBucket');if(wlBk)wlBk.style.top=(58-p*34)+'%';
      const wlRp=$('wlRope');if(wlRp)wlRp.style.height=(34-p*20)+'%';
      const wlWt=$('wlWater');if(wlWt)wlWt.style.opacity=clamp(p*1.5-0.4,0,1);
      for(let bn=1;bn<=3;bn++){const fl3=$('bfF'+bn);if(fl3){fl3.style.transform='scaleY('+(0.25+p*0.95)+')';fl3.style.opacity=clamp(p*2-bn*0.2+0.2,0,1);}}
      for(let bn2=1;bn2<=2;bn2++){const spk=$('bfS'+bn2);if(spk){spk.style.opacity=p>0.15?1:0;spk.style.bottom=(30+((tick/(800+bn2*300))%1)*40)+'%';}}
      const sgFl=$('sgFlow');if(sgFl){sgFl.style.height=(10+p*55)+'%';sgFl.style.opacity=clamp(p*2,0,1);}
      const sgPl=$('sgPool');if(sgPl){sgPl.style.width=(24+p*56)+'%';sgPl.style.opacity=clamp(p*1.6-0.3,0,1);}
      const sgMs=$('sgMist');if(sgMs)sgMs.style.opacity=clamp(p*1.2-0.6,0,0.5);
      const gnF=$('gnFill');if(gnF)gnF.style.height=(p*100)+'%';
      for(let gs=1;gs<=3;gs++){const sk4=$('gnSack'+gs);if(sk4)sk4.style.opacity=clamp(p*3-gs+0.4,0,1);}
      const hrN=$('hrNeck');if(hrN)hrN.style.transform='rotate('+(-14+p*40)+'deg)';
      const hrR=$('hrRipple');if(hrR)hrR.style.width=(16+p*70)+'px';
      const hrF=$('hrFish');if(hrF){hrF.style.opacity=clamp(p*4-3,0,1);hrF.style.bottom=(24+clamp(p*4-3,0,1)*18)+'px';}
      for(let pk=1;pk<=3;pk++){const puf=$('smkP'+pk);if(puf){puf.style.opacity=p>pk*0.2?clamp(1-((tick/(1400+pk*400))%1),0,1):0;puf.style.bottom=(44+((tick/(1400+pk*400))%1)*46)+'px';}}
      for(let hm=1;hm<=2;hm++){const ham=$('smkHam'+hm);if(ham)ham.style.transform='rotate('+(Math.sin(tick/900+hm)*3)+'deg)';}
      const smB=$('smBlade');if(smB)smB.style.transform='rotate('+(tick/18)+'deg)';
      const smL=$('smLog');if(smL)smL.style.left=(14+p*30)+'%';
      for(let plk=1;plk<=3;plk++){const pl5=$('smPlank'+plk);if(pl5)pl5.style.opacity=clamp(p*3-plk+0.5,0,1);}
      const clW=$('clWater');if(clW)clW.style.height=(18+p*44)+'%';
      const clB=$('clBoat');if(clB)clB.style.bottom=(20+p*44)+'%';
      for(let cG=1;cG<=2;cG++){const gt=$('clG'+cG);if(gt)gt.style.transform='rotateY('+(clamp(p-0.75,0,0.25)*4*(cG===1?-60:60))+'deg)';}
      for(let shp=1;shp<=3;shp++){const sh2=$('sfS'+shp);if(sh2)sh2.style.opacity=clamp(p*3-shp+0.6,0,1);}
      const sGt=$('sfW');if(sGt)sGt.style.opacity=clamp(p*2-1.6,0,1);
    for(let ki2=1;ki2<=4;ki2++){const kf=$('koiF'+ki2);if(kf){const near=clamp(p*1.2-(ki2-1)*0.2,0,1);const cx=50+(1-near)*(ki2%2?30:-30)+Math.sin(tick/(500+ki2*90))*6*(1-near);const cy=50+(1-near)*(ki2<3?22:-22)+Math.cos(tick/(600+ki2*70))*5*(1-near);kf.style.left=cx+'%';kf.style.top=cy+'%';kf.style.opacity=p>(ki2-1)*0.18?1:0;}}
    for(let zi=1;zi<=4;zi++){const zl=$('zenL'+zi);if(zl)zl.style.opacity=p*4>=zi?1:0.12;}
    for(let zs=1;zs<=3;zs++){const st=$('zenS'+zs);if(st)st.style.opacity=p*3>=zs?1:0;}
    for(let oi=1;oi<=6;oi++){const fr2=$('orcF'+oi);if(fr2){const stage=clamp(p*6-oi+1,0,1);fr2.style.background=stage>=1?'radial-gradient(circle at 35% 30%,#f87058,#c03018)':stage>0?'radial-gradient(circle at 35% 30%,#c8d860,#88a828)':'radial-gradient(circle at 35% 30%,#7a9a48,#5a7830)';fr2.style.transform='scale('+(0.5+stage*0.5)+')';}}
    const csh=$('ccdShell');if(csh)csh.style.opacity=p<0.7?1:0;
    const cbu=$('ccdBug');if(cbu){const out=clamp((p-0.4)/0.6,0,1);cbu.style.opacity=out>0?1:0;cbu.style.top=(46-out*26)+'%';}
    const cwl=$('ccdWingL');if(cwl)cwl.style.transform='rotate('+(-20-p*50)+'deg) scaleY('+(0.4+p*0.6)+')';
    const cwr=$('ccdWingR');if(cwr)cwr.style.transform='rotate('+(20+p*50)+'deg) scaleY('+(0.4+p*0.6)+')';
    const dwa=$('damWater');if(dwa)dwa.style.height=(p*100)+'%';
    const dsp=$('damSpill');if(dsp)dsp.style.opacity=p>=0.98?1:0;
    for(let di=1;di<=2;di++){const dg=$('damG'+di);if(dg)dg.style.height=p>=0.98?(di==1?'40%':'55%'):'0';}
    const dmk=$('damMark');if(dmk)dmk.textContent=Math.round(p*100)+'%';
    const pcn=$('pogCoins');if(pcn)pcn.style.height=(p*100)+'%';
    const psp2=$('pogSpark');if(psp2)psp2.style.opacity=p>0.85?1:0;}
    setText('termNote',data.working?'streaming salary · '+(data.symbol||'¥')+data.secondRate.toLocaleString('en-US',{maximumFractionDigits:4})+'/s':(data.snapshot&&data.snapshot.isWorkday?'paused · off the clock':'weekend · no charge'));
    const coinRate=data.fun?data.secondRate/1e8:data.secondRate;
    setText('pigDeposit','+ '+data.symbol+coinRate.toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2})+(data.fun?' 亿':''));
    const vs=window.__vsItem;
    if(vs){const vb=$('vsBadge');if(vb){vb.hidden=false;setText('vsCount',((data.snapshot&&data.snapshot.todayEarned||0)/vs.price).toFixed(1));setText('vsName',' '+vs.name);}}
    const avg=window.__avgSalary;
    if(avg){const ab=$('avgBadge');if(ab){ab.hidden=false;const avgHour=avg/(21.75*8),myHour=(data.snapshot&&data.snapshot.hourSalary)||0;
    const diff=avgHour>0?((myHour/avgHour)-1)*100:0;setText('avgDiff',(diff>=0?'+':'')+diff.toFixed(0)+'%');
    const rate=(data.currency&&data.currency.rate)||1;
    setText('avgRef','vs 均值 '+(data.symbol||'¥')+(avgHour*rate).toFixed(1)+'/h');}}
    const overtimeHours=Number(state?.config.estimatedOvertime)||0;
    const scenario=window.SalaryEngine.overtimeScenario(state.config,data.now,overtimeHours,state.config.extraPay||0);
    setText('overtimeSummaryValue',overtimeHours?window.SalaryApp.formatMoney(scenario.actualHourly)+' / h':'展开');
    $('chargeHead').style.left=(p*100)+'%';
    for(let i=0;i<segmentCount;i++){
      const f=clamp(p*segmentCount-i);segments[i].fill.style.height=(f*100)+'%';
      segments[i].slot.classList.toggle('is-active',f>0&&f<1 || (i===segmentCount-1&&p===1));
    }
    setText('meterChargeLabel',data.period==='month'?'本月工作进度':'工作时段内累计');
    if(data.fun){
      $('funConversion').hidden=false;
      setText('funConversion','1 元 = '+(data.currency.rate/1e8).toLocaleString('en-US',{maximumFractionDigits:4})+' 亿 Z$ · 趣味倍率');
    }else $('funConversion').hidden=true;
    const cnEl=$('cnAmount');
    if(cnEl){
      if(window.__cnAmount&&isFinite(data.displayAmount)){
        cnEl.hidden=false;
        const CN='零一二三四五六七八九';
        cnEl.textContent=(data.symbol||'')+String(Math.abs(data.displayAmount).toFixed(data.decimals??2)).split('').map(ch=>ch>='0'&&ch<='9'?CN[+ch]:(ch==='.'?'点':ch)).join('');
      }else cnEl.hidden=true;
    }
    if(window.__allTime&&data.snapshot&&(tick-(window.__allLast||0)>5000)){
      window.__allLast=tick;
      try{
        const allMap=JSON.parse(localStorage.getItem('salaryFlow.all')||'{}');
        allMap[data.snapshot.dayKey]=Math.round((data.snapshot.todayEarned||0)*100)/100;
        const aks=Object.keys(allMap).sort();
        while(aks.length>400)delete allMap[aks.shift()];
        localStorage.setItem('salaryFlow.all',JSON.stringify(allMap));
        const tot=Object.values(allMap).reduce((a,b)=>a+b,0);
        const ab=$('allBadge');if(ab){ab.hidden=false;setText('allTotal',(data.symbol||'¥')+tot.toLocaleString('en-US',{maximumFractionDigits:0}));}
      }catch(_){}
    }
    if(window.__chime&&data.working&&audioReady){
      const hr=data.now.getHours();
      if(window.__lastChimeHr!==hr){window.__lastChimeHr=hr;if(data.now.getMinutes()===0)playTick(true);}
    }
    if(window.__spark&&data.working&&data.snapshot){
      const sc=$('sparkCanvas');
      if(sc){
        const buf=window.__spBuf=window.__spBuf||[];
        if(!buf.length||buf[buf.length-1].d!==data.snapshot.dayKey){buf.length=0;buf.push({d:data.snapshot.dayKey,v:data.displayAmount,t:tick});}
        if(tick-buf[buf.length-1].t>=2000)buf.push({d:data.snapshot.dayKey,v:data.displayAmount,t:tick});
        if(buf.length>240)buf.shift();
        const ctx2=sc.getContext('2d'),W=sc.width=Math.max(1,sc.clientWidth*2),H=sc.height=36;
        ctx2.clearRect(0,0,W,H);
        if(buf.length>1){
          const v0=buf[0].v,mx=Math.max.apply(null,buf.map(p=>p.v-v0).concat([1e-9]));
          ctx2.strokeStyle='rgba(125,211,252,.9)';ctx2.lineWidth=2;ctx2.lineJoin='round';ctx2.beginPath();
          buf.forEach((p,i)=>{const x=i/(buf.length-1)*W,y=H-3-(p.v-v0)/mx*(H-6);i?ctx2.lineTo(x,y):ctx2.moveTo(x,y);});
          ctx2.stroke();
        }
      }
    }
    // Keep the compact date suited to both desktop and phone layouts.
    const date=data.now;
    setText('currentDate',(date.getMonth()+1)+'月'+date.getDate()+'日 · 周'+'日一二三四五六'[date.getDay()]);
    if(data.period!==lastPeriod){lastPeriod=data.period;planKey='';}
    $('salaryForm')?.classList.toggle('is-dirty',Number($('salaryInput')?.value)!==state?.config.salary);
    updateNumericDensity();
    if(!frame && !document.hidden)frame=requestAnimationFrame(animate);
    if(motion.matches){tweenDuration=0;amountShown=data.displayAmount;renderNumber(amountShown,true);drawPixel(tick);}
    else if(!data.working && !tweenDuration){amountShown=data.displayAmount;renderNumber(amountShown,changed);drawPixel(tick);}
  }

  function updateNumericDensity(){
    for(const id of ['dayRate','hourRate','monthEarned','compareActual']){
      const node=$(id);if(!node)continue;
      node.classList.toggle('long-value',node.textContent.length>14);
    }
  }

  function animate(tick){
    frame=0;if(!latest||document.hidden)return;
    const elapsed=Math.min(250,tick-lastTime)/1000;
    const speed=latest.demo?20:1;
    const step=latest.working ? latest.secondRate*(latest.fun?1e-8:1)*elapsed*speed:0;
    let target=latest.displayAmount+step;
    const cap=(latest.period==='month'?window.SalaryApp?.getState().config.salary:latest.snapshot.daySalary)*latest.currency.rate/(latest.fun?1e8:1);
    target=Math.min(target,Math.max(0,cap||0));
    if(tweenDuration>0){
      const f=clamp((tick-tweenStart)/tweenDuration);const eased=1-Math.pow(1-f,3);
      amountShown=amountFrom+(target-amountFrom)*eased;
      if(f>=1)tweenDuration=0;
    }else amountShown=target;
    if(tick-lastDigitTime>105 || motion.matches){renderNumber(amountShown);lastDigitTime=tick;}
    if(lastTemplate==='pixel' && tick-lastPixelTime>40){drawPixel(tick);lastPixelTime=tick;}
    const second=Math.floor(latest.now.getTime()/1000);
    if(second!==lastPulseSecond && latest.working){
      if(lastPulseSecond>=0 && window.SalaryApp?.getState().preferences.sound)playTick();
      lastPulseSecond=second;
    }
    if(latest.working || tweenDuration>0)frame=requestAnimationFrame(animate);
  }

  function resizeCanvas(){
    const c=$('pixelCanvas');if(!c || lastTemplate!=='pixel')return;
    const rect=c.getBoundingClientRect();if(rect.width<1)return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    if(canvasWidth===rect.width&&canvasHeight===rect.height&&canvasRatio===dpr)return;
    canvasWidth=rect.width;canvasHeight=rect.height;canvasRatio=dpr;
    c.width=Math.round(rect.width*dpr);c.height=Math.round(rect.height*dpr);
    planKey='';
  }

  function preparePlan(){
    const app=window.SalaryApp;if(!app||!latest)return null;
    const state=app.getState(),cfg=state.config,now=latest.now;
    const key=latest.period+'|'+now.getFullYear()+'-'+now.getMonth()+'-'+now.getDate()+'|'+JSON.stringify(cfg.intervals)+'|'+JSON.stringify(cfg.overrides)+'|'+cfg.calendar+'|'+cfg.weekDays.join(',')+'|'+canvasWidth;
    if(key===planKey)return chartPlan;
    planKey=key;
    if(latest.period==='day'){
      const pairs=cfg.intervals.map(pair=>pair.map(window.SalaryEngine.timeMinutes));
      const start=pairs[0][0],end=pairs[pairs.length-1][1];
      const columns=window.innerWidth<=760?28:32;
      const total=pairs.reduce((s,p)=>s+p[1]-p[0],0);
      const sumAt=t=>pairs.reduce((s,p)=>s+clamp(t-p[0],0,p[1]-p[0]),0);
      chartPlan={start,end,columns,rows:18,levels:Array.from({length:columns},(_,i)=>sumAt(start+(end-start)*(i+1)/columns)/total)};
      const labels=[cfg.intervals[0][0],...(cfg.intervals.length>1?[cfg.intervals[0][1],cfg.intervals[1][0]]:[]),cfg.intervals[cfg.intervals.length-1][1]];
      $('pixelAxis').replaceChildren(...labels.map(label=>{const span=document.createElement('span');span.textContent=label;return span;}));
      setText('pixelTitle','今天的积累');
    }else{
      const days=window.SalaryEngine.daysInMonth(now.getFullYear(),now.getMonth());let done=0;
      const levels=[];
      for(let d=1;d<=days;d++){if(window.SalaryEngine.dayInfo(new Date(now.getFullYear(),now.getMonth(),d,12),cfg).work)done++;levels.push(done/Math.max(1,latest.snapshot.workdays));}
      chartPlan={columns:days,rows:18,levels};
      $('pixelAxis').replaceChildren(...['1 日','10 日','20 日',days+' 日'].map(label=>{const span=document.createElement('span');span.textContent=label;return span;}));
      setText('pixelTitle','这个月的积累');
    }
    return chartPlan;
  }

  function drawPixel(tick){
    if(lastTemplate!=='pixel'||!latest||document.hidden)return;
    resizeCanvas();const plan=preparePlan();if(!plan||canvasWidth<1)return;
    const canvas=$('pixelCanvas'),ctx=canvas.getContext('2d');
    ctx.setTransform(canvasRatio,0,0,canvasRatio,0,0);ctx.clearRect(0,0,canvasWidth,canvasHeight);
    const gap=2.2,cell=Math.min((canvasWidth-(plan.columns-1)*gap)/plan.columns,(canvasHeight-(plan.rows-1)*gap)/plan.rows);
    const width=plan.columns*cell+(plan.columns-1)*gap,height=plan.rows*cell+(plan.rows-1)*gap;
    const ox=(canvasWidth-width)/2,oy=canvasHeight-height;
    let position=0,actualLevel=0;
    if(latest.period==='day'){
      const minutes=latest.now.getHours()*60+latest.now.getMinutes()+latest.now.getSeconds()/60+latest.now.getMilliseconds()/60000;
      position=clamp((minutes-plan.start)/(plan.end-plan.start))*plan.columns;
      actualLevel=latest.snapshot.progress;
      if(!latest.snapshot.isWorkday)position=0;
    }else{position=latest.now.getDate()-1+latest.snapshot.progress;actualLevel=latest.snapshot.monthProgress;}
    const activeColumn=Math.min(plan.columns-1,Math.floor(position));
    const working=latest.working;
    const shimmer=motion.matches?0:Math.max(0,1-((latest.now.getMilliseconds()/1000))/.32);
    for(let col=0;col<plan.columns;col++){
      const target=plan.levels[col]*plan.rows;
      for(let row=0;row<plan.rows;row++){
        if(row>=Math.ceil(target))continue;
        const x=ox+col*(cell+gap),y=oy+(plan.rows-1-row)*(cell+gap);
        const visibleTarget=clamp(target-row);
        ctx.fillStyle='rgba(76,76,73,'+(.32+.27*visibleTarget)+')';
        ctx.fillRect(x,y,cell,cell);
        const completed=col<Math.floor(position)?target:col===activeColumn?Math.min(target,actualLevel*plan.rows):0;
        const filled=clamp(completed-row);
        if(filled>0){
          const hot=col===activeColumn&&row===Math.ceil(completed)-1&&working;
          const opacity=.60+.40*(row/plan.rows);
          ctx.fillStyle=hot?'rgba(255,'+Math.round(137+shimmer*58)+','+Math.round(82+shimmer*66)+',1)':'rgba(254,121,70,'+opacity+')';
          if(hot){ctx.shadowColor='rgba(255,121,70,.3)';ctx.shadowBlur=9;}
          ctx.fillRect(x,y+cell*(1-filled),cell,cell*filled);ctx.shadowBlur=0;
        }
      }
    }
    canvas.setAttribute('aria-label',(latest.period==='day'?'今天':'本月')+'按工作时段累计收入，已完成 '+(latest.progress*100).toFixed(1)+'%，橙色为已赚，灰色为计划。');
  }

  function initAudio(){
    try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();audioReady=true;}catch(_){window.SalaryApp?.toast('此浏览器暂不支持音效。');return false;}return true;
  }
  function playTick(confirm=false){
    if(!audioReady||!audioContext||document.hidden||motion.matches&&!confirm)return;
    try{
      const time=audioContext.currentTime;const osc=audioContext.createOscillator(),gain=audioContext.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(confirm?880:1320,time);osc.frequency.exponentialRampToValueAtTime(confirm?1174:1760,time+.035);
      gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(confirm?.035:.012,time+.006);gain.gain.exponentialRampToValueAtTime(.0001,time+.08);
      osc.connect(gain);gain.connect(audioContext.destination);osc.start(time);osc.stop(time+.09);
    }catch(_){}
  }
  function refreshSound(){
    const on=Boolean(window.SalaryApp.getState().preferences.sound);
    $('soundButton').innerHTML=icon(on?'volume-2':'volume-x');$('soundButton').setAttribute('aria-pressed',String(on));
    const label=on?'关闭收入音效':'开启收入音效';$('soundButton').setAttribute('aria-label',label);$('soundButton').title=label;
  }
  function bind(){
    const app=window.SalaryApp;if(!app)return;
    applyTemplate(app.getState().preferences.template,false);refreshSound();
    document.querySelectorAll('.template-switch button').forEach(button=>button.addEventListener('click',()=>{app.setTemplate(button.dataset.template);if(audioReady&&app.getState().preferences.sound)playTick(true);}));
    $('richQuickButton').addEventListener('click',()=>app.setCurrency(app.getState().currency.fun?'CNY':'ZIM'));
    $('monthSummaryButton').addEventListener('click',()=>app.setPeriod(app.getState().period==='month'?'day':'month'));
    $('ratePill')?.addEventListener('click',()=>{try{localStorage.setItem('salaryFlow.rateMode',String((rateModeIdx()+1)%3));}catch(e){}render();});
    $('salaryInput').addEventListener('input',()=>{$('salaryForm').classList.toggle('is-dirty',Number($('salaryInput').value)!==app.getState().config.salary);});
    $('soundButton').addEventListener('click',()=>{
      const enabled=!app.getState().preferences.sound;
      if(enabled&&!initAudio())return;
      app.setPreference('sound',enabled);refreshSound();if(enabled)playTick(true);
      app.toast(enabled?'收入音效已开启':'收入音效已关闭');
    });
    // A saved sound preference does not bypass browser audio activation policy.
    document.addEventListener('pointerdown',()=>{if(app.getState().preferences.sound&&!audioReady)initAudio();},{once:true});
    $('fullscreenButton').addEventListener('click',async()=>{
      try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else app.toast('此浏览器可使用下方的专注模式。');}
      catch(_){app.toast('当前浏览器不支持全屏，可切换专注模式。');}
    });
    document.addEventListener('fullscreenchange',()=>{
      const active=Boolean(document.fullscreenElement);$('fullscreenButton').innerHTML=icon(active?'minimize':'maximize');$('fullscreenButton').setAttribute('aria-label',active?'退出全屏':'全屏沉浸');
    });
    $('focusButton').addEventListener('click',()=>{
      focusMode=!focusMode;document.body.classList.toggle('is-focus',focusMode);
      $('focusButton').innerHTML=icon(focusMode?'eye-off':'eye')+(focusMode?'退出专注':'专注模式');
      fitKey='';requestAnimationFrame(()=>{resizeCanvas();fitAmount();if(latest)drawPixel(performance.now());});
      if(focusMode)window.scrollTo({top:0,behavior:motion.matches?'auto':'smooth'});
    });
    window.addEventListener('salary-template',event=>applyTemplate(event.detail.template));
    window.addEventListener('resize',()=>{fitKey='';applySlider();resizeCanvas();fitAmount();if(latest)drawPixel(performance.now());});
    document.fonts.ready.then(()=>{fitKey='';fitAmount();});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}
      else{lastPulseSecond=-1;app.render();}
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&focusMode&&!document.querySelector('dialog[open]'))$('focusButton').click();
    });
    app.render();
  }
  function applySlider(){
    const buttons=[...document.querySelectorAll('.template-switch button')],selected=buttons.find(b=>b.dataset.template===lastTemplate);
    if(selected){$('templateSlider').style.width=selected.offsetWidth+'px';$('templateSlider').style.transform='translateX('+(selected.offsetLeft-buttons[0].offsetLeft)+'px)';}
  }
  window.SalaryVisual={update,resize:()=>{resizeCanvas();fitKey='';fitAmount();}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else queueMicrotask(bind);
})();

(function () {
  'use strict';
  const E = window.SalaryEngine;
  if (!E) throw new Error('SalaryEngine is required.');
  const STORAGE_KEY = 'salaryFlow.v2';
  const RATE_ENDPOINT = 'https://api.frankfurter.dev/v2/rates?base=CNY&quotes=USD,EUR,JPY,KRW,HKD,VND,IDR,GBP,SGD,AUD';
  const CURRENCIES = {
    CNY: {code:'CNY', name:'人民币', symbol:'¥'},
    USD: {code:'USD', name:'美元', symbol:'$'},
    EUR: {code:'EUR', name:'欧元', symbol:'€'},
    JPY: {code:'JPY', name:'日元', symbol:'¥'},
    KRW: {code:'KRW', name:'韩元', symbol:'₩'},
    HKD: {code:'HKD', name:'港币', symbol:'HK$'},
    VND: {code:'VND', name:'越南盾', symbol:'₫'},
    IDR: {code:'IDR', name:'印尼盾', symbol:'Rp'},
    GBP: {code:'GBP', name:'英镑', symbol:'£'},
    SGD: {code:'SGD', name:'新元', symbol:'S$'},
    AUD: {code:'AUD', name:'澳元', symbol:'A$'},
    ZIM: {code:'ZIM', name:'津巴布韦 · 趣味', symbol:'Z$', fun:true}
  };
  const PRESET_RATES = {CNY:1, USD:.14981, EUR:.13344, JPY:23.71, KRW:199.13, HKD:1.1766, VND:3869.68, IDR:2699.77, GBP:.10712, SGD:.19347, AUD:.21614, ZIM:1e11};
  const defaultPreferences = {template:'pig', sound:false, period:'day', currency:'CNY', goal:{name:'一杯咖啡',price:25}, manualRates:{}};
  const clone = object => JSON.parse(JSON.stringify(object));
  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];
  const number = (value, fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const escapeHTML = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const format = (value, decimals=2) => number(value).toLocaleString('en-US', {minimumFractionDigits:decimals, maximumFractionDigits:decimals});
  const trimNumber = (value, maximumFractionDigits=2) => number(value).toLocaleString('en-US', {maximumFractionDigits});
  const icon = name => {
    const aliases={stop:'square',close:'x',arrow:'arrow-right',chevron:'chevron-right'};
    const preferred='icon-'+(aliases[name] || name);
    return '<svg class="icon" aria-hidden="true"><use href="#'+($(preferred)?preferred:'i-'+name)+'"/></svg>';
  };
  const text = (id, value) => { const node=$(id); if (node && node.textContent !== String(value)) node.textContent=String(value); };
  const hidden = (id, yes) => { if ($(id)) $(id).hidden = yes; };
  let config = clone(E.defaults);
  let preferences = clone(defaultPreferences);
  let rates = {quotes:{...PRESET_RATES}, dates:{}, source:'内置参考汇率', sources:{}};
  for (const code of Object.keys(CURRENCIES)) { rates.dates[code]='2026-10-21'; rates.sources[code]='内置参考汇率'; }
  let storageUnavailable = false;
  let settingsDraft = null;
  let calendarDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedDate = null;
  let demo = null;
  let latestSnapshot = null;
  let lastChartSignature = '';
  let refreshing = false;
  let lastRealDay = '';
  const listeners = new Set();

  function parseDate(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key))) return null;
    const [year, month, day] = String(key).split('-').map(Number);
    const result = new Date(year, month-1, day, 12);
    return E.dateKey(result) === key ? result : null;
  }

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored || typeof stored !== 'object') return;
      if (stored.config && typeof stored.config === 'object') {
        const candidate = {...clone(E.defaults), ...stored.config};
        if (E.validateConfig(candidate).valid) config = candidate;
        config.overtimeRecords = {};
        for (const [day,hours] of Object.entries(stored.config.overtimeRecords || {})) {
          if (parseDate(day) && Number.isFinite(Number(hours)) && Number(hours)>0 && Number(hours)<=24) config.overtimeRecords[day]=Number(hours);
        }
        config.overrides={};
        for (const [day,state] of Object.entries(stored.config.overrides || {})) {
          if (parseDate(day) && ['work','rest'].includes(state)) config.overrides[day]=state;
        }
        config.estimatedOvertime=clamp(number(config.estimatedOvertime),0,8);
        config.extraPay=clamp(number(config.extraPay),0,1e6);
        const session=stored.config.overtimeSession;
        config.overtimeSession=session && Number.isFinite(Number(session.start)) && Number(session.start)>0 && Number(session.start)<=Date.now()+60000
          ? {start:Number(session.start),day:E.dateKey(new Date(Number(session.start)))} : null;
      }
      const p = stored.preferences || {};
      preferences={...clone(defaultPreferences),...p};
      if (!['charge','meter','pixel','pig','neon','mono','paper','term','ecg','wave','therm','receipt','sand','dial','trail','metro','lift','eclipse','flap','vinyl','const','plant','shadow','tide','rocket','balloon','aqua','kite','falls','toast','ember','cable','hive','lantern','abacus','ferris','globe','seismo','terrace','crane','slots','domino','match','popcorn','tetris','fishing','pottery','sparkler','origami','typewriter','aurora','catnap','prayer','piano','firejar','lava','knit','juice','rainbow','bonsai','vending','lighthouse','treadmill','oven','wishing','sandcastle','inkwash','candle','swing','gacha','surf','scope','bottle','pinball','lotus','ramen','gear','invader','mine','puppet','sprout','hop','mahjong','scale','tearoff','windmill','grill','dock','compass','sub','icicle','snowman','latte','train','ivy','forge','tanghulu','dragonboat','mill','laundry','muyu','sushi','mallow','top','fountain','sled','kaleido','gongfu','jigsaw','scroll','parasol','steamer','hotpot','waterwheel','firecrack','sugarart','sling','bigdrum','faceoff','liondance','chestnut','icesculpt','zoetrope','stoneskip','polaroid','seesaw','neontube','bubble','pizza','sugarman','skylantern','coin','sandart','rattle','ringtoss','inkjet','gaiwan','diabolo','stitch','tangram','knot','rubbing','loom','mosaic','seal','gong','bianzhong','zither','grind','copter','papercut','hula','rubik','nesting','curling','juggle','yoyo','pinwheel','marble','omikuji','darts','pinata','kendama','vaultbox','stilts','jumprope','plate','tightrope','shateki','fukuwarai','kagami','hagoita','shogi','karuta','suika','sumo','goldfish','noren','volcano','abyss','chrysalis','oyster','antfarm','sunflower','metronome','spiral','circuit','drawbridge','weathervane','bigben','telescope','aquarium','terrarium','nest','sourdough','ferment','archery','basketball','pendulum','zipline','carousel','ski','firefly','moonphase','teapot','spiderweb','snail','hummingbird','cicada','dam','potofgold','koipond','zengarden','orchard','constellation','solarsystem','bamboo','geode','mandala','catapult','sakura','incense','pagoda','radar','rover','iceberg','comet','nebula','tornado','rose','dandelion','chess','sunrise','moonrise','billiards','golf','bowling','meadow','geyser','vineyard','reef','fireplace','onsen','iceskate','jukebox','musicbox','bath','dive','observatory','darkroom','projector','trek','harbor','staircase','bakery','castle','voyage','sauna','tidepool','jacuzzi','movie','library','maze','greenhouse','carnival','beach','waterfall','desert','rain','cave','garden','lake','bridge','market','storm','river','canyon','dawn','cabin','origamicrane','jellyfish','shrine','snowy','dusk','harvest','pier','valley','marsh','glacier','fjord','theater','circus','studio','kitchen','workshop','bay','gate','dojo','aviary','apiary','lagoon','glade','cove','plaza','ranch','barn','prairie','tavern','arcade','chapel','tram','temple','cellar','gondola','rooftop','boardwalk','diner','barber','gallery','museum','station','kelp','funicular','marina','planetarium','depot','atrium','stable','elevator','beacon','dune','coop','summit','brook','teahouse','smithy','kennel','lilypad','grove','jetty','camp','boathouse','igloo','monastery','yurt','paddy','silo','dovecote','courtyard','oasis','mesa','crater','quarry','foundry','mint','well','bonfire','spring','granary','heron','smokehouse','sawmill','canallock','sheepfold'].includes(preferences.template)) preferences.template='pig';
      if (!['day','month'].includes(preferences.period)) preferences.period='day';
      if (!CURRENCIES[preferences.currency]) preferences.currency='CNY';
      preferences.sound=Boolean(preferences.sound);
      const goal=p.goal || {};
      preferences.goal={name:typeof goal.name==='string' && goal.name.trim() ? goal.name.trim().slice(0,12) : '一杯咖啡',price:clamp(number(goal.price,25),.01,1e8)};
      preferences.manualRates={};
      for (const [code,rate] of Object.entries(p.manualRates || {})) {
        if (CURRENCIES[code] && code!=='CNY' && number(rate)>0 && number(rate)<=1e15) preferences.manualRates[code]=Number(rate);
      }
      if (stored.rates && typeof stored.rates==='object') {
        for (const code of Object.keys(CURRENCIES)) {
          if (['CNY','ZIM'].includes(code)) continue;
          const rate=number(stored.rates.quotes?.[code]);
          const date=stored.rates.dates?.[code];
          if (rate>0 && rate<=1e15 && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            rates.quotes[code]=rate;
            rates.dates[code]=date;
            rates.sources[code]=stored.rates.sources?.[code] || '缓存的 Frankfurter 汇率';
          }
        }
        rates.source=stored.rates.source || rates.source;
      }
    } catch (_) { storageUnavailable=true; }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify({version:2,config,preferences,rates})); }
    catch (_) {
      if (!storageUnavailable) toast('浏览器未允许保存设置；本次打开仍可正常使用。');
      storageUnavailable=true;
    }
  }

  function toast(message) {
    const stack=$('toastStack');
    if (!stack) return;
    const toast=document.createElement('div');
    toast.className='toast';
    toast.setAttribute('role','status');
    toast.textContent=message;
    stack.appendChild(toast);
    while (stack.children.length>3) stack.firstElementChild.remove();
    setTimeout(()=> { toast.classList.add('leaving'); setTimeout(()=>toast.remove(),260); },3600);
  }

  function getCurrency(code=preferences.currency) {
    const chosen=CURRENCIES[code] || CURRENCIES.CNY;
    return {...chosen,rate:chosen.code==='CNY' ? 1 : number(preferences.manualRates[chosen.code],number(rates.quotes[chosen.code],PRESET_RATES[chosen.code])),fun:Boolean(chosen.fun)};
  }

  function formatMoney(value, code=preferences.currency, decimals=2, compact=true) {
    const cur=getCurrency(code);
    const amount=number(value)*cur.rate;
    let displayed=amount,unit='';
    if(compact && (cur.fun || Math.abs(amount)>=1e7)) {
      const units=[[1e24,'亿亿亿'],[1e20,'万亿亿'],[1e16,'亿亿'],[1e12,'万亿'],[1e8,'亿'],[1e4,'万']];
      const selected=units.find(([scale])=>Math.abs(amount)>=scale && (!cur.fun || scale>=1e8));
      if(selected) [displayed,unit]=[amount/selected[0],selected[1]];
      else if(cur.fun) [displayed,unit]=[amount/1e8,'亿'];
    }
    return cur.symbol + (cur.symbol.length>1?' ':'') + format(displayed,decimals) + (unit?' '+unit:'');
  }

  function rateModeIdx(){try{return Math.min(2,Math.max(0,parseInt(localStorage.getItem('salaryFlow.rateMode')||'0',10)||0));}catch(e){return 0;}}
  function moneyText(id,value,{code=preferences.currency,decimals=2,prefix='',suffix=''}={}) {
    text(id,prefix+formatMoney(value,code,decimals)+suffix);
    const node=$(id);
    if(node) node.title=prefix+formatMoney(value,code,decimals,false)+' '+code+suffix;
  }

  function duration(seconds) {
    const total=Math.max(0,Math.floor(number(seconds)));
    return [Math.floor(total/3600),Math.floor(total/60)%60,total%60].map(value=>String(value).padStart(2,'0')).join(':');
  }

  function getNow() { return demo ? new Date(demo.anchor+(performance.now()-demo.started)*demo.speed) : new Date(); }
  function getState() { return {config,preferences,currency:getCurrency(),rates,period:preferences.period,demo,snapshot:latestSnapshot}; }
  function emitUpdate() {
    const state=getState();
    for (const callback of listeners) { try { callback(state); } catch (error) { console.error(error); } }
    window.dispatchEvent(new CustomEvent('salary-update',{detail:state}));
  }
  function setTemplate(name) {
    if (!['charge','meter','pixel','pig','neon','mono','paper','term','ecg','wave','therm','receipt','sand','dial','trail','metro','lift','eclipse','flap','vinyl','const','plant','shadow','tide','rocket','balloon','aqua','kite','falls','toast','ember','cable','hive','lantern','abacus','ferris','globe','seismo','terrace','crane','slots','domino','match','popcorn','tetris','fishing','pottery','sparkler','origami','typewriter','aurora','catnap','prayer','piano','firejar','lava','knit','juice','rainbow','bonsai','vending','lighthouse','treadmill','oven','wishing','sandcastle','inkwash','candle','swing','gacha','surf','scope','bottle','pinball','lotus','ramen','gear','invader','mine','puppet','sprout','hop','mahjong','scale','tearoff','windmill','grill','dock','compass','sub','icicle','snowman','latte','train','ivy','forge','tanghulu','dragonboat','mill','laundry','muyu','sushi','mallow','top','fountain','sled','kaleido','gongfu','jigsaw','scroll','parasol','steamer','hotpot','waterwheel','firecrack','sugarart','sling','bigdrum','faceoff','liondance','chestnut','icesculpt','zoetrope','stoneskip','polaroid','seesaw','neontube','bubble','pizza','sugarman','skylantern','coin','sandart','rattle','ringtoss','inkjet','gaiwan','diabolo','stitch','tangram','knot','rubbing','loom','mosaic','seal','gong','bianzhong','zither','grind','copter','papercut','hula','rubik','nesting','curling','juggle','yoyo','pinwheel','marble','omikuji','darts','pinata','kendama','vaultbox','stilts','jumprope','plate','tightrope','shateki','fukuwarai','kagami','hagoita','shogi','karuta','suika','sumo','goldfish','noren','volcano','abyss','chrysalis','oyster','antfarm','sunflower','metronome','spiral','circuit','drawbridge','weathervane','bigben','telescope','aquarium','terrarium','nest','sourdough','ferment','archery','basketball','pendulum','zipline','carousel','ski','firefly','moonphase','teapot','spiderweb','snail','hummingbird','cicada','dam','potofgold','koipond','zengarden','orchard','constellation','solarsystem','bamboo','geode','mandala','catapult','sakura','incense','pagoda','radar','rover','iceberg','comet','nebula','tornado','rose','dandelion','chess','sunrise','moonrise','billiards','golf','bowling','meadow','geyser','vineyard','reef','fireplace','onsen','iceskate','jukebox','musicbox','bath','dive','observatory','darkroom','projector','trek','harbor','staircase','bakery','castle','voyage','sauna','tidepool','jacuzzi','movie','library','maze','greenhouse','carnival','beach','waterfall','desert','rain','cave','garden','lake','bridge','market','storm','river','canyon','dawn','cabin','origamicrane','jellyfish','shrine','snowy','dusk','harvest','pier','valley','marsh','glacier','fjord','theater','circus','studio','kitchen','workshop','bay','gate','dojo','aviary','apiary','lagoon','glade','cove','plaza','ranch','barn','prairie','tavern','arcade','chapel','tram','temple','cellar','gondola','rooftop','boardwalk','diner','barber','gallery','museum','station','kelp','funicular','marina','planetarium','depot','atrium','stable','elevator','beacon','dune','coop','summit','brook','teahouse','smithy','kennel','lilypad','grove','jetty','camp','boathouse','igloo','monastery','yurt','paddy','silo','dovecote','courtyard','oasis','mesa','crater','quarry','foundry','mint','well','bonfire','spring','granary','heron','smokehouse','sawmill','canallock','sheepfold'].includes(name)) return false;
    preferences.template=name;
    save();
    window.dispatchEvent(new CustomEvent('salary-template',{detail:{template:name}}));
    render();
    return true;
  }
  function setPreference(key,value) {
    if (key==='template') return setTemplate(value);
    if (key==='currency') return setCurrency(value);
    if (key==='period') return setPeriod(value);
    if (['sound','theme','motion'].includes(key)) { preferences[key]=value; save(); render(); }
  }
  function setPeriod(period) {
    if (!['day','month'].includes(period)) return false;
    preferences.period=period;
    save();
    render();
    return true;
  }
  function setCurrency(code) {
    if (!CURRENCIES[code]) return false;
    const changed=preferences.currency!==code;
    preferences.currency=code;
    save();
    renderCurrencyPanel();
    render();
    if ($('currencyDialog')?.open) $('currencyDialog').close();
    if (changed) toast(code==='ZIM' ? '亿万富翁模式开启 · 每 1 元映射为 '+trimNumber(getCurrency(code).rate/1e8,4)+' 亿 Z$' : '已切换为'+CURRENCIES[code].name);
    return true;
  }

  function toggleDemo() {
    if (demo) {
      demo=null;
      hidden('demoBanner',true);
      toast('已回到真实时间');
      render();
      return false;
    }
    const actual=new Date();
    const candidates=[];
    for(let day=actual.getDate();day<=E.daysInMonth(actual.getFullYear(),actual.getMonth());day++) candidates.push(day);
    for(let day=1;day<actual.getDate();day++) candidates.push(day);
    const chosen=candidates.map(day=>new Date(actual.getFullYear(),actual.getMonth(),day,14,30)).find(date=>E.dayInfo(date,config).work);
    if (!chosen) { toast('本月没有工作日，请先调整日历。'); return false; }
    if (E.snapshot(chosen,config).status!=='working') {
      const pair=config.intervals[0];
      const minute=Math.floor((E.timeMinutes(pair[0])+E.timeMinutes(pair[1]))/2);
      chosen.setHours(Math.floor(minute/60),minute%60,0,0);
    }
    const demoSpeed=(window.__demoSpeed>=1&&window.__demoSpeed<=200)?window.__demoSpeed:20;
    demo={anchor:chosen.getTime(),started:performance.now(),speed:demoSpeed};
    hidden('demoBanner',false);
    const copy=$('demoBanner')?.querySelector('[data-demo-copy],span');
    if(copy) copy.innerHTML=icon('play')+'<b>正在体验</b> · 模拟 '+escapeHTML(E.dateKey(chosen))+' '+chosen.toTimeString().slice(0,5)+'，时间以 '+demoSpeed+' 倍流动';
    render();
    return true;
  }

  function openDialog(id) {
    const dialog=$(id);
    if (!dialog || typeof dialog.showModal!=='function') return;
    for (const other of all('dialog[open]')) if (other!==dialog) other.close();
    if (id==='settingsDialog') prepareSettings();
    if (id==='calendarDialog') renderCalendar();
    if (id==='currencyDialog') renderCurrencyPanel();
    if (id==='overtimeDialog') {
      if ($('overtimeDate')) { $('overtimeDate').value=E.dateKey(new Date()); $('overtimeDate').max=E.dateKey(new Date()); }
      text('overtimeEntryError','');
      renderOvertimeRecords();
      renderOvertimeLive();
    }
    if (id==='goalDialog') {
      if($('goalNameInput')) $('goalNameInput').value=preferences.goal.name;
      if($('goalPriceInput')) $('goalPriceInput').value=preferences.goal.price;
    }
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
  }

  function refreshAll() {
    lastChartSignature='';
    render();
    if ($('calendarDialog')?.open) renderCalendar();
    if ($('currencyDialog')?.open) renderCurrencyPanel();
    if ($('overtimeDialog')?.open) renderOvertimeRecords();
  }

  function render() {
    const now=getNow();
    const current=E.snapshot(now,config);
    latestSnapshot=current;
    const cur=getCurrency();
    const monthly=preferences.period==='month';
    const baseAmount=monthly ? current.monthEarned : current.todayEarned;
    const amount=baseAmount*cur.rate;
    const progress=monthly ? current.monthProgress : current.progress;
    const working=current.status==='working';
    text('currentDate',new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(now));
    text('currentTime',now.toLocaleTimeString('zh-CN',{hour12:Boolean(window.__clock12),hour:'2-digit',minute:'2-digit',second:'2-digit'}));
    text('workingStatus',demo ? (working?'演示中 · 正在入账':'演示中 · '+current.statusLabel) : (config.overtimeSession && !working ? '加班计时中 · 工资不变' : current.statusLabel));
    if ($('statusDot')) { $('statusDot').classList.toggle('paused',!working); $('statusDot').classList.toggle('active',working); }
    hidden('sampleBadge',Boolean(config.configured));
    hidden('funBadge',!cur.fun);
    text('currencyName',cur.name);
    text('currencyMark',cur.symbol);
    text('moneySymbol',window.__symbol||cur.symbol);
    text('moneyUnit',cur.fun?'亿':'');
    const rateModes=[{m:1,s:' / 秒'},{m:60,s:' / 分'},{m:3600,s:' / 时'}];
    if(working){const rm=rateModes[rateModeIdx()];moneyText('perSecond',current.secondSalary*rm.m,{code:cur.code,decimals:cur.fun?2:4,prefix:'+ ',suffix:rm.s});}
    else text('perSecond','暂停入账');
    const boundaryTime=current.nextBoundary ? new Date(current.nextBoundary).toLocaleTimeString('zh-CN',{hour12:false,hour:'2-digit',minute:'2-digit'}) : '';
    const lunch=current.status==='break' && now.getHours()>=12 && now.getHours()<14;
    const captions={working:'工作时段内实时累积',break:(lunch?'午休':'休息')+'，'+boundaryTime+' 继续',before:boundaryTime+' 开始计入',finished:'今日工作时段已结束',off:'休息日，暂停累积'};
    text('incomeCaption',captions[current.status]);
    text('progressTitle',monthly?'本月进度':'今日进度');
    text('progressPercent',format(progress*100,1)+'%');
    if($('heroProgressFill')) $('heroProgressFill').style.width=(progress*100)+'%';
    if($('heroProgress')) $('heroProgress').setAttribute('aria-valuenow',String(Math.round(progress*1000)/10));
    let countdownLabel='距离下班';
    let countdownSeconds=current.untilClockOutSeconds;
    if(current.status==='before') { countdownLabel='距离开工'; countdownSeconds=current.untilSeconds; }
    if(current.status==='break') { countdownLabel=lunch?'距离午休结束':'距离休息结束'; countdownSeconds=current.untilSeconds; }
    if(current.status==='finished') { countdownLabel='今日已下班'; countdownSeconds=0; }
    if(current.status==='off') { countdownLabel='距离下次开工'; countdownSeconds=current.untilSeconds; }
    text('countdownLabel',countdownLabel);
    text('countdown',current.nextBoundary===null && current.status==='off' ? '暂无排班' : duration(countdownSeconds));
    moneyText('dailyTarget',monthly?config.salary:current.isWorkday?current.daySalary:0,{prefix:monthly?'本月目标 ':'今日目标 '});
    for(const button of all('[data-period]')) { const selected=button.dataset.period===preferences.period; button.classList.toggle('selected',selected); button.setAttribute('aria-pressed',String(selected)); }
    const periodButton=$(monthly?'periodMonth':'periodDay'),periodSlide=$('periodSlide');
    if(periodSlide && periodButton) {
      const transform='translateX('+periodButton.offsetLeft+'px)',width=periodButton.offsetWidth+'px';
      if(periodSlide.style.transform!==transform) periodSlide.style.transform=transform;
      if(periodSlide.style.width!==width) periodSlide.style.width=width;
    }
    moneyText('dayRate',current.daySalary);
    moneyText('hourRate',current.hourSalary,{suffix:' / h'});
    text('scheduleLabel',config.intervals.map(pair=>pair.join('–')).join(' · '));
    text('hoursLabel','每天 '+trimNumber(current.hoursPerDay)+' 小时');
    text('workdaysLabel','本月 '+current.workdays+' 个工作日');
    text('monthLabel',now.getFullYear()+' 年 '+(now.getMonth()+1)+' 月');
    moneyText('monthEarned',current.monthEarned);
    moneyText('monthGoal',config.salary,{prefix:'/ '});
    const completed=current.elapsedWorkdays+(current.progress>=1?1:0);
    text('monthWorkdays','已走过 '+completed+' 个工作日');
    text('monthRemaining','还有 '+Math.max(0,current.workdays-completed)+' 天');
    renderMonthChart(now,current);
    renderGoal(current);
    renderScenario(now);
    if($('overtimeDialog')?.open || config.overtimeSession) renderOvertimeLive();
    text('overtimeRecordLabel',config.overtimeSession?'加班计时中':'记录加班');
    if($('demoButton')) { $('demoButton').setAttribute('aria-pressed',String(Boolean(demo))); $('demoButton').innerHTML=icon(demo?'stop':'play')+(demo?'退出体验':'体验涨薪'); }
    const realDay=E.dateKey(new Date());
    if(realDay!==lastRealDay) { lastRealDay=realDay; if($('calendarDialog')?.open) renderCalendar(); }
    window.SalaryVisual?.update({amount,displayAmount:cur.fun?amount/1e8:amount,decimals:window.__decimals||2,symbol:cur.symbol,unit:cur.fun?'亿':'',secondRate:current.secondSalary*cur.rate,progress,snapshot:current,now,working,fun:cur.fun,currency:cur,period:preferences.period,demo:Boolean(demo)});
    emitUpdate();
  }

  function renderMonthChart(now,current) {
    const chart=$('monthChart');
    if(!chart || chart.closest('[hidden]')) return;
    const signature=E.dateKey(now)+'|'+Math.floor(current.progress*100)+'|'+current.workdays+'|'+config.salary+'|'+JSON.stringify(config.overrides)+'|'+config.calendar+'|'+config.weekDays.join(',')+'|'+preferences.currency+'|'+getCurrency().rate;
    if(signature===lastChartSignature) return;
    lastChartSignature=signature;
    const fragment=document.createDocumentFragment();
    for(let day=1;day<=E.daysInMonth(now.getFullYear(),now.getMonth());day++) {
      const date=new Date(now.getFullYear(),now.getMonth(),day,12);
      const info=E.dayInfo(date,config);
      const progress=info.work ? (day<now.getDate()?1:day===now.getDate()?current.progress:0) : 0;
      const bar=document.createElement('div');
      bar.className='month-day '+(info.work?'is-work':'is-rest')+(day===now.getDate()?' is-today':'')+(progress>=1?' is-complete':'');
      bar.title=(now.getMonth()+1)+'月'+day+'日 · '+info.name+(info.work?' · '+formatMoney(current.daySalary*progress):'');
      bar.setAttribute('aria-label',bar.title);
      const fill=document.createElement('span');
      fill.style.height=(info.work?Math.max(5,progress*100):7)+'%';
      bar.appendChild(fill);
      fragment.appendChild(bar);
    }
    chart.replaceChildren(fragment);
  }

  function renderGoal(current) {
    if(!$('goalCount') || $('goalCount').closest('[hidden]')) return;
    const goal=preferences.goal;
    const count=Math.floor(current.todayEarned/goal.price);
    const remainder=current.todayEarned%goal.price;
    text('goalCount',trimNumber(count,0));
    text('goalUnit',goal.name.startsWith('一')?goal.name.slice(1):'份'+goal.name);
    text('goalNext',count?'下一份小快乐，也在路上。':'第一份小快乐，正在靠近。');
    text('goalPrice',goal.name+' '+formatMoney(goal.price,'CNY',goal.price%1?2:0));
    text('goalRemaining','再赚 '+formatMoney(goal.price-remainder,'CNY'));
    if($('goalFill')) $('goalFill').style.width=(remainder/goal.price*100)+'%';
  }

  function renderScenario(now) {
    const scenario=E.overtimeScenario(config,now,config.estimatedOvertime,config.extraPay);
    text('overtimeValue',trimNumber(config.estimatedOvertime,1));
    moneyText('compareStandard',scenario.baseHourly);
    moneyText('compareActual',scenario.actualHourly);
    const ratio=scenario.baseHourly?scenario.actualHourly/scenario.baseHourly:0;
    if($('actualBar')) $('actualBar').style.width=(clamp(ratio,0,1)*100)+'%';
    text('discountNumber',format(ratio*10,1));
    const loss=scenario.lossPercent;
    text('lossBadge',config.estimatedOvertime===0 && config.extraPay===0?'准点下班':loss>=0?'时薪下降 '+format(loss,1)+'%':'时薪提高 '+format(-loss,1)+'%');
    text('overtimeScenarioNote',config.estimatedOvertime ? '每天 '+trimNumber(scenario.totalHours)+' 小时'+(config.extraPay?'，另付 '+formatMoney(config.extraPay,'CNY',0):'，月薪不变') : '拖动模拟加班后的时薪');
    text('overtimeImpactNote',config.estimatedOvertime ? '每天加班 '+trimNumber(config.estimatedOvertime)+' 小时，本月增加 '+trimNumber(config.estimatedOvertime*latestSnapshot.workdays)+' 小时。':'当前按标准工时计算');
    if($('overtimeRange')) $('overtimeRange').style.setProperty('--range-progress',(config.estimatedOvertime/8*100)+'%');
  }

  function prepareSettings() {
    settingsDraft={calendar:config.calendar,weekDays:[...config.weekDays],intervals:clone(config.intervals)};
    text('settingsError','');
    for(const input of all('input[name="calendarMode"]')) input.checked=input.value===settingsDraft.calendar;
    renderWeekdays();
    renderIntervals();
  }
  function renderWeekdays() {
    if(!settingsDraft || !$('weekdayPicker')) return;
    hidden('weekdayPicker',settingsDraft.calendar!=='custom');
    $('weekdayPicker').innerHTML=[1,2,3,4,5,6,0].map(day=>'<button type="button" class="weekday-option'+(settingsDraft.weekDays.includes(day)?' selected':'')+'" data-weekday="'+day+'" aria-pressed="'+settingsDraft.weekDays.includes(day)+'">'+['日','一','二','三','四','五','六'][day]+'</button>').join('');
  }
  function renderIntervals() {
    if(!settingsDraft || !$('intervalFields')) return;
    $('intervalFields').innerHTML=settingsDraft.intervals.map((pair,index)=>'<div class="interval-row"><span class="interval-index">'+String(index+1).padStart(2,'0')+'</span><input type="time" value="'+escapeHTML(pair[0])+'" data-interval="'+index+'" data-edge="0" aria-label="第'+(index+1)+'段开始时间" required><span class="interval-separator">—</span><input type="time" value="'+escapeHTML(pair[1])+'" data-interval="'+index+'" data-edge="1" aria-label="第'+(index+1)+'段结束时间" required><button class="remove-interval icon-btn" type="button" data-remove-interval="'+index+'" aria-label="移除第'+(index+1)+'个工作时段" '+(settingsDraft.intervals.length===1?'disabled':'')+'>'+icon('minus')+'</button></div>').join('');
    if($('addInterval')) $('addInterval').disabled=settingsDraft.intervals.length>=4;
    renderScheduleTotal();
  }
  function renderScheduleTotal() {
    if(!settingsDraft) return;
    const minutes=settingsDraft.intervals.reduce((sum,pair)=>sum+Math.max(0,number(E.timeMinutes(pair[1])-E.timeMinutes(pair[0]))),0);
    text('scheduleTotal','共 '+trimNumber(minutes/60)+' 小时');
  }
  function saveSettings(event) {
    event.preventDefault();
    if(!settingsDraft) return;
    const candidate={...config,...settingsDraft};
    const validation=E.validateConfig(candidate);
    if(!validation.valid) { text('settingsError',validation.errors[0]); return; }
    config.calendar=settingsDraft.calendar;
    config.weekDays=[...settingsDraft.weekDays];
    config.intervals=clone(settingsDraft.intervals);
    config.configured=true;
    save();
    $('settingsDialog').close();
    if(demo) demo=null;
    hidden('demoBanner',true);
    refreshAll();
    toast('作息已保存，日薪已重新计算。');
  }

  function renderCalendar() {
    const grid=$('calendarGrid');
    if(!grid) return;
    const year=calendarDate.getFullYear(), month=calendarDate.getMonth();
    const info=E.monthInfo(calendarDate,config);
    text('calendarMonthTitle',year+' 年 '+(month+1)+' 月');
    text('calendarSummary',info.workdays+' 个工作日 · 每天 '+trimNumber(info.hoursPerDay)+' 小时 · 日薪 '+formatMoney(info.daySalary));
    const today=E.dateKey(new Date());
    const offset=(new Date(year,month,1).getDay()+6)%7;
    let html='<span class="calendar-empty" aria-hidden="true"></span>'.repeat(offset);
    for(let day=1;day<=E.daysInMonth(year,month);day++) {
      const date=new Date(year,month,day,12),key=E.dateKey(date),details=E.dayInfo(date,config);
      let classes='calendar-day '+(details.work?'work':'rest');
      if(details.kind==='makeup') classes+=' makeup';
      if(details.kind==='override') classes+=' custom';
      if(key===today) classes+=' today';
      if(key===selectedDate) classes+=' selected';
      const label=details.kind==='override'?'自定'+(details.work?'班':'休'):details.kind==='holiday'?details.name:details.kind==='makeup'?'补班':details.work?'上班':'休';
      html+='<button type="button" class="'+classes+'" data-calendar-day="'+key+'" aria-pressed="'+(key===selectedDate)+'" aria-label="'+key+' '+escapeHTML(details.name)+'"><b>'+day+'</b><small>'+escapeHTML(label)+'</small></button>';
    }
    grid.innerHTML=html;
    if(selectedDate && parseDate(selectedDate)) {
      const selected=parseDate(selectedDate),details=E.dayInfo(selected,config);
      hidden('dateInspector',false);
      text('selectedDateLabel',selected.getFullYear()+'年'+(selected.getMonth()+1)+'月'+selected.getDate()+'日');
      text('selectedDateInfo',details.name+' · '+(details.work?'分摊当月固定工资':'当天暂停入账'));
      for(const button of all('[data-day-override]')) button.classList.toggle('selected',config.overrides[selectedDate]===button.dataset.dayOverride);
    } else hidden('dateInspector',true);
    text('calendarHint',info.calendarKnown?'点击任意日期，调整你的实际安排。':year+' 年官方调休未内置，目前按每周排班计算。请按实际安排手动调整日期。');
    const source=$('calendarSource');
    if(source) {
      source.replaceChildren();
      if(config.calendar==='cn' && E.holidayYears[year]) {
        const link=document.createElement('a');link.href=E.holidayYears[year].source;link.target='_blank';link.rel='noopener noreferrer';link.textContent='查看 '+year+' 年节假日安排来源';source.appendChild(link);
      } else source.textContent=config.calendar==='custom'?'当前使用你的自定义排班':'当前按固定每周工作日计算';
    }
  }

  function renderCurrencyPanel() {
    const grid=$('currencyGrid');
    const cur=getCurrency();
    if(grid) grid.innerHTML=Object.values(CURRENCIES).filter(item=>!item.fun).map(item=>'<button type="button" class="currency-option'+(item.code===cur.code?' selected':'')+'" data-currency="'+item.code+'" aria-pressed="'+(item.code===cur.code)+'"><span class="currency-option-symbol">'+escapeHTML(item.symbol)+'</span><span class="currency-option-copy"><b>'+item.name+'</b><small>'+item.code+'</small></span><span class="currency-check">'+(item.code===cur.code?icon('check'):'')+'</span></button>').join('');
    if($('richModeOption')) { $('richModeOption').classList.toggle('selected',cur.fun); $('richModeOption').setAttribute('aria-pressed',String(cur.fun)); }
    const manual=Object.hasOwn(preferences.manualRates,cur.code);
    text('rateDescription',cur.code==='CNY'?'当前按人民币显示':'1 CNY = '+trimNumber(cur.rate,8)+' '+(cur.fun?'Z$':cur.code));
    text('rateSource',cur.code==='CNY'?'无需汇率换算':cur.fun?(manual?'自定义趣味倍率 · 非真实汇率':'趣味倍率 · 非现行货币汇率'):manual?'手动汇率 · 仅影响显示':(rates.sources[cur.code] || rates.source)+' · 报价 '+rates.dates[cur.code]);
    text('manualRateCode',cur.fun?'Z$':cur.code);
    if($('manualRateInput')) { $('manualRateInput').value=cur.rate; $('manualRateInput').disabled=cur.code==='CNY'; }
    const apply=$('exchangeForm')?.querySelector('button[type="submit"]'); if(apply) apply.disabled=cur.code==='CNY';
    if($('resetManualRate')) $('resetManualRate').disabled=!manual;
    text('manualRateHint',cur.fun?'娱乐倍率，1 元默认映射为 1,000 亿 Z$。':'自定义汇率仅影响金额展示，不改变原始工资。');
  }

  async function refreshRates() {
    if(refreshing) return;
    refreshing=true;
    const button=$('refreshRates');
    if(button) {button.disabled=true;button.classList.add('loading');}
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),9000);
    try {
      const response=await fetch(RATE_ENDPOINT,{signal:controller.signal,cache:'no-store',credentials:'omit'});
      if(!response.ok) throw new Error('rate request failed');
      const data=await response.json();
      if(!Array.isArray(data)) throw new Error('invalid rate response');
      const accepted=data.filter(item=>item.base==='CNY' && CURRENCIES[item.quote] && !['CNY','ZIM'].includes(item.quote) && number(item.rate)>0 && number(item.rate)<=1e15 && /^\d{4}-\d{2}-\d{2}$/.test(item.date));
      if(!accepted.length) throw new Error('empty rate response');
      for(const item of accepted) { rates.quotes[item.quote]=Number(item.rate);rates.dates[item.quote]=item.date;rates.sources[item.quote]='Frankfurter 在线报价'; }
      rates.source='Frankfurter 在线报价';
      save();
      refreshAll();
      const dates=[...new Set(accepted.map(item=>item.date))].sort();
      toast('汇率已更新 · 报价日期 '+dates[dates.length-1]+(Object.keys(preferences.manualRates).length?'，手动汇率继续保留':''));
    } catch (_) { toast('暂时无法联网，继续使用已保存的汇率。'); }
    finally { clearTimeout(timer);refreshing=false;if(button){button.disabled=false;button.classList.remove('loading');} }
  }

  function renderOvertimeLive() {
    const actual=new Date();
    const current=E.snapshot(actual,config);
    let timerHours=0;
    if(config.overtimeSession) timerHours=Object.values(E.overtimeSegments(config.overtimeSession.start,actual.getTime(),config)).reduce((sum,value)=>sum+value,0);
    text('overtimeTimer',duration(timerHours*3600));
    text('overtimeLiveStatus',config.overtimeSession?(current.status==='working'?'计时已开启 · 正常班次内暂停累计':'正在记录额外工作时间'):'还没有正在进行的加班');
    if($('overtimeLiveDot')) {
      const active=Boolean(config.overtimeSession) && current.status!=='working';
      $('overtimeLiveDot').classList.toggle('active',active);
      $('overtimeLiveDot').classList.toggle('paused',!active);
    }
    const button=$('overtimeTimerButton');
    if(button) {
      button.innerHTML=icon(config.overtimeSession?'stop':'play')+(config.overtimeSession?'结束并保存加班':'开始加班计时');
      button.disabled=Boolean(demo);
      button.classList.toggle('recording',Boolean(config.overtimeSession));
    }
    text('overtimeTimerHelp',demo?'体验模式不会写入加班记录，请先回到真实时间。':'正常排班时段会自动排除，关掉页面后仍可回来结算。');
    const entryHelp=$('overtimeEntryForm')?.querySelector('.field-help');
    if(entryHelp) entryHelp.textContent=config.overtimeSession?'补记已结束的额外工时；正在进行的计时会在结束后加入。':'同一天再次保存会替换该日记录；填 0 可以清除。';
    text('recordHours',trimNumber(current.monthOvertimeHours,2)+' 小时');
    moneyText('recordActualHourly',current.actualHourSalary);
    if($('overtimeDate')) $('overtimeDate').max=E.dateKey(actual);
  }
  function maxOvertimeHours(date) {
    return E.dayInfo(date,config).work?24-E.standardDaySeconds(config)/3600:24;
  }
  function toggleOvertime() {
    if(demo) {toast('先退出体验模式，再记录真实的加班时间。');return;}
    if(config.overtimeSession) {
      const segments=E.overtimeSegments(config.overtimeSession.start,Date.now(),config);
      let total=0;
      for(const [day,hours] of Object.entries(segments)) {
        const previous=number(config.overtimeRecords[day]);
        const next=Math.min(maxOvertimeHours(parseDate(day)),previous+hours);
        config.overtimeRecords[day]=next;
        total+=Math.max(0,next-previous);
      }
      config.overtimeSession=null;
      toast(total>0?'已记录 '+trimNumber(total,2)+' 小时额外工作':Object.keys(segments).length?'已有记录已达到当天额外工时上限。':'这段时间都在正常班次内，没有额外工时。');
    } else {
      config.overtimeSession={start:Date.now(),day:E.dateKey(new Date())};
      toast('加班计时已开始，正常排班时段会自动排除。');
    }
    save();refreshAll();renderOvertimeLive();
  }
  function renderOvertimeRecords() {
    const list=$('overtimeList');
    if(!list) return;
    const month=E.dateKey(new Date()).slice(0,7);
    const records=Object.entries(config.overtimeRecords).filter(([day,hours])=>day.startsWith(month) && number(hours)>0).sort((a,b)=>b[0].localeCompare(a[0]));
    if(!records.length) {list.innerHTML='<p class="empty-records">本月暂无加班记录</p>';return;}
    list.innerHTML=records.map(([day,hours])=>'<div class="overtime-record"><button class="record-date text-btn" type="button" data-edit-overtime="'+day+'"><b>'+day+'</b><small>'+escapeHTML(E.dayInfo(parseDate(day),config).name)+'</small></button><strong>'+trimNumber(hours,2)+' 小时</strong><button class="delete-record icon-btn" type="button" data-delete-overtime="'+day+'" aria-label="删除'+day+'的加班记录">'+icon('close')+'</button></div>').join('');
  }
  function saveOvertimeEntry(event) {
    event.preventDefault();
    if(demo) {text('overtimeEntryError','请先退出体验模式，再保存真实记录。');return;}
    const key=$('overtimeDate').value,date=parseDate(key),hours=Number($('overtimeHours').value);
    if(!date || key>E.dateKey(new Date())) {text('overtimeEntryError','请选择今天或更早的有效日期。');return;}
    const maximum=maxOvertimeHours(date);
    if(!Number.isFinite(hours) || hours<0 || hours>maximum) {text('overtimeEntryError','当天额外工时应在 0 至 '+trimNumber(maximum)+' 小时之间。');return;}
    if(hours===0) delete config.overtimeRecords[key]; else config.overtimeRecords[key]=hours;
    text('overtimeEntryError','');
    save();refreshAll();renderOvertimeLive();
    toast(hours===0?'已清除 '+key+' 的加班记录':'已保存 '+key+' · '+trimNumber(hours)+' 小时');
  }

  function bindEvents() {
    document.addEventListener('click',event=> {
      const button=event.target.closest('button,[data-open]');
      if(!button) return;
      if(button.dataset.open) {openDialog(button.dataset.open);return;}
      if(button.classList.contains('close-dialog')) {button.closest('dialog')?.close();return;}
      if(button.dataset.period) {setPeriod(button.dataset.period);return;}
      if(button.dataset.currency) {setCurrency(button.dataset.currency);return;}
      if(button.dataset.weekday!==undefined && settingsDraft) {
        const day=Number(button.dataset.weekday),index=settingsDraft.weekDays.indexOf(day);
        if(index>=0) settingsDraft.weekDays.splice(index,1);else settingsDraft.weekDays.push(day);
        renderWeekdays();return;
      }
      if(button.dataset.removeInterval!==undefined && settingsDraft && settingsDraft.intervals.length>1) {
        settingsDraft.intervals.splice(Number(button.dataset.removeInterval),1);renderIntervals();return;
      }
      if(button.dataset.calendarDay) {selectedDate=button.dataset.calendarDay;renderCalendar();return;}
      if(button.dataset.dayOverride && selectedDate) {
        if(button.dataset.dayOverride==='reset') delete config.overrides[selectedDate]; else config.overrides[selectedDate]=button.dataset.dayOverride;
        save();refreshAll();toast('日期已更新，日薪已重新分摊。');return;
      }
      if(button.dataset.goal) {
        const presets={coffee:['一杯咖啡',25],tea:['一杯奶茶',18],meal:['一顿好饭',45],game:['一个游戏',198]};
        const preset=presets[button.dataset.goal];if(preset){$('goalNameInput').value=preset[0];$('goalPriceInput').value=preset[1];}return;
      }
      if(button.dataset.deleteOvertime) {delete config.overtimeRecords[button.dataset.deleteOvertime];save();refreshAll();renderOvertimeLive();toast('该日加班记录已删除。');return;}
      if(button.dataset.editOvertime) {$('overtimeDate').value=button.dataset.editOvertime;$('overtimeHours').value=config.overtimeRecords[button.dataset.editOvertime];$('overtimeHours').focus();return;}
    });
    for(const dialog of all('dialog')) {
      dialog.addEventListener('close',()=> {if(!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');});
      dialog.addEventListener('click',event=> {if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom)dialog.close();});
    }
    $('salaryForm')?.addEventListener('submit',event=> {
      event.preventDefault();const salary=Number($('salaryInput').value);const result=E.validateConfig({...config,salary});
      if(!result.valid){text('salaryHint',result.errors[0]);$('salaryInput').setAttribute('aria-invalid','true');toast(result.errors[0]);return;}
      config.salary=salary;config.configured=true;$('salaryInput').removeAttribute('aria-invalid');$('salaryForm').classList.remove('is-dirty');text('salaryHint','已保存 · 收入按实际工作日分摊');save();refreshAll();toast('月薪已保存，日薪已重新计算。');
    });
    $('salaryInput')?.addEventListener('input',()=>{$('salaryInput').removeAttribute('aria-invalid');$('salaryForm').classList.add('is-dirty');text('salaryHint','输入后按回车或勾号应用。');});
    $('salaryInput')?.addEventListener('invalid',event=>{event.preventDefault();const result=E.validateConfig({...config,salary:Number(event.target.value)});const message=result.errors[0] || '月薪需为 1 元至 10 亿元，可保留两位小数。';text('salaryHint',message);event.target.setAttribute('aria-invalid','true');toast(message);event.target.focus();});
    $('settingsForm')?.addEventListener('submit',saveSettings);
    $('settingsForm')?.addEventListener('change',event=> {if(event.target.name==='calendarMode' && settingsDraft){settingsDraft.calendar=event.target.value;renderWeekdays();}});
    $('intervalFields')?.addEventListener('input',event=> {const input=event.target;if(settingsDraft && input.dataset.interval!==undefined){settingsDraft.intervals[Number(input.dataset.interval)][Number(input.dataset.edge)]=input.value;renderScheduleTotal();text('settingsError','');}});
    $('addInterval')?.addEventListener('click',()=> {
      if(!settingsDraft || settingsDraft.intervals.length>=4)return;
      const end=E.timeMinutes(settingsDraft.intervals[settingsDraft.intervals.length-1][1]);
      const start=Math.min(23*60,number(end,17*60)+30),finish=Math.min(23*60+59,start+120);
      if(start<=end || finish<=start){text('settingsError','当天已经没有可添加的时间，请先调整前一个时段。');return;}
      const hhmm=value=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
      settingsDraft.intervals.push([hhmm(start),hhmm(finish)]);renderIntervals();
    });
    $('restoreSchedule')?.addEventListener('click',()=> {if(settingsDraft){settingsDraft.intervals=clone(E.defaults.intervals);renderIntervals();text('settingsError','');}});
    $('previousMonth')?.addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);selectedDate=null;renderCalendar();});
    $('nextMonth')?.addEventListener('click',()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);selectedDate=null;renderCalendar();});
    $('calendarToday')?.addEventListener('click',()=>{const now=new Date();calendarDate=new Date(now.getFullYear(),now.getMonth(),1);selectedDate=E.dateKey(now);renderCalendar();});
    $('richModeOption')?.addEventListener('click',()=>setCurrency('ZIM'));
    $('refreshRates')?.addEventListener('click',refreshRates);
    $('exchangeForm')?.addEventListener('submit',event=>{event.preventDefault();const value=Number($('manualRateInput').value),code=preferences.currency;if(code==='CNY')return;if(!Number.isFinite(value)||value<=0||value>1e15){toast('请输入大于 0、且不超过 1,000,000,000,000,000 的倍率。');return;}preferences.manualRates[code]=value;save();refreshAll();toast('手动汇率已应用。');});
    $('resetManualRate')?.addEventListener('click',()=>{delete preferences.manualRates[preferences.currency];save();refreshAll();toast('已恢复默认汇率。');});
    $('demoButton')?.addEventListener('click',toggleDemo);
    $('exitDemo')?.addEventListener('click',()=>{if(demo)toggleDemo();});
    $('overtimeRange')?.addEventListener('input',event=>{config.estimatedOvertime=clamp(number(event.target.value),0,8);save();render();});
    $('extraPayToggle')?.addEventListener('click',()=>{const field=$('extraPayField');if(field){field.hidden=!field.hidden;if(!field.hidden)$('extraPayInput')?.focus();}});
    $('extraPayInput')?.addEventListener('input',event=>{config.extraPay=clamp(number(event.target.value),0,1e6);save();render();});
    $('extraPayInput')?.addEventListener('change',event=>{event.target.value=config.extraPay;});
    $('overtimeTimerButton')?.addEventListener('click',toggleOvertime);
    $('overtimeEntryForm')?.addEventListener('submit',saveOvertimeEntry);
    $('overtimeDate')?.addEventListener('change',()=>{const key=$('overtimeDate').value;if(Object.hasOwn(config.overtimeRecords,key))$('overtimeHours').value=config.overtimeRecords[key];text('overtimeEntryError','');});
    $('goalForm')?.addEventListener('submit',event=>{event.preventDefault();const name=$('goalNameInput').value.trim(),price=Number($('goalPriceInput').value);if(!name||!Number.isFinite(price)||price<=0||price>1e8){toast('填一个目标名称和有效金额吧。');return;}preferences.goal={name:name.slice(0,12),price};save();$('goalDialog').close();render();toast('新的小目标：'+name+'。');});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
    window.addEventListener('pageshow',()=>render());
  }

  loadState();
  if($('salaryInput')) $('salaryInput').value=config.salary;
  if($('overtimeRange')) $('overtimeRange').value=config.estimatedOvertime;
  if($('extraPayInput')) $('extraPayInput').value=config.extraPay;
  if($('overtimeHours')) $('overtimeHours').step='any';
  hidden('extraPayField',config.extraPay<=0);
  text('salaryHint',config.configured?'已保存 · 收入按你的实际工作日分摊':'示例月薪，可以改成你的实际工资。');
  window.SalaryApp={getState,setTemplate,setCurrency,setPeriod,toggleDemo,openDialog,render,toast,setPreference,formatMoney,getNow,refreshRates,onChange(callback){listeners.add(callback);return()=>listeners.delete(callback);}};
  bindEvents();
  render();
  setInterval(()=>{if(!document.hidden || config.overtimeSession)render();},200);
  if(storageUnavailable)setTimeout(()=>toast('当前浏览器限制了本地存储，设置仅在本次打开有效。'),600);
})();

//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectionLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = [];

    var _this = {};

    var makeImpl = function(test, maskPattern) {

      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }

      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
              || (0 <= c && c <= 6 && (r == 0 || r == 6) )
              || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                  || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw 'code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')';
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data, mode) {

      mode = mode || 'Byte';

      var newData = null;

      switch(mode) {
      case 'Numeric' :
        newData = qrNumber(data);
        break;
      case 'Alphanumeric' :
        newData = qrAlphaNum(data);
        break;
      case 'Byte' :
        newData = qr8BitByte(data);
        break;
      case 'Kanji' :
        newData = qrKanji(data);
        break;
      default :
        throw 'mode:' + mode;
      }

      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw row + ',' + col;
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function() {
      if (_typeNumber < 1) {
        var typeNumber = 1;

        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = qrBitBuffer();

          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
            data.write(buffer);
          }

          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
          }

          if (buffer.getLengthInBits() <= totalDataCount * 8) {
            break;
          }
        }

        _typeNumber = typeNumber;
      }

      makeImpl(false, getBestMaskPattern() );
    };

    _this.createTableTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var qrHtml = '';

      qrHtml += '<table style="';
      qrHtml += ' border-width: 0px; border-style: none;';
      qrHtml += ' border-collapse: collapse;';
      qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
      qrHtml += '">';
      qrHtml += '<tbody>';

      for (var r = 0; r < _this.getModuleCount(); r += 1) {

        qrHtml += '<tr>';

        for (var c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: 0px;';
          qrHtml += ' width: ' + cellSize + 'px;';
          qrHtml += ' height: ' + cellSize + 'px;';
          qrHtml += ' background-color: ';
          qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
          qrHtml += ';';
          qrHtml += '"/>';
        }

        qrHtml += '</tr>';
      }

      qrHtml += '</tbody>';
      qrHtml += '</table>';

      return qrHtml;
    };

    _this.createSvgTag = function(cellSize, margin, alt, title) {

      var opts = {};
      if (typeof arguments[0] == 'object') {
        // Called by options.
        opts = arguments[0];
        // overwrite cellSize and margin.
        cellSize = opts.cellSize;
        margin = opts.margin;
        alt = opts.alt;
        title = opts.title;
      }

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      // Compose alt property surrogate
      alt = (typeof alt === 'string') ? {text: alt} : alt || {};
      alt.text = alt.text || null;
      alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

      // Compose title property surrogate
      title = (typeof title === 'string') ? {text: title} : title || {};
      title.text = title.text || null;
      title.id = (title.text) ? title.id || 'qrcode-title' : null;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var c, mc, r, mr, qrSvg='', rect;

      rect = 'l' + cellSize + ',0 0,' + cellSize +
        ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

      qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
      qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
      qrSvg += ' preserveAspectRatio="xMinYMin meet"';
      qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
          escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
      qrSvg += '>';
      qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
          escapeXml(title.text) + '</title>' : '';
      qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
          escapeXml(alt.text) + '</description>' : '';
      qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
      qrSvg += '<path d="';

      for (r = 0; r < _this.getModuleCount(); r += 1) {
        mr = r * cellSize + margin;
        for (c = 0; c < _this.getModuleCount(); c += 1) {
          if (_this.isDark(r, c) ) {
            mc = c*cellSize+margin;
            qrSvg += 'M' + mc + ',' + mr + rect;
          }
        }
      }

      qrSvg += '" stroke="transparent" fill="black"/>';
      qrSvg += '</svg>';

      return qrSvg;
    };

    _this.createDataURL = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      return createDataURL(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          var c = Math.floor( (x - min) / cellSize);
          var r = Math.floor( (y - min) / cellSize);
          return _this.isDark(r, c)? 0 : 1;
        } else {
          return 1;
        }
      } );
    };

    _this.createImgTag = function(cellSize, margin, alt) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;

      var img = '';
      img += '<img';
      img += '\u0020src="';
      img += _this.createDataURL(cellSize, margin);
      img += '"';
      img += '\u0020width="';
      img += size;
      img += '"';
      img += '\u0020height="';
      img += size;
      img += '"';
      if (alt) {
        img += '\u0020alt="';
        img += escapeXml(alt);
        img += '"';
      }
      img += '/>';

      return img;
    };

    var escapeXml = function(s) {
      var escaped = '';
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charAt(i);
        switch(c) {
        case '<': escaped += '&lt;'; break;
        case '>': escaped += '&gt;'; break;
        case '&': escaped += '&amp;'; break;
        case '"': escaped += '&quot;'; break;
        default : escaped += c; break;
        }
      }
      return escaped;
    };

    var _createHalfASCII = function(margin) {
      var cellSize = 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r1, r2, p;

      var blocks = {
        '██': '█',
        '█ ': '▀',
        ' █': '▄',
        '  ': ' '
      };

      var blocksLastLineNoMargin = {
        '██': '▀',
        '█ ': '▀',
        ' █': ' ',
        '  ': ' '
      };

      var ascii = '';
      for (y = 0; y < size; y += 2) {
        r1 = Math.floor((y - min) / cellSize);
        r2 = Math.floor((y + 1 - min) / cellSize);
        for (x = 0; x < size; x += 1) {
          p = '█';

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
            p = ' ';
          }

          if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
            p += ' ';
          }
          else {
            p += '█';
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
        }

        ascii += '\n';
      }

      if (size % 2 && margin > 0) {
        return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('▀');
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.createASCII = function(cellSize, margin) {
      cellSize = cellSize || 1;

      if (cellSize < 2) {
        return _createHalfASCII(margin);
      }

      cellSize -= 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r, p;

      var white = Array(cellSize+1).join('██');
      var black = Array(cellSize+1).join('  ');

      var ascii = '';
      var line = '';
      for (y = 0; y < size; y += 1) {
        r = Math.floor( (y - min) / cellSize);
        line = '';
        for (x = 0; x < size; x += 1) {
          p = 1;

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
            p = 0;
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          line += p ? white : black;
        }

        for (r = 0; r < cellSize; r += 1) {
          ascii += line + '\n';
        }
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.renderTo2dContext = function(context, cellSize) {
      cellSize = cellSize || 2;
      var length = _this.getModuleCount();
      for (var row = 0; row < length; row++) {
        for (var col = 0; col < length; col++) {
          context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
          context.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
        }
      }
    }

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytesFuncs = {
    'default' : function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
      }
      return bytes;
    }
  };

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];

  //---------------------------------------------------------------------
  // qrcode.createStringToBytes
  //---------------------------------------------------------------------

  /**
   * @param unicodeData base64 string of byte array.
   * [16bit Unicode],[16bit Bytes], ...
   * @param numChars
   */
  qrcode.createStringToBytes = function(unicodeData, numChars) {

    // create conversion map.

    var unicodeMap = function() {

      var bin = base64DecodeInputStream(unicodeData);
      var read = function() {
        var b = bin.read();
        if (b == -1) throw 'eof';
        return b;
      };

      var count = 0;
      var unicodeMap = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode( (b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + ' != ' + numChars;
      }

      return unicodeMap;
    }();

    var unknownChar = '?'.charCodeAt(0);

    return function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == 'number') {
            if ( (b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :    1 << 0,
    MODE_ALPHA_NUM : 1 << 1,
    MODE_8BIT_BYTE : 1 << 2,
    MODE_KANJI :     1 << 3
  };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectionLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 :
        return function(i, j) { return (i + j) % 2 == 0; };
      case QRMaskPattern.PATTERN001 :
        return function(i, j) { return i % 2 == 0; };
      case QRMaskPattern.PATTERN010 :
        return function(i, j) { return j % 3 == 0; };
      case QRMaskPattern.PATTERN011 :
        return function(i, j) { return (i + j) % 3 == 0; };
      case QRMaskPattern.PATTERN100 :
        return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
      case QRMaskPattern.PATTERN101 :
        return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
      case QRMaskPattern.PATTERN110 :
        return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
      case QRMaskPattern.PATTERN111 :
        return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

      default :
        throw 'bad maskPattern:' + maskPattern;
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 10;
        case QRMode.MODE_ALPHA_NUM : return 9;
        case QRMode.MODE_8BIT_BYTE : return 8;
        case QRMode.MODE_KANJI     : return 8;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 12;
        case QRMode.MODE_ALPHA_NUM : return 11;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 10;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 14;
        case QRMode.MODE_ALPHA_NUM : return 13;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 12;
        default :
          throw 'mode:' + mode;
        }

      } else {
        throw 'type:' + type;
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row, col + 1)
              &&  qrcode.isDark(row, col + 2)
              &&  qrcode.isDark(row, col + 3)
              &&  qrcode.isDark(row, col + 4)
              && !qrcode.isDark(row, col + 5)
              &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row + 1, col)
              &&  qrcode.isDark(row + 2, col)
              &&  qrcode.isDark(row + 3, col)
              &&  qrcode.isDark(row + 4, col)
              && !qrcode.isDark(row + 5, col)
              &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw 'glog(' + n + ')';
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw num.length + '/' + shift;
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],

      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],

      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],

      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],

      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],

      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],

      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],

      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],

      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],

      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],

      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],

      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],

      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],

      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],

      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],

      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],

      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],

      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],

      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],

      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],

      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],

      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],

      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],

      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],

      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],

      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],

      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],

      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],

      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],

      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],

      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var _this = {};

    var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

      switch(errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default :
        return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

      if (typeof rsBlock == 'undefined') {
        throw 'bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel;
      }

      var length = rsBlock.length / 3;

      var list = [];

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = [];
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrNumber
  //---------------------------------------------------------------------

  var qrNumber = function(data) {

    var _mode = QRMode.MODE_NUMBER;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var data = _data;

      var i = 0;

      while (i + 2 < data.length) {
        buffer.put(strToNum(data.substring(i, i + 3) ), 10);
        i += 3;
      }

      if (i < data.length) {
        if (data.length - i == 1) {
          buffer.put(strToNum(data.substring(i, i + 1) ), 4);
        } else if (data.length - i == 2) {
          buffer.put(strToNum(data.substring(i, i + 2) ), 7);
        }
      }
    };

    var strToNum = function(s) {
      var num = 0;
      for (var i = 0; i < s.length; i += 1) {
        num = num * 10 + chatToNum(s.charAt(i) );
      }
      return num;
    };

    var chatToNum = function(c) {
      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      }
      throw 'illegal char :' + c;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrAlphaNum
  //---------------------------------------------------------------------

  var qrAlphaNum = function(data) {

    var _mode = QRMode.MODE_ALPHA_NUM;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var s = _data;

      var i = 0;

      while (i + 1 < s.length) {
        buffer.put(
          getCode(s.charAt(i) ) * 45 +
          getCode(s.charAt(i + 1) ), 11);
        i += 2;
      }

      if (i < s.length) {
        buffer.put(getCode(s.charAt(i) ), 6);
      }
    };

    var getCode = function(c) {

      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      } else if ('A' <= c && c <= 'Z') {
        return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      } else {
        switch (c) {
        case ' ' : return 36;
        case '$' : return 37;
        case '%' : return 38;
        case '*' : return 39;
        case '+' : return 40;
        case '-' : return 41;
        case '.' : return 42;
        case '/' : return 43;
        case ':' : return 44;
        default :
          throw 'illegal char :' + c;
        }
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrKanji
  //---------------------------------------------------------------------

  var qrKanji = function(data) {

    var _mode = QRMode.MODE_KANJI;
    var _data = data;

    var stringToBytes = qrcode.stringToBytesFuncs['SJIS'];
    if (!stringToBytes) {
      throw 'sjis not supported.';
    }
    !function(c, code) {
      // self test for sjis support.
      var test = stringToBytes(c);
      if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
        throw 'sjis not supported.';
      }
    }('\u53cb', 0x9746);

    var _bytes = stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return ~~(_bytes.length / 2);
    };

    _this.write = function(buffer) {

      var data = _bytes;

      var i = 0;

      while (i + 1 < data.length) {

        var c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

        if (0x8140 <= c && c <= 0x9FFC) {
          c -= 0x8140;
        } else if (0xE040 <= c && c <= 0xEBBF) {
          c -= 0xC140;
        } else {
          throw 'illegal char at ' + (i + 1) + '/' + c;
        }

        c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

        buffer.put(c, 13);

        i += 2;
      }

      if (i < data.length) {
        throw 'illegal char at ' + (i + 1);
      }
    };

    return _this;
  };

  //=====================================================================
  // GIF Support etc.
  //

  //---------------------------------------------------------------------
  // byteArrayOutputStream
  //---------------------------------------------------------------------

  var byteArrayOutputStream = function() {

    var _bytes = [];

    var _this = {};

    _this.writeByte = function(b) {
      _bytes.push(b & 0xff);
    };

    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };

    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (var i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };

    _this.writeString = function(s) {
      for (var i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i) );
      }
    };

    _this.toByteArray = function() {
      return _bytes;
    };

    _this.toString = function() {
      var s = '';
      s += '[';
      for (var i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ',';
        }
        s += _bytes[i];
      }
      s += ']';
      return s;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64EncodeOutputStream
  //---------------------------------------------------------------------

  var base64EncodeOutputStream = function() {

    var _buffer = 0;
    var _buflen = 0;
    var _length = 0;
    var _base64 = '';

    var _this = {};

    var writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 0x3f) );
    };

    var encode = function(n) {
      if (n < 0) {
        // error.
      } else if (n < 26) {
        return 0x41 + n;
      } else if (n < 52) {
        return 0x61 + (n - 26);
      } else if (n < 62) {
        return 0x30 + (n - 52);
      } else if (n == 62) {
        return 0x2b;
      } else if (n == 63) {
        return 0x2f;
      }
      throw 'n:' + n;
    };

    _this.writeByte = function(n) {

      _buffer = (_buffer << 8) | (n & 0xff);
      _buflen += 8;
      _length += 1;

      while (_buflen >= 6) {
        writeEncoded(_buffer >>> (_buflen - 6) );
        _buflen -= 6;
      }
    };

    _this.flush = function() {

      if (_buflen > 0) {
        writeEncoded(_buffer << (6 - _buflen) );
        _buffer = 0;
        _buflen = 0;
      }

      if (_length % 3 != 0) {
        // padding
        var padlen = 3 - _length % 3;
        for (var i = 0; i < padlen; i += 1) {
          _base64 += '=';
        }
      }
    };

    _this.toString = function() {
      return _base64;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64DecodeInputStream
  //---------------------------------------------------------------------

  var base64DecodeInputStream = function(str) {

    var _str = str;
    var _pos = 0;
    var _buffer = 0;
    var _buflen = 0;

    var _this = {};

    _this.read = function() {

      while (_buflen < 8) {

        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw 'unexpected end of file./' + _buflen;
        }

        var c = _str.charAt(_pos);
        _pos += 1;

        if (c == '=') {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\s$/) ) {
          // ignore if whitespace.
          continue;
        }

        _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
        _buflen += 6;
      }

      var n = (_buffer >>> (_buflen - 8) ) & 0xff;
      _buflen -= 8;
      return n;
    };

    var decode = function(c) {
      if (0x41 <= c && c <= 0x5a) {
        return c - 0x41;
      } else if (0x61 <= c && c <= 0x7a) {
        return c - 0x61 + 26;
      } else if (0x30 <= c && c <= 0x39) {
        return c - 0x30 + 52;
      } else if (c == 0x2b) {
        return 62;
      } else if (c == 0x2f) {
        return 63;
      } else {
        throw 'c:' + c;
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // gifImage (B/W)
  //---------------------------------------------------------------------

  var gifImage = function(width, height) {

    var _width = width;
    var _height = height;
    var _data = new Array(width * height);

    var _this = {};

    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };

    _this.write = function(out) {

      //---------------------------------
      // GIF Signature

      out.writeString('GIF87a');

      //---------------------------------
      // Screen Descriptor

      out.writeShort(_width);
      out.writeShort(_height);

      out.writeByte(0x80); // 2bit
      out.writeByte(0);
      out.writeByte(0);

      //---------------------------------
      // Global Color Map

      // black
      out.writeByte(0x00);
      out.writeByte(0x00);
      out.writeByte(0x00);

      // white
      out.writeByte(0xff);
      out.writeByte(0xff);
      out.writeByte(0xff);

      //---------------------------------
      // Image Descriptor

      out.writeString(',');
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);

      //---------------------------------
      // Local Color Map

      //---------------------------------
      // Raster Data

      var lzwMinCodeSize = 2;
      var raster = getLZWRaster(lzwMinCodeSize);

      out.writeByte(lzwMinCodeSize);

      var offset = 0;

      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }

      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0x00);

      //---------------------------------
      // GIF Terminator
      out.writeString(';');
    };

    var bitOutputStream = function(out) {

      var _out = out;
      var _bitLength = 0;
      var _bitBuffer = 0;

      var _this = {};

      _this.write = function(data, length) {

        if ( (data >>> length) != 0) {
          throw 'length over';
        }

        while (_bitLength + length >= 8) {
          _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
          length -= (8 - _bitLength);
          data >>>= (8 - _bitLength);
          _bitBuffer = 0;
          _bitLength = 0;
        }

        _bitBuffer = (data << _bitLength) | _bitBuffer;
        _bitLength = _bitLength + length;
      };

      _this.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };

      return _this;
    };

    var getLZWRaster = function(lzwMinCodeSize) {

      var clearCode = 1 << lzwMinCodeSize;
      var endCode = (1 << lzwMinCodeSize) + 1;
      var bitLength = lzwMinCodeSize + 1;

      // Setup LZWTable
      var table = lzwTable();

      for (var i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i) );
      }
      table.add(String.fromCharCode(clearCode) );
      table.add(String.fromCharCode(endCode) );

      var byteOut = byteArrayOutputStream();
      var bitOut = bitOutputStream(byteOut);

      // clear code
      bitOut.write(clearCode, bitLength);

      var dataIndex = 0;

      var s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      while (dataIndex < _data.length) {

        var c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;

        if (table.contains(s + c) ) {

          s = s + c;

        } else {

          bitOut.write(table.indexOf(s), bitLength);

          if (table.size() < 0xfff) {

            if (table.size() == (1 << bitLength) ) {
              bitLength += 1;
            }

            table.add(s + c);
          }

          s = c;
        }
      }

      bitOut.write(table.indexOf(s), bitLength);

      // end code
      bitOut.write(endCode, bitLength);

      bitOut.flush();

      return byteOut.toByteArray();
    };

    var lzwTable = function() {

      var _map = {};
      var _size = 0;

      var _this = {};

      _this.add = function(key) {
        if (_this.contains(key) ) {
          throw 'dup key:' + key;
        }
        _map[key] = _size;
        _size += 1;
      };

      _this.size = function() {
        return _size;
      };

      _this.indexOf = function(key) {
        return _map[key];
      };

      _this.contains = function(key) {
        return typeof _map[key] != 'undefined';
      };

      return _this;
    };

    return _this;
  };

  var createDataURL = function(width, height, getPixel) {
    var gif = gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y) );
      }
    }

    var b = byteArrayOutputStream();
    gif.write(b);

    var base64 = base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    return 'data:image/gif;base64,' + base64;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();

// multibyte support
!function() {

  qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
    // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
    function toUTF8Array(str) {
      var utf8 = [];
      for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6),
              0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
          i++;
          // UTF-16 encodes 0x10000-0x10FFFF by
          // subtracting 0x10000 and splitting the
          // 20 bits of 0x0-0xFFFFF into two halves
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
            | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18),
              0x80 | ((charcode>>12) & 0x3f),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
      }
      return utf8;
    }
    return toUTF8Array(s);
  };

}();

(function (factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof exports === 'object') {
      module.exports = factory();
  }
}(function () {
    return qrcode;
}));
//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript UTF8 Support (optional)
//
// Copyright (c) 2011 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

!function(qrcode) {

  //---------------------------------------------------------------------
  // overwrite qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

}(qrcode);

/*
MIT License

Copyright (c) 2009 Kazuhiko Arase

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

/* Salary Flow sharing. Canvas stays origin-clean: no external images or font requests. */
(function(){
'use strict';
const $=id=>document.getElementById(id),dialog=$('shareDialog'),canvas=$('shareCanvas');
if(!dialog||!canvas)return;
const ctx=canvas.getContext('2d'),APP=()=>window.SalaryApp;
let frozen=null,lastBlob=null,renderVersion=0,drawQueue=Promise.resolve();
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=v=>JSON.parse(JSON.stringify(v));
const fmt=(v,n=2)=>finite(v).toLocaleString('en-US',{minimumFractionDigits:n,maximumFractionDigits:n});
function privateHost(host){host=host.toLowerCase().replace(/^\[|\]$/g,'');return host==='localhost'||host==='::1'||host==='0.0.0.0'||host==='terminal.local'||!host.includes('.')||/\.(localhost|local|internal|test|invalid)$/.test(host)||/^(127|10)\./.test(host)||/^192\.168\./.test(host)||/^172\.(1[6-9]|2\d|3[01])\./.test(host)||/^169\.254\./.test(host)||/^(fc|fd|fe80):/i.test(host);}
function publicUrl(raw){try{const u=new URL(String(raw).trim());if(!['https:','http:'].includes(u.protocol)||u.username||u.password||privateHost(u.hostname))return null;return u.origin+u.pathname;}catch(_){return null;}}
function autoUrl(){return publicUrl(location.href);}
function caption(){return dialog.querySelector('input[name=shareCaption]:checked')?.value||'每秒都算数';}
function money(value,decimals=2){const c=frozen.currency;let v=finite(value)*finite(c.rate,1),unit='';const choices=[[1e24,'亿亿亿'],[1e20,'万亿亿'],[1e16,'亿亿'],[1e12,'万亿'],[1e8,'亿'],[1e4,'万']];if(c.fun||Math.abs(v)>=1e7){const chosen=choices.find(([n])=>Math.abs(v)>=n&&(!c.fun||n>=1e8));if(chosen){v/=chosen[0];unit=chosen[1];}else if(c.fun){v/=1e8;unit='亿';}}return(c.symbol||'¥')+' '+fmt(v,decimals)+(unit?' '+unit:'');}
function badges(){const result=[];if(!frozen.config.configured)result.push('示例工资');if(frozen.demo)result.push('演示 · '+finite(frozen.demo.speed,20)+'× 时间');if(frozen.currency.fun)result.push('趣味倍率 · 非实际汇率');return result;}
function shareText(){const s=frozen.snapshot;let text=caption()+'。\n'+s.dayKey+' · 薪动\n今天已赚 '+money(s.todayEarned)+'\n工作时段每秒 '+money(s.secondSalary,frozen.currency.fun?2:4)+'\n今日工作进度 '+fmt(s.progress*100,1)+'%';if($('shareIncludeSalary').checked)text+='\n月薪 ¥ '+fmt(frozen.config.salary);const marks=badges();if(marks.length)text+='\n'+marks.join(' · ');text+='\n按设定工资和工作时段折算，非实际到账记录。';const url=publicUrl($('shareUrl').value);if($('shareQrMode').value==='link'&&url)text+='\n'+url;return text;}
function qrPayload(){const mode=$('shareQrMode').value;if(mode==='none')return null;if(mode==='text')return{text:shareText(),label:'扫码查看今日战绩',hint:'文字二维码 · 不会打开网页'};const raw=$('shareUrl').value.trim(),url=publicUrl(raw);$('shareUrlError').textContent=raw&&!url?'请填写可公开访问的 http / https 网页链接。':'';if(!url)return null;return{text:url,label:'扫码试试，你每秒值多少',hint:'你的工资和加班记录不会随链接分享'};}
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function write(text,x,y,size=28,color='#f3f3f3',weight=400,family='Geist, "PingFang SC", "Microsoft YaHei", sans-serif',maxWidth){ctx.font=weight+' '+size+'px '+family;ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='alphabetic';if(maxWidth){while(ctx.measureText(text).width>maxWidth&&size>18){size-=2;ctx.font=weight+' '+size+'px '+family;}}ctx.fillText(text,x,y);return size;}
function wrap(text,x,y,width,size=23,color='#86898a',line=36){let row='';for(const char of text){ctx.font='400 '+size+'px Geist,"PingFang SC","Microsoft YaHei",sans-serif';if(ctx.measureText(row+char).width>width&&row){write(row,x,y,size,color);y+=line;row=char;}else row+=char;}if(row)write(row,x,y,size,color);return y;}
function drawQR(payload,x,y,outer=208){const qr=qrcode(0,'M');qr.addData(payload,'Byte');qr.make();const modules=qr.getModuleCount(),cell=Math.max(1,Math.floor(outer/(modules+8))),size=(modules+8)*cell;rounded(x,y,size,size,0,'#fff');ctx.fillStyle='#111';for(let row=0;row<modules;row++)for(let col=0;col<modules;col++)if(qr.isDark(row,col))ctx.fillRect(x+(col+4)*cell,y+(row+4)*cell,cell,cell);return size;}
function drawDevice(theme,p,accent){
if(theme==='pig'){
const pig=document.getElementById('piggyImage');if(pig&&pig.complete&&pig.naturalWidth&&String(pig.currentSrc||pig.src).startsWith('data:image/')){ctx.drawImage(pig,350,563,380,380);}else{write('每一秒，存下一个小愿望。',190,737,37,accent);}rounded(225,919,630,8,4,'#36312d');if(p>0)rounded(225,919,630*p,8,4,accent);
}else if(theme==='meter'){
write('0',80,635,22,'#717174');write('50',514,635,22,'#717174');write('100',948,635,22,'#717174');const n=34,gap=10,w=(920-gap*(n-1))/n;for(let i=0;i<n;i++){const x=80+i*(w+gap),f=clamp(p*n-i,0,1);rounded(x,667,w,145,6,'#303031');if(f>0)rounded(x,667+145*(1-f),w,145*f,Math.min(6,145*f/2),accent);}write('今天的时间，正在变成收入。',80,867,24,'#8b8b8d');
}else if(theme==='pixel'){
const cols=34,rows=11,gap=5,size=22,x0=80,y0=590,ints=(frozen.config.intervals||[['09:00','12:00'],['13:30','18:00']]).map(([a,b])=>[a,b].map(v=>{const [h,m]=v.split(':').map(Number);return h*60+m;}));const start=ints[0][0],end=ints[ints.length-1][1],total=ints.reduce((a,v)=>a+v[1]-v[0],0),at=new Date(frozen.time),nowMinute=at.getHours()*60+at.getMinutes()+at.getSeconds()/60;for(let col=0;col<cols;col++){const t=start+(end-start)*(col+1)/cols,cum=ints.reduce((a,[a0,b0])=>a+clamp(t-a0,0,b0-a0),0),height=Math.ceil(cum/total*rows),past=t<=nowMinute&&frozen.snapshot.isWorkday;for(let row=0;row<height;row++){const y=y0+(rows-1-row)*(size+gap);rounded(x0+col*(size+gap),y,size,size,1,past?accent:'#2b2b2d');}}write(ints.length?frozen.config.intervals[0][0]:'09:00',80,922,22,'#818183');write(frozen.config.intervals.at(-1)[1],925,922,22,'#818183');
}else if(theme==='neon'){
ctx.save();ctx.lineWidth=16;ctx.strokeStyle='#232849';ctx.beginPath();ctx.arc(540,719,110,0,Math.PI*2);ctx.stroke();if(p>0){ctx.strokeStyle=accent;ctx.shadowColor=accent;ctx.shadowBlur=32;ctx.lineCap='round';ctx.beginPath();ctx.arc(540,719,110,-Math.PI/2,-Math.PI/2+Math.PI*2*p);ctx.stroke();}ctx.restore();ctx.fillStyle='#e8ecff';ctx.font='500 44px Geist,sans-serif';ctx.textAlign='center';ctx.fillText(fmt(p*100,1)+'%',540,737);ctx.fillStyle='#7a82b4';ctx.font='400 20px "PingFang SC",sans-serif';ctx.fillText('今日进度',540,775);ctx.textAlign='left';
}else if(theme==='mono'){
ctx.fillStyle='#f0f0f0';ctx.font='300 56px Geist,sans-serif';ctx.textAlign='center';ctx.fillText(fmt(p*100,1)+'%',540,690);ctx.textAlign='left';ctx.strokeStyle='#3a3a3a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(140,740);ctx.lineTo(940,740);ctx.stroke();if(p>0){ctx.strokeStyle=accent;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(140,740);ctx.lineTo(140+800*p,740);ctx.stroke();}write('每一秒，都算数。',468,800,22,'#8a8a8a');
}else if(theme==='paper'){
rounded(150,600,780,250,8,'#fbf7ec');ctx.save();ctx.fillStyle='rgba(210,190,140,.55)';ctx.translate(260,588);ctx.rotate(-0.06);ctx.fillRect(-52,0,104,26);ctx.restore();ctx.save();ctx.fillStyle='rgba(210,190,140,.55)';ctx.translate(820,588);ctx.rotate(0.05);ctx.fillRect(-52,0,104,26);ctx.restore();ctx.strokeStyle='#e9e0cb';ctx.lineWidth=1;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(190,682+i*34);ctx.lineTo(890,682+i*34);ctx.stroke();}ctx.fillStyle='#6d5c40';ctx.font='24px "PingFang SC",sans-serif';ctx.fillText('今日存钱进度',190,660);ctx.fillStyle='#a4531f';ctx.font='600 40px Georgia,serif';ctx.textAlign='right';ctx.fillText(fmt(p*100,1)+'%',880,660);ctx.textAlign='left';if(p>0){ctx.strokeStyle=accent;ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();const seg=Math.max(1,Math.round(40*p));for(let i=0;i<=seg;i++){const x=190+i*(700/40);const y=730+Math.sin(i*.9)*6;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}ctx.fillStyle='#b25a24';ctx.font='20px "PingFang SC",sans-serif';ctx.strokeStyle='#b25a24';ctx.lineWidth=1.5;ctx.strokeRect(852,792,56,32);ctx.fillText('薪动',858,815);
}else if(theme==='term'){
ctx.fillStyle='#0d1117';rounded(140,600,800,280,12,'#0d1117');ctx.strokeStyle='#2d333b';ctx.lineWidth=2;rounded(140,600,800,280,12,'transparent');ctx.stroke();ctx.fillStyle='#39d353';ctx.font='26px ui-monospace,monospace';ctx.fillText('xin@dong:~$ ./salary --watch',180,660);const cells=30,on=Math.round(p*cells);let bar='[';for(let i=0;i<cells;i++)bar+=i<on?'█':'░';bar+=']';ctx.font='44px ui-monospace,monospace';ctx.fillText(bar,180,740);ctx.font='40px ui-monospace,monospace';ctx.fillText(fmt(p*100,1)+'%',180,815);if(Math.floor(frozen.time/800)%2===0){ctx.fillRect(180+ctx.measureText(fmt(p*100,1)+'%').width+14,782,20,40);}
}else if(theme==='ecg'){
ctx.strokeStyle='#3a2b2b';ctx.lineWidth=3;ctx.beginPath();const ecgX=(i)=>80+i*20;const ecgY=(i)=>[719,719,679,774,719][i%5];for(let i=0;i<46;i++){ctx.lineTo(ecgX(i),ecgY(i));}ctx.stroke();if(p>0){ctx.save();ctx.strokeStyle=accent;ctx.shadowColor=accent;ctx.shadowBlur=18;ctx.lineWidth=4;ctx.beginPath();const on=Math.round(46*p);for(let i=0;i<=on;i++){ctx.lineTo(ecgX(i),ecgY(i));}ctx.stroke();ctx.restore();}ctx.fillStyle='#ffb3ab';ctx.font='400 24px Geist,sans-serif';ctx.fillText('心率 · 薪跳 '+fmt(p*100,1)+'%',80,860);
}else if(theme==='wave'){
ctx.strokeStyle='#1e3a5f';ctx.lineWidth=5;ctx.beginPath();ctx.arc(540,719,130,0,Math.PI*2);ctx.stroke();ctx.save();ctx.beginPath();ctx.arc(540,719,126,0,Math.PI*2);ctx.clip();ctx.fillStyle='#0b1526';ctx.fillRect(400,579,280,280);if(p>0){ctx.fillStyle=accent;ctx.globalAlpha=.85;ctx.beginPath();const wy=859-280*p;ctx.moveTo(400,859);ctx.lineTo(400,wy);for(let x=400;x<=680;x+=10){ctx.lineTo(x,wy+Math.sin(x/28)*8);}ctx.lineTo(680,859);ctx.closePath();ctx.fill();ctx.globalAlpha=1;}ctx.restore();ctx.fillStyle='#e8f4ff';ctx.font='500 44px Geist,sans-serif';ctx.textAlign='center';ctx.fillText(fmt(p*100,1)+'%',540,737);ctx.textAlign='left';ctx.fillStyle='#7fa3c7';ctx.font='400 20px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.fillText('水涨船高',540,790);ctx.textAlign='left';
}else if(theme==='therm'){
rounded(505,570,70,220,35,'#1c1310');ctx.strokeStyle='#3a2418';ctx.lineWidth=3;rounded(505,570,70,220,35,'transparent');ctx.stroke();ctx.beginPath();ctx.arc(540,812,55,0,Math.PI*2);ctx.fillStyle='#b83a12';ctx.fill();ctx.stroke();if(p>0){ctx.save();rounded(505,570,70,220,35,'transparent');ctx.clip();ctx.fillStyle='#dc4a1e';const fh=220*p;ctx.fillRect(505,790-fh,70,fh);ctx.restore();}ctx.fillStyle='#fdba74';ctx.font='500 40px Geist,sans-serif';ctx.textAlign='center';ctx.fillText(fmt(p*100,1)+'%',540,895);ctx.textAlign='left';ctx.fillStyle='#a87f5c';ctx.font='400 20px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.fillText('干劲温度计',540,930);ctx.textAlign='left';
}else if(theme==='receipt'){
const rh=80+300*p;ctx.fillStyle='#f6f1e7';ctx.fillRect(315,560,450,rh);ctx.strokeStyle='#b8ad97';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.strokeRect(315,560,450,rh);ctx.setLineDash([]);ctx.fillStyle='#4a4238';ctx.font='26px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText('*** 薪动收银条 ***',540,615);ctx.fillText('进度 '+fmt(p*100,1)+'%',540,660);if(rh>150)ctx.fillText('已入账 '+money(s.todayEarned),540,705);ctx.textAlign='left';write('收银条 · 慢慢打印中',80,940,22,'#8a8378');
}else{
rounded(70,633,940,172,86,'#050706');rounded(132,711,816,12,6,'#303833');if(p>0){const w=816*p;ctx.save();ctx.shadowColor=accent;ctx.shadowBlur=24;rounded(132,711,Math.max(2,w),12,6,accent);ctx.restore();const head=clamp(132+w,162,912);rounded(head-35,690,70,54,27,accent);write(Math.round(p*100)+'',head-23,727,26,'#091a0e',500); }write('每一秒，都在向前。',80,866,25,'#8c9490');}
}
async function paint(){if(!frozen)return;const version=++renderVersion;await(document.fonts?.ready||Promise.resolve());if(frozen.preferences.template==='pig'){const image=document.getElementById('piggyImage');if(image&&!image.complete&&String(image.src).startsWith('data:image/')){try{await image.decode();}catch(_){}}}if(version!==renderVersion)return;const s=frozen.snapshot,p=clamp(finite(s.progress),0,1),theme=frozen.preferences.template||'charge',accent=theme==='charge'?'#5ae593':theme==='meter'?'#ff764c':theme==='pig'?'#eeb58e':theme==='neon'?'#4de3ff':theme==='mono'?'#e8e8e8':theme==='paper'?'#c2622f':theme==='term'?'#39d353':theme==='ecg'?'#ff5f56':theme==='wave'?'#38bdf8':theme==='therm'?'#f97316':theme==='receipt'?'#d4b483':theme==='sand'?'#e0b45a':theme==='dial'?'#e8b04c':theme==='trail'?'#7cc48f':theme==='metro'?'#5fb0e8':theme==='lift'?'#c9a96e':theme==='eclipse'?'#f0a24c':theme==='flap'?'#8ec3ff':theme==='vinyl'?'#d8b4fe':theme==='const'?'#a5d8ff':theme==='plant'?'#84cc7a':theme==='shadow'?'#e8a05c':theme==='tide'?'#5cc8d8':theme==='rocket'?'#f08080':theme==='balloon'?'#f0b45c':theme==='aqua'?'#64c8f0':theme==='kite'?'#f0d060':theme==='falls'?'#7ac8e8':theme==='toast'?'#e8b878':theme==='ember'?'#f09050':theme==='cable'?'#7ec8a0':theme==='hive'?'#f0c040':theme==='lantern'?'#f0a080':theme==='abacus'?'#d8a05c':theme==='ferris'?'#e86aa8':theme==='globe'?'#9ecfff':theme==='seismo'?'#e06050':theme==='terrace'?'#68b878':theme==='crane'?'#f078a8':theme==='slots'?'#f0c040':theme==='domino'?'#a8c8e8':theme==='match'?'#f08040':theme==='popcorn'?'#f0d860':theme==='tetris'?'#68c8d8':theme==='fishing'?'#58b8a0':theme==='pottery'?'#c89068':theme==='sparkler'?'#f8d060':theme==='origami'?'#e87a9c':theme==='typewriter'?'#d8c8a8':theme==='aurora'?'#58e8a8':theme==='catnap'?'#e8a860':theme==='prayer'?'#d8a848':theme==='piano'?'#e8e8f0':theme==='firejar'?'#c8e858':theme==='lava'?'#f0608a':theme==='knit'?'#c878a8':theme==='juice'?'#f8a030':theme==='rainbow'?'#f07090':theme==='bonsai'?'#78b858':theme==='vending'?'#58b8e8':theme==='lighthouse'?'#f8e078':theme==='treadmill'?'#68d8a8':theme==='oven'?'#e89a58':theme==='wishing'?'#68c8e8':theme==='sandcastle'?'#e8c878':theme==='inkwash'?'#888898':theme==='candle'?'#f0b040':theme==='swing'?'#88c8a0':theme==='gacha'?'#f088a8':theme==='surf'?'#58c8e0':theme==='scope'?'#b8c8e8':theme==='bottle'?'#78c8b0':theme==='pinball'?'#f0c858':theme==='lotus'?'#f080b0':theme==='ramen'?'#e8b058':theme==='gear'?'#c8a860':theme==='invader'?'#68e878':theme==='mine'?'#989898':theme==='puppet'?'#e8a858':theme==='sprout'?'#78c878':theme==='hop'?'#88b0e8':theme==='mahjong'?'#58b878':theme==='scale'?'#e8c868':theme==='tearoff'?'#e86858':theme==='windmill'?'#88d8e8':theme==='grill'?'#e88848':theme==='dock'?'#6898d8':theme==='compass'?'#d8b868':theme==='sub'?'#58a8c8':theme==='icicle'?'#a8d8f0':theme==='snowman'?'#e8f0f8':theme==='latte'?'#c89060':theme==='train'?'#e87858':theme==='ivy'?'#68b868':theme==='forge'?'#f08040':theme==='tanghulu'?'#e84848':theme==='dragonboat'?'#e87838':theme==='mill'?'#c8b088':theme==='laundry'?'#68b8e8':theme==='muyu'?'#c89858':theme==='sushi'?'#f0a0a8':theme==='mallow'?'#f0d0a0':theme==='top'?'#e86a8a':theme==='fountain'?'#68c8f0':theme==='sled'?'#b8d8f0':theme==='kaleido'?'#b070e8':theme==='gongfu'?'#c88848':theme==='jigsaw'?'#68a8d8':theme==='scroll'?'#b8a060':theme==='parasol'?'#e07070':theme==='steamer'?'#d8b080':theme==='hotpot'?'#e04030':theme==='waterwheel'?'#78a8c8':theme==='firecrack'?'#e83838':theme==='sugarart'?'#e8a840':theme==='sling'?'#a88858':theme==='bigdrum'?'#d84838':theme==='faceoff'?'#e83030':theme==='liondance'?'#f0b830':theme==='chestnut'?'#c08848':theme==='icesculpt'?'#98d8f0':theme==='zoetrope'?'#e89038':theme==='stoneskip'?'#70b0c8':theme==='polaroid'?'#e8e0d0':theme==='seesaw'?'#c8a040':theme==='neontube'?'#f048a0':theme==='bubble'?'#88d0f0':theme==='pizza'?'#e09838':theme==='sugarman'?'#e8b050':theme==='skylantern'?'#f0a040':theme==='coin'?'#d8a838':theme==='sandart'?'#d8b878':theme==='rattle'?'#d84a30':theme==='ringtoss'?'#48c8a0':theme==='inkjet'?'#6898d8':theme==='gaiwan'?'#78b888':theme==='diabolo'?'#d87838':theme==='stitch'?'#e06090':theme==='tangram'?'#e08840':theme==='knot'?'#d82828':theme==='rubbing'?'#909098':theme==='loom'?'#c87840':theme==='mosaic'?'#58a8c8':theme==='seal'?'#d83830':theme==='gong'?'#d8a830':theme==='bianzhong'?'#88a878':theme==='zither'?'#c89858':theme==='grind'?'#98906e':theme==='copter'?'#78b060':theme==='papercut'?'#d83030':theme==='hula'?'#f070a8':theme==='rubik'?'#e0c030':theme==='nesting'?'#d86848':theme==='curling'?'#5098c8':theme==='juggle'?'#e08838':theme==='yoyo'?'#d85050':theme==='pinwheel'?'#58b8c8':theme==='marble'?'#e06080':theme==='omikuji'?'#d84848':theme==='darts'?'#48a868':theme==='pinata'?'#e09830':theme==='kendama'?'#b87840':theme==='vaultbox'?'#c08850':theme==='stilts'?'#88a050':theme==='jumprope'?'#e07840':theme==='plate'?'#a8c8e0':theme==='tightrope'?'#e0c040':theme==='shateki'?'#d05040':theme==='fukuwarai'?'#e0a890':theme==='kagami'?'#f0e8d8':theme==='hagoita'?'#d04858':theme==='shogi'?'#d8b060':theme==='karuta'?'#4868a8':theme==='suika'?'#e04848':theme==='sumo'?'#c09868':theme==='goldfish'?'#e06030':theme==='noren'?'#4a6898':theme==='volcano'?'#e05020':theme==='abyss'?'#3a88b8':theme==='chrysalis'?'#c8a0e0':theme==='oyster'?'#e8d8e8':theme==='antfarm'?'#c07840':theme==='sunflower'?'#e8b030':theme==='metronome'?'#b86848':theme==='spiral'?'#8a78e0':theme==='circuit'?'#48c878':theme==='drawbridge'?'#a08858':theme==='weathervane'?'#78a8c8':theme==='bigben'?'#c8a848':theme==='telescope'?'#98a8e0':theme==='aquarium'?'#40b8c8':theme==='terrarium'?'#68b878':theme==='nest'?'#b08850':theme==='sourdough'?'#d8a060':theme==='ferment'?'#c8b840':theme==='archery'?'#c85048':theme==='basketball'?'#e07028':theme==='pendulum'?'#c8b070':theme==='zipline'?'#78b868':theme==='carousel'?'#e05878':theme==='ski'?'#88c8e8':theme==='firefly'?'#c8e060':theme==='moonphase'?'#c8c8d8':theme==='teapot'?'#8a9878':theme==='spiderweb'?'#a0a8b8':theme==='snail'?'#b89858':theme==='hummingbird'?'#48c8a8':theme==='cicada'?'#a8b848':theme==='dam'?'#5898c8':theme==='potofgold'?'#e8b830':theme==='koipond'?'#e07830':theme==='zengarden'?'#a8a898':theme==='orchard'?'#d84838':theme==='constellation'?'#88c0e8':theme==='solarsystem'?'#e0a050':theme==='bamboo'?'#58a848':theme==='geode'?'#a068d8':theme==='mandala'?'#d8a058':theme==='catapult'?'#a87848':theme==='sakura'?'#f0a0b8':theme==='incense'?'#c87858':theme==='pagoda'?'#d85848':theme==='radar'?'#50e080':theme==='rover'?'#d86848':theme==='iceberg'?'#a8d8f0':theme==='comet'?'#b8d8ff':theme==='nebula'?'#b078e8':theme==='tornado'?'#90a8b8':theme==='rose'?'#e04870':theme==='dandelion'?'#e0e8f0':theme==='chess'?'#c8b088':theme==='sunrise'?'#f0a040':theme==='moonrise'?'#d0d8e8':theme==='billiards'?'#38a858':theme==='golf'?'#58b060':theme==='bowling'?'#d85848':theme==='meadow'?'#78c060':theme==='geyser'?'#68c8e0':theme==='vineyard'?'#8858b8':theme==='reef'?'#f07858':theme==='fireplace'?'#e07830':theme==='onsen'?'#c8d8e0':theme==='iceskate'?'#a8d0f0':theme==='jukebox'?'#f0b040':theme==='musicbox'?'#d8b8e0':theme==='bath'?'#78c0d8':theme==='dive'?'#58b8e0':theme==='observatory'?'#8898c0':theme==='darkroom'?'#e04838':theme==='projector'?'#e8d8a0':theme==='trek'?'#78b060':theme==='harbor'?'#5898c8':theme==='staircase'?'#b8a878':theme==='bakery'?'#d8a050':theme==='castle'?'#98a0b8':theme==='voyage'?'#4a90c8':theme==='sauna'?'#c88a4a':theme==='tidepool'?'#3a9a8a':theme==='jacuzzi'?'#5ab8d8':theme==='movie'?'#c85050':theme==='library'?'#a8824a':theme==='maze'?'#7ab86a':theme==='greenhouse'?'#6ac87a':theme==='carnival'?'#e8a83a':theme==='beach'?'#e8c878':theme==='waterfall'?'#6ab8d8':theme==='desert'?'#d8a050':theme==='rain'?'#6a90b8':theme==='cave'?'#9a7ab8':theme==='garden'?'#e87a9a':theme==='lake'?'#5a8ac8':theme==='bridge'?'#c87878':theme==='market'?'#e8983a':theme==='storm'?'#8a9ab8':theme==='river'?'#5aa8c8':theme==='canyon'?'#c87848':theme==='dawn'?'#e89a5a':theme==='cabin'?'#b8784a':theme==='origamicrane'?'#d8d0c0':theme==='jellyfish'?'#8a6ac8':theme==='shrine'?'#c8452a':theme==='snowy'?'#a8c8e8':theme==='dusk'?'#c86a4a':theme==='harvest'?'#d8b84a':theme==='pier'?'#8a7a5a':theme==='valley'?'#6aa87a':theme==='marsh'?'#7a9a5a':theme==='glacier'?'#8ac8e8':theme==='fjord'?'#4a7a9a':theme==='theater'?'#c84a5a':theme==='circus'?'#e8604a':theme==='studio'?'#c8a878':theme==='kitchen'?'#d87840':theme==='workshop'?'#a89068':theme==='bay'?'#4a8ab8':theme==='gate'?'#b85a3a':theme==='dojo'?'#c8a050':theme==='aviary'?'#7ab8a8':theme==='apiary'?'#e8b83a':theme==='lagoon'?'#3ab8a8':theme==='glade'?'#8ab85a':theme==='cove'?'#4a9ab8':theme==='plaza'?'#b89a6a':theme==='ranch'?'#c89058':theme==='barn'?'#b85040':theme==='prairie'?'#a8b858':theme==='tavern'?'#d89838':theme==='arcade'?'#7888b8':theme==='chapel'?'#c8b878':theme==='tram'?'#d8b038':theme==='temple'?'#d85848':theme==='cellar'?'#98684a':theme==='gondola'?'#5a9a8a':theme==='rooftop'?'#b87a7a':theme==='boardwalk'?'#8a9a70':theme==='diner'?'#e86a8a':theme==='barber'?'#5a8ab8':theme==='gallery'?'#c8a85a':theme==='museum'?'#a89878':theme==='station'?'#d8a038':theme==='kelp'?'#3a9a78':theme==='funicular'?'#b8a050':theme==='marina'?'#4a90b8':theme==='planetarium'?'#7868c8':theme==='depot'?'#c85848':theme==='atrium'?'#6aa878':theme==='stable'?'#a07850':theme==='elevator'?'#8898b0':theme==='beacon'?'#e08038':theme==='dune'?'#d8b070':theme==='coop'?'#d8a040':theme==='summit'?'#98b8d8':theme==='brook'?'#68b8a8':theme==='teahouse'?'#7a9a58':theme==='smithy'?'#c86838':theme==='kennel'?'#b8845a':theme==='lilypad'?'#5aaa6a':theme==='grove'?'#7a8a4a':theme==='jetty'?'#5a8aa8':theme==='camp'?'#e08848':theme==='boathouse'?'#6a8aa0':theme==='igloo'?'#a8d8e8':theme==='monastery'?'#98887a':theme==='yurt'?'#c8a060':theme==='paddy'?'#78b858':theme==='silo'?'#b8a878':theme==='dovecote'?'#a8a8b8':theme==='courtyard'?'#c08858':theme==='oasis'?'#58b8a0':theme==='mesa'?'#c88a58':theme==='crater'?'#9a8ab8':theme==='quarry'?'#8a8a80':theme==='foundry'?'#d86830':theme==='mint'?'#d8b838':theme==='well'?'#7aa8c8':theme==='bonfire'?'#f07828':theme==='spring'?'#58b8d8':theme==='granary'?'#c8a040':theme==='heron'?'#88a8b8':theme==='smokehouse'?'#a88858':theme==='sawmill'?'#c8863a':theme==='canallock'?'#6a98b0':theme==='sheepfold'?'#d8ccb0':'#ff833f',bg=theme==='charge'?'#111513':'#171718';ctx.clearRect(0,0,1080,1440);ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1440);
write('薪动',80,111,33,'#f0f4f1',500);write('每一秒，都算数。',188,110,22,'#818a84');write(s.dayKey.replaceAll('-',' / '),775,110,22,'#939a96');ctx.strokeStyle='#ffffff1c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(80,153);ctx.lineTo(1000,153);ctx.stroke();
write(caption(),80,258,53,'#f0f3f1',400,undefined,920);write('今天已赚 · '+(frozen.currency.name||frozen.currency.code),80,336,26,'#8a938d');write(money(s.todayEarned),73,495,125,'#f5f7f5',400,theme==='meter'?'"Barlow Condensed",Geist,sans-serif':undefined,927);
const marks=badges();let bx=80;for(const text of marks){ctx.font='400 21px Geist,"PingFang SC","Microsoft YaHei",sans-serif';const width=ctx.measureText(text).width+28;rounded(bx,527,width,37,18,'#ffffff0d');write(text,bx+14,553,21,accent);bx+=width+12;}
drawDevice(theme,p,accent);
const statY=theme==='pixel'?986:971;write('工作时段每秒',80,statY,23,'#8c938e');write(money(s.secondSalary,frozen.currency.fun?2:4),80,statY+53,36,accent,500,undefined,540);write('今日进度',732,statY,23,'#8c938e');write(fmt(p*100,1)+'%',732,statY+53,39,'#f1f3f1',400);let footY=statY+97;
if($('shareIncludeSalary').checked){write('月薪 ¥ '+fmt(frozen.config.salary),80,footY,23,'#a4aaa6');footY+=38;}
ctx.strokeStyle='#ffffff1c';ctx.beginPath();ctx.moveTo(80,1130);ctx.lineTo(1000,1130);ctx.stroke();const qr=qrPayload();if(qr&&typeof qrcode==='function'){try{const actual=drawQR(qr.text,80,1153,244);write(qr.label,80+actual+34,1224,28,'#e3e7e4',400,undefined,650);write(qr.hint,80+actual+34,1266,19,'#8e9690',400,undefined,650);}catch(error){write('今天的积累，值得被看见。',80,1225,32,'#e3e7e4');$('shareResult').textContent='内容过长，海报已生成；请缩短链接后再加入二维码。';}}else{write('今天的积累，值得被看见。',80,1225,32,'#e3e7e4');write('薪动 · 每一秒，都算数。',80,1274,23,'#8e9690');}
let note='按设定工资与工作时段折算 · 非实际到账记录';if(frozen.currency.fun)note+=' · 趣味倍率 '+fmt(frozen.currency.rate,0);else if(frozen.currency.code!=='CNY')note+=' · '+(frozen.preferences.manualRates?.[frozen.currency.code]?'手动汇率':'参考汇率 '+(frozen.rates.dates?.[frozen.currency.code]||''));write(note,80,1416,17,'#747c76',400,undefined,920);
lastBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(version!==renderVersion)return;$('shareSnapshotNote').textContent='已固定 '+new Date(frozen.time).toLocaleTimeString('zh-CN',{hour12:false})+' 的收入快照，页面里的收入会继续变化。';}
function updateQrControls(){$('shareLinkField').hidden=$('shareQrMode').value!=='link';$('shareLocalNote').hidden=Boolean(autoUrl());}
function scheduleDraw(){updateQrControls();drawQueue=drawQueue.catch(()=>{}).then(paint);return drawQueue;}
async function open(){const raw=APP()?.getState();if(!raw?.snapshot){APP()?.toast('收入还在准备，请稍后再试。');return;}frozen=clone(raw);frozen.time=APP().getNow().getTime();lastBlob=null;$('shareIncludeSalary').checked=false;$('shareCopyFallback').hidden=true;$('shareUrlError').textContent='';$('shareResult').textContent='';const url=autoUrl();$('shareUrl').value=url||'';$('shareQrMode').value=url?'link':'text';$('shareLinkHint').textContent=url?'已使用当前网页地址，自动移除查询参数与片段。':'填入部署后的公网地址，二维码将打开该网页。';if(!dialog.open)dialog.showModal();await scheduleDraw();}
async function pngBlob(){await drawQueue;return lastBlob||await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));}
function download(blob){if(!blob){$('shareResult').textContent='图片生成失败，请重试。';return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='薪动-'+frozen.snapshot.dayKey+'-'+(frozen.preferences.template||'charge')+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('shareResult').textContent='海报已保存；手机浏览器如打开图片，可长按保存。';}
$('shareButton')?.addEventListener('click',open);$('shareClose')?.addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.querySelectorAll('input[name=shareCaption],#shareIncludeSalary,#shareQrMode').forEach(el=>el.addEventListener('change',()=>{$('shareUrlError').textContent='';scheduleDraw();}));
$('shareUrl').addEventListener('input',()=>{if($('shareUrl').value.trim())$('shareQrMode').value='link';$('shareUrlError').textContent='';scheduleDraw();});
$('savePoster').addEventListener('click',async()=>{const button=$('savePoster');button.disabled=true;try{download(await pngBlob());}catch(_){$('shareResult').textContent='保存未完成，请重试。';}finally{button.disabled=false;}});
$('nativeSharePoster').addEventListener('click',async()=>{const button=$('nativeSharePoster');button.disabled=true;try{const blob=await pngBlob();if(!blob)throw Error('No image');const file=new File([blob],'薪动-'+frozen.snapshot.dayKey+'.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({title:'薪动 · '+caption(),text:caption(),files:[file]});$('shareResult').textContent='已打开系统分享。';}else{download(blob);$('shareResult').textContent='当前浏览器不支持直接分享，已保存图片，可发送给朋友。';}}catch(error){if(error.name==='AbortError')$('shareResult').textContent='已取消分享。';else{$('shareResult').textContent='系统分享未完成，已改为保存图片。';download(await pngBlob());}}finally{button.disabled=false;}});
$('copyPosterCaption').addEventListener('click',async()=>{const text=shareText();try{await navigator.clipboard.writeText(text);$('shareResult').textContent='分享文案已复制。';}catch(_){const area=$('shareCopyFallback');area.hidden=false;area.value=text;area.focus();area.select();let copied=false;try{copied=document.execCommand('copy');}catch(_){}$('shareResult').textContent=copied?'分享文案已复制。':'请复制下方文案。';}});
window.SalaryShare={open,render:scheduleDraw,publicUrl,getSnapshot:()=>frozen?clone(frozen):null,getText:()=>frozen?shareText():''};
})();
