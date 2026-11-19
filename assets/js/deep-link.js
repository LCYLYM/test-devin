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

    var salary = Number(params.get('salary'));
    if (isFinite(salary) && salary > 0) {
      var input = document.getElementById('salaryInput');
      var form = document.getElementById('salaryForm');
      if (input && form) {
        input.value = String(salary);
        form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }

    var template = params.get('template');
    if (template) app.setTemplate(template);

    var currency = (params.get('currency') || '').toUpperCase();
    if (currency) app.setCurrency(currency);

    var period = params.get('period');
    if (period === 'day' || period === 'month') app.setPeriod(period);

    if (params.get('demo') === '1') {
      if (!app.getState().demo) app.toggleDemo();
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
  function wireCopyLink() {
    var field = document.getElementById('shareLinkField');
    if (!field || field.dataset.copyWired) return;
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
      var template = state && state.preferences && state.preferences.template;
      if (salary) u.searchParams.set('salary', salary);
      if (template) u.searchParams.set('template', template);
      var text = u.toString();
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(function () { btn.textContent = '已复制 ✓'; setTimeout(function(){ btn.textContent='复制当前链接'; }, 1500); })
        .catch(function () {
          var url = document.getElementById('shareUrl');
          if (url) { url.value = text; url.select(); }
        });
    });
    field.appendChild(btn);
  }
  var obs = new MutationObserver(wireCopyLink);
  obs.observe(document.body, { childList: true, subtree: true });
  wireCopyLink();
})();
