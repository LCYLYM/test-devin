/* Deep links & small extras:
   ?salary=30000&template=pig&currency=USD&demo=1 — share-ready URLs.
   ?title=0 — disable the live tab-title ticker. */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);

  if (params.get('reset') === '1') {
    try {
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf('salaryFlow') === 0) localStorage.removeItem(k); });
    } catch (e) {}
    var ru = new URL(location.href);
    ru.searchParams.delete('reset');
    location.replace(ru.toString());
    return;
  }

  function whenReady(fn) {
    if (window.SalaryApp) return fn();
    var tries = 0;
    var t = setInterval(function () {
      if (window.SalaryApp || ++tries > 40) { clearInterval(t); fn(); }
    }, 100);
  }

  whenReady(function () {
    var app = window.SalaryApp;
    if (!app) return;

    // Read "is this a returning visitor" BEFORE any param handler can save
    // default preferences (e.g. the salary form submit persists storage).
    var hasStored = false;
    try { hasStored = !!(JSON.parse(localStorage.getItem('salaryFlow.v2') || 'null') || {}).preferences; } catch (e) {}

    // ?preset=focus|kiosk|party expands into individual params (explicit params win).
    var PRESETS = { focus: { zen: '1', steady: '1' }, kiosk: { lock: '1', wake: '1', kiosk: '1', tips: '1' }, party: { fx: 'stars', rgb: '1', glow: '1' } };
    var preset = PRESETS[(params.get('preset') || '').toLowerCase()];
    if (preset) Object.keys(preset).forEach(function (k) { if (!params.get(k)) params.set(k, preset[k]); });

    var salaryRaw = (params.get('salary') || '').toLowerCase().replace(/万/g, 'w').replace(/[,_\s]/g, '');
    var salary = /^[\d.]+w$/.test(salaryRaw) ? parseFloat(salaryRaw) * 1e4 : Number(salaryRaw);
    if (isFinite(salary) && salary > 0) {
      var input = document.getElementById('salaryInput');
      var form = document.getElementById('salaryForm');
      if (input && form) {
        input.value = String(salary);
        form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }

    var template = params.get('template') || params.get('skin');
    if (template === 'daily') {
      var dayNum = Math.floor(Date.now() / 864e5);
      var dailyList = ['pig', 'charge', 'meter', 'pixel', 'neon', 'mono', 'paper', 'term', 'ecg', 'wave', 'therm'];
      template = dailyList[dayNum % dailyList.length];
    }
    if (template === 'random') template = ['charge','meter','pixel','pig','neon','mono','paper','term','ecg','wave','therm','receipt'][Math.floor(Math.random() * 12)];
    if (template) app.setTemplate(template);
    else {
      // First-visit default follows the OS: light mode gets the paper skin.
      // hasStored was captured before any handler could persist defaults.
      if (!hasStored && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches)
        app.setTemplate('paper');
    }

    var currency = (params.get('currency') || '').toUpperCase();
    if (currency) app.setCurrency(currency);

    var period = params.get('period');
    if (period === 'day' || period === 'month') app.setPeriod(period);

    var demoParam = params.get('demo') || params.get('speed');
    if (demoParam && demoParam !== '0') {
      if (!app.getState().demo) app.toggleDemo();
      var speed = parseFloat(demoParam);
      var demoState = app.getState().demo;
      if (isFinite(speed) && speed > 0 && demoState) demoState.speed = Math.min(speed, 10000);
    }

    if (params.get('sound') === '1') app.setPreference('sound', true);
    else if (params.get('sound') === '0') app.setPreference('sound', false);

    // ?accent=%234de3ff — override the theme accent color (shareable).
    var paydayParam = params.get('payday');
    if (paydayParam === '0' || paydayParam === 'off') { try { localStorage.removeItem('salaryFlow.payday'); } catch (e) {} }
    else if (paydayParam) { try { localStorage.setItem('salaryFlow.payday', paydayParam); } catch (e) {} }
    var payday = parseInt(paydayParam || '', 10);
    if (!(payday >= 1 && payday <= 31)) { try { payday = parseInt(localStorage.getItem('salaryFlow.payday') || '', 10); } catch (e) {} }
    if (payday >= 1 && payday <= 31) {
      var now = new Date(), year = now.getFullYear(), month = now.getMonth();
      var last = new Date(year, month + 1, 0).getDate();
      var target = new Date(year, month, Math.min(payday, last));
      if (now > target) {
        var last2 = new Date(year, month + 2, 0).getDate();
        target = new Date(year, month + 1, Math.min(payday, last2));
      }
      var days = Math.round((target - new Date(year, month, now.getDate())) / 864e5);
      var badge = document.getElementById('paydayBadge');
      if (badge) {
        badge.hidden = false;
        var lbl = document.getElementById('paydayLabel');
        if (lbl) lbl.textContent = days === 0 ? '今天发薪' : '距发薪';
        badge.classList.toggle('is-today', days === 0);
        badge.title = days === 0 ? '今天就是发薪日' : '发薪日 ' + (target.getMonth() + 1) + '月' + target.getDate() + '日';
        var dd = document.getElementById('paydayDays');
        if (dd) dd.textContent = days === 0 ? '🎉' : String(days);
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', function () {
          var y = target.getFullYear(), m2 = String(target.getMonth() + 1).padStart(2, '0'), dy = String(target.getDate()).padStart(2, '0');
          var ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//xindong//payday//CN\r\nBEGIN:VEVENT\r\nUID:xindong-payday-'+y+m2+dy+'@xindong\r\nDTSTART;VALUE=DATE:'+y+m2+dy+'\r\nRRULE:FREQ=MONTHLY\r\nSUMMARY:发薪日 · 薪动\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
          var a = document.createElement('a');
          a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
          a.download = 'payday-' + y + m2 + dy + '.ics';
          document.body.appendChild(a); a.click(); a.remove();
          if (window.SalaryApp && window.SalaryApp.toast) window.SalaryApp.toast('已导出每月发薪提醒 .ics，导入日历即可。');
        });
      }
    }

    var goal = parseFloat(params.get('goal'));
    if (isFinite(goal) && goal > 0) {
      var gp = document.getElementById('goalPriceInput');
      var gn = document.getElementById('goalNameInput');
      var gname = params.get('goalname');
      if (gp) gp.value = String(goal);
      if (gn && gname) gn.value = gname.slice(0, 12);
      var gform = document.getElementById('goalForm');
      if (params.get('goalapply') === '1' && gform && gn && gn.value) {
        gform.requestSubmit ? gform.requestSubmit() : gform.dispatchEvent(new Event('submit', { cancelable: true }));
      } else if (window.SalaryApp) window.SalaryApp.openDialog('goalDialog');
    }

    var work = params.get('work') || params.get('intervals');
    if (work) {
      var workPairs = work.split(',').map(function (seg) {
        var m = seg.trim().replace(/\./g, ':').match(/^(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})$/);
        return m ? [m[1].padStart(2, '0') + ':' + m[2], m[3].padStart(2, '0') + ':' + m[4]] : null;
      }).filter(Boolean).slice(0, 4);
      if (workPairs.length) {
        app.openDialog('settingsDialog');
        setTimeout(function () {
          var fields = document.getElementById('intervalFields');
          var addBtn = document.getElementById('addInterval');
          var sform = document.getElementById('settingsForm');
          if (!fields || !sform) return;
          var guard = 10;
          while (fields.querySelectorAll('.interval-row').length < workPairs.length && addBtn && guard--) addBtn.click();
          guard = 10;
          while (fields.querySelectorAll('.interval-row').length > workPairs.length && guard--) {
            var rems = fields.querySelectorAll('[data-remove-interval]:not([disabled])');
            if (!rems.length) break;
            rems[rems.length - 1].click();
          }
          workPairs.forEach(function (pair, i) {
            var ins = fields.querySelectorAll('input[data-interval="' + i + '"]');
            if (ins[0]) { ins[0].value = pair[0]; ins[0].dispatchEvent(new Event('input', { bubbles: true })); }
            if (ins[1]) { ins[1].value = pair[1]; ins[1].dispatchEvent(new Event('input', { bubbles: true })); }
          });
          sform.requestSubmit ? sform.requestSubmit() : sform.dispatchEvent(new Event('submit', { cancelable: true }));
        }, 60);
      }
    }

    var accent = params.get('accent');
    if (accent === 'off' || accent === '0') { try { localStorage.removeItem('salaryFlow.accent'); } catch (e) {} accent = ''; }
    else if (accent) { try { localStorage.setItem('salaryFlow.accent', accent); } catch (e) {} }
    if (!accent) { try { accent = localStorage.getItem('salaryFlow.accent') || ''; } catch (e) { accent = ''; } }
    var bg = params.get('bg');
    if (bg === 'off' || bg === '0') { try { localStorage.removeItem('salaryFlow.bg'); } catch (e) {} bg = ''; }
    else if (bg) { try { localStorage.setItem('salaryFlow.bg', bg); } catch (e) {} }
    if (!bg) { try { bg = localStorage.getItem('salaryFlow.bg') || ''; } catch (e) { bg = ''; } }
    if (bg && /^#?([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(bg)) {
      document.body.style.setProperty('--bg', bg[0] === '#' ? bg : '#' + bg);
      var tm = document.querySelector('meta[name=theme-color]');
      if (tm) tm.content = bg[0] === '#' ? bg : '#' + bg;
    } else if (bg && /^[a-zA-Z]{3,20}$/.test(bg)) {
      document.body.style.setProperty('--bg', bg);
      var tm2 = document.querySelector('meta[name=theme-color]');
      if (tm2) tm2.content = bg;
    }

    if (accent && /^#?([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(accent)) {
      var v = accent[0] === '#' ? accent : '#' + accent;
      document.body.style.setProperty('--accent', v);
    } else if (accent && /^[a-zA-Z]{3,20}$/.test(accent)) {
      document.body.style.setProperty('--accent', accent);
    }

    var THEME_COLORS = {pig:'#1a1716',charge:'#131415',meter:'#171715',pixel:'#151515',neon:'#0c0e18',mono:'#111111',paper:'#f2efe7',term:'#0d1117',ecg:'#160a0a',wave:'#0b1526',therm:'#181310',receipt:'#181512'};
    function applyThemeColor(t) {
      var m = document.querySelector('meta[name=theme-color]');
      if (m && THEME_COLORS[t]) m.content = THEME_COLORS[t];
    }
    applyThemeColor(app.getState().preferences.template);
    window.addEventListener('salary-template', function (e) { applyThemeColor(e.detail && e.detail.template); });

    var motion = params.get('motion');
    if (motion === '0' || motion === 'reduce') app.setPreference('motion', 'reduce');
    else if (motion === '1') app.setPreference('motion', 'full');

    var cmd = params.get('cmd');
    if (cmd) { var tc = document.querySelector('.term-cmd'); if (tc) tc.textContent = cmd.slice(0, 40); }

    if (params.get('confetti') === '0') window.__noConfetti = true;

    if (params.get('keys') === '0') window.__noKeys = true;
    var themeParam = params.get('theme');
    if (themeParam === 'light') document.body.dataset.light = '1';
    else if (themeParam === 'dark') delete document.body.dataset.light;
    else if (themeParam === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) document.body.dataset.light = '1';
    if (params.get('ms') === '1') window.__msNext = true;
    if (params.get('luck') === '1') {
      window.__luck = true;
      var lb = document.getElementById('luckBadge');
      if (lb) {
        lb.hidden = false;
        var dk = new Date().toISOString().slice(0, 10);
        var hash = 0; for (var ci = 0; ci < dk.length; ci++) hash = (hash * 31 + dk.charCodeAt(ci)) >>> 0;
        var grades = ['大吉', '中吉', '小吉', '半吉', '小凶'];
        var yi = ['摸鱼', '记账', '存钱', '喝奶茶', '准点下班', '和同事唠嗑'];
        var ji = ['加班', '立 flag', '冲动消费', '熬夜', '内卷'];
        document.getElementById('luckText').textContent =
          grades[hash % grades.length] + ' · 宜' + yi[hash % yi.length] + ' 忌' + ji[(hash >> 3) % ji.length];
      }
    }
    var bgimg = params.get('bgimg');
    if (bgimg && /^https?:\/\//.test(bgimg)) {
      document.body.style.backgroundImage = 'url("' + bgimg.replace(/["'()\\]/g, '') + '")';
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundAttachment = 'fixed';
    }
    var earnParam = parseFloat(params.get('earn'));
    if (isFinite(earnParam) && earnParam > 0) window.__earnTarget = earnParam;
    if (params.get('streak') === '1') {
      try {
        var t0 = new Date();
        var fmtD = function (x) { return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
        var days = JSON.parse(localStorage.getItem('salaryFlow.days') || '[]');
        if (days.indexOf(fmtD(t0)) < 0) { days.push(fmtD(t0)); if (days.length > 400) days = days.slice(-400); localStorage.setItem('salaryFlow.days', JSON.stringify(days)); }
        var streak = 0, dcur = t0;
        while (days.indexOf(fmtD(dcur)) >= 0) { streak++; dcur.setDate(dcur.getDate() - 1); }
        var sb = document.getElementById('streakBadge');
        if (sb && streak > 0) { sb.hidden = false; document.getElementById('streakDays').textContent = String(streak); }
      } catch (e) {}
    }
    var badgeParam = params.get('badge');
    if (badgeParam) {
      var cb = document.getElementById('customBadge');
      if (cb) { cb.hidden = false; document.getElementById('customBadgeText').textContent = badgeParam.slice(0, 20); }
    }
    var capParam = params.get('caption');
    if (capParam) {
      var ic = document.getElementById('incomeCaption');
      if (ic) ic.textContent = capParam.slice(0, 40);
    }
    if (params.get('mirror') === '1') document.body.style.transform = 'scaleX(-1)';
    var ssParam = parseInt(params.get('ss') || '', 10);
    if (ssParam > 0) {
      var ssTimer = 0;
      var ssArm = function () {
        clearTimeout(ssTimer);
        document.body.classList.remove('is-focus');
        ssTimer = setTimeout(function () {
          if (!document.querySelector('dialog[open]')) document.body.classList.add('is-focus');
        }, Math.min(3600, ssParam) * 1000);
      };
      ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) { window.addEventListener(ev, ssArm, {passive: true}); });
      ssArm();
    }
    var symParam = params.get('symbol');
    if (symParam) window.__symbol = symParam.slice(0, 3);
    var brandParam = params.get('brand');
    if (brandParam) {
      var bs = document.querySelector('.brand span');
      if (bs) bs.textContent = brandParam.slice(0, 12);
      if (!params.get('title')) document.title = brandParam.slice(0, 12) + ' · ' + document.title.split('·').slice(-1)[0].trim();
    }
    var sizeParam = parseFloat(params.get('size'));
    if (isFinite(sizeParam) && sizeParam > 0.4 && sizeParam <= 2.5) {
      var vc = document.querySelector('.value-cluster');
      if (vc) vc.style.zoom = String(sizeParam);
    }
    if (params.get('dir') === 'down') window.__dirDown = true;
    if (params.get('compact') === '0') window.__noCompact = true;
    if (params.get('vibrate') === '1') window.__vibrate = true;
    if (params.get('season') === 'auto' && !params.get('fx')) {
      var sm = new Date().getMonth();
      var sfx = sm === 11 || sm <= 1 ? 'snow' : sm === 2 || sm === 3 ? 'sakura' : sm >= 5 && sm <= 7 ? 'rain' : sm >= 8 && sm <= 10 ? 'leaves' : '';
      if (sfx) params.set('fx', sfx);
    }
    var fxParam = params.get('fx');
    if (fxParam === 'matrix' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var mc = document.createElement('canvas');
      mc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;opacity:.5';
      document.body.prepend(mc);
      var mctx = mc.getContext('2d');
      var GLYPHS = '薪动打工人0123456789¥$暴富';
      var mcols = 0, mdrops = [];
      function mResize() {
        mc.width = innerWidth; mc.height = innerHeight;
        mcols = Math.floor(innerWidth / 16); mdrops = [];
        for (var i = 0; i < mcols; i++) mdrops.push(Math.random() * innerHeight / 16);
        mctx.fillStyle = '#0d1117'; mctx.fillRect(0, 0, mc.width, mc.height);
      }
      mResize(); window.addEventListener('resize', mResize);
      (function mFrame() {
        mctx.fillStyle = 'rgba(13,17,23,.1)'; mctx.fillRect(0, 0, mc.width, mc.height);
        mctx.font = '14px monospace'; mctx.fillStyle = '#3fb950';
        for (var i = 0; i < mcols; i++) {
          mctx.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], i * 16, mdrops[i] * 16);
          if (mdrops[i] * 16 > innerHeight && Math.random() > .975) mdrops[i] = 0;
          mdrops[i]++;
        }
        requestAnimationFrame(mFrame);
      })();
    }
    if (['snow', 'sakura', 'rain', 'stars', 'leaves', 'bubble', 'ember', 'firefly', 'dust', 'meteor', 'warp', 'cloud', 'paper', 'fireworks', 'petal', 'fish', 'heart'].indexOf(fxParam) >= 0 && params.get('eco') !== '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var fxc = document.createElement('canvas');
      fxc.className = 'fx-layer';
      fxc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;opacity:.65';
      document.body.prepend(fxc);
      var fxctx = fxc.getContext('2d');
      var parts = [], N = fxParam === 'rain' ? 90 : fxParam === 'stars' ? 70 : fxParam === 'meteor' ? 0 : fxParam === 'cloud' ? 12 : fxParam === 'paper' ? 10 : 45;
      var meteors = [];
      function fxResize(){ fxc.width = innerWidth; fxc.height = innerHeight; }
      fxResize(); window.addEventListener('resize', fxResize);
      for (var i = 0; i < N; i++) parts.push({x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: 1 + Math.random() * (fxParam === 'rain' ? 1 : 3.2), v: fxParam === 'rain' ? 9 + Math.random() * 6 : 0.6 + Math.random() * 1.4, s: Math.random() * 6.28, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .06, ph: Math.random() * 6.28});
      (function fxFrame(){
        fxctx.clearRect(0, 0, fxc.width, fxc.height);
        if (fxParam === 'meteor') {
          if (Math.random() < 0.015) meteors.push({x: Math.random() * innerWidth * 0.8 + innerWidth * 0.1, y: -20, vx: -2 - Math.random() * 3, vy: 4 + Math.random() * 4, life: 1});
          for (var mi = meteors.length - 1; mi >= 0; mi--) {
            var m = meteors[mi];
            m.x += m.vx; m.y += m.vy; m.life -= 0.012;
            if (m.life <= 0 || m.y > innerHeight + 40) { meteors.splice(mi, 1); continue; }
            fxctx.strokeStyle = 'rgba(220,235,255,' + (m.life * 0.8).toFixed(2) + ')';
            fxctx.lineWidth = 1.5;
            fxctx.beginPath(); fxctx.moveTo(m.x, m.y); fxctx.lineTo(m.x - m.vx * 14, m.y - m.vy * 14); fxctx.stroke();
          }
          requestAnimationFrame(fxFrame);
          return;
        }
        for (var i2 = 0; i2 < parts.length; i2++) {
          var q = parts[i2];
          if (fxParam === 'warp') {
            var wx = q.x - innerWidth / 2, wy = q.y - innerHeight / 2;
            var wd = Math.sqrt(wx * wx + wy * wy) || 1;
            var sp = (wd / 200 + 0.3) * q.v * 3;
            fxctx.strokeStyle = 'rgba(180,220,255,' + Math.min(0.8, wd / innerWidth).toFixed(2) + ')';
            fxctx.lineWidth = Math.min(2.5, wd / 220);
            fxctx.beginPath(); fxctx.moveTo(q.x, q.y); fxctx.lineTo(q.x + wx / wd * sp * 4, q.y + wy / wd * sp * 4); fxctx.stroke();
            q.x += wx / wd * sp * 4; q.y += wy / wd * sp * 4;
            if (q.x < -50 || q.x > innerWidth + 50 || q.y < -50 || q.y > innerHeight + 50) {
              q.x = innerWidth / 2 + (Math.random() - .5) * 300; q.y = innerHeight / 2 + (Math.random() - .5) * 300;
            }
            continue;
          }
          if (fxParam === 'stars') {
            q.ph += 0.02;
            fxctx.fillStyle = 'rgba(240,246,255,' + (0.2 + 0.6 * Math.abs(Math.sin(q.ph))).toFixed(2) + ')';
            fxctx.beginPath(); fxctx.arc(q.x, q.y, q.r * 0.8, 0, 6.3); fxctx.fill();
            continue;
          }
          if (fxParam === 'ember') {
            q.y -= q.v * 0.8; q.x += Math.sin(q.s += 0.02) * 1.1; q.ph += 0.05;
            if (q.y < -10) { q.y = innerHeight + 10; q.x = Math.random() * innerWidth; }
            fxctx.fillStyle = 'rgba(251,' + (140 + (i2 % 3) * 40) + ',60,' + (0.3 + 0.5 * Math.abs(Math.sin(q.ph))).toFixed(2) + ')';
            fxctx.beginPath(); fxctx.arc(q.x, q.y, q.r * 0.9, 0, 6.3); fxctx.fill();
            continue;
          }
          if (fxParam === 'dust') {
            q.y -= q.v * 0.15; q.x += Math.sin(q.s += 0.003) * 0.3; q.ph += 0.01;
            if (q.y < -8) { q.y = innerHeight + 8; q.x = Math.random() * innerWidth; }
            fxctx.fillStyle = 'rgba(230,235,245,' + (0.05 + 0.12 * Math.abs(Math.sin(q.ph))).toFixed(2) + ')';
            fxctx.beginPath(); fxctx.arc(q.x, q.y, q.r * 0.6, 0, 6.3); fxctx.fill();
            continue;
          }
          if (fxParam === 'firefly') {
            q.x += Math.sin(q.s += 0.008) * 0.9; q.y += Math.cos(q.s * 0.8) * 0.6; q.ph += 0.04;
            if (q.x < -10) q.x = innerWidth + 10; if (q.x > innerWidth + 10) q.x = -10;
            if (q.y < -10) q.y = innerHeight + 10; if (q.y > innerHeight + 10) q.y = -10;
            fxctx.fillStyle = 'rgba(190,242,100,' + (0.15 + 0.6 * Math.abs(Math.sin(q.ph))).toFixed(2) + ')';
            fxctx.beginPath(); fxctx.arc(q.x, q.y, q.r, 0, 6.3); fxctx.fill();
            continue;
          }
          if (fxParam === 'cloud') {
            q.x += q.v * 0.22;
            if (q.x - q.r * 12 > innerWidth) { q.x = -q.r * 12; q.y = Math.random() * innerHeight * 0.85; }
            fxctx.fillStyle = 'rgba(220,230,240,.05)';
            fxctx.beginPath(); fxctx.ellipse(q.x, q.y, q.r * 7, q.r * 3, 0, 0, 6.3); fxctx.fill();
            fxctx.beginPath(); fxctx.ellipse(q.x + q.r * 4, q.y + q.r, q.r * 4.5, q.r * 2.2, 0, 0, 6.3); fxctx.fill();
            continue;
          }
          if (fxParam === 'paper') {
            q.x += q.v * 1.6; q.y += q.v * 0.5 + Math.sin(q.s += 0.03) * 0.8;
            if (q.x > innerWidth + 30) { q.x = -30; q.y = Math.random() * innerHeight * 0.7; }
            fxctx.save(); fxctx.translate(q.x, q.y); fxctx.rotate(0.3 + Math.sin(q.s) * 0.15);
            fxctx.fillStyle = 'rgba(230,238,248,.7)';
            fxctx.beginPath(); fxctx.moveTo(q.r * 6, 0); fxctx.lineTo(-q.r * 3, -q.r * 2.2); fxctx.lineTo(-q.r * 1.2, 0); fxctx.lineTo(-q.r * 3, q.r * 2.2); fxctx.closePath(); fxctx.fill();
            fxctx.restore();
            continue;
          }
          if (fxParam === 'fireworks') {
            if (!q.fw) { q.fw = 1; q.rot = 0.4 + Math.random() * 0.8; q.s = Math.random() * 6.28; q.ph = Math.random() * 360 | 0; }
            q.rot -= 0.008;
            if (q.rot <= 0) { q.x = innerWidth * (0.15 + Math.random() * 0.7); q.y = innerHeight * (0.1 + Math.random() * 0.5); q.rot = 0.4 + Math.random() * 0.8; q.s = Math.random() * 6.28; q.v = 0.6 + Math.random() * 1.4; q.ph = Math.random() * 360 | 0; }
            q.x += Math.cos(q.s) * q.v * 2.2; q.y += Math.sin(q.s) * q.v * 2.2 + 0.35;
            fxctx.fillStyle = 'hsla(' + q.ph + ',90%,68%,' + Math.min(1, q.rot * 2).toFixed(2) + ')';
            fxctx.beginPath(); fxctx.arc(q.x, q.y, q.r * 0.75, 0, 6.3); fxctx.fill();
            continue;
          }
          if (fxParam === 'fish') {
            q.x += q.v * 1.2; q.y += Math.sin(q.s += 0.02) * 0.6;
            if (q.x > innerWidth + 40) { q.x = -40; q.y = Math.random() * innerHeight; }
            fxctx.save(); fxctx.translate(q.x, q.y); fxctx.rotate(Math.sin(q.s) * 0.12);
            fxctx.fillStyle = 'rgba(125,211,252,.7)';
            fxctx.beginPath(); fxctx.ellipse(0, 0, q.r * 3, q.r * 1.5, 0, 0, 6.3); fxctx.fill();
            fxctx.beginPath(); fxctx.moveTo(-q.r * 3, 0); fxctx.lineTo(-q.r * 5, -q.r * 1.6); fxctx.lineTo(-q.r * 5, q.r * 1.6); fxctx.closePath(); fxctx.fill();
            fxctx.fillStyle = '#0b2239'; fxctx.beginPath(); fxctx.arc(q.r * 1.6, -q.r * 0.4, q.r * 0.35, 0, 6.3); fxctx.fill();
            fxctx.restore();
            continue;
          }
          if (fxParam === 'heart') {
            q.y -= q.v * 1.1; q.x += Math.sin(q.s += 0.015) * 0.4;
            if (q.y < -24) { q.y = innerHeight + 24; q.x = Math.random() * innerWidth; }
            fxctx.save(); fxctx.translate(q.x, q.y); fxctx.scale(q.r / 6, q.r / 6);
            fxctx.fillStyle = 'rgba(251,113,133,.55)';
            fxctx.beginPath(); fxctx.moveTo(0, 3);
            fxctx.bezierCurveTo(-5, -3, -10, -3, -10, 2);
            fxctx.bezierCurveTo(-10, 6, -5, 9, 0, 13);
            fxctx.bezierCurveTo(5, 9, 10, 6, 10, 2);
            fxctx.bezierCurveTo(10, -3, 5, -3, 0, 3);
            fxctx.fill(); fxctx.restore();
            continue;
          }
          if (fxParam === 'bubble') {
            q.y -= q.v; q.x += Math.sin(q.s += 0.01) * 0.7;
            if (q.y < -12) { q.y = innerHeight + 12; q.x = Math.random() * innerWidth; }
            fxctx.strokeStyle = 'rgba(147,197,253,.55)'; fxctx.lineWidth = 1;
            fxctx.beginPath(); fxctx.arc(q.x, q.y, q.r * 1.4, 0, 6.3); fxctx.stroke();
            continue;
          }
          q.y += q.v; q.x += Math.sin(q.s += 0.01) * (fxParam === 'rain' ? 0.4 : 0.7); q.rot += q.vr;
          if (q.y > innerHeight + 12) { q.y = -12; q.x = Math.random() * innerWidth; }
          if (fxParam === 'snow') { fxctx.fillStyle = 'rgba(240,246,255,.85)'; fxctx.beginPath(); fxctx.arc(q.x, q.y, q.r, 0, 6.3); fxctx.fill(); }
          else if (fxParam === 'sakura') { fxctx.save(); fxctx.translate(q.x, q.y); fxctx.rotate(q.rot); fxctx.fillStyle = 'rgba(255,183,197,.8)'; fxctx.beginPath(); fxctx.ellipse(0, 0, q.r * 1.6, q.r, 0, 0, 6.3); fxctx.fill(); fxctx.restore(); }
          else if (fxParam === 'petal') { fxctx.save(); fxctx.translate(q.x, q.y); fxctx.rotate(q.rot); fxctx.fillStyle = ['rgba(249,168,212,.75)', 'rgba(251,207,232,.7)', 'rgba(244,114,182,.65)'][i2 % 3]; fxctx.beginPath(); fxctx.moveTo(0, -q.r * 2); fxctx.quadraticCurveTo(q.r * 1.6, -q.r * .5, 0, q.r * 1.8); fxctx.quadraticCurveTo(-q.r * 1.6, -q.r * .5, 0, -q.r * 2); fxctx.fill(); fxctx.restore(); }
          else if (fxParam === 'leaves') { fxctx.save(); fxctx.translate(q.x, q.y); fxctx.rotate(q.rot); fxctx.fillStyle = ['rgba(217,119,6,.75)', 'rgba(180,83,9,.7)', 'rgba(202,138,4,.7)'][i2 % 3]; fxctx.beginPath(); fxctx.ellipse(0, 0, q.r * 1.8, q.r * .9, 0, 0, 6.3); fxctx.fill(); fxctx.restore(); }
          else { fxctx.strokeStyle = 'rgba(140,180,220,.5)'; fxctx.lineWidth = 1; fxctx.beginPath(); fxctx.moveTo(q.x, q.y); fxctx.lineTo(q.x - 1.5, q.y + 14); fxctx.stroke(); }
        }
        requestAnimationFrame(fxFrame);
      })();
    }
    var favParam = params.get('favicon');
    if (favParam) {
      var fav = document.querySelector('link[rel="icon"]') || document.createElement('link');
      fav.rel = 'icon';
      fav.href = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">' + Array.from(favParam).slice(0, 4).join('') + '</text></svg>');
      if (!fav.parentNode) document.head.appendChild(fav);
    }
    var kioskParam = parseInt(params.get('kiosk') || '', 10);
    if (kioskParam === 1) kioskParam = 15;
    if (kioskParam > 0) {
      setInterval(function () {
        if (document.querySelector('dialog[open]')) return;
        var btns = document.querySelectorAll('.template-switch button');
        if (btns.length < 2) return;
        var cur2 = -1;
        btns.forEach(function (b, i) { if (b.classList.contains('selected')) cur2 = i; });
        btns[(cur2 + 1) % btns.length].click();
      }, Math.min(600, Math.max(3, kioskParam)) * 1000);
    }
    var amountArea = document.getElementById('amountArea');
    if (amountArea) {
      var copyAmount = function () {
        var txt = amountArea.getAttribute('aria-label') || '';
        if (!txt) return;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
          .then(function () { if (window.SalaryApp && window.SalaryApp.toast) window.SalaryApp.toast('已复制 ' + txt); })
          .catch(function () {});
      };
      amountArea.addEventListener('dblclick', copyAmount);
      var lpTimer = 0;
      amountArea.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') lpTimer = setTimeout(copyAmount, 550); });
      ['pointerup', 'pointercancel', 'pointermove'].forEach(function (ev) { amountArea.addEventListener(ev, function () { clearTimeout(lpTimer); }, {passive: true}); });
    }
    var toastParam = params.get('toast');
    if (toastParam) setTimeout(function () { if (window.SalaryApp && window.SalaryApp.toast) window.SalaryApp.toast(toastParam.slice(0, 40)); }, 1200);
    if (params.get('cn') === '1') window.__cnAmount = true;
    if (params.get('glass') === '1') document.body.dataset.glass = '1';
    if (params.get('rgb') === '1') document.body.dataset.rgb = '1';
    if (params.get('breath') === '1') document.body.dataset.breath = '1';
    if (params.get('notify') === '1' && window.Notification && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch (e) {}
    }
    if (params.get('notify') === '1') window.__notify = true;
    var pomoMatch = /^(\d{1,3})(?:[,.\-](\d{1,2}))?$/.exec(params.get('pomodoro') || '');
    if (pomoMatch) {
      var pWork = Math.min(180, +pomoMatch[1]), pBreak = pomoMatch[2] ? Math.min(60, +pomoMatch[2]) : 5;
      var pBadge = document.getElementById('pomoBadge');
      if (pBadge && pWork > 0) {
        pBadge.hidden = false;
        var pPhase = 'work', pEnd = Date.now() + pWork * 60000;
        setInterval(function () {
          var left = Math.max(0, Math.round((pEnd - Date.now()) / 1000));
          if (left === 0) {
            pPhase = pPhase === 'work' ? 'break' : 'work';
            pEnd = Date.now() + (pPhase === 'work' ? pWork : pBreak) * 60000;
            left = Math.round((pEnd - Date.now()) / 1000);
            if (window.SalaryApp && window.SalaryApp.toast) window.SalaryApp.toast(pPhase === 'work' ? '🍅 休息结束，继续搬砖' : '🍅 摸鱼时间到');
            if (window.__vibrate && navigator.vibrate) navigator.vibrate(60);
          }
          pBadge.classList.toggle('is-break', pPhase === 'break');
          document.getElementById('pomoLabel').textContent = pPhase === 'work' ? '搬砖' : '摸鱼';
          document.getElementById('pomoLeft').textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
        }, 1000);
      }
    }
    var spdParam = parseInt(params.get('speed') || '', 10);
    if (spdParam >= 1 && spdParam <= 200) window.__demoSpeed = spdParam;
    if (params.get('year') === '1') {
      var yn = new Date();
      var y0 = new Date(yn.getFullYear(), 0, 1);
      var ytotal = Math.round((new Date(yn.getFullYear() + 1, 0, 1) - y0) / 864e5);
      var ydone = (yn - y0) / 864e5;
      var yb = document.getElementById('yearBadge');
      if (yb) {
        yb.hidden = false;
        document.getElementById('yearPct').textContent = (ydone / ytotal * 100).toFixed(1) + '%';
        yb.title = '今年已过 ' + Math.floor(ydone) + ' / ' + ytotal + ' 天';
      }
    }
    if (params.get('crt') === '1') {
      var crt = document.createElement('div');
      crt.className = 'crt-overlay';
      crt.setAttribute('aria-hidden', 'true');
      document.body.appendChild(crt);
    }
    if (params.get('invert') === '1') document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
    if (params.get('bw') === '1') document.documentElement.style.filter = 'grayscale(1)';
    if (params.get('sepia') === '1') document.documentElement.style.filter = 'sepia(.85)';
    if (params.get('contrast') === '1') document.body.dataset.contrast = '1';
    if (params.get('spark') === '1') {
      window.__spark = true;
      var scv = document.getElementById('sparkCanvas'); if (scv) scv.hidden = false;
    }
    if (params.get('count') === '1') window.__count = true;
    var tickr = params.get('ticker');
    if (tickr) {
      var tkEl = document.getElementById('ticker'), tkT = document.getElementById('tickerTrack');
      if (tkEl && tkT) { var tkx = Array.from(tickr).slice(0, 80).join(''); tkT.textContent = tkx + '　·　' + tkx; tkEl.hidden = false; }
    }
    var bgP = params.get('bg');
    if (bgP && /^#?[0-9a-fA-F]{3,8}$/.test(bgP)) {
      var bgv = bgP[0] === '#' ? bgP : '#' + bgP;
      document.body.style.setProperty('--bg', bgv);
      document.body.style.setProperty('--instrument', bgv);
    }
    var dimM = /^(\d{1,2})-(\d{1,2})$/.exec(params.get('dim') || '');
    if (dimM) {
      var dh = +dimM[1], de = +dimM[2];
      if (dh >= 0 && dh <= 24 && de >= 0 && de <= 24) {
        var dimEl = document.createElement('div');
        dimEl.setAttribute('aria-hidden', 'true');
        dimEl.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity 1.2s;z-index:40';
        document.body.appendChild(dimEl);
        var dimCheck = function () {
          var h = new Date().getHours();
          var on = dh <= de ? (h >= dh && h < de) : (h >= dh || h < de);
          dimEl.style.opacity = on ? '.55' : '0';
        };
        dimCheck(); setInterval(dimCheck, 60000);
      }
    }
    var anniMatch = /^(\d{1,2})[-./](\d{1,2})$/.exec(params.get('anni') || '');
    if (anniMatch) {
      var am = +anniMatch[1], ad = +anniMatch[2];
      var an = new Date(), ay = an.getFullYear();
      var alast = new Date(ay, am, 0).getDate();
      var atarget = (am >= 1 && am <= 12 && ad >= 1 && ad <= alast) ? new Date(ay, am - 1, ad) : null;
      if (atarget) {
        if (atarget < new Date(ay, an.getMonth(), an.getDate())) {
          ay++;
          atarget = new Date(ay, am - 1, Math.min(ad, new Date(ay, am, 0).getDate()));
        }
        var adays = Math.round((atarget - new Date(an.getFullYear(), an.getMonth(), an.getDate())) / 864e5);
        var abadge = document.getElementById('anniBadge');
        if (abadge) {
          abadge.hidden = false;
          var aname = (params.get('anniname') || '纪念日').slice(0, 12);
          var albl = document.getElementById('anniLabel');
          if (albl) albl.textContent = adays === 0 ? '今天' : '距' + aname;
          abadge.classList.toggle('is-today', adays === 0);
          abadge.title = aname + ' ' + am + '月' + ad + '日';
          var add = document.getElementById('anniDays');
          if (add) add.textContent = adays === 0 ? '🎉' : String(adays);
        }
      }
    }
    if (params.get('friday') === '1') {
      var fb = document.getElementById('friBadge');
      if (fb) {
        var fdow = new Date().getDay();
        var fdays = (5 - fdow + 7) % 7;
        fb.hidden = false;
        var fl = document.getElementById('friLabel');
        var fd = document.getElementById('friDays');
        var fu = document.getElementById('friUnit');
        if (fdays === 0) {
          if (fl) fl.textContent = '今天是周五';
          if (fd) fd.textContent = '🎉';
          if (fu) fu.hidden = true;
        } else if (fd) fd.textContent = String(fdays);
      }
    }
    var fromParam = params.get('from');
    if (fromParam) {
      var fromName = Array.from(fromParam).slice(0, 16).join('');
      setTimeout(function () { if (window.SalaryApp && window.SalaryApp.toast) window.SalaryApp.toast('👋 ' + fromName + ' 喊你一起来数钱'); }, 1600);
    }
    var logoParam = params.get('logo');
    if (logoParam) {
      var bi = document.querySelector('.brand-icon');
      if (bi) {
        var bsp = document.createElement('span');
        bsp.className = 'brand-emoji';
        bsp.textContent = Array.from(logoParam).slice(0, 2).join('');
        bi.replaceWith(bsp);
      }
    }
    if (params.get('grad') === '1') document.body.dataset.grad = '1';
    if (params.get('visits') === '1') {
      var vc = 0;
      try { vc = (parseInt(localStorage.getItem('salaryFlow.visits'), 10) || 0) + 1; localStorage.setItem('salaryFlow.visits', String(vc)); } catch (e) { vc = 1; }
      var vb2 = document.getElementById('visitsBadge');
      if (vb2) { vb2.hidden = false; var vn = document.getElementById('visitsCount'); if (vn) vn.textContent = String(vc); }
    }
    if (params.get('chime') === '1') window.__chime = true;
    if (params.get('auto') === '1') {
      ['dow', 'clock2', 'pct', 'kpi'].forEach(function (p) { if (!params.get(p)) params.set(p, '1'); });
    }
    if (params.get('eco') === '1') { document.body.classList.add('is-eco'); }
    if (params.get('bloom') === '1') { document.body.classList.add('is-bloom'); }
    if (params.get('all') === '1') window.__allTime = true;
    if (params.get('moon') === '1') {
      var mb = document.getElementById('moonBadge');
      if (mb) {
        var SYN = 29.53059, ref = Date.UTC(2000, 0, 6, 18, 14);
        var ph = (((Date.now() - ref) / 864e5) % SYN + SYN) % SYN;
        var midx = Math.round(ph / SYN * 8) % 8;
        var EM = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
        var NM = ['朔', '峨眉', '上弦', '盈凸', '望', '亏凸', '下弦', '残月'];
        mb.hidden = false;
        mb.title = '月相 · ' + NM[midx];
        var mei = document.getElementById('moonIcon'); if (mei) mei.textContent = EM[midx];
        var mnm = document.getElementById('moonName'); if (mnm) mnm.textContent = NM[midx];
      }
    }
    if (params.get('week') === '1') {
      var wk = document.getElementById('weekBadge'), wp = document.getElementById('weekPct');
      if (wk && wp) {
        var wkFill = function () {
          var n = new Date(), dw = (n.getDay() + 6) % 7;
          wp.textContent = Math.round(((dw + n.getHours() / 24 + n.getMinutes() / 1440) / 7) * 100) + '%';
        };
        wk.hidden = false; wkFill(); setInterval(wkFill, 60000);
      }
    }
    if (params.get('glow') === '1') document.body.dataset.glow = '1';
    var hourlyP = Number(params.get('hourly'));
    if (isFinite(hourlyP) && hourlyP > 0) {
      var hst = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
      var hh = (hst && hst.snapshot && hst.snapshot.hoursPerDay) || 8;
      var hwd = (hst && hst.snapshot && hst.snapshot.workdays) || 21.75;
      var hInput = document.getElementById('salaryInput'), hForm = document.getElementById('salaryForm');
      if (hInput && hForm) {
        hInput.value = String(Math.round(hourlyP * hh * hwd * 100) / 100);
        hForm.requestSubmit ? hForm.requestSubmit() : hForm.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }
    var dailyP = Number(params.get('daily'));
    if (isFinite(dailyP) && dailyP > 0) {
      var dst = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
      var dwd = (dst && dst.snapshot && dst.snapshot.workdays) || 21.75;
      var dInput = document.getElementById('salaryInput'), dForm = document.getElementById('salaryForm');
      if (dInput && dForm) {
        dInput.value = String(Math.round(dailyP * dwd * 100) / 100);
        dForm.requestSubmit ? dForm.requestSubmit() : dForm.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }
    if (params.get('quarter') === '1') {
      var qb = document.getElementById('quarterBadge'), qp = document.getElementById('quarterPct'), ql = document.getElementById('quarterLabel');
      if (qb && qp) {
        var qFill = function () {
          var n = new Date(), qm = Math.floor(n.getMonth() / 3) * 3;
          var dim = function (m) { return new Date(n.getFullYear(), m + 1, 0).getDate(); };
          var done = n.getDate(), tot = 0;
          for (var i = 0; i < 3; i++) { tot += dim(qm + i); if (n.getMonth() > qm + i) done += dim(qm + i); }
          done += (n.getHours() * 60 + n.getMinutes()) / 1440;
          qp.textContent = (done / tot * 100).toFixed(1) + '%';
          if (ql) ql.textContent = 'Q' + (qm / 3 + 1);
        };
        qb.hidden = false; qFill(); setInterval(qFill, 60000);
      }
    }
    var fontP = params.get('font');
    if (fontP && ['mono', 'serif', 'round'].indexOf(fontP) >= 0) document.body.dataset.font = fontP;
    var palP = params.get('pal');
    if (palP && ['forest', 'ocean', 'sunset', 'grape', 'vapor'].indexOf(palP) >= 0) document.body.dataset.pal = palP;
    if (params.get('flat') === '1') document.body.dataset.flat = '1';
    var idleS = Math.min(3600, Math.max(5, Number(params.get('idle')) || 0));
    if (idleS) {
      var idleT = null, idleZen = false;
      var idleFire = function () {
        if (!document.body.classList.contains('is-focus')) {
          var fb = document.getElementById('focusButton');
          if (fb) { fb.click(); idleZen = true; }
        }
      };
      var idleReset = function () {
        if (idleZen && document.body.classList.contains('is-focus')) {
          var fb2 = document.getElementById('focusButton');
          if (fb2) fb2.click();
        }
        idleZen = false;
        clearTimeout(idleT);
        idleT = setTimeout(idleFire, idleS * 1000);
      };
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, idleReset, { passive: true }); });
      idleT = setTimeout(idleFire, idleS * 1000);
    }
    if (params.get('wake') === '1' && navigator.wakeLock) {
      var wakeReq = function () { navigator.wakeLock.request('screen').catch(function () {}); };
      wakeReq();
      document.addEventListener('visibilitychange', function () { if (!document.hidden) wakeReq(); });
    }
    if (params.get('holiday') === '1' && window.SalaryEngine) {
      var hb = document.getElementById('holidayBadge');
      if (hb) {
        var hn = new Date(), hdk = window.SalaryEngine.dateKey(hn);
        var hall = [];
        [hn.getFullYear(), hn.getFullYear() + 1].forEach(function (hy) {
          ((window.SalaryEngine.holidayYears[hy] || {}).ranges || []).forEach(function (r) { hall.push(r); });
        });
        var hIn = null, hNext = null;
        hall.forEach(function (r) {
          if (hdk >= r[0] && hdk <= r[1]) hIn = r;
          else if (r[0] > hdk && (!hNext || r[0] < hNext[0])) hNext = r;
        });
        var hlab = document.getElementById('holidayLabel'), hd = document.getElementById('holidayDays'), hu = document.getElementById('holidayUnit');
        hb.hidden = false;
        if (hIn) { if (hlab) hlab.textContent = '放假中 · ' + hIn[2]; if (hd) hd.textContent = ''; if (hu) hu.textContent = '🎉'; }
        else if (hNext) {
          var hdd = Math.round((new Date(hNext[0]).getTime() - new Date(hdk).getTime()) / 864e5);
          if (hlab) hlab.textContent = '距' + hNext[2]; if (hd) hd.textContent = String(hdd); if (hu) hu.textContent = '天';
        }
      }
    }
    if (params.get('cny') === '1') {
      var cb = document.getElementById('cnyBadge');
      if (cb) {
        var cn = new Date(), cdk = cn.getFullYear() * 10000 + (cn.getMonth() + 1) * 100 + cn.getDate();
        var CNY = [[20260215, 20260223], [20270206, 20270212], [20280126, 20280201], [20290213, 20290219], [20300203, 20300209], [20310123, 20310129], [20320211, 20320217], [20330201, 20330207]];
        var cy = null;
        ((window.SalaryEngine && window.SalaryEngine.holidayYears[cn.getFullYear()] || {}).ranges || []).forEach(function (r) {
          if (r[2] === '春节') cy = [Number(r[0].replace(/-/g, '')), Number(r[1].replace(/-/g, ''))];
        });
        if (cy && cdk > cy[1]) cy = null;
        for (var ci = 0; ci < CNY.length && !cy; ci++) if (CNY[ci][1] >= cdk) cy = CNY[ci];
        var clab = document.getElementById('cnyLabel'), cd = document.getElementById('cnyDays'), cu = document.getElementById('cnyUnit');
        cb.hidden = false;
        if (cy && cdk >= cy[0] && cdk <= cy[1]) { if (clab) clab.textContent = '春节快乐'; if (cd) cd.textContent = ''; if (cu) cu.textContent = '🎊'; }
        else if (cy) {
          var cd0 = new Date(String(cy[0]).slice(0, 4), Number(String(cy[0]).slice(4, 6)) - 1, Number(String(cy[0]).slice(6, 8)));
          var cdiff = Math.round((cd0.getTime() - new Date(cn.getFullYear(), cn.getMonth(), cn.getDate()).getTime()) / 864e5);
          if (clab) clab.textContent = '距春节'; if (cd) cd.textContent = String(cdiff); if (cu) cu.textContent = '天';
        } else { cb.hidden = true; }
      }
    }
    if (params.get('tap') === '1') {
      var aa = document.getElementById('amountArea');
      if (aa) aa.addEventListener('pointerdown', function (e) {
        var sp = document.createElement('span');
        sp.className = 'tap-coin';
        sp.textContent = '🪙';
        sp.style.left = (e.clientX || 0) + 'px';
        sp.style.top = (e.clientY || 0) + 'px';
        document.body.appendChild(sp);
        setTimeout(function () { sp.remove(); }, 900);
      });
    }
    if (params.get('yuan') === '1') {
      var yb = document.getElementById('yuanBadge'), yl = document.getElementById('yuanLeft');
      if (yb && yl) {
        var yFill = function () {
          var ys = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = ys && ys.snapshot;
          if (!sn || !sn.daySalary) { yl.textContent = '—'; return; }
          var perSec = sn.daySalary / ((sn.hoursPerDay || 8) * 3600);
          var frac = (sn.todayEarned || 0) % 1;
          var secs = perSec > 0 ? Math.max(0, Math.ceil((1 - frac) / perSec)) : 0;
          yl.textContent = secs >= 3600 ? Math.round(secs / 60) + 'm' : secs + 's';
        };
        yb.hidden = false; yFill(); setInterval(yFill, 1000);
      }
    }
    if (params.get('pace') === '1') {
      var pb = document.getElementById('paceBadge'), pv = document.getElementById('paceVal');
      if (pb && pv) {
        var pFill = function () {
          var ps = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = ps && ps.snapshot;
          if (!sn || !sn.daySalary) { pv.textContent = '—'; return; }
          var cur = ps.currency || { rate: 1, symbol: '¥' };
          var hourly = sn.daySalary * (cur.rate || 1) / (sn.hoursPerDay || 8);
          pv.textContent = (cur.symbol || '¥') + (hourly >= 100 ? Math.round(hourly) : hourly.toFixed(1));
        };
        pb.hidden = false; pFill(); setInterval(pFill, 60000);
      }
    }
    if (params.get('blink') === '1') document.body.dataset.blink = '1';
    var astroP = params.get('astro');
    if (astroP && /^(0?[1-9]|1[0-2])-([1-9]|[12]\d|3[01])$/.test(astroP)) {
      var ab2 = document.getElementById('astroBadge');
      if (ab2) {
        var amp = astroP.split('-').map(Number), av = amp[0] * 100 + amp[1];
        var SIGNS = [['♑', '摩羯'], ['♒', '水瓶'], ['♓', '双鱼'], ['♈', '白羊'], ['♉', '金牛'], ['♊', '双子'], ['♋', '巨蟹'], ['♌', '狮子'], ['♍', '处女'], ['♎', '天秤'], ['♏', '天蝎'], ['♐', '射手']];
        var CUTS = [120, 219, 321, 420, 521, 622, 723, 823, 923, 1024, 1123, 1222];
        var sidx = 0;
        for (var si = 0; si < CUTS.length; si++) { if (av < CUTS[si]) { sidx = si; break; } }
        ab2.hidden = false;
        var aic = document.getElementById('astroIcon'); if (aic) aic.textContent = SIGNS[sidx][0];
        var anm = document.getElementById('astroName'); if (anm) anm.textContent = SIGNS[sidx][1];
      }
    }
    if (params.get('rank') === '1') {
      var rb = document.getElementById('rankBadge'), rp = document.getElementById('rankPct');
      if (rb && rp) {
        var rFill = function () {
          var rs = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = rs && rs.snapshot;
          if (!sn || !sn.daySalary) { rp.textContent = '—'; return; }
          var hourly = sn.daySalary / (sn.hoursPerDay || 8);
          var p = Math.round(100 / (1 + Math.exp(-(hourly - 45) / 22)));
          rp.textContent = Math.min(99, Math.max(1, p)) + '%';
        };
        rb.hidden = false; rFill(); setInterval(rFill, 60000);
      }
    }
    var bannerP = params.get('banner');
    if (bannerP) {
      var sb = document.getElementById('siteBanner');
      if (sb) { sb.textContent = bannerP.slice(0, 60); sb.hidden = false; document.body.dataset.banner = '1'; }
    }
    var zoomP = Number(params.get('zoom'));
    if (isFinite(zoomP) && zoomP >= 50 && zoomP <= 200) document.body.style.zoom = (zoomP / 100).toFixed(2);
    if (params.get('mirror') === '1') document.body.dataset.mirror = '1';
    if (params.get('lot') === '1') {
      var lb = document.getElementById('lotBadge'), ln = document.getElementById('lotNum');
      if (lb && ln) {
        var lsn = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var ldk = (lsn && lsn.snapshot && lsn.snapshot.dayKey) || new Date().toISOString().slice(0, 10);
        var lh = 0; for (var li = 0; li < ldk.length; li++) lh = (lh * 31 + ldk.charCodeAt(li)) % 997;
        ln.textContent = String(lh % 99 + 1);
        lb.hidden = false;
      }
    }
    if (params.get('lock') === '1') {
      var li2 = document.getElementById('salaryInput'), lf = document.getElementById('salaryForm');
      if (li2) { li2.readOnly = true; li2.setAttribute('aria-readonly', 'true'); }
      if (lf) lf.classList.add('is-locked');
    }
    var ddlP = params.get('ddl');
    var ddlParts = ddlP ? ddlP.split('-').map(Number) : null;
    var ddlOk = ddlParts && (ddlParts.length === 3 ? (ddlParts[1] >= 1 && ddlParts[1] <= 12 && ddlParts[2] >= 1 && ddlParts[2] <= 31) : (ddlParts.length === 2 && ddlParts[0] >= 1 && ddlParts[0] <= 12 && ddlParts[1] >= 1 && ddlParts[1] <= 31));
    if (ddlOk) {
      var db = document.getElementById('ddlBadge');
      if (db) {
        var dn2 = params.get('ddlname');
        var dl2 = document.getElementById('ddlLabel'); if (dl2) dl2.textContent = dn2 ? '距' + dn2.slice(0, 8) : '距DDL';
        var ddFill = function () {
          var dn = new Date(), dParts = ddlP.split('-').map(Number);
          var dy = dParts.length === 3 ? dParts[0] : dn.getFullYear();
          var dm2 = dParts.length === 3 ? dParts[1] : dParts[0], dday = dParts.length === 3 ? dParts[2] : dParts[1];
          var dt = new Date(dy, dm2 - 1, dday);
          if (dParts.length === 2 && dt.getTime() < new Date(dn.getFullYear(), dn.getMonth(), dn.getDate()).getTime()) dt = new Date(dy + 1, dm2 - 1, dday);
          var ddiff = Math.round((dt.getTime() - new Date(dn.getFullYear(), dn.getMonth(), dn.getDate()).getTime()) / 864e5);
          var ddd = document.getElementById('ddlDays'), ddu = document.getElementById('ddlUnit');
          if (ddd) ddd.textContent = ddiff === 0 ? '🎯' : String(Math.abs(ddiff));
          if (ddu) ddu.textContent = ddiff === 0 ? '就是今天' : (ddiff < 0 ? '天前' : '天');
        };
        db.hidden = false; ddFill(); setInterval(ddFill, 60000);
      }
    }
    if (params.get('noise') === '1') document.body.dataset.noise = '1';
    if (params.get('grid') === '1') document.body.dataset.grid = '1';
    var cornerP = params.get('corner');
    if (cornerP) {
      var cp = document.getElementById('cornerPet');
      if (cp) { cp.textContent = cornerP.slice(0, 4); cp.hidden = false; }
    }
    if (params.get('tips') === '1') {
      var tq = document.getElementById('quoteLine');
      if (tq) {
        var TIPS = ['按 t 轮换 12 套皮肤', '?zen=1 一键专注模式', '?fx=snow 飘雪特效', '?hourly=50 时薪直接换算', '?pomodoro=25,5 番茄钟', '?season=auto 季节特效', '?shift=9-18 自定义工时', '?kiosk=10 皮肤自动轮换', '?earn=500 目标倒计时', '?vs=奶茶@15 等价换算', '?lock=1 锁定输入', '?count=1 开场数字滚动'];
        var ti = 0;
        var tFill = function () { tq.textContent = '💡 ' + TIPS[ti++ % TIPS.length]; };
        tq.hidden = false; tFill(); setInterval(tFill, 20000);
      }
    }
    if (params.get('lunar') === '1') {
      var lu = document.getElementById('lunarBadge'), lt = document.getElementById('lunarText');
      if (lu && lt && window.Intl) {
        try {
          lt.textContent = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'long', day: 'numeric' }).format(new Date());
          lu.hidden = false;
        } catch (e2) {}
      }
    }
    if (params.get('yi') === '1') {
      var yib = document.getElementById('yiBadge'), yit = document.getElementById('yiText');
      if (yib && yit) {
        var YI_GOOD = ['摸鱼', '涨薪', '早退', '咖啡', '摸鱼', '划水', '写周报', '提桶'];
        var YI_BAD = ['加班', '开会', '背锅', '改需求', '团建', '述职', '周报', '年会'];
        var ysn = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var ydk = (ysn && ysn.snapshot && ysn.snapshot.dayKey) || new Date().toISOString().slice(0, 10);
        var yh = 0; for (var yi2 = 0; yi2 < ydk.length; yi2++) yh = (yh * 31 + ydk.charCodeAt(yi2)) % 977;
        yit.textContent = '宜' + YI_GOOD[yh % YI_GOOD.length] + ' 忌' + YI_BAD[(yh >> 3) % YI_BAD.length];
        yib.hidden = false;
      }
    }
    if (params.get('spot') === '1') {
      document.body.dataset.spot = '1';
      document.addEventListener('pointermove', function (e) {
        document.body.style.setProperty('--spot-x', e.clientX + 'px');
        document.body.style.setProperty('--spot-y', e.clientY + 'px');
      });
    }
    if (params.get('tilt') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var tIns = document.querySelector('.instrument');
      document.body.dataset.tilt = '1';
      if (tIns) document.addEventListener('pointermove', function (e) {
        var r = tIns.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) / r.width, dy = (e.clientY - r.top - r.height / 2) / r.height;
        tIns.style.transform = 'perspective(900px) rotateY(' + (dx * 5).toFixed(2) + 'deg) rotateX(' + (-dy * 5).toFixed(2) + 'deg)';
      });
    }
    if (params.get('gloss') === '1') document.body.dataset.gloss = '1';
    if (params.get('orb') === '1') {
      var oIns = document.querySelector('.instrument');
      if (oIns) {
        document.body.dataset.orb = '1';
        var or = document.createElement('div');
        or.className = 'orb-ring'; or.setAttribute('aria-hidden', 'true');
        or.innerHTML = '<i></i>';
        oIns.appendChild(or);
      }
    }
    if (params.get('steady') === '1') window.__noTween = true;
    if (params.get('mins') === '1') {
      var mb = document.getElementById('minsBadge'), mv = document.getElementById('minsVal');
      if (mb && mv) {
        var mFill = function () {
          var mst = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = mst && mst.snapshot;
          if (!sn || !sn.daySalary) { mv.textContent = '—'; return; }
          var perSec = sn.daySalary / ((sn.hoursPerDay || 8) * 3600);
          var mins = perSec > 0 ? Math.floor((sn.todayEarned || 0) / perSec / 60) : 0;
          mv.textContent = mins >= 60 ? Math.floor(mins / 60) + 'h' + (mins % 60) + 'm' : mins + 'm';
        };
        mb.hidden = false; mFill(); setInterval(mFill, 30000);
      }
    }
    if (params.get('grade') === '1') {
      var gb = document.getElementById('gradeBadge'), gv = document.getElementById('gradeVal');
      if (gb && gv) {
        var gFill = function () {
          var gst = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = gst && gst.snapshot;
          if (!sn || !sn.daySalary) { gv.textContent = '—'; return; }
          var h = sn.daySalary / (sn.hoursPerDay || 8);
          gv.textContent = h >= 200 ? 'S' : h >= 100 ? 'A' : h >= 50 ? 'B' : h >= 25 ? 'C' : 'D';
        };
        gb.hidden = false; gFill(); setInterval(gFill, 60000);
      }
    }
    if (params.get('lava') === '1') document.body.dataset.lava = '1';
    if (params.get('date') === '1') {
      var db = document.getElementById('dateBadge'), dt = document.getElementById('dateText');
      if (db && dt) {
        var WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        var dFill = function () { var dn = new Date(); dt.textContent = (dn.getMonth() + 1) + '月' + dn.getDate() + '日 ' + WD[dn.getDay()]; };
        db.hidden = false; dFill(); setInterval(dFill, 30000);
      }
    }
    if (params.get('pulse') === '1') document.body.dataset.pulse = '1';
    if (params.get('aurora') === '1') document.body.dataset.aurora = '1';
    if (params.get('halo') === '1') document.body.dataset.halo = '1';
    if (params.get('fade') === '1') document.body.dataset.fade = '1';
    if (params.get('vig') === '1') document.body.dataset.vig = '1';
    if (params.get('round') === '1') document.body.dataset.round = '1';
    if (params.get('drift') === '1') document.body.dataset.drift = '1';
    if (params.get('wide') === '1') document.body.dataset.wide = '1';
    if (params.get('rb') === '1') document.body.dataset.rb = '1';
    if (params.get('slim') === '1') document.body.dataset.slim = '1';
    if (params.get('lift') === '1') document.body.dataset.lift = '1';
    if (params.get('glitch') === '1') document.body.dataset.glitch = '1';
    if (params.get('cinema') === '1') document.body.dataset.cinema = '1';
    if (params.get('frame') === '1') document.body.dataset.frame = '1';
    if (params.get('amber') === '1') document.body.dataset.amber = '1';
    if (params.get('dots') === '1') document.body.dataset.dots = '1';
    if (params.get('tile') === '1') document.body.dataset.tile = '1';
    if (params.get('outline') === '1') document.body.dataset.outline = '1';
    if (params.get('stripe') === '1') document.body.dataset.stripe = '1';
    if (params.get('bezel') === '1') document.body.dataset.bezel = '1';
    var hueP = Number(params.get('hue'));
    if (isFinite(hueP) && params.get('hue') !== null && params.get('hue') !== '') {
      document.body.style.setProperty('--hue-rot', ((hueP % 360) + 360) % 360 + 'deg');
      document.body.dataset.hue = '1';
    }
    var bornM = /^\d{4}-\d{1,2}-\d{1,2}$/.test(params.get('born') || '') ? params.get('born') : null;
    if (bornM) {
      var bParts = bornM.split('-').map(Number);
      var bDate = new Date(bParts[0], bParts[1] - 1, bParts[2]);
      var bb = document.getElementById('bornBadge'), bd = document.getElementById('bornDays');
      if (bb && bd && !isNaN(bDate.getTime()) && bDate.getTime() < Date.now()) {
        var bFill = function () {
          bd.textContent = String(Math.floor((Date.now() - bDate.getTime()) / 864e5));
        };
        bb.title = bParts[0] + '年' + bParts[1] + '月' + bParts[2] + '日出生';
        bb.hidden = false; bFill(); setInterval(bFill, 60000);
      }
    }
    if (params.get('disco') === '1') document.body.dataset.disco = '1';
    if (params.get('sway') === '1') document.body.dataset.sway = '1';
    if (params.get('band') === '1') document.body.dataset.band = '1';
    if (params.get('mood') === '1') {
      var mb2 = document.getElementById('moodBadge'), mi = document.getElementById('moodIcon'), mt = document.getElementById('moodText');
      if (mb2 && mi && mt) {
        var MOODS = ['😤 硬撑', '💪 奥利给', '🥱 犯困', '🔥 爆肝', '😌 摸鱼', '🤯 过载', '😎 拿捏', '🥺 求放过', '⚡ 打满', '😴 梦游', '🍀 躺赢', '💸 盼发薪', '🚀 起飞', '🌊 划水', '😭 裂开', '✨ 发光', '🧱 搬砖', '🎯 输出', '🌈 回血', '💡 灵感'];
        var msn = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var mdk = (msn && msn.snapshot && msn.snapshot.dayKey) || new Date().toISOString().slice(0, 10);
        var mh = 0; for (var mji = 0; mji < mdk.length; mji++) mh = (mh * 31 + mdk.charCodeAt(mji)) % 997;
        var mp = MOODS[mh % MOODS.length].split(' ');
        mi.textContent = mp[0]; mt.textContent = mp[1];
        mb2.hidden = false;
      }
    }
    if (params.get('wiggle') === '1') document.body.dataset.wiggle = '1';
    if (params.get('stamp') === '1') {
      var inst2 = document.querySelector('.instrument');
      if (inst2 && !document.getElementById('stampSeal')) {
        var ssd = new Date();
        var seal = document.createElement('div');
        seal.className = 'stamp-seal'; seal.id = 'stampSeal'; seal.setAttribute('aria-hidden', 'true');
        seal.innerHTML = '<i>已打卡</i><b>' + (ssd.getMonth() + 1) + '/' + ssd.getDate() + '</b>';
        inst2.appendChild(seal);
      }
    }
    if (params.get('tock') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.dataset.tock = '1';
    }
    if (params.get('gains') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      setInterval(function () {
        var gst = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var gsn = gst && gst.snapshot;
        if (!gsn || !gsn.isWorkday || !gsn.daySalary) return;
        if (!document.querySelector('.instrument.is-working')) return;
        var area = document.getElementById('amountArea');
        if (!area) return;
        var perSec = gsn.daySalary / ((gsn.hoursPerDay || 8) * 3600);
        if (!isFinite(perSec) || perSec <= 0) return;
        var gsym = (gst.currency && gst.currency.symbol) || '¥';
        var gf = document.createElement('span');
        gf.className = 'gain-float';
        gf.textContent = '+' + gsym + (perSec < 1 ? perSec.toFixed(3) : perSec.toFixed(2));
        gf.style.left = (15 + Math.random() * 60) + '%';
        area.appendChild(gf);
        setTimeout(function () { gf.remove(); }, 2200);
      }, 7000);
    }
    if (params.get('hour') === '1') {
      var hb = document.getElementById('hourBadge'), hp = document.getElementById('hourPct');
      if (hb && hp) {
        var hFill = function () {
          var hn = new Date();
          hp.textContent = Math.round(((hn.getMinutes() * 60 + hn.getSeconds()) / 3600) * 100) + '%';
        };
        hb.hidden = false; hFill(); setInterval(hFill, 30000);
      }
    }
    if (params.get('greet') === '1') {
      var grb = document.getElementById('greetBadge'), gri = document.getElementById('greetIcon'), grt = document.getElementById('greetText');
      if (grb && gri && grt) {
        var gh = new Date().getHours();
        var gp = gh >= 5 && gh < 11 ? ['🌅', '早上好'] : gh >= 11 && gh < 13 ? ['🍚', '中午好'] : gh >= 13 && gh < 18 ? ['☀️', '下午好'] : gh >= 18 && gh < 23 ? ['🌆', '晚上好'] : ['🌙', '夜深了'];
        gri.textContent = gp[0]; grt.textContent = gp[1];
        grb.hidden = false;
      }
    }
    var satP = params.get('sat');
    if (satP !== null && isFinite(Number(satP))) {
      var satV = Math.max(0, Math.min(200, Number(satP)));
      document.body.style.setProperty('--sat-pct', satV + '%');
      document.body.dataset.sat = '1';
    }
    if (params.get('wotd') === '1') {
      var wdb = document.getElementById('wotdBadge'), wdw = document.getElementById('wotdWord');
      if (wdb && wdw) {
        var WOTD = ['搬砖', '摸鱼', '内卷', '躺平', '搞钱', '画饼', '跑路', '上岸', '充电', '筑基', '续命', '通勤', '月光', '牛马', '加班', '周报', '例会', '对齐', '冲刺', '干饭'];
        var wsn = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var wdk = (wsn && wsn.snapshot && wsn.snapshot.dayKey) || new Date().toISOString().slice(0, 10);
        var wh = 0; for (var wji = 0; wji < wdk.length; wji++) wh = (wh * 31 + wdk.charCodeAt(wji)) % 997;
        wdw.textContent = WOTD[wh % WOTD.length];
        wdb.hidden = false;
      }
    }
    if (params.get('half') === '1') {
      var hfb = document.getElementById('halfBadge'), hft = document.getElementById('halfText');
      if (hfb && hft) {
        var hfFill = function () {
          var hfs = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var hsn = hfs && hfs.snapshot;
          if (!hsn || !hsn.daySalary) { hft.textContent = '—'; return; }
          hft.textContent = (hsn.todayEarned || 0) >= hsn.daySalary / 2 ? '下半场' : '上半场';
        };
        hfb.hidden = false; hfFill(); setInterval(hfFill, 30000);
      }
    }
    if (params.get('month') === '1') {
      var mbb = document.getElementById('monthBadge'), mbp = document.getElementById('monthPct');
      if (mbb && mbp) {
        var moFill = function () {
          var mn = new Date();
          var dim = new Date(mn.getFullYear(), mn.getMonth() + 1, 0).getDate();
          mbp.textContent = Math.round(mn.getDate() / dim * 100) + '%';
        };
        mbb.hidden = false; moFill(); setInterval(moFill, 60000);
      }
    }
    if (params.get('horizon') === '1') {
      document.body.dataset.horizon = '1';
      var hz = document.createElement('div');
      hz.className = 'horizon-layer'; hz.setAttribute('aria-hidden', 'true');
      document.body.appendChild(hz);
    }
    var signP = params.get('sign');
    if (signP && signP.trim()) {
      var sg = document.createElement('div');
      sg.className = 'sign-line'; sg.setAttribute('aria-hidden', 'true');
      sg.textContent = '— ' + signP.trim().slice(0, 30);
      document.body.appendChild(sg);
    }
    if (params.get('weeks') === '1') {
      var wkb = document.getElementById('weeksBadge'), wkn = document.getElementById('weeksNum');
      if (wkb && wkn) {
        var wkd = new Date();
        var wkj = new Date(wkd.getFullYear(), 0, 1);
        wkn.textContent = Math.ceil((((wkd - wkj) / 864e5) + wkj.getDay() + 1) / 7);
        wkb.hidden = false;
      }
    }
    if (params.get('flick') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.dataset.flick = '1';
    }
    if (params.get('eq') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.dataset.eq = '1';
      var eql = document.createElement('div');
      eql.className = 'eq-layer'; eql.setAttribute('aria-hidden', 'true');
      eql.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
      document.body.appendChild(eql);
    }
    var lumP = params.get('lum');
    if (lumP !== null && isFinite(Number(lumP))) {
      var lumV = Math.max(40, Math.min(160, Number(lumP)));
      document.body.style.setProperty('--lum-pct', lumV + '%');
      document.body.dataset.lum = '1';
    }
    if (params.get('rail') === '1') {
      var rl = document.createElement('div');
      rl.className = 'rail-layer'; rl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(rl);
      var rlFill = function () {
        var rls = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var rsn = rls && rls.snapshot;
        var rw = rsn && rsn.daySalary ? Math.min(100, (rsn.todayEarned || 0) / rsn.daySalary * 100) : 0;
        rl.style.setProperty('--rail-w', rw.toFixed(1) + '%');
      };
      rlFill(); setInterval(rlFill, 30000);
    }
    if (params.get('hover') === '1') document.body.dataset.hover = '1';
    if (params.get('trail') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var lastT = 0;
      document.addEventListener('pointermove', function (ev) {
        var nt = Date.now();
        if (nt - lastT < 40) return; lastT = nt;
        var td = document.createElement('span');
        td.className = 'trail-dot';
        td.style.left = ev.clientX + 'px'; td.style.top = ev.clientY + 'px';
        document.body.appendChild(td);
        setTimeout(function () { td.remove(); }, 650);
      });
    }
    if (params.get('pillar') === '1') document.body.dataset.pillar = '1';
    if (params.get('gloom') === '1') document.body.dataset.gloom = '1';
    if (params.get('owl') === '1') {
      var ob = document.getElementById('owlBadge'), oi = document.getElementById('owlIcon'), ot = document.getElementById('owlText');
      if (ob && oi && ot) {
        var oh = new Date().getHours();
        var night = oh >= 22 || oh < 6;
        oi.textContent = night ? '🦉' : '🐝';
        ot.textContent = night ? '夜猫子' : '勤劳小蜜蜂';
        ob.hidden = false;
      }
    }
    if (params.get('workday') === '1') {
      var wdb2 = document.getElementById('workdayBadge'), wdi = document.getElementById('workdayIcon'), wdt = document.getElementById('workdayText');
      if (wdb2 && wdi && wdt) {
        var wds = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var isW = wds && wds.snapshot && wds.snapshot.isWorkday;
        wdi.textContent = isW ? '💼' : '🏖️';
        wdt.textContent = isW ? '工作日' : '休息日';
        wdb2.hidden = false;
      }
    }
    if (params.get('turn') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.dataset.turn = '1';
    }
    if (params.get('yearday') === '1') {
      var ydb = document.getElementById('yeardayBadge'), ydn = document.getElementById('yeardayNum');
      if (ydb && ydn) {
        var ynw = new Date(), yj1 = new Date(ynw.getFullYear(), 0, 1);
        ydn.textContent = String(Math.floor((ynw - yj1) / 864e5) + 1);
        ydb.hidden = false;
      }
    }
    if (params.get('left') === '1') {
      var lfb = document.getElementById('leftBadge'), lfa = document.getElementById('leftAmt');
      if (lfb && lfa) {
        var lfUpd = function () {
          var lfs = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn2 = lfs && lfs.snapshot;
          if (!sn2 || !sn2.daySalary) { lfb.hidden = true; return; }
          var rem = sn2.daySalary - sn2.todayEarned;
          if (rem <= 0) { lfb.hidden = true; return; }
          lfa.textContent = window.SalaryApp.formatMoney ? window.SalaryApp.formatMoney(rem) : rem.toFixed(2);
          lfb.hidden = false;
        };
        lfUpd();
        setInterval(lfUpd, 5000);
      }
    }
    if (params.get('warm') === '1') document.body.dataset.warm = '1';
    if (params.get('uptime') === '1') {
      var upb = document.getElementById('uptimeBadge'), upv = document.getElementById('uptimeVal');
      if (upb && upv) {
        var upT0 = Date.now();
        var upUpd = function () { upv.textContent = String(Math.max(0, Math.floor((Date.now() - upT0) / 60000))); };
        upUpd();
        upb.hidden = false;
        setInterval(upUpd, 30000);
      }
    }
    if (params.get('tea') === '1') {
      var teb = document.getElementById('teaBadge'), tet = document.getElementById('teaText');
      if (teb && tet) {
        var teUpd = function () {
          var th = new Date().getHours();
          if (th >= 14 && th < 16) { tet.textContent = '下午茶时间'; teb.hidden = false; }
          else if (th >= 16 && th < 18) { tet.textContent = '再扛一会儿'; teb.hidden = false; }
          else teb.hidden = true;
        };
        teUpd();
        setInterval(teUpd, 60000);
      }
    }
    if (params.get('breathe') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.dataset.breathe = '1';
    }
    if (params.get('hours') === '1') {
      var hrb = document.getElementById('hoursBadge'), hrp = document.getElementById('hoursPct');
      if (hrb && hrp) {
        var hrUpd = function () {
          var hrs = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn3 = hrs && hrs.snapshot;
          if (!sn3 || !sn3.daySalary) { hrb.hidden = true; return; }
          hrp.textContent = Math.min(100, Math.round(sn3.todayEarned / sn3.daySalary * 100)) + '%';
          hrb.hidden = false;
        };
        hrUpd();
        setInterval(hrUpd, 30000);
      }
    }
    if (params.get('charm') === '1') {
      var chb = document.getElementById('charmBadge'), chi = document.getElementById('charmIcon'), chn = document.getElementById('charmName');
      if (chb && chi && chn) {
        var CHARMS = [['🍀','四叶草'],['🧧','红包'],['🪙','金币'],['🐱','招财猫'],['🔮','水晶球'],['🌟','幸运星'],['🧿','守护眼'],['🎋','许愿竹']];
        var chs = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var chk = (chs && chs.snapshot && chs.snapshot.dayKey) || new Date().toISOString().slice(0, 10);
        var chh = 0;
        for (var ci = 0; ci < chk.length; ci++) chh = (chh * 31 + chk.charCodeAt(ci)) % 997;
        var pick = CHARMS[chh % CHARMS.length];
        chi.textContent = pick[0];
        chn.textContent = pick[1];
        chb.hidden = false;
      }
    }
    if (params.get('prism') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.dataset.prism = '1';
    }
    if (params.get('lunch') === '1') {
      var lub = document.getElementById('lunchBadge'), lut = document.getElementById('lunchText');
      if (lub && lut) {
        var luUpd = function () {
          var lh = new Date().getHours() + new Date().getMinutes() / 60;
          if (lh >= 11 && lh < 13.5) { lut.textContent = '干饭时间'; lub.hidden = false; }
          else if (lh >= 13.5 && lh < 14) { lut.textContent = '饭毕收心'; lub.hidden = false; }
          else lub.hidden = true;
        };
        luUpd();
        setInterval(luUpd, 60000);
      }
    }
    if (params.get('off') === '1') {
      var ofb = document.getElementById('offBadge'), oft = document.getElementById('offText');
      if (ofb && oft) {
        var ofUpd = function () {
          var working = !!document.querySelector('.instrument.is-working');
          var oh2 = new Date().getHours();
          if (working) { ofb.hidden = true; return; }
          oft.textContent = (oh2 >= 0 && oh2 < 6) ? '深夜自由' : '已收工';
          ofb.hidden = false;
        };
        ofUpd();
        setInterval(ofUpd, 30000);
      }
    }
    if (params.get('water') === '1') {
      var wtb = document.getElementById('waterBadge');
      if (wtb) {
        var wtUpd = function () {
          var wh = new Date().getHours();
          wtb.hidden = !(wh >= 8 && wh < 20);
        };
        wtUpd();
        setInterval(wtUpd, 60000);
      }
    }
    if (params.get('stretch') === '1') {
      var stb = document.getElementById('stretchBadge');
      if (stb) {
        var stUpd = function () {
          var sd = new Date();
          stb.hidden = !(sd.getMinutes() < 10 && sd.getHours() >= 8 && sd.getHours() < 20);
        };
        stUpd();
        setInterval(stUpd, 60000);
      }
    }
    if (params.get('fortune') === '1') {
      var ftb = document.getElementById('fortuneBadge'), ftt = document.getElementById('fortuneText');
      if (ftb && ftt) {
        var QUOTES = ['钱不是万能的，但没钱万万不能','搬砖不狠，地位不稳','今天的砖格外烫手','摸鱼一时爽，发薪两行泪','薪资到账的声音是世界上最好听的声音','打工人打工魂，打工都是人上人','加班费是检验真爱的唯一标准','只要我够快，老板就追不上我','梦想还是要有的，万一老板先跑了呢','工资就像大姨妈，一个月来一次一周就没了'];
        var fts = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var ftk = (fts && fts.snapshot && fts.snapshot.dayKey) || new Date().toISOString().slice(0, 10);
        var fth = 0;
        for (var fi = 0; fi < ftk.length; fi++) fth = (fth * 31 + ftk.charCodeAt(fi)) % 997;
        ftt.textContent = QUOTES[fth % QUOTES.length];
        ftb.hidden = false;
      }
    }
    if (params.get('xmas') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var xl = document.createElement('div');
      xl.className = 'xmas-lights';
      for (var xli = 0; xli < 24; xli++) xl.appendChild(document.createElement('i'));
      document.body.prepend(xl);
    }
    if (params.get('sq') === '1') document.body.dataset.sq = '1';
    if (params.get('compact') === '1') document.body.dataset.compact = '1';
    if (params.get('advent') === '1') {
      var adb = document.getElementById('adventBadge'), add = document.getElementById('adventDays');
      if (adb && add) {
        var adn = new Date(), adv = new Date(adn.getFullYear(), 11, 25);
        var addl = Math.ceil((adv - adn) / 864e5);
        if (addl < -7 || addl > 40) adb.hidden = true;
        else { add.textContent = addl === 0 ? '🎉' : String(Math.max(0, addl)); adb.hidden = false; }
      }
    }
    if (params.get('newyear') === '1') {
      var nyb = document.getElementById('newyearBadge'), nyd = document.getElementById('newyearDays'), nyl = document.getElementById('newyearLabel');
      if (nyb && nyd && nyl) {
        var nyn = new Date(), nyt = new Date(nyn.getFullYear() + 1, 0, 1);
        var nydl = Math.ceil((nyt - nyn) / 864e5);
        nyl.textContent = '距' + (nyn.getFullYear() + 1) + '年';
        nyd.textContent = String(Math.max(0, nydl));
        nyb.hidden = false;
      }
    }
    if (params.get('week7') === '1') {
      window.__allTime = true;
      var w7b = document.getElementById('week7Badge'), w7a = document.getElementById('week7Amt');
      if (w7b && w7a) {
        var w7Upd = function () {
          try {
            var map = JSON.parse(localStorage.getItem('salaryFlow.all') || '{}');
            var ld = new Date(Date.now() - 6 * 864e5);
            var lim = ld.getFullYear() + '-' + String(ld.getMonth() + 1).padStart(2, '0') + '-' + String(ld.getDate()).padStart(2, '0');
            var sum = 0;
            for (var k in map) if (k >= lim) sum += map[k];
            var w7s = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
            var sym3 = (w7s && w7s.currency && w7s.currency.symbol) || '¥';
            w7a.textContent = sym3 + sum.toLocaleString('en-US', { maximumFractionDigits: 0 });
            w7b.hidden = false;
          } catch (_) { }
        };
        w7Upd();
        setInterval(w7Upd, 8000);
      }
    }
    if (params.get('over') === '1') {
      var ovb = document.getElementById('overBadge'), ova = document.getElementById('overAmt');
      if (ovb && ova) {
        var ovUpd = function () {
          var ovs = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn4 = ovs && ovs.snapshot;
          // todayEarned 封顶在日薪——"超额"实际是当日加班补贴（记了加班且配了 extraPay）
          var surplus = sn4 && sn4.dayOvertimeHours > 0 ? Math.max(0, Number(ovs.config && ovs.config.extraPay) || 0) : 0;
          if (surplus <= 0) { ovb.hidden = true; return; }
          ova.textContent = window.SalaryApp.formatMoney ? window.SalaryApp.formatMoney(surplus) : surplus.toFixed(2);
          ovb.hidden = false;
        };
        ovUpd();
        setInterval(ovUpd, 5000);
      }
    }
    if (params.get('fson') === '1') {
      // click 才带全输入类型的用户激活（触屏/笔的激活在 pointerup 才产生）
      document.addEventListener('click', function fsonOnce() {
        document.removeEventListener('click', fsonOnce);
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      });
    }
    if (params.get('fps') === '1') {
      var fpb = document.getElementById('fpsBadge'), fpv = document.getElementById('fpsVal');
      if (fpb && fpv) {
        var fpCnt = 0, fpT0 = performance.now();
        (function fpLoop() { fpCnt++; requestAnimationFrame(fpLoop); })();
        setInterval(function () {
          var el = (performance.now() - fpT0) / 1000;
          fpv.textContent = String(Math.round(fpCnt / Math.max(0.1, el)));
          fpCnt = 0; fpT0 = performance.now();
        }, 2000);
        fpb.hidden = false;
      }
    }
    if (params.get('bat') === '1') {
      var bab = document.getElementById('batBadge'), bav = document.getElementById('batVal'), bai = document.getElementById('batIcon');
      if (bab && bav && bai && navigator.getBattery) {
        navigator.getBattery().then(function (bt) {
          var baUpd = function () {
            bav.textContent = String(Math.round(bt.level * 100));
            bai.textContent = bt.charging ? '🔌' : bt.level > 0.2 ? '🔋' : '🪫';
          };
          baUpd();
          bt.addEventListener('levelchange', baUpd);
          bt.addEventListener('chargingchange', baUpd);
          bab.hidden = false;
        }).catch(function () { });
      }
    }
    if (params.get('net') === '1') {
      var neb = document.getElementById('netBadge'), nei = document.getElementById('netIcon'), net2 = document.getElementById('netText');
      if (neb && nei && net2) {
        var neUpd = function () {
          var on = navigator.onLine;
          nei.textContent = on ? '🌐' : '📵';
          net2.textContent = on ? '在线' : '离线';
          neb.hidden = false;
        };
        window.addEventListener('online', neUpd);
        window.addEventListener('offline', neUpd);
        neUpd();
      }
    }
    if (params.get('yd') === '1') {
      window.__allTime = true;
      var ydb = document.getElementById('ydBadge'), yda = document.getElementById('ydAmt');
      if (ydb && yda) {
        var ydUpd = function () {
          var map = {}; try { map = JSON.parse(localStorage.getItem('salaryFlow.all') || '{}'); } catch (_) { }
          var d = new Date(); d.setDate(d.getDate() - 1);
          var yk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          var yv = map[yk];
          yda.textContent = (yv && window.SalaryApp && window.SalaryApp.formatMoney) ? window.SalaryApp.formatMoney(yv) : (yv ? yv.toFixed(2) : '—');
          ydb.hidden = false;
        };
        ydUpd();
        setInterval(ydUpd, 8000);
      }
    }
    if (params.get('tapn') === '1') {
      var tpb = document.getElementById('tapnBadge'), tpv = document.getElementById('tapnVal');
      if (tpb && tpv) {
        var tapLog = [];
        document.addEventListener('click', function () { tapLog.push(Date.now()); if (tapLog.length > 600) tapLog.shift(); });
        setInterval(function () {
          var cut = Date.now() - 60000;
          tapLog = tapLog.filter(function (t) { return t > cut; });
          tpv.textContent = tapLog.length;
          tpb.hidden = false;
        }, 1000);
        tpb.hidden = false;
      }
    }
    if (params.get('quiet') === '1') { document.body.classList.add('is-quiet'); }
    if (params.get('sec') === '1') {
      var scb = document.getElementById('secBadge'), scv = document.getElementById('secVal');
      if (scb && scv) {
        var scUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var v = st && st.snapshot && st.snapshot.secondSalary;
          if (v) { scv.textContent = (window.SalaryApp.formatMoney ? window.SalaryApp.formatMoney(v, undefined, 4) : v.toFixed(4)) + '/秒'; scb.hidden = false; }
        };
        scUpd(); setInterval(scUpd, 5000);
      }
    }
    var altParam = params.get('alt');
    if (altParam) {
      var ALTSYM = {CNY:'¥',USD:'$',EUR:'€',JPY:'JP¥',KRW:'₩',HKD:'HK$',VND:'₫',IDR:'Rp',GBP:'£',SGD:'S$',AUD:'A$',ZIM:'Z$'};
      var acode = altParam.toUpperCase();
      var alb = document.getElementById('altBadge'), ala = document.getElementById('altAmt');
      if (ALTSYM[acode] && alb && ala) {
        var alUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var r = st && st.rates && st.rates.quotes && st.rates.quotes[acode];
          var e = st && st.snapshot && st.snapshot.todayEarned;
          if (r && e != null) { ala.textContent = ALTSYM[acode] + (e * r).toLocaleString('en-US', {maximumFractionDigits: 2}); alb.hidden = false; }
        };
        alUpd(); setInterval(alUpd, 3000);
      }
    }
    if (params.get('dow') === '1') {
      var dwb = document.getElementById('dowBadge'), dwt = document.getElementById('dowText');
      if (dwb && dwt) {
        var DOWS = ['日', '一', '二', '三', '四', '五', '六'];
        var dwUpd = function () { dwt.textContent = '星期' + DOWS[new Date().getDay()]; dwb.hidden = false; };
        dwUpd(); setInterval(dwUpd, 30000);
      }
    }
    if (params.get('vib') === '1' && navigator.vibrate) {
      var vibLast = -1;
      window.addEventListener('salary-update', function (e) {
        var sn = e.detail && e.detail.snapshot;
        if (sn && isFinite(sn.todayEarned)) {
          var m = Math.floor(sn.todayEarned / 10);
          if (m > vibLast) { vibLast = m; if (m > 0) try { navigator.vibrate(30); } catch (_) { } }
        }
      });
    }
    if (params.get('ago') === '1') {
      var agb = document.getElementById('agoBadge'), agv = document.getElementById('agoVal');
      if (agb && agv) {
        var agUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sec = st && st.snapshot && st.snapshot.elapsedSecondsToday;
          if (sec != null) {
            var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
            agv.textContent = h ? h + 'h' + m + 'm' : m + 'm';
            agb.hidden = false;
          }
        };
        agUpd(); setInterval(agUpd, 30000);
      }
    }
    var tzParam = params.get('tz');
    if (tzParam) {
      var tzb = document.getElementById('tzBadge'), tzv = document.getElementById('tzVal');
      if (tzb && tzv) {
        var tzone = decodeURIComponent(tzParam).trim().slice(0, 40);
        try {
          new Intl.DateTimeFormat('zh-CN', {timeZone: tzone, hour: '2-digit', minute: '2-digit'});
          var tzUpd = function () {
            tzv.textContent = new Intl.DateTimeFormat('zh-CN', {timeZone: tzone, hour: '2-digit', minute: '2-digit'}).format(new Date());
            tzb.hidden = false;
          };
          tzUpd(); setInterval(tzUpd, 10000);
        } catch (_) { }
      }
    }
    if (params.get('ghost') === '1') {
      var ghT = null;
      var ghOn = function () { document.body.classList.remove('is-ghost'); if (ghT) clearTimeout(ghT); ghT = setTimeout(function () { document.body.classList.add('is-ghost'); }, 10000); };
      ['mousemove', 'click', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, ghOn, {passive: true}); });
      ghOn();
    }
    if (params.get('wfh') === '1') {
      var wfb = document.getElementById('wfhBadge');
      if (wfb) wfb.hidden = false;
    }
    if (params.get('kpi') === '1') {
      var kpb = document.getElementById('kpiBadge'), kpv = document.getElementById('kpiVal');
      if (kpb && kpv) {
        var kpUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = st && st.snapshot;
          if (sn && sn.daySalary > 0 && sn.todayEarned != null) {
            kpv.textContent = Math.min(999, Math.round(sn.todayEarned / sn.daySalary * 100)) + '%';
            kpb.hidden = false;
          }
        };
        kpUpd(); setInterval(kpUpd, 5000);
      }
    }
    if (params.get('sprint') === '1') {
      var spb = document.getElementById('sprintBadge'), spl = document.getElementById('sprintLeft');
      if (spb && spl) {
        var spUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = st && st.snapshot;
          if (sn && sn.isWorkday && sn.hoursPerDay > 0 && sn.elapsedSecondsToday != null) {
            var left = sn.hoursPerDay * 3600 - sn.elapsedSecondsToday;
            if (left > 0 && left <= 1800) {
              var mm = Math.ceil(left / 60);
              spl.textContent = mm + '分钟';
              spb.hidden = false;
            } else { spb.hidden = true; }
          }
        };
        spUpd(); setInterval(spUpd, 15000);
      }
    }
    if (params.get('ovt') === '1') {
      var ovb2 = document.getElementById('ovtBadge'), ovv = document.getElementById('ovtVal');
      if (ovb2 && ovv) {
        var ovUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = st && st.snapshot;
          if (sn && sn.monthOvertimeHours != null) {
            ovv.textContent = sn.monthOvertimeHours.toFixed(1) + 'h';
            ovb2.hidden = false;
          }
        };
        ovUpd(); setInterval(ovUpd, 10000);
      }
    }
    if (params.get('clock2') === '1') {
      var c2b = document.getElementById('clock2Badge'), c2v = document.getElementById('clock2Val');
      if (c2b && c2v) {
        var c2Upd = function () {
          var n = new Date();
          c2v.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
          c2b.hidden = false;
        };
        c2Upd(); setInterval(c2Upd, 5000);
      }
    }
    if (params.get('veil') === '1') {
      var vl = document.createElement('div');
      vl.className = 'veil-layer';
      document.body.appendChild(vl);
    }
    if (params.get('rest') === '1') {
      var rsb = document.getElementById('restBadge');
      if (rsb) {
        var rsUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = st && st.snapshot;
          rsb.hidden = !(sn && sn.isWorkday === false);
        };
        rsUpd(); setInterval(rsUpd, 30000);
      }
    }
    if (params.get('wdn') === '1') {
      var wnb = document.getElementById('wdnBadge'), wnv = document.getElementById('wdnVal'), wno = document.getElementById('wdnOf');
      if (wnb && wnv && wno) {
        var wnUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = st && st.snapshot;
          if (sn && sn.workdays != null && sn.elapsedWorkdays != null) {
            wnv.textContent = sn.elapsedWorkdays + (sn.isWorkday ? 1 : 0);
            wno.textContent = '/' + sn.workdays + ' 工日';
            wnb.hidden = false;
          }
        };
        wnUpd(); setInterval(wnUpd, 60000);
      }
    }
    if (params.get('aura') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.classList.add('is-aura');
    }
    if (params.get('pct') === '1') {
      var pcb = document.getElementById('pctBadge'), pcv = document.getElementById('pctVal');
      if (pcb && pcv) {
        var pcUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = st && st.snapshot;
          if (sn && sn.progress != null) { pcv.textContent = Math.round(sn.progress * 100) + '%'; pcb.hidden = false; }
        };
        pcUpd(); setInterval(pcUpd, 5000);
      }
    }
    if (params.get('qr') === '1') {
      var qrb2 = document.getElementById('qrBadge');
      if (qrb2 && window.qrcode) {
        qrb2.hidden = false;
        qrb2.style.cursor = 'pointer';
        var qrPop = null;
        qrb2.addEventListener('click', function () {
          if (qrPop) { qrPop.remove(); qrPop = null; return; }
          try {
            var q = window.qrcode(0, 'M');
            q.addData(location.href, 'Byte'); q.make();
            var n = q.getModuleCount(), cell = 4, cv = document.createElement('canvas');
            cv.width = cv.height = (n + 8) * cell;
            var cx = cv.getContext('2d');
            cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.fillStyle = '#111';
            for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) cx.fillRect((c + 4) * cell, (r + 4) * cell, cell, cell);
            qrPop = document.createElement('div');
            qrPop.className = 'qr-pop';
            qrPop.appendChild(cv);
            qrb2.appendChild(qrPop);
          } catch (_) { }
        });
      }
    }
    if (params.get('ver') === '1') {
      var vrb = document.getElementById('verBadge'), vrv = document.getElementById('verVal');
      if (vrb && vrv) {
        var m2 = document.querySelector('script[src*="deep-link"]');
        var mv = m2 && m2.src.match(/v=([a-z0-9]+)/i);
        vrv.textContent = mv ? mv[1] : 'dev';
        vrb.hidden = false;
      }
    }
    var quoteParam = params.get('quote');
    if (quoteParam) {
      var ql2 = document.getElementById('quoteLine');
      var qt = quoteParam.slice(0, 60);
      if (ql2 && qt) { ql2.textContent = qt; ql2.hidden = false; }
    }
    if (params.get('cheer') === '1') {
      var chb = document.getElementById('cheerBadge'), chi = document.getElementById('cheerIcon'), cht = document.getElementById('cheerText');
      if (chb && chi && cht) {
        var CHEERS = [['💪', '稳住，工资在涨'], ['🔥', '摸鱼也在赚钱'], ['☕', '咖啡续命，金币续杯'], ['🚀', '余额起飞中'], ['🍀', '今日财运在线'], ['😤', '再撑一会就下班']];
        var chI = Math.floor(Math.random() * CHEERS.length);
        var chUpd = function () { var c2 = CHEERS[chI % CHEERS.length]; chi.textContent = c2[0]; cht.textContent = c2[1]; chb.hidden = false; chI++; };
        chUpd(); setInterval(chUpd, 30000);
      }
    }
    if (params.get('pix') === '1') { document.body.classList.add('is-pix'); }
    if (params.get('ratio') === '1') {
      var rrb = document.getElementById('ratioBadge'), rrv = document.getElementById('ratioVal');
      if (rrb && rrv) {
        var rrUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = st && st.snapshot;
          var avg = 30; // 娱乐参考：社平时薪 ¥30/h
          if (sn && sn.hourSalary > 0) { rrv.textContent = (sn.hourSalary / avg).toFixed(1) + 'x'; rrb.hidden = false; }
        };
        rrUpd(); setInterval(rrUpd, 10000);
      }
    }
    if (params.get('done') === '1') {
      var dnb = document.getElementById('doneBadge'), dnv = document.getElementById('doneVal');
      if (dnb && dnv) {
        var dnUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = st && st.snapshot;
          if (sn && sn.progress != null) { dnv.textContent = Math.min(100, Math.round(sn.progress * 100)) + '%'; dnb.hidden = false; }
        };
        dnUpd(); setInterval(dnUpd, 5000);
      }
    }
    if (params.get('tilt2') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var inst3 = document.querySelector('.instrument');
      if (inst3) {
        inst3.style.transition = 'transform .25s ease';
        document.addEventListener('mousemove', function (e) {
          if (inst3.classList.contains('entrance')) inst3.classList.remove('entrance');
          var dx = (e.clientX / innerWidth - .5) * 6, dy = (e.clientY / innerHeight - .5) * -6;
          inst3.style.transform = 'perspective(900px) rotateY(' + dx + 'deg) rotateX(' + dy + 'deg)';
        });
      }
    }
    var taxParam = params.get('tax');
    if (taxParam) {
      var txb = document.getElementById('taxBadge'), txv = document.getElementById('taxVal');
      var trate = parseFloat(taxParam);
      if (!isFinite(trate) || trate <= 0 || trate >= 1) trate = 0.8;
      if (txb && txv) {
        var txUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var e = st && st.snapshot && st.snapshot.todayEarned;
          if (e != null) {
            txv.textContent = window.SalaryApp.formatMoney ? window.SalaryApp.formatMoney(e * trate) : (e * trate).toFixed(2);
            txb.hidden = false;
          }
        };
        txUpd(); setInterval(txUpd, 3000);
      }
    }
    var beanParam = params.get('bean');
    if (beanParam) {
      var bnb = document.getElementById('beanBadge'), bnv = document.getElementById('beanVal');
      var bprice = parseFloat(beanParam);
      if (!isFinite(bprice) || bprice <= 0) bprice = 15;
      if (bnb && bnv) {
        var bnUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var e = st && st.snapshot && st.snapshot.todayEarned;
          if (e != null) { bnv.textContent = (e / bprice).toFixed(1); bnb.hidden = false; }
        };
        bnUpd(); setInterval(bnUpd, 3000);
      }
    }
    var lofiParam = params.get('lofi');
    if (lofiParam) {
      var lf = document.createElement('div');
      lf.className = 'lofi-layer';
      document.body.appendChild(lf);
    }
    if (params.get('wage') === '1') {
      var wgb = document.getElementById('wageBadge'), wgv = document.getElementById('wageVal');
      if (wgb && wgv) {
        var wgUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var sn = st && st.snapshot;
          var v = sn && (sn.actualHourSalary || sn.hourSalary);
          if (v) { wgv.textContent = window.SalaryApp.formatMoney ? window.SalaryApp.formatMoney(v) : v.toFixed(2); wgb.hidden = false; }
        };
        wgUpd(); setInterval(wgUpd, 5000);
      }
    }
    if (params.get('mini') === '1') { document.body.classList.add('is-mini'); }
    if (params.get('sav') === '1') {
      var svb = document.getElementById('savBadge'), svv = document.getElementById('savVal');
      if (svb && svv) {
        var svUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var e = st && st.snapshot && st.snapshot.monthEarned;
          if (e != null) { svv.textContent = window.SalaryApp.formatMoney ? window.SalaryApp.formatMoney(e) : e.toFixed(2); svb.hidden = false; }
        };
        svUpd(); setInterval(svUpd, 4000);
      }
    }
    if (params.get('xp') === '1') {
      var xpb = document.getElementById('xpBadge'), xpv = document.getElementById('xpVal');
      if (xpb && xpv) {
        var xpUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var e = st && st.snapshot && st.snapshot.todayEarned;
          if (e != null) { xpv.textContent = '+' + Math.floor(e * 10); xpb.hidden = false; }
        };
        xpUpd(); setInterval(xpUpd, 1000);
      }
    }
    if (params.get('boss') === '1') {
      var boss = function () { document.body.classList.add('is-boss'); };
      var unboss = function () { document.body.classList.remove('is-boss'); };
      window.addEventListener('blur', boss);
      window.addEventListener('focus', unboss);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') unboss(); });
    }
    if (params.get('bks') === '1') {
      var bkb = document.getElementById('bksBadge'), bkv = document.getElementById('bksVal');
      if (bkb && bkv) {
        var STEPS = [10, 20, 50, 100, 200, 500, 1000];
        var bkUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var e = st && st.snapshot && st.snapshot.todayEarned;
          if (e != null) {
            var nx = STEPS.find(function (v) { return v > e; }) || STEPS[STEPS.length - 1];
            bkv.textContent = '¥' + e.toFixed(0) + '/' + nx;
            bkb.hidden = false;
          }
        };
        bkUpd(); setInterval(bkUpd, 3000);
      }
    }
    if (params.get('dice') === '1') {
      var dcb = document.getElementById('diceBadge'), dcv = document.getElementById('diceVal'), dct = document.getElementById('diceText');
      if (dcb && dcv && dct) {
        var dk = new Date().getFullYear() * 372 + (new Date().getMonth() + 1) * 31 + new Date().getDate();
        var faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        var lucks = ['大凶', '小凶', '平', '小吉', '中吉', '大吉'];
        var di = dk % 6;
        dcv.textContent = faces[di]; dct.textContent = lucks[di];
        dcb.hidden = false;
      }
    }
    if (params.get('vhs') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.classList.add('is-vhs');
    }
    var endParam = params.get('end');
    if (endParam) {
      var em = endParam.match(/^(\d{1,2})[:：.-](\d{1,2})$/);
      var eb = document.getElementById('endBadge'), ev = document.getElementById('endVal');
      if (em && eb && ev) {
        var eh = Math.min(23, parseInt(em[1], 10)), emin = Math.min(59, parseInt(em[2], 10));
        var eUpd = function () {
          var n = new Date(), tgt = new Date(n); tgt.setHours(eh, emin, 0, 0);
          var df = tgt - n;
          if (df <= 0) { ev.textContent = '已下班'; eb.hidden = false; return; }
          var h = Math.floor(df / 36e5), m = Math.floor(df % 36e5 / 6e4);
          ev.textContent = (h ? h + 'h' : '') + m + 'm';
          eb.hidden = false;
        };
        eUpd(); setInterval(eUpd, 15000);
      }
    }
    var cbParam = params.get('badge');
    if (cbParam) {
      var cbb = document.getElementById('cbBadge'), cbi = document.getElementById('cbIcon'), cbt = document.getElementById('cbText');
      var parts2 = cbParam.split('|');
      if (cbb && cbt && parts2[0]) {
        cbi.textContent = parts2[1] ? parts2[0] : '🏷️';
        cbt.textContent = (parts2[1] || parts2[0]).slice(0, 20);
        cbb.hidden = false;
      }
    }
    var wmParam = params.get('wm');
    if (wmParam) {
      var wm = document.createElement('div');
      wm.className = 'wm-layer';
      var wmt = wmParam.slice(0, 30);
      for (var wi = 0; wi < 24; wi++) { var ws = document.createElement('span'); ws.textContent = wmt; wm.appendChild(ws); }
      document.body.appendChild(wm);
    }
    if (params.get('flash') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var fLast = null;
      window.addEventListener('salary-update', function (e) {
        var v = e.detail && e.detail.snapshot && e.detail.snapshot.todayEarned;
        var aa = document.getElementById('amountArea');
        if (aa && v != null && fLast != null && v > fLast) { aa.classList.remove('flash-on'); void aa.offsetWidth; aa.classList.add('flash-on'); }
        fLast = v;
      });
    }
    if (params.get('look') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var ey = document.createElement('div');
      ey.className = 'look-eyes'; ey.textContent = '👀';
      document.body.appendChild(ey);
      document.addEventListener('mousemove', function (e) {
        var ang = Math.atan2(e.clientY - innerHeight / 2, e.clientX - innerWidth / 2);
        ey.style.transform = 'translate(-50%,-50%) rotate(' + ang + 'rad)';
      });
    }
    if (params.get('raw') === '1') {
      var rwb = document.getElementById('rawBadge'), rwv = document.getElementById('rawVal');
      if (rwb && rwv) {
        var rwUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var e = st && st.snapshot && st.snapshot.todayEarned;
          if (e != null) { rwv.textContent = e.toFixed(6); rwb.hidden = false; }
        };
        rwUpd(); setInterval(rwUpd, 200);
      }
    }
    if (params.get('swirl') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.classList.add('is-swirl');
    }
    if (params.get('rev') === '1') {
      var rvb = document.getElementById('revBadge'), rvv = document.getElementById('revVal');
      if (rvb && rvv) {
        var rvUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          if (!st || !st.snapshot) return;
          var r = Math.max(0, st.snapshot.daySalary - st.snapshot.todayEarned);
          rvv.textContent = window.SalaryApp.formatMoney(r, st.currency);
          rvb.hidden = false;
        };
        rvUpd(); setInterval(rvUpd, 500);
      }
    }
    var capParam2 = params.get('cap');
    if (capParam2 !== null) {
      var capEl = document.getElementById('incomeCaption');
      if (capEl) {
        if (capParam2.length > 120) capParam2 = capParam2.slice(0, 120);
        capEl.textContent = capParam2 || '·';
      }
    }
    if (params.get('mar') === '1') {
      var mrb = document.getElementById('marBadge'), mrv = document.getElementById('marVal');
      if (mrb && mrv) {
        var mrUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var p = st && st.snapshot && st.snapshot.progress;
          if (p != null) { mrv.textContent = (p * 42.195).toFixed(2) + ' / 42.195km'; mrb.hidden = false; }
        };
        mrUpd(); setInterval(mrUpd, 1000);
      }
    }
    if (params.get('idx') === '1') {
      var ixb = document.getElementById('idxBadge'), ixv = document.getElementById('idxVal');
      if (ixb && ixv) {
        ixv.textContent = String(Array.from(new URLSearchParams(location.search).keys()).length) + ' 个参数';
        ixb.hidden = false;
      }
    }
    if (params.get('noir') === '1') {
      document.body.classList.add('is-noir');
    }
    var tintParam = params.get('tint');
    if (tintParam) {
      var tc = decodeURIComponent(tintParam).trim();
      if (/^#?[0-9a-fA-F]{3,8}$/.test(tc)) {
        if (tc[0] !== '#') tc = '#' + tc;
        var tl = document.createElement('div');
        tl.className = 'tint-layer'; tl.style.background = tc;
        document.body.appendChild(tl);
      }
    }
    var mottoParam = params.get('motto');
    if (mottoParam) {
      var mt = mottoParam.slice(0, 24);
      if (mt) {
        var mdiv = document.querySelector('.amount-area');
        if (mdiv && !document.getElementById('mottoLine')) {
          var ml = document.createElement('div');
          ml.id = 'mottoLine'; ml.className = 'motto-line'; ml.textContent = mt;
          mdiv.appendChild(ml);
        }
      }
    }
    var opaParam = params.get('opacity');
    if (opaParam) {
      var opa = Math.min(100, Math.max(20, parseFloat(opaParam)));
      if (isFinite(opa)) document.documentElement.style.setProperty('--inst-opacity', (opa / 100).toString());
      document.body.dataset.opacity = '1';
    }
    var titleParam = params.get('title');
    if (titleParam) window.__customTitle = titleParam.trim().slice(0, 30);
    if (params.get('tabearn') === '1' || window.__customTitle) {
      var baseT = window.__customTitle || '薪动';
      document.title = baseT;
      if (params.get('tabearn') === '1') {
        setInterval(function () {
          var ta = document.getElementById('amountArea');
          var txt = ta && ta.getAttribute('aria-label');
          document.title = txt ? txt + ' · ' + baseT : baseT;
        }, 2000);
      }
    }
    if (params.get('hex') === '1') {
      var hxb = document.getElementById('hexBadge'), hxd = document.getElementById('hexDot'), hxv = document.getElementById('hexVal');
      if (hxb && hxd && hxv) {
        var hxs = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var hxk = (hxs && hxs.snapshot && hxs.snapshot.dayKey) || new Date().toISOString().slice(0, 10);
        var hxh = 0; for (var hxi = 0; hxi < hxk.length; hxi++) hxh = (hxh * 31 + hxk.charCodeAt(hxi)) % 997;
        var hexC = '#' + ('00000' + ((hxh * 2654435761) >>> 8 & 0xFFFFFF).toString(16)).slice(-6);
        hxd.style.background = hexC; hxv.textContent = hexC;
        hxb.hidden = false;
      }
    }
    if (params.get('spin') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.dataset.spin = '1';
    }
    if (params.get('pop') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.dataset.pop = '1';
    }
    if (params.get('rt') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.dataset.rt = '1';
    }
    if (params.get('dual') === '1') document.body.dataset.dual = '1';
    if (params.get('bold') === '1') document.body.dataset.bold = '1';
    if (params.get('frost') === '1') document.body.dataset.frost = '1';
    if (params.get('led') === '1') document.body.dataset.led = '1';
    if (params.get('sky') === '1') {
      var skh = new Date().getHours();
      document.body.dataset.sky = skh >= 5 && skh < 8 ? 'dawn' : skh >= 8 && skh < 17 ? 'day' : skh >= 17 && skh < 19 ? 'dusk' : 'night';
      var skyl = document.createElement('div');
      skyl.className = 'sky-layer'; skyl.setAttribute('aria-hidden', 'true');
      document.body.prepend(skyl);
    }
    if (params.get('rays') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.dataset.rays = '1';
      var raysL = document.createElement('div');
      raysL.className = 'rays-layer'; raysL.setAttribute('aria-hidden', 'true');
      document.body.appendChild(raysL);
    }
    if (params.get('shimmer') === '1') document.body.dataset.shimmer = '1';
    if (params.get('fog') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.dataset.fog = '1';
      var fogL = document.createElement('div');
      fogL.className = 'fog-layer'; fogL.setAttribute('aria-hidden', 'true');
      fogL.innerHTML = '<i></i><i></i>';
      document.body.appendChild(fogL);
    }
    var curP = params.get('cursor');
    if (curP && /^[\S]{1,4}$/u.test(curP)) {
      document.body.style.cursor = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">' + curP + '</text></svg>') + '") 16 16, auto';
    }
    var borderC = params.get('border');
    if (borderC && /^#?([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(borderC)) {
      var inst = document.querySelector('.instrument');
      if (inst) inst.style.borderColor = borderC[0] === '#' ? borderC : '#' + borderC;
    }
    if (params.get('ripple') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.addEventListener('pointerdown', function (ev) {
        var rp = document.createElement('span');
        rp.className = 'click-ripple';
        rp.style.left = ev.clientX + 'px'; rp.style.top = ev.clientY + 'px';
        document.body.appendChild(rp);
        setTimeout(function () { rp.remove(); }, 700);
      });
    }
    if (params.get('day') === '1') {
      var db2 = document.getElementById('dayBadge'), dp = document.getElementById('dayPct'), di = document.getElementById('dayIcon');
      if (db2 && dp) {
        var dayFill = function () {
          var dn = new Date(), hrs = dn.getHours() + dn.getMinutes() / 60;
          if (hrs >= 6 && hrs <= 19) { if (di) di.textContent = '☀️'; dp.textContent = '白昼 ' + Math.round((hrs - 6) / 13 * 100) + '%'; }
          else { if (di) di.textContent = '🌙'; dp.textContent = '夜晚'; }
        };
        db2.hidden = false; dayFill(); setInterval(dayFill, 60000);
      }
    }
    if (params.get('card') === '1') {
      var cb = document.getElementById('cardBadge'), cn2 = document.getElementById('cardName');
      if (cb && cn2) {
        var MAJOR = [['愚者', '🃏'], ['魔术师', '🎩'], ['女祭司', '🌙'], ['女皇', '👑'], ['皇帝', '🤴'], ['教皇', '⛪'], ['恋人', '💞'], ['战车', '🏇'], ['力量', '🦁'], ['隐士', '🏮'], ['命运之轮', '🎡'], ['正义', '⚖️'], ['倒吊人', '🙃'], ['死神', '💀'], ['节制', '🏺'], ['恶魔', '😈'], ['高塔', '🗼'], ['星星', '⭐'], ['月亮', '🌙'], ['太阳', '☀️'], ['审判', '📯'], ['世界', '🌍']];
        var csn = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var cdk = (csn && csn.snapshot && csn.snapshot.dayKey) || new Date().toISOString().slice(0, 10);
        var ch = 0; for (var ci = 0; ci < cdk.length; ci++) ch = (ch * 31 + cdk.charCodeAt(ci)) % 997;
        var card = MAJOR[ch % 22];
        cn2.textContent = card[1] + ' ' + card[0];
        cb.hidden = false;
      }
    }
    if (params.get('bar') === '1') {
      var tp = document.createElement('div');
      tp.className = 'top-progress'; tp.setAttribute('aria-hidden', 'true');
      document.body.appendChild(tp);
      var barFill = function () {
        var bst = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        var bsn = bst && bst.snapshot;
        if (!bsn || !bsn.daySalary) return;
        document.body.style.setProperty('--bar-w', Math.min(100, bsn.todayEarned / bsn.daySalary * 100).toFixed(1));
      };
      barFill(); setInterval(barFill, 1000);
    }
    if (params.get('zodiac') === '1') {
      var zb = document.getElementById('zodiacBadge');
      if (zb) {
        var ZI = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
        var ZE = ['🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐷'];
        var zidx = (new Date().getFullYear() - 4) % 12;
        zb.hidden = false;
        var zic = document.getElementById('zodiacIcon'); if (zic) zic.textContent = ZE[zidx];
        var znm = document.getElementById('zodiacName'); if (znm) znm.textContent = ZI[zidx] + '年';
      }
    }
    if (params.get('jieqi') === '1') {
      var jb = document.getElementById('jieqiBadge');
      if (jb) {
        var JQ = [['小寒', 1, 5], ['大寒', 1, 20], ['立春', 2, 4], ['雨水', 2, 19], ['惊蛰', 3, 6], ['春分', 3, 21], ['清明', 4, 5], ['谷雨', 4, 20], ['立夏', 5, 6], ['小满', 5, 21], ['芒种', 6, 6], ['夏至', 6, 21], ['小暑', 7, 7], ['大暑', 7, 23], ['立秋', 8, 8], ['处暑', 8, 23], ['白露', 9, 8], ['秋分', 9, 23], ['寒露', 10, 8], ['霜降', 10, 23], ['立冬', 11, 7], ['小雪', 11, 22], ['大雪', 12, 7], ['冬至', 12, 22]];
        var jn = new Date(), jy = jn.getFullYear(), today0 = new Date(jy, jn.getMonth(), jn.getDate()).getTime();
        var best = null;
        for (var ji = 0; ji < JQ.length + 1; ji++) {
          var jt = JQ[ji % JQ.length], jyr = ji >= JQ.length ? jy + 1 : jy;
          var dd = Math.round((new Date(jyr, jt[1] - 1, jt[2]).getTime() - today0) / 864e5);
          if (dd >= 0) { best = { n: jt[0], d: dd }; break; }
        }
        if (best) {
          jb.hidden = false;
          var jlab = document.getElementById('jieqiLabel'); if (jlab) jlab.textContent = best.d === 0 ? '今日' + best.n : '距' + best.n;
          var jdd = document.getElementById('jieqiDays'); if (jdd) { jdd.textContent = String(best.d); jdd.nextSibling.textContent = best.d === 0 ? '' : '天'; }
        }
      }
    }
    var daysP = params.get('days');
    if (daysP) {
      var daySet = [];
      daysP.split(',').forEach(function (seg) {
        var dm = /^(\d)-(\d)$/.exec(seg), dv = Number(seg);
        if (dm) { for (var di = +dm[1]; di <= +dm[2]; di++) if (di <= 6) daySet.push(di); }
        else if (dv >= 0 && dv <= 6 && String(dv) === seg.trim()) daySet.push(dv);
      });
      daySet = daySet.filter(function (v, i) { return daySet.indexOf(v) === i; });
      var dst2 = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
      if (daySet.length && dst2 && dst2.config) { dst2.config.weekDays = daySet; if (window.SalaryApp.render) window.SalaryApp.render(); }
    }
    if (params.get('shake') === '1' && window.DeviceMotionEvent) {
      var lastShake = 0;
      window.addEventListener('devicemotion', function (e) {
        var a = e.accelerationIncludingGravity;
        if (!a) return;
        if (Math.abs(a.x) + Math.abs(a.y) + Math.abs(a.z) > 42 && Date.now() - lastShake > 3000) {
          lastShake = Date.now();
          if (window.SalaryApp && window.SalaryApp.toast) window.SalaryApp.toast('🎉 摇一摇，钱抖出来了');
          var inst = document.querySelector('.instrument');
          if (inst) { inst.classList.add('shake-hit'); setTimeout(function () { inst.classList.remove('shake-hit'); }, 600); }
        }
      });
    }
    var bdayMatch = /^(\d{1,2})[-./](\d{1,2})$/.exec(params.get('bday') || '');
    if (bdayMatch) {
      var bm = +bdayMatch[1], bd = +bdayMatch[2];
      var bn = new Date(), by = bn.getFullYear();
      var blast = new Date(by, bm, 0).getDate();
      var btarget = (bm >= 1 && bm <= 12 && bd >= 1 && bd <= blast) ? new Date(by, bm - 1, bd) : null;
      if (btarget) {
        if (btarget < new Date(by, bn.getMonth(), bn.getDate())) { by++; btarget = new Date(by, bm - 1, bd); }
        var bdays = Math.round((btarget - new Date(bn.getFullYear(), bn.getMonth(), bn.getDate())) / 864e5);
        var bb = document.getElementById('bdayBadge');
        if (bb) {
          bb.hidden = false;
          bb.title = '生日 ' + bm + '月' + bd + '日';
          var bl = document.getElementById('bdayLabel');
          var bdd = document.getElementById('bdayDays');
          var bu2 = document.getElementById('bdayUnit');
          if (bdays === 0) {
            if (bl) bl.textContent = '生日快乐';
            if (bdd) bdd.textContent = '🎂';
            if (bu2) bu2.hidden = true;
            if (window.SalaryApp && window.SalaryApp.toast) setTimeout(function(){ window.SalaryApp.toast('🎂 生日快乐！'); }, 1500);
          } else {
            if (bl) bl.textContent = '距生日';
            if (bdd) bdd.textContent = String(bdays);
          }
        }
      }
    }
    var msParam = params.get('milestone');
    if (msParam !== null) {
      window.__milestones = (msParam === '0' || msParam === '') ? []
        : msParam.split(',').map(Number).filter(function (n) { return n > 0 && n < 1e12; }).slice(0, 50);
    }
    if (params.get('light') === '1') document.body.dataset.light = '1';
    else if (params.get('light') === '0') delete document.body.dataset.light;
    else if (params.get('light') === 'auto') { var lhr = new Date().getHours(); if (lhr >= 7 && lhr < 19) document.body.dataset.light = '1'; }
    if (params.get('eink') === '1') document.body.dataset.eink = '1';
    var shiftP = params.get('shift');
    if (shiftP) {
      var shiftPairs = shiftP.split(',').slice(0, 4).map(function (seg) {
        var sm = /^(\d{1,2})(?::?(\d{2}))?-(\d{1,2})(?::?(\d{2}))?$/.exec(seg);
        if (!sm) return null;
        var s = (+sm[1]) * 60 + (+(sm[2] || 0)), e = (+sm[3]) * 60 + (+(sm[4] || 0));
        if (e > 1440 || s >= e) return null;
        var fmt = function (x) { return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };
        return [fmt(s), fmt(e)];
      });
      if (shiftPairs.length && shiftPairs.every(Boolean)) {
        var sst = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        if (sst && sst.config) { sst.config.intervals = shiftPairs; if (window.SalaryApp.render) window.SalaryApp.render(); }
      }
    }
    if (!params.get('light') && !themeParam) { try { if (localStorage.getItem('salaryFlow.light') === '1') document.body.dataset.light = '1'; } catch (e) {} }
    window.__toggleLight = function () {
      var on = document.body.dataset.light !== '1';
      if (on) document.body.dataset.light = '1'; else delete document.body.dataset.light;
      try { localStorage.setItem('salaryFlow.light', on ? '1' : '0'); } catch (e) {}
      var tmc = document.querySelector('meta[name=theme-color]');
      if (tmc) tmc.setAttribute('content', getComputedStyle(document.body).getPropertyValue('--bg').trim());
      if (window.SalaryApp && window.SalaryApp.toast) window.SalaryApp.toast(on ? '浅色模式' : '深色模式');
    };

    var QUOTES = ['打工不摸鱼，不如回家种地','今天的砖，格外烫手','薪尽自然凉','只要我够快，贫穷就追不上我','上班如上坟，下班如过年','人在工位坐，薪从秒上跳','摸鱼是打工人的浪漫','卷不动的时候，就看看余额'];
    var quoteCustom = params.get('quote');
    if (quoteCustom && !['0', '1', 'off', 'true', 'on'].includes(quoteCustom)) quoteCustom = quoteCustom.slice(0, 40);
    else quoteCustom = '';
    var showQuote = function () {
      var q = document.getElementById('quoteLine'); if (!q) return;
      q.hidden = false;
      q.textContent = quoteCustom || QUOTES[Math.floor(Date.now() / 864e5) % QUOTES.length];
    };
    var quoteParam = params.get('quote');
    if (quoteParam === '0' || quoteParam === 'off') { try { localStorage.removeItem('salaryFlow.quote'); } catch (e) {} }
    else if (quoteParam) { try { localStorage.setItem('salaryFlow.quote', '1'); } catch (e) {} }
    var quoteOn = quoteParam && quoteParam !== '0' && quoteParam !== 'off';
    if (!quoteOn) { try { quoteOn = localStorage.getItem('salaryFlow.quote') === '1'; } catch (e) {} }
    if (quoteOn || quoteCustom) showQuote();
    window.__toggleQuote = function () {
      var q2 = document.getElementById('quoteLine'); if (!q2) return;
      if (q2.hidden) showQuote();
      else q2.hidden = true;
      try { localStorage.setItem('salaryFlow.quote', q2.hidden ? '0' : '1'); } catch (e) {}
    };

    var emojiParam = params.get('emoji');
    if (emojiParam) { var es = document.getElementById('statusEmoji'); if (es) { es.textContent = emojiParam.slice(0, 4); es.hidden = false; } }

    var rateParam = {sec: 0, second: 0, s: 0, min: 1, minute: 1, m: 1, hour: 2, h: 2}[params.get('rate') || ''];
    if (rateParam !== undefined) { try { localStorage.setItem('salaryFlow.rateMode', String(rateParam)); } catch (e) {} }

    if (params.get('clock') === '12') window.__clock12 = true;

    var decParam = parseInt(params.get('dec') || '', 10);
    if (decParam >= 2 && decParam <= 6) window.__decimals = decParam;

    var petParam = params.get('pet');
    if (petParam) { var pn = document.getElementById('pigNoteText'); if (pn) pn.textContent = petParam.slice(0, 12) + '正在存钱…'; }

    var avgParam = params.get('avg');
    if (avgParam) { var avgN = parseFloat(avgParam.replace(/,/g, '')); if (avgN > 0) { window.__avgSalary = avgN; var ab0 = document.getElementById('avgBadge'); if (ab0) ab0.hidden = false; } }

    var vsParam = params.get('vs');
    if (vsParam) {
      var vsM = /^([^@:]+)[@:]([0-9]+(?:\.[0-9]+)?)$/.exec(vsParam.trim());
      if (vsM) { window.__vsItem = { name: vsM[1], price: parseFloat(vsM[2]) }; var vb0 = document.getElementById('vsBadge'); if (vb0) vb0.hidden = false; }
    }

    var hideMap = {header:'.app-header',footer:'.app-footer',faq:'.seo-faq',utility:'.utility-row',summary:'.summary-strip',overtime:'.overtime-disclosure',bottom:'.bottom-row',toolbar:'.instrument-toolbar',foot:'.instrument-footer',badges:'.payday',clock:'.clockout',caption:'.income-caption',progress:'.progress-info',status:'.hero-status'};
    var hideList = (params.get('hide') || '').split(',').map(function (s) { return s.trim(); });
    if (params.get('embed') === '1') hideList = ['header', 'footer', 'faq'];
    var hiddenSel = hideList.map(function (k) { return hideMap[k]; }).filter(Boolean);
    if (hiddenSel.length) {
      var st = document.createElement('style');
      st.textContent = hiddenSel.join(',') + '{display:none!important}';
      document.head.appendChild(st);
    }

    if (params.get('zen') === '1' || params.get('ui') === '0') document.body.classList.add('is-focus');

    // ?dialog=share|about|settings|goal|calendar|currency|overtime — open a panel directly.
    var dlg = params.get('dialog') || params.get('share') === '1' && 'share' || '';
    var dlgMap = {share:'shareDialog',about:'aboutDialog',settings:'settingsDialog',goal:'goalDialog',calendar:'calendarDialog',currency:'currencyDialog',overtime:'overtimeDialog'};
    if (dlgMap[dlg]) app.openDialog(dlgMap[dlg]);

    if (params.get('focus') === 'salary') {
      var salaryInput = document.getElementById('salaryInput');
      if (salaryInput) { salaryInput.focus(); salaryInput.select(); }
    }
  });

  /* Live tab title: show the ticking amount. ?title=0 disables. */
  if (params.get('title') !== '0') {
    var baseTitle = params.get('title') || document.title;
    setInterval(function () {
      if (document.hidden) return;
      var odo = document.getElementById('earningsNumber');
      var sym = document.getElementById('moneySymbol');
      var val = odo && odo.getAttribute('aria-label');
      if (val) document.title = (sym ? sym.textContent : '') + val + ' · ' + baseTitle;
    }, 5000);
  }

  /* Keyboard shortcuts: / focus salary · f fullscreen · ? help */
  var konamiBuf = [];
  document.addEventListener('keydown', function (e) {
    if (window.__noKeys) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    konamiBuf.push(e.key); if (konamiBuf.length > 10) konamiBuf.shift();
    if (konamiBuf.join(',') === 'ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a') {
      konamiBuf.length = 0;
      var rkb = document.getElementById('richQuickButton');
      if (rkb) rkb.click();
      if (window.SalaryApp && window.SalaryApp.toast) window.SalaryApp.toast('🎮 KONAMI！暴富模式解锁');
    }
    if (e.key === '/') {
      e.preventDefault();
      var input = document.getElementById('salaryInput');
      if (input) { input.focus(); input.select(); }
    } else if (e.key === 'f') {
      var fs = document.getElementById('fullscreenButton');
      if (fs) fs.click();
    } else if (e.key === '?') {
      if (window.SalaryApp) window.SalaryApp.openDialog('aboutDialog');
    } else if (e.key === 't' && window.SalaryApp) {
      var skins = ['pig', 'charge', 'meter', 'pixel', 'neon', 'mono', 'paper', 'term', 'ecg', 'wave', 'therm'];
      var cur = window.SalaryApp.getState().preferences.template;
      window.SalaryApp.setTemplate(skins[(skins.indexOf(cur) + 1) % skins.length]);
    } else if (e.key === 'p' && window.SalaryApp) {
      var st = window.SalaryApp.getState();
      window.SalaryApp.setPeriod(st.preferences.period === 'day' ? 'month' : 'day');
    } else if (/^[0-9]$/.test(e.key) && window.SalaryApp) {
      var skinKeys = ['pig','charge','meter','pixel','neon','mono','paper','term','ecg','wave'];
      var direct = e.key === '0' ? skinKeys[9] : skinKeys[Number(e.key) - 1];
      if (direct) window.SalaryApp.setTemplate(direct);
    } else if (e.key === 'q') {
      if (window.__toggleQuote) window.__toggleQuote();
    } else if (e.key === 'n' && window.SalaryApp) {
      try {
        var rm = Math.min(2, Math.max(0, parseInt(localStorage.getItem('salaryFlow.rateMode') || '0', 10) || 0));
        localStorage.setItem('salaryFlow.rateMode', String((rm + 1) % 3));
        window.SalaryApp.render && window.SalaryApp.render();
      } catch (e) {}
    } else if (e.key === 'a') {
      var pal = ['#4de3ff', '#5ae593', '#eeb58e', '#ff8a52', '#c2622f', '#e8e8e8', '#39d353'];
      var cur3 = '';
      try { cur3 = localStorage.getItem('salaryFlow.accent') || ''; } catch (e) {}
      var nxt = pal[(pal.indexOf(cur3) + 1) % pal.length];
      try { localStorage.setItem('salaryFlow.accent', nxt); } catch (e) {}
      document.body.style.setProperty('--accent', nxt);
    } else if (e.key === 'e' && window.SalaryApp) {
      window.SalaryApp.toggleDemo();
    } else if (e.key === 'x' && window.SalaryApp) {
      var cc = ['CNY','USD','EUR','JPY','KRW','HKD','VND','IDR','GBP','SGD','AUD','ZIM'];
      var cur2 = window.SalaryApp.getState().preferences.currency;
      window.SalaryApp.setCurrency(cc[(cc.indexOf(cur2) + 1) % cc.length]);
    } else if (e.key === 'c' && window.SalaryApp) {
      window.SalaryApp.openDialog('calendarDialog');
    } else if (e.key === 'o') {
      var ob = document.getElementById('overtimeRecordButton');
      if (ob) ob.click();
    } else if (e.key === 'g' && window.SalaryApp) {
      window.SalaryApp.openDialog('goalDialog');
    } else if (e.key === 'b') {
      var rb = document.getElementById('richQuickButton');
      if (rb) rb.click();
    } else if (e.key === 's' && window.SalaryApp) {
      window.SalaryApp.openDialog('shareDialog');
    } else if (e.key === 'Escape' && document.body.classList.contains('is-focus') && !document.querySelector('dialog[open]')) {
      document.body.classList.remove('is-focus');
    } else if (e.key === 'z') {
      var fb = document.getElementById('focusButton');
      if (fb) fb.click();
    } else if (e.key === 'm') {
      var sb = document.getElementById('soundButton');
      if (sb) sb.click();
    } else if (e.key === 'l') {
      if (window.__toggleLight) window.__toggleLight();
    }
  });

  /* "Copy link" inside the share dialog: URL carrying current salary + template. */
  function privateHost(host) {
    host = String(host).toLowerCase().replace(/^\[|\]$/g, '');
    if (host.includes(':')) return host === '::1' || /^(fc|fd|fe80)/.test(host);
    var ip = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ip) {
      var a = +ip[1], b = +ip[2];
      return a === 0 || a === 10 || a === 127
        || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 168);
    }
    return host === 'localhost' || !host.includes('.')
      || /\.(localhost|local|internal|test|invalid)$/.test(host);
  }
  function publicBase(raw) {
    try {
      var u = new URL(String(raw || '').trim());
      if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password || privateHost(u.hostname)) return null;
      return u.origin + u.pathname;
    } catch (e) { return null; }
  }
  function addInstallBtn(field) {
    var installBtn = document.createElement('button');
    installBtn.type = 'button';
    installBtn.className = 'small-button install-btn';
    installBtn.textContent = '安装到桌面';
    installBtn.addEventListener('click', function () {
      var p = deferredInstall;
      if (!p) return;
      p.prompt();
      p.userChoice.finally(function () { installBtn.remove(); deferredInstall = null; });
    });
    field.appendChild(installBtn);
  }
  function wireCopyLink() {
    var field = document.getElementById('shareLinkField');
    if (!field) return;
    if (field.dataset.copyWired) {
      if (deferredInstall && !field.querySelector('.install-btn')) addInstallBtn(field);
      return;
    }
    field.dataset.copyWired = '1';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'small-button';
    btn.textContent = '复制当前链接';
    btn.addEventListener('click', function () {
      var app = window.SalaryApp;
      // Mirror app.js publicUrl(): public http(s), no credentials, no private hosts,
      // and origin+pathname only so pasted share links don't leak their own params.
      var base = publicBase(location.href) || publicBase((document.getElementById('shareUrl') || {}).value);
      if (!base) { btn.textContent = '需要公开部署的网址'; setTimeout(function(){ btn.textContent='复制当前链接'; }, 1800); return; }
      var u = new URL(base);
      var state = app && app.getState();
      var salary = state && state.config && state.config.salary;
      var prefs = state && state.preferences;
      if (salary) u.searchParams.set('salary', salary);
      if (prefs && prefs.template) u.searchParams.set('template', prefs.template);
      if (prefs && prefs.currency && prefs.currency !== 'CNY') u.searchParams.set('currency', prefs.currency);
      if (prefs && prefs.period && prefs.period !== 'day') u.searchParams.set('period', prefs.period);
      var ac = document.body.style.getPropertyValue('--accent') || params.get('accent') ||
        (function () { try { return localStorage.getItem('salaryFlow.accent') || ''; } catch (e) { return ''; } })();
      if (ac && (/^#?([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(ac) || /^[a-zA-Z]{3,20}$/.test(ac))) u.searchParams.set('accent', ac);
      if (document.body.classList.contains('is-focus')) u.searchParams.set('zen', '1');
      var ints = state && state.config && state.config.intervals;
      if (ints && ints.length && JSON.stringify(ints) !== '[["09:00","12:00"],["13:30","18:00"]]') {
        u.searchParams.set('work', ints.map(function (p) { return p.join('-').replace(/:/g, ''); }).join(','));
      }
      var bgc = document.body.style.getPropertyValue('--bg');
      if (/^#?([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(bgc) || /^[a-zA-Z]{3,20}$/.test(bgc)) u.searchParams.set('bg', bgc);
      var pd = params.get('payday') || (function () { try { return localStorage.getItem('salaryFlow.payday'); } catch (e) { return ''; } })();
      if (pd && /^[0-9]{1,2}$/.test(pd)) u.searchParams.set('payday', pd);
      if (window.__vsItem) u.searchParams.set('vs', window.__vsItem.name + '@' + window.__vsItem.price);
      if (window.__avgSalary) u.searchParams.set('avg', String(window.__avgSalary));
      var petNow = params.get('pet'); if (petNow) u.searchParams.set('pet', petNow.slice(0, 12));
      if (window.__decimals && window.__decimals !== 2) u.searchParams.set('dec', String(window.__decimals));
      var em = params.get('emoji'); if (em) u.searchParams.set('emoji', em.slice(0, 4));
      var qc = params.get('quote'); if (qc) u.searchParams.set('quote', qc.slice(0, 40));
      var rt = params.get('rate'); if (rt) u.searchParams.set('rate', rt);
      if (window.__clock12) u.searchParams.set('clock', '12');
      if (window.__noKeys) u.searchParams.set('keys', '0');
      if (window.__noConfetti) u.searchParams.set('confetti', '0');
      if (window.__milestones) u.searchParams.set('milestone', window.__milestones.length ? window.__milestones.join(',') : '0');
      var lgp = params.get('light'); if (document.body.dataset.light === '1') u.searchParams.set('light', lgp === 'auto' ? 'auto' : '1');
      if (document.body.dataset.eink === '1') u.searchParams.set('eink', '1');
      var shp = params.get('shift'); if (shp) u.searchParams.set('shift', shp);
      var thp = params.get('theme'); if (thp) u.searchParams.set('theme', thp);
      if (window.__dirDown) u.searchParams.set('dir', 'down');
      var szp = params.get('size'); if (szp) u.searchParams.set('size', szp);
      var fxp = params.get('fx'); if (fxp) u.searchParams.set('fx', fxp);
      if (window.__noCompact) u.searchParams.set('compact', '0');
      if (window.__vibrate) u.searchParams.set('vibrate', '1');
      var syp = params.get('symbol'); if (syp) u.searchParams.set('symbol', syp.slice(0, 3));
      var brp = params.get('brand'); if (brp) u.searchParams.set('brand', brp.slice(0, 12));
      var bdp = params.get('badge'); if (bdp) u.searchParams.set('badge', bdp.slice(0, 20));
      var cpp = params.get('caption'); if (cpp) u.searchParams.set('caption', cpp.slice(0, 40));
      if (params.get('mirror') === '1') u.searchParams.set('mirror', '1');
      var ssp = params.get('ss'); if (ssp) u.searchParams.set('ss', ssp);
      if (window.__msNext) u.searchParams.set('ms', '1');
      if (window.__luck) u.searchParams.set('luck', '1');
      if (window.__earnTarget) u.searchParams.set('earn', String(window.__earnTarget));
      var bgp = params.get('bgimg'); if (bgp) u.searchParams.set('bgimg', bgp);
      var kip = params.get('kiosk'); if (kip) u.searchParams.set('kiosk', kip);
      var fvp = params.get('favicon'); if (fvp) u.searchParams.set('favicon', Array.from(fvp).slice(0, 4).join(''));
      if (params.get('crt') === '1') u.searchParams.set('crt', '1');
      if (params.get('invert') === '1') u.searchParams.set('invert', '1');
      var anp = params.get('anni'); if (anp) { u.searchParams.set('anni', anp); var ann = params.get('anniname'); if (ann) u.searchParams.set('anniname', ann.slice(0, 12)); }
      if (params.get('year') === '1') u.searchParams.set('year', '1');
      var spp = params.get('speed'); if (spp) u.searchParams.set('speed', spp);
      var tsp = params.get('toast'); if (tsp) u.searchParams.set('toast', tsp.slice(0, 40));
      if (window.__cnAmount) u.searchParams.set('cn', '1');
      if (document.body.dataset.glass === '1') u.searchParams.set('glass', '1');
      var pop = params.get('pomodoro'); if (pop) u.searchParams.set('pomodoro', pop);
      if (document.body.dataset.rgb === '1') u.searchParams.set('rgb', '1');
      if (document.body.dataset.breath === '1') u.searchParams.set('breath', '1');
      if (window.__notify) u.searchParams.set('notify', '1');
      if (params.get('bw') === '1') u.searchParams.set('bw', '1');
      if (params.get('sepia') === '1') u.searchParams.set('sepia', '1');
      if (params.get('friday') === '1') u.searchParams.set('friday', '1');
      var bp = params.get('bday'); if (bp) u.searchParams.set('bday', bp);
      var seap = params.get('season'); if (seap) u.searchParams.set('season', seap);
      if (window.__spark) u.searchParams.set('spark', '1');
      if (window.__count) u.searchParams.set('count', '1');
      var tkp = params.get('ticker'); if (tkp) u.searchParams.set('ticker', tkp.slice(0, 80));
      var bgq = params.get('bg'); if (bgq && /^#?[0-9a-fA-F]{3,8}$/.test(bgq)) u.searchParams.set('bg', bgq);
      if (document.body.dataset.contrast === '1') u.searchParams.set('contrast', '1');
      var dimp = params.get('dim'); if (dimp) u.searchParams.set('dim', dimp);
      if (params.get('visits') === '1') u.searchParams.set('visits', '1');
      if (window.__chime) u.searchParams.set('chime', '1');
      var lp = params.get('logo'); if (lp) u.searchParams.set('logo', lp);
      if (document.body.dataset.grad === '1') u.searchParams.set('grad', '1');
      var fp = params.get('from'); if (fp) u.searchParams.set('from', fp.slice(0, 16));
      if (params.get('auto') === '1') u.searchParams.set('auto', '1');
      if (params.get('eco') === '1') u.searchParams.set('eco', '1');
      if (params.get('bloom') === '1') u.searchParams.set('bloom', '1');
      if (params.get('all') === '1') u.searchParams.set('all', '1');
      if (params.get('moon') === '1') u.searchParams.set('moon', '1');
      if (params.get('shake') === '1') u.searchParams.set('shake', '1');
      if (params.get('week') === '1') u.searchParams.set('week', '1');
      if (params.get('glow') === '1') u.searchParams.set('glow', '1');
      var hpp = params.get('hourly'); if (hpp) u.searchParams.set('hourly', hpp);
      var dpp = params.get('daily'); if (dpp) u.searchParams.set('daily', dpp);
      if (params.get('quarter') === '1') u.searchParams.set('quarter', '1');
      var fpp = params.get('font'); if (fpp && ['mono', 'serif', 'round'].indexOf(fpp) >= 0) u.searchParams.set('font', fpp);
      if (params.get('zodiac') === '1') u.searchParams.set('zodiac', '1');
      if (params.get('jieqi') === '1') u.searchParams.set('jieqi', '1');
      var dyp = params.get('days'); if (dyp) u.searchParams.set('days', dyp);
      var plp = params.get('pal'); if (plp && ['forest', 'ocean', 'sunset', 'grape', 'vapor'].indexOf(plp) >= 0) u.searchParams.set('pal', plp);
      if (params.get('amber') === '1') u.searchParams.set('amber', '1');
      if (params.get('dots') === '1') u.searchParams.set('dots', '1');
      if (params.get('tile') === '1') u.searchParams.set('tile', '1');
      if (params.get('outline') === '1') u.searchParams.set('outline', '1');
      if (params.get('stripe') === '1') u.searchParams.set('stripe', '1');
      if (params.get('bezel') === '1') u.searchParams.set('bezel', '1');
      var hup = params.get('hue'); if (hup) u.searchParams.set('hue', hup.slice(0, 5));
      var bop = params.get('born'); if (bop) u.searchParams.set('born', bop.slice(0, 10));
      if (params.get('disco') === '1') u.searchParams.set('disco', '1');
      if (params.get('sway') === '1') u.searchParams.set('sway', '1');
      if (params.get('band') === '1') u.searchParams.set('band', '1');
      if (params.get('mood') === '1') u.searchParams.set('mood', '1');
      if (params.get('wiggle') === '1') u.searchParams.set('wiggle', '1');
      if (params.get('stamp') === '1') u.searchParams.set('stamp', '1');
      if (params.get('tock') === '1') u.searchParams.set('tock', '1');
      if (params.get('gains') === '1') u.searchParams.set('gains', '1');
      if (params.get('hour') === '1') u.searchParams.set('hour', '1');
      if (params.get('greet') === '1') u.searchParams.set('greet', '1');
      var satX = params.get('sat'); if (satX) u.searchParams.set('sat', satX);
      if (params.get('wotd') === '1') u.searchParams.set('wotd', '1');
      if (params.get('half') === '1') u.searchParams.set('half', '1');
      if (params.get('month') === '1') u.searchParams.set('month', '1');
      if (params.get('horizon') === '1') u.searchParams.set('horizon', '1');
      var sgp = params.get('sign'); if (sgp) u.searchParams.set('sign', sgp.slice(0, 30));
      if (params.get('frost') === '1') u.searchParams.set('frost', '1');
      if (params.get('led') === '1') u.searchParams.set('led', '1');
      if (params.get('sky') === '1') u.searchParams.set('sky', '1');
      if (params.get('weeks') === '1') u.searchParams.set('weeks', '1');
      if (params.get('flick') === '1') u.searchParams.set('flick', '1');
      if (params.get('eq') === '1') u.searchParams.set('eq', '1');
      if (params.get('rt') === '1') u.searchParams.set('rt', '1');
      if (params.get('dual') === '1') u.searchParams.set('dual', '1');
      if (params.get('bold') === '1') u.searchParams.set('bold', '1');
      if (params.get('hex') === '1') u.searchParams.set('hex', '1');
      if (params.get('spin') === '1') u.searchParams.set('spin', '1');
      if (params.get('pop') === '1') u.searchParams.set('pop', '1');
      var lumX = params.get('lum'); if (lumX) u.searchParams.set('lum', lumX);
      if (params.get('rail') === '1') u.searchParams.set('rail', '1');
      if (params.get('hover') === '1') u.searchParams.set('hover', '1');
      if (params.get('trail') === '1') u.searchParams.set('trail', '1');
      if (params.get('pillar') === '1') u.searchParams.set('pillar', '1');
      if (params.get('gloom') === '1') u.searchParams.set('gloom', '1');
      if (params.get('owl') === '1') u.searchParams.set('owl', '1');
      if (params.get('workday') === '1') u.searchParams.set('workday', '1');
      if (params.get('turn') === '1') u.searchParams.set('turn', '1');
      if (params.get('yearday') === '1') u.searchParams.set('yearday', '1');
      if (params.get('left') === '1') u.searchParams.set('left', '1');
      if (params.get('warm') === '1') u.searchParams.set('warm', '1');
      if (params.get('uptime') === '1') u.searchParams.set('uptime', '1');
      if (params.get('tea') === '1') u.searchParams.set('tea', '1');
      if (params.get('breathe') === '1') u.searchParams.set('breathe', '1');
      if (params.get('hours') === '1') u.searchParams.set('hours', '1');
      if (params.get('charm') === '1') u.searchParams.set('charm', '1');
      if (params.get('prism') === '1') u.searchParams.set('prism', '1');
      if (params.get('lunch') === '1') u.searchParams.set('lunch', '1');
      if (params.get('off') === '1') u.searchParams.set('off', '1');
      if (params.get('water') === '1') u.searchParams.set('water', '1');
      if (params.get('stretch') === '1') u.searchParams.set('stretch', '1');
      if (params.get('fortune') === '1') u.searchParams.set('fortune', '1');
      if (params.get('xmas') === '1') u.searchParams.set('xmas', '1');
      if (params.get('sq') === '1') u.searchParams.set('sq', '1');
      if (params.get('compact') === '1') u.searchParams.set('compact', '1');
      if (params.get('advent') === '1') u.searchParams.set('advent', '1');
      if (params.get('newyear') === '1') u.searchParams.set('newyear', '1');
      if (params.get('week7') === '1') u.searchParams.set('week7', '1');
      if (params.get('tabearn') === '1') u.searchParams.set('tabearn', '1');
      var ttp = params.get('title'); if (ttp) u.searchParams.set('title', ttp);
      if (params.get('over') === '1') u.searchParams.set('over', '1');
      if (params.get('fson') === '1') u.searchParams.set('fson', '1');
      var opp = params.get('opacity'); if (opp) u.searchParams.set('opacity', opp);
      if (params.get('fps') === '1') u.searchParams.set('fps', '1');
      if (params.get('bat') === '1') u.searchParams.set('bat', '1');
      if (params.get('net') === '1') u.searchParams.set('net', '1');
      if (params.get('yd') === '1') u.searchParams.set('yd', '1');
      if (params.get('tapn') === '1') u.searchParams.set('tapn', '1');
      if (params.get('quiet') === '1') u.searchParams.set('quiet', '1');
      if (params.get('sec') === '1') u.searchParams.set('sec', '1');
      var alp = params.get('alt'); if (alp) u.searchParams.set('alt', alp);
      var mtp = params.get('motto'); if (mtp) u.searchParams.set('motto', mtp);
      if (params.get('dow') === '1') u.searchParams.set('dow', '1');
      if (params.get('vib') === '1') u.searchParams.set('vib', '1');
      var tnp = params.get('tint'); if (tnp) u.searchParams.set('tint', tnp);
      if (params.get('ago') === '1') u.searchParams.set('ago', '1');
      var tzp = params.get('tz'); if (tzp) u.searchParams.set('tz', tzp);
      if (params.get('ghost') === '1') u.searchParams.set('ghost', '1');
      if (params.get('wfh') === '1') u.searchParams.set('wfh', '1');
      if (params.get('kpi') === '1') u.searchParams.set('kpi', '1');
      if (params.get('veil') === '1') u.searchParams.set('veil', '1');
      if (params.get('sprint') === '1') u.searchParams.set('sprint', '1');
      if (params.get('ovt') === '1') u.searchParams.set('ovt', '1');
      if (params.get('clock2') === '1') u.searchParams.set('clock2', '1');
      if (params.get('rest') === '1') u.searchParams.set('rest', '1');
      if (params.get('wdn') === '1') u.searchParams.set('wdn', '1');
      if (params.get('aura') === '1') u.searchParams.set('aura', '1');
      if (params.get('pct') === '1') u.searchParams.set('pct', '1');
      if (params.get('qr') === '1') u.searchParams.set('qr', '1');
      if (params.get('ver') === '1') u.searchParams.set('ver', '1');
      var qtp = params.get('quote'); if (qtp) u.searchParams.set('quote', qtp);
      if (params.get('cheer') === '1') u.searchParams.set('cheer', '1');
      if (params.get('pix') === '1') u.searchParams.set('pix', '1');
      if (params.get('ratio') === '1') u.searchParams.set('ratio', '1');
      if (params.get('done') === '1') u.searchParams.set('done', '1');
      if (params.get('tilt2') === '1') u.searchParams.set('tilt2', '1');
      var txp = params.get('tax'); if (txp) u.searchParams.set('tax', txp);
      var bnp = params.get('bean'); if (bnp) u.searchParams.set('bean', bnp);
      if (params.get('lofi') === '1') u.searchParams.set('lofi', '1');
      if (params.get('wage') === '1') u.searchParams.set('wage', '1');
      if (params.get('mini') === '1') u.searchParams.set('mini', '1');
      if (params.get('sav') === '1') u.searchParams.set('sav', '1');
      if (params.get('xp') === '1') u.searchParams.set('xp', '1');
      if (params.get('boss') === '1') u.searchParams.set('boss', '1');
      if (params.get('bks') === '1') u.searchParams.set('bks', '1');
      if (params.get('dice') === '1') u.searchParams.set('dice', '1');
      if (params.get('vhs') === '1') u.searchParams.set('vhs', '1');
      var enp = params.get('end'); if (enp) u.searchParams.set('end', enp);
      var cbp = params.get('badge'); if (cbp) u.searchParams.set('badge', cbp);
      var wmp = params.get('wm'); if (wmp) u.searchParams.set('wm', wmp);
      if (params.get('flash') === '1') u.searchParams.set('flash', '1');
      if (params.get('look') === '1') u.searchParams.set('look', '1');
      if (params.get('raw') === '1') u.searchParams.set('raw', '1');
      if (params.get('swirl') === '1') u.searchParams.set('swirl', '1');
      if (params.get('rev') === '1') u.searchParams.set('rev', '1');
      if (params.get('cap') !== null) u.searchParams.set('cap', params.get('cap'));
      if (params.get('mar') === '1') u.searchParams.set('mar', '1');
      if (params.get('idx') === '1') u.searchParams.set('idx', '1');
      if (params.get('noir') === '1') u.searchParams.set('noir', '1');
      if (params.get('rays') === '1') u.searchParams.set('rays', '1');
      if (params.get('flat') === '1') u.searchParams.set('flat', '1');
      var idl = params.get('idle'); if (idl) u.searchParams.set('idle', idl);
      if (params.get('wake') === '1') u.searchParams.set('wake', '1');
      if (params.get('tap') === '1') u.searchParams.set('tap', '1');
      if (params.get('holiday') === '1') u.searchParams.set('holiday', '1');
      if (params.get('cny') === '1') u.searchParams.set('cny', '1');
      if (params.get('yuan') === '1') u.searchParams.set('yuan', '1');
      if (params.get('pace') === '1') u.searchParams.set('pace', '1');
      if (params.get('blink') === '1') u.searchParams.set('blink', '1');
      if (params.get('astro')) u.searchParams.set('astro', params.get('astro'));
      if (params.get('rank') === '1') u.searchParams.set('rank', '1');
      if (params.get('banner')) u.searchParams.set('banner', params.get('banner'));
      if (params.get('zoom')) u.searchParams.set('zoom', params.get('zoom'));
      if (params.get('mirror') === '1') u.searchParams.set('mirror', '1');
      if (params.get('lot') === '1') u.searchParams.set('lot', '1');
      if (params.get('lock') === '1') u.searchParams.set('lock', '1');
      if (params.get('ddl')) u.searchParams.set('ddl', params.get('ddl'));
      if (params.get('ddlname')) u.searchParams.set('ddlname', params.get('ddlname'));
      if (params.get('noise') === '1') u.searchParams.set('noise', '1');
      if (params.get('grid') === '1') u.searchParams.set('grid', '1');
      if (params.get('corner')) u.searchParams.set('corner', params.get('corner'));
      if (params.get('tips') === '1') u.searchParams.set('tips', '1');
      if (params.get('lunar') === '1') u.searchParams.set('lunar', '1');
      if (params.get('yi') === '1') u.searchParams.set('yi', '1');
      if (params.get('spot') === '1') u.searchParams.set('spot', '1');
      if (params.get('tilt') === '1') u.searchParams.set('tilt', '1');
      if (params.get('gloss') === '1') u.searchParams.set('gloss', '1');
      if (params.get('orb') === '1') u.searchParams.set('orb', '1');
      if (params.get('steady') === '1') u.searchParams.set('steady', '1');
      if (params.get('mins') === '1') u.searchParams.set('mins', '1');
      if (params.get('grade') === '1') u.searchParams.set('grade', '1');
      if (params.get('lava') === '1') u.searchParams.set('lava', '1');
      var prp = params.get('preset'); if (prp) u.searchParams.set('preset', prp.slice(0, 12));
      if (params.get('bar') === '1') u.searchParams.set('bar', '1');
      if (params.get('date') === '1') u.searchParams.set('date', '1');
      if (params.get('card') === '1') u.searchParams.set('card', '1');
      if (params.get('pulse') === '1') u.searchParams.set('pulse', '1');
      if (params.get('aurora') === '1') u.searchParams.set('aurora', '1');
      if (params.get('day') === '1') u.searchParams.set('day', '1');
      if (params.get('halo') === '1') u.searchParams.set('halo', '1');
      if (params.get('fade') === '1') u.searchParams.set('fade', '1');
      if (params.get('vig') === '1') u.searchParams.set('vig', '1');
      if (params.get('round') === '1') u.searchParams.set('round', '1');
      if (params.get('drift') === '1') u.searchParams.set('drift', '1');
      if (params.get('wide') === '1') u.searchParams.set('wide', '1');
      if (params.get('rb') === '1') u.searchParams.set('rb', '1');
      if (params.get('slim') === '1') u.searchParams.set('slim', '1');
      if (params.get('lift') === '1') u.searchParams.set('lift', '1');
      if (params.get('glitch') === '1') u.searchParams.set('glitch', '1');
      if (params.get('cinema') === '1') u.searchParams.set('cinema', '1');
      if (params.get('frame') === '1') u.searchParams.set('frame', '1');
      if (params.get('shimmer') === '1') u.searchParams.set('shimmer', '1');
      if (params.get('fog') === '1') u.searchParams.set('fog', '1');
      var cup = params.get('cursor'); if (cup) u.searchParams.set('cursor', cup.slice(0, 4));
      var bdc = params.get('border'); if (bdc) u.searchParams.set('border', bdc.slice(0, 9));
      if (params.get('ripple') === '1') u.searchParams.set('ripple', '1');
      params.forEach(function (v, k) { if (k.indexOf('utm_') === 0 && v) u.searchParams.set(k, v.slice(0, 64)); });
      var text = u.toString();
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(function () { btn.textContent = '已复制 ✓'; setTimeout(function(){ btn.textContent='复制当前链接'; }, 1500); })
        .catch(function () {
          var url = document.getElementById('shareUrl');
          if (url) { url.value = text; url.select(); }
        });
    });
    field.appendChild(btn);

    var textBtn = document.createElement('button');
    textBtn.type = 'button';
    textBtn.className = 'small-button';
    textBtn.textContent = '复制分享文案';
    textBtn.addEventListener('click', function () {
      var app = window.SalaryApp;
      var state = app && app.getState();
      var snap = state && state.snapshot;
      var url = publicBase(location.href) || 'https://xd.syal.site/';
      var lines = ['我在看自己的工资一秒一秒往上涨 · 薪动'];
      if (snap && isFinite(snap.todayEarned)) lines.push('今天已赚 ' + app.formatMoney(snap.todayEarned));
      if (window.__vsItem && snap && isFinite(snap.todayEarned)) lines.push('≈ ' + (snap.todayEarned / window.__vsItem.price).toFixed(1) + ' ' + window.__vsItem.name);
      var includeSalary = document.getElementById('shareIncludeSalary');
      if ((!includeSalary || includeSalary.checked) && state && state.config && state.config.salary)
        lines.push('月薪 ¥' + state.config.salary);
      lines.push(url);
      var text = lines.join('\n');
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(function () { textBtn.textContent = '已复制 ✓'; setTimeout(function(){ textBtn.textContent='复制分享文案'; }, 1500); })
        .catch(function () { textBtn.textContent = '复制失败'; setTimeout(function(){ textBtn.textContent='复制分享文案'; }, 1500); });
    });
    field.appendChild(textBtn);

    var share = document.createElement('div');
    share.style.cssText = 'display:flex;gap:10px;margin-top:8px;font-size:12px';
    share.innerHTML = '分享到：'
      + '<a href="#" data-intent="x" style="color:inherit">X/Twitter</a>'
      + '<a href="#" data-intent="weibo" style="color:inherit">微博</a>'
      + '<a href="#" data-intent="tg" style="color:inherit">Telegram</a>';
    share.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-intent]');
      if (!a) return;
      e.preventDefault();
      var state = window.SalaryApp && window.SalaryApp.getState();
      var snap = state && state.snapshot;
      var url = publicBase(location.href) || 'https://xd.syal.site/';
      var text = '我在看自己的工资一秒一秒往上涨 · 薪动'
        + (snap && isFinite(snap.todayEarned) ? '，今天已赚 ' + window.SalaryApp.formatMoney(snap.todayEarned) : '');
      var enc = encodeURIComponent, u;
      if (a.dataset.intent === 'x') u = 'https://twitter.com/intent/tweet?text=' + enc(text) + '&url=' + enc(url);
      else if (a.dataset.intent === 'weibo') u = 'https://service.weibo.com/share/share.php?title=' + enc(text + ' ' + url);
      else u = 'https://t.me/share/url?url=' + enc(url) + '&text=' + enc(text);
      window.open(u, '_blank', 'noopener,noreferrer,width=640,height=560');
    });
    field.appendChild(share);

    if (deferredInstall) addInstallBtn(field);

    if (navigator.share) {
      var nativeBtn = document.createElement('button');
      nativeBtn.type = 'button';
      nativeBtn.className = 'small-button';
      nativeBtn.textContent = '系统分享…';
      nativeBtn.addEventListener('click', function () {
        var state = window.SalaryApp && window.SalaryApp.getState();
        var snap = state && state.snapshot;
        var url = publicBase(location.href) || 'https://xd.syal.site/';
        navigator.share({
          title: document.title,
          text: '我在看自己的工资一秒一秒往上涨 · 薪动'
            + (snap && isFinite(snap.todayEarned) ? '，今天已赚 ' + window.SalaryApp.formatMoney(snap.todayEarned) : ''),
          url: url
        }).catch(function () { /* user cancelled or unsupported */ });
      });
      field.appendChild(nativeBtn);
    }
  }
  var obs = new MutationObserver(wireCopyLink);
  obs.observe(document.body, { childList: true, subtree: true });
  wireCopyLink();

  /* Install prompt: surface a toast when the browser offers PWA install. */
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredInstall = e;
    wireCopyLink();
  });
  document.addEventListener('keydown', function (e) {
    if (window.__noKeys) return;
    if (e.key === 'i' && deferredInstall && !e.metaKey && !e.ctrlKey && !e.altKey) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      deferredInstall.prompt();
    }
  });
})();
