/* Deep links & small extras:
   ?salary=30000&template=pig&currency=USD&demo=1 — share-ready URLs.
   ?title=0 — disable the live tab-title ticker. */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);

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
      var dailyList = ['pig', 'charge', 'meter', 'pixel', 'neon', 'mono', 'paper', 'term', 'ecg', 'wave'];
      template = dailyList[dayNum % dailyList.length];
    }
    if (template === 'random') template = ['charge','meter','pixel','pig','neon','mono','paper','term','ecg','wave'][Math.floor(Math.random() * 10)];
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

    var THEME_COLORS = {pig:'#1a1716',charge:'#131415',meter:'#171715',pixel:'#151515',neon:'#0c0e18',mono:'#111111',paper:'#f2efe7',term:'#0d1117',ecg:'#160a0a',wave:'#0b1526'};
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
    var msParam = params.get('milestone');
    if (msParam !== null) {
      window.__milestones = (msParam === '0' || msParam === '') ? []
        : msParam.split(',').map(Number).filter(function (n) { return n > 0 && n < 1e12; }).slice(0, 50);
    }
    if (params.get('light') === '1') document.body.dataset.light = '1';
    else if (params.get('light') === '0') delete document.body.dataset.light;
    else { try { if (localStorage.getItem('salaryFlow.light') === '1') document.body.dataset.light = '1'; } catch (e) {} }
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

    var hideMap = {header:'.app-header',footer:'.app-footer',faq:'.seo-faq',utility:'.utility-row',summary:'.summary-strip',overtime:'.overtime-disclosure',bottom:'.bottom-row',toolbar:'.instrument-toolbar',foot:'.instrument-footer',badges:'.payday'};
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
  document.addEventListener('keydown', function (e) {
    if (window.__noKeys) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
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
      var skins = ['pig', 'charge', 'meter', 'pixel', 'neon', 'mono', 'paper', 'term', 'ecg', 'wave'];
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
      var cc = ['CNY','USD','EUR','JPY','KRW','HKD','VND','IDR','ZIM'];
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
      if (document.body.dataset.light === '1') u.searchParams.set('light', '1');
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
