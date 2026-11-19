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
      var base = /^https?:/.test(location.origin) ? location.origin + location.pathname : '';
      if (!base) {
        var urlField = document.getElementById('shareUrl');
        base = urlField && /^https?:\/\//.test(urlField.value) ? urlField.value : '';
      }
      if (!base) { btn.textContent = '需要部署后的网址'; setTimeout(function(){ btn.textContent='复制当前链接'; }, 1800); return; }
      var u;
      try { u = new URL(base); } catch (err) { btn.textContent = '链接无效'; setTimeout(function(){ btn.textContent='复制当前链接'; }, 1800); return; }
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
