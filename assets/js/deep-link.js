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
    if (['snow', 'sakura', 'rain', 'stars', 'leaves', 'bubble', 'ember', 'firefly', 'dust', 'meteor', 'warp'].indexOf(fxParam) >= 0 && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var fxc = document.createElement('canvas');
      fxc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;opacity:.65';
      document.body.prepend(fxc);
      var fxctx = fxc.getContext('2d');
      var parts = [], N = fxParam === 'rain' ? 90 : fxParam === 'stars' ? 70 : fxParam === 'meteor' ? 0 : 45;
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
