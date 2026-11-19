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

    var salary = Number(params.get('salary'));
    if (isFinite(salary) && salary > 0) {
      var input = document.getElementById('salaryInput');
      var form = document.getElementById('salaryForm');
      if (input && form) {
        input.value = String(salary);
        form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }

    var template = params.get('template') || params.get('skin');
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

    if (params.get('demo') === '1') {
      if (!app.getState().demo) app.toggleDemo();
    }

    if (params.get('sound') === '1') app.setPreference('sound', true);

    // ?accent=%234de3ff — override the theme accent color (shareable).
    var accent = params.get('accent');
    if (accent && /^#?[0-9a-fA-F]{3,8}$/.test(accent)) {
      var v = accent[0] === '#' ? accent : '#' + accent;
      document.body.style.setProperty('--accent', v);
    }

    var THEME_COLORS = {pig:'#1a1716',charge:'#131415',meter:'#171715',pixel:'#151515',neon:'#0c0e18',mono:'#111111',paper:'#f2efe7'};
    function applyThemeColor(t) {
      var m = document.querySelector('meta[name=theme-color]');
      if (m && THEME_COLORS[t]) m.content = THEME_COLORS[t];
    }
    applyThemeColor(app.getState().preferences.template);
    window.addEventListener('salary-template', function (e) { applyThemeColor(e.detail && e.detail.template); });

    if (params.get('zen') === '1') document.body.classList.add('is-focus');

    if (params.get('focus') === 'salary') {
      var salaryInput = document.getElementById('salaryInput');
      if (salaryInput) { salaryInput.focus(); salaryInput.select(); }
    }
  });

  /* Live tab title: show the ticking amount. ?title=0 disables. */
  if (params.get('title') !== '0') {
    var baseTitle = document.title;
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
      var skins = ['pig', 'charge', 'meter', 'pixel', 'neon', 'mono', 'paper'];
      var cur = window.SalaryApp.getState().preferences.template;
      window.SalaryApp.setTemplate(skins[(skins.indexOf(cur) + 1) % skins.length]);
    } else if (e.key === 'p' && window.SalaryApp) {
      var st = window.SalaryApp.getState();
      window.SalaryApp.setPeriod(st.preferences.period === 'day' ? 'month' : 'day');
    } else if (e.key === 'z') {
      var fb = document.getElementById('focusButton');
      if (fb) fb.click();
    } else if (e.key === 'm') {
      var sb = document.getElementById('soundButton');
      if (sb) sb.click();
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
      var ac = params.get('accent');
      if (ac && /^#?[0-9a-fA-F]{3,8}$/.test(ac)) u.searchParams.set('accent', ac);
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
    if (e.key === 'i' && deferredInstall && !e.metaKey && !e.ctrlKey && !e.altKey) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      deferredInstall.prompt();
    }
  });
})();
