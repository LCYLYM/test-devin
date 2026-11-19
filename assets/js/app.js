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
    if(changed){amountFrom=lastSignature?amountShown:data.displayAmount;amountTarget=data.displayAmount;tweenStart=tick;tweenDuration=motion.matches?0:560;lastSignature=signature;}
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
      for(const m of ml){if(earn>=m&&!milestonesHit.has(m)){milestonesHit.add(m);if(window.__vibrate&&navigator.vibrate)navigator.vibrate(40);if(window.SalaryApp&&window.SalaryApp.toast)window.SalaryApp.toast('已入账 '+(data.symbol||'¥')+m.toLocaleString('en-US')+(MILESTONE_MSG[m]?' · '+MILESTONE_MSG[m]:''));break;}}
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
  const RATE_ENDPOINT = 'https://api.frankfurter.dev/v2/rates?base=CNY&quotes=USD,EUR,JPY,KRW,HKD,VND,IDR';
  const CURRENCIES = {
    CNY: {code:'CNY', name:'人民币', symbol:'¥'},
    USD: {code:'USD', name:'美元', symbol:'$'},
    EUR: {code:'EUR', name:'欧元', symbol:'€'},
    JPY: {code:'JPY', name:'日元', symbol:'¥'},
    KRW: {code:'KRW', name:'韩元', symbol:'₩'},
    HKD: {code:'HKD', name:'港币', symbol:'HK$'},
    VND: {code:'VND', name:'越南盾', symbol:'₫'},
    IDR: {code:'IDR', name:'印尼盾', symbol:'Rp'},
    ZIM: {code:'ZIM', name:'津巴布韦 · 趣味', symbol:'Z$', fun:true}
  };
  const PRESET_RATES = {CNY:1, USD:.14981, EUR:.13344, JPY:23.71, KRW:199.13, HKD:1.1766, VND:3869.68, IDR:2699.77, ZIM:1e11};
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
      if (!['charge','meter','pixel','pig','neon','mono','paper','term','ecg','wave','therm'].includes(preferences.template)) preferences.template='pig';
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
    if (!['charge','meter','pixel','pig','neon','mono','paper','term','ecg','wave','therm'].includes(name)) return false;
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
}else{
rounded(70,633,940,172,86,'#050706');rounded(132,711,816,12,6,'#303833');if(p>0){const w=816*p;ctx.save();ctx.shadowColor=accent;ctx.shadowBlur=24;rounded(132,711,Math.max(2,w),12,6,accent);ctx.restore();const head=clamp(132+w,162,912);rounded(head-35,690,70,54,27,accent);write(Math.round(p*100)+'',head-23,727,26,'#091a0e',500); }write('每一秒，都在向前。',80,866,25,'#8c9490');}
}
async function paint(){if(!frozen)return;const version=++renderVersion;await(document.fonts?.ready||Promise.resolve());if(frozen.preferences.template==='pig'){const image=document.getElementById('piggyImage');if(image&&!image.complete&&String(image.src).startsWith('data:image/')){try{await image.decode();}catch(_){}}}if(version!==renderVersion)return;const s=frozen.snapshot,p=clamp(finite(s.progress),0,1),theme=frozen.preferences.template||'charge',accent=theme==='charge'?'#5ae593':theme==='meter'?'#ff764c':theme==='pig'?'#eeb58e':theme==='neon'?'#4de3ff':theme==='mono'?'#e8e8e8':theme==='paper'?'#c2622f':theme==='term'?'#39d353':theme==='ecg'?'#ff5f56':theme==='wave'?'#38bdf8':theme==='therm'?'#f97316':'#ff833f',bg=theme==='charge'?'#111513':'#171718';ctx.clearRect(0,0,1080,1440);ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1440);
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
