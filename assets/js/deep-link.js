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
      var dailyList = ['pig', 'charge', 'meter', 'pixel', 'neon', 'mono', 'paper', 'term', 'ecg', 'wave', 'therm', 'receipt', 'sand', 'dial', 'trail', 'metro', 'lift', 'eclipse', 'flap', 'vinyl', 'const', 'plant', 'shadow', 'tide', 'rocket', 'balloon', 'aqua', 'kite', 'falls', 'toast', 'ember', 'cable', 'hive', 'lantern', 'abacus', 'ferris', 'globe', 'seismo', 'terrace', 'crane', 'slots', 'domino', 'match', 'popcorn', 'tetris', 'fishing', 'pottery', 'sparkler', 'origami', 'typewriter', 'aurora', 'catnap', 'prayer', 'piano', 'firejar', 'lava', 'knit', 'juice', 'rainbow', 'bonsai', 'vending', 'lighthouse', 'treadmill', 'oven', 'wishing', 'sandcastle', 'inkwash', 'candle', 'swing', 'gacha', 'surf', 'scope', 'bottle', 'pinball', 'lotus', 'ramen', 'gear', 'invader', 'mine', 'puppet', 'sprout', 'hop', 'mahjong', 'scale', 'tearoff', 'windmill', 'grill', 'dock', 'compass', 'sub', 'icicle', 'snowman', 'latte', 'train', 'ivy', 'forge', 'tanghulu', 'dragonboat', 'mill', 'laundry', 'muyu', 'sushi', 'mallow', 'top', 'fountain', 'sled', 'kaleido', 'gongfu', 'jigsaw', 'scroll', 'parasol', 'steamer', 'hotpot', 'waterwheel', 'firecrack', 'sugarart', 'sling', 'bigdrum', 'faceoff', 'liondance', 'chestnut', 'icesculpt', 'zoetrope', 'stoneskip', 'polaroid', 'seesaw', 'neontube', 'bubble', 'pizza', 'sugarman', 'skylantern', 'coin', 'sandart', 'rattle', 'ringtoss', 'inkjet', 'gaiwan', 'diabolo', 'stitch', 'tangram', 'knot', 'rubbing', 'loom', 'mosaic', 'seal', 'gong', 'bianzhong', 'zither', 'grind', 'copter', 'papercut', 'hula', 'rubik', 'nesting', 'curling', 'juggle', 'yoyo', 'pinwheel', 'marble', 'omikuji', 'darts', 'pinata', 'kendama', 'vaultbox', 'stilts', 'jumprope', 'plate', 'tightrope', 'shateki', 'fukuwarai', 'kagami', 'hagoita', 'shogi', 'karuta', 'suika', 'sumo', 'goldfish', 'noren', 'volcano', 'abyss', 'chrysalis', 'oyster', 'antfarm', 'sunflower', 'metronome', 'spiral', 'circuit', 'drawbridge', 'weathervane', 'bigben', 'telescope', 'aquarium', 'terrarium', 'nest', 'sourdough', 'ferment', 'archery', 'basketball', 'pendulum', 'zipline', 'carousel', 'ski', 'firefly', 'moonphase', 'teapot', 'spiderweb', 'snail', 'hummingbird', 'cicada', 'dam', 'potofgold', 'koipond', 'zengarden', 'orchard', 'constellation', 'solarsystem', 'bamboo', 'geode', 'mandala', 'catapult', 'sakura', 'incense', 'pagoda', 'radar', 'rover', 'iceberg', 'comet', 'nebula', 'tornado', 'rose', 'dandelion', 'chess', 'sunrise', 'moonrise', 'billiards', 'golf', 'bowling', 'meadow', 'geyser', 'vineyard', 'reef', 'fireplace', 'onsen', 'iceskate', 'jukebox', 'musicbox', 'bath', 'dive', 'observatory', 'darkroom', 'projector', 'trek', 'harbor', 'staircase', 'bakery', 'castle', 'voyage', 'sauna', 'tidepool', 'jacuzzi', 'movie', 'library', 'maze', 'greenhouse', 'carnival'];
      template = dailyList[dayNum % dailyList.length];
    }
    if (template === 'random') template = ['charge','meter','pixel','pig','neon','mono','paper','term','ecg','wave','therm','receipt','sand','dial','trail','metro','lift','eclipse','flap','vinyl','const','plant','shadow','tide','rocket','balloon','aqua','kite','falls','toast','ember','cable','hive','lantern','abacus','ferris','globe','seismo','terrace','crane','slots','domino','match','popcorn','tetris','fishing','pottery','sparkler','origami','typewriter','aurora','catnap','prayer','piano','firejar','lava','knit','juice','rainbow','bonsai','vending','lighthouse','treadmill','oven','wishing','sandcastle','inkwash','candle','swing','gacha','surf','scope','bottle','pinball','lotus','ramen','gear','invader','mine','puppet','sprout','hop','mahjong','scale','tearoff','windmill','grill','dock','compass','sub','icicle','snowman','latte','train','ivy','forge','tanghulu','dragonboat','mill','laundry','muyu','sushi','mallow','top','fountain','sled','kaleido','gongfu','jigsaw','scroll','parasol','steamer','hotpot','waterwheel','firecrack','sugarart','sling','bigdrum','faceoff','liondance','chestnut','icesculpt','zoetrope','stoneskip','polaroid','seesaw','neontube','bubble','pizza','sugarman','skylantern','coin','sandart','rattle','ringtoss','inkjet','gaiwan','diabolo','stitch','tangram','knot','rubbing','loom','mosaic','seal','gong','bianzhong','zither','grind','copter','papercut','hula','rubik','nesting','curling','juggle','yoyo','pinwheel','marble','omikuji','darts','pinata','kendama','vaultbox','stilts','jumprope','plate','tightrope','shateki','fukuwarai','kagami','hagoita','shogi','karuta','suika','sumo','goldfish','noren','volcano','abyss','chrysalis','oyster','antfarm','sunflower','metronome','spiral','circuit','drawbridge','weathervane','bigben','telescope','aquarium','terrarium','nest','sourdough','ferment','archery','basketball','pendulum','zipline','carousel','ski','firefly','moonphase','teapot','spiderweb','snail','hummingbird','cicada','dam','potofgold','koipond','zengarden','orchard','constellation','solarsystem','bamboo','geode','mandala','catapult','sakura','incense','pagoda','radar','rover','iceberg','comet','nebula','tornado','rose','dandelion','chess','sunrise','moonrise','billiards','golf','bowling','meadow','geyser','vineyard','reef','fireplace','onsen','iceskate','jukebox','musicbox','bath','dive','observatory','darkroom','projector','trek','harbor','staircase','bakery','castle','voyage','sauna','tidepool','jacuzzi','movie','library','maze','greenhouse','carnival'][Math.floor(Math.random() * 265)];
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

    var THEME_COLORS = {pig:'#1a1716',charge:'#131415',meter:'#171715',pixel:'#151515',neon:'#0c0e18',mono:'#111111',paper:'#f2efe7',term:'#0d1117',ecg:'#160a0a',wave:'#0b1526',therm:'#181310',receipt:'#181512',sand:'#221a0e',dial:'#1e1710',trail:'#121a13',metro:'#0e1620',lift:'#16140f',eclipse:'#0b0d12',flap:'#101216',vinyl:'#150e1c',const:'#0a1020',plant:'#0f180c',shadow:'#1c140c',tide:'#0a161c',rocket:'#120f14',balloon:'#181208',aqua:'#081418',kite:'#161508',falls:'#0a141c',toast:'#181008',ember:'#140c08',cable:'#0c1611',hive:'#181204',lantern:'#140e10', abacus:'#181008', ferris:'#160e14', globe:'#0c1420', seismo:'#16100e', terrace:'#0e1610', crane:'#180e16', slots:'#181204', domino:'#0e141c', match:'#160e08', popcorn:'#181404', tetris:'#0c1418', fishing:'#0c1614', pottery:'#18100a', sparkler:'#0e0c14', origami:'#180e14', typewriter:'#181410', aurora:'#08121a', catnap:'#181008', prayer:'#180e04', piano:'#0e0e14', firejar:'#10160a', lava:'#180e14', knit:'#180e18', juice:'#181004', rainbow:'#101418', bonsai:'#0e140c', vending:'#0c141c', lighthouse:'#0e1018', treadmill:'#0e1610', oven:'#160e08', wishing:'#0c141c', sandcastle:'#181204', inkwash:'#141210', candle:'#181008', swing:'#0e1610', gacha:'#180e14', surf:'#0a141c', scope:'#0c0e16', bottle:'#0c1614', pinball:'#161008', lotus:'#140e14', ramen:'#181008', gear:'#161208', invader:'#0a140c', mine:'#121214', puppet:'#1a1008', sprout:'#0c160c', hop:'#0c1220', mahjong:'#0c160e', scale:'#181408', tearoff:'#181008', windmill:'#0c1618', grill:'#180e08', dock:'#0a1018', compass:'#161206', sub:'#081018', icicle:'#0c1418', snowman:'#101824', latte:'#181008', train:'#140e0a', ivy:'#0c140c', forge:'#160c06', tanghulu:'#180a0a', dragonboat:'#100e08', mill:'#141008', laundry:'#0c1418', muyu:'#161006', sushi:'#160e10', mallow:'#181008', top:'#160e14', fountain:'#0a141c', sled:'#0e1620', kaleido:'#120c1a', gongfu:'#161008', jigsaw:'#0c1420', scroll:'#18140a', parasol:'#160e0e', steamer:'#181208', hotpot:'#180a06', waterwheel:'#0c1418', firecrack:'#180a0a', sugarart:'#181008', sling:'#141008', bigdrum:'#180c08', faceoff:'#180808', liondance:'#181008', chestnut:'#140e08', icesculpt:'#0a1418', zoetrope:'#180e06', stoneskip:'#0a1418', polaroid:'#141210', seesaw:'#141008', neontube:'#0c0810', bubble:'#0a1218', pizza:'#180c06', sugarman:'#181006', skylantern:'#100a08', coin:'#140e06', sandart:'#141008', rattle:'#180c08', ringtoss:'#0a1410', inkjet:'#0a1014', gaiwan:'#0a1410', diabolo:'#180e08', stitch:'#140c10', tangram:'#180e06', knot:'#140808', rubbing:'#101010', loom:'#181008', mosaic:'#0a1216', seal:'#140e0a', gong:'#141006', bianzhong:'#0c120c', zither:'#140e06', grind:'#12100c', copter:'#0c140c', papercut:'#140a0a', hula:'#160c12', rubik:'#121008', nesting:'#140e0a', curling:'#0a1418', juggle:'#140e08', yoyo:'#140c0c', pinwheel:'#0a1418', marble:'#10141a', omikuji:'#160c0c', darts:'#0c140e', pinata:'#181008', kendama:'#140e08', vaultbox:'#140e08', stilts:'#0e140c', jumprope:'#160e06', plate:'#0e1418', tightrope:'#141208', shateki:'#160c08', fukuwarai:'#160e0c', kagami:'#121010', hagoita:'#160a0c', shogi:'#141008', karuta:'#0c1018', suika:'#140a08', sumo:'#141008', goldfish:'#120c06', noren:'#0c1016', volcano:'#160a06', abyss:'#040a14', chrysalis:'#120e16', oyster:'#121014', antfarm:'#120c06', sunflower:'#140e04', metronome:'#140e0a', spiral:'#0e0a1a', circuit:'#060f08', drawbridge:'#100e0a', weathervane:'#0a1218', bigben:'#100e06', telescope:'#0a0c1a', aquarium:'#041418', terrarium:'#0a120a', nest:'#120e08', sourdough:'#140e06', ferment:'#120e04', archery:'#140c0a', basketball:'#140c06', pendulum:'#100e0a', zipline:'#0a140c', carousel:'#140a10', ski:'#0a1218', firefly:'#0a100a', moonphase:'#0a0c14', teapot:'#0e100a', spiderweb:'#0c0e12', snail:'#100e08', hummingbird:'#061410', cicada:'#101008', dam:'#0a1216', potofgold:'#120c04', koipond:'#0a1410', zengarden:'#121110', orchard:'#120c06', constellation:'#060812', solarsystem:'#05070d', bamboo:'#0a1208', geode:'#100a18', mandala:'#120c06', catapult:'#120e08', sakura:'#140e12', incense:'#100c0a', pagoda:'#120c0a', radar:'#041008', rover:'#140a06', iceberg:'#08121c', comet:'#060a14', nebula:'#0c0818', tornado:'#0c1014', rose:'#160a10', dandelion:'#0e120c', chess:'#12100c', sunrise:'#140c08', moonrise:'#0a0e18', billiards:'#0a140c', golf:'#0c140c', bowling:'#140e0a', meadow:'#0c1208', geyser:'#081418', vineyard:'#100c14', reef:'#081418', fireplace:'#140a06', onsen:'#0c1418', iceskate:'#0a1218', jukebox:'#140c06', musicbox:'#140e18', bath:'#0a141a', dive:'#08141c', observatory:'#0a0e18', darkroom:'#100606', projector:'#121008', trek:'#0e140a', harbor:'#0a141c', staircase:'#121008', bakery:'#140e06', castle:'#0e1018', voyage:'#0a1018', sauna:'#140e08', tidepool:'#081410', jacuzzi:'#081418', movie:'#140a0a', library:'#120e06', maze:'#0c120a', greenhouse:'#0a140c', carnival:'#140e08'};
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
    if (['snow', 'sakura', 'rain', 'stars', 'leaves', 'bubble', 'ember', 'firefly', 'dust', 'meteor', 'warp', 'cloud', 'paper', 'fireworks', 'petal', 'fish', 'heart', 'comet'].indexOf(fxParam) >= 0 && params.get('eco') !== '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
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
          if (fxParam === 'comet') {
            q.x += q.v * 3.5; q.y += q.v * 1.4;
            if (q.x > innerWidth + 60 || q.y > innerHeight + 60) {
              q.x = Math.random() * innerWidth * 0.5 - 60; q.y = Math.random() * innerHeight * 0.3 - 40;
            }
            var cgr = fxctx.createLinearGradient(q.x - q.v * 30, q.y - q.v * 12, q.x, q.y);
            cgr.addColorStop(0, 'rgba(186,230,253,0)');
            cgr.addColorStop(1, 'rgba(186,230,253,.8)');
            fxctx.strokeStyle = cgr; fxctx.lineWidth = q.r * 0.8;
            fxctx.beginPath(); fxctx.moveTo(q.x - q.v * 30, q.y - q.v * 12); fxctx.lineTo(q.x, q.y); fxctx.stroke();
            fxctx.fillStyle = '#e0f2fe'; fxctx.beginPath(); fxctx.arc(q.x, q.y, q.r * 0.6, 0, 6.3); fxctx.fill();
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
    if (params.get('chil') === '1') {
      var chb = document.getElementById('chilBadge'), chv = document.getElementById('chilVal');
      if (chb && chv) {
        var chUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var p = st && st.snapshot && st.snapshot.progress;
          if (p != null) { chv.textContent = Math.max(0, Math.round((1 - p) * 100)) + '%'; chb.hidden = false; }
        };
        chUpd(); setInterval(chUpd, 1000);
      }
    }
    if (params.get('ref') === '1') {
      document.body.classList.add('is-ref');
    }
    if (params.get('duo') === '1') {
      document.body.classList.add('is-duo');
    }
    if (params.get('sky') === '1') {
      var hr = new Date().getHours();
      var skyCls = hr < 6 ? 'sky-night' : hr < 9 ? 'sky-dawn' : hr < 17 ? 'sky-day' : hr < 20 ? 'sky-dusk' : 'sky-night';
      document.body.classList.add('is-sky', skyCls);
    }
    if (params.get('bob') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.classList.add('is-bob');
    }
    if (params.get('cam') === '1') {
      var cam = document.createElement('div');
      cam.className = 'cam-layer';
      cam.setAttribute('aria-hidden', 'true');
      cam.innerHTML = '<i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i>';
      var inst5 = document.querySelector('.instrument-card, .instrument');
      (inst5 || document.body).appendChild(cam);
    }
    if (params.get('lvl') === '1') {
      var lvb = document.getElementById('lvlBadge'), lvv = document.getElementById('lvlVal');
      if (lvb && lvv) {
        var lvUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var p = st && st.snapshot && st.snapshot.progress;
          if (p != null) {
            lvv.textContent = p >= 1 ? '王者' : p >= 0.75 ? '钻石' : p >= 0.5 ? '黄金' : p >= 0.25 ? '白银' : '青铜';
            lvb.hidden = false;
          }
        };
        lvUpd(); setInterval(lvUpd, 2000);
      }
    }
    if (params.get('dots') === '1') {
      document.body.classList.add('is-dots');
    }
    if (params.get('sum') === '1') {
      var smb = document.getElementById('sumBadge'), smv = document.getElementById('sumVal');
      if (smb && smv) {
        var smUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var m = st && st.snapshot && st.snapshot.monthEarned;
          if (m != null) { smv.textContent = window.SalaryApp.formatMoney(m, st.currency); smb.hidden = false; }
        };
        smUpd(); setInterval(smUpd, 500);
      }
    }
    var emoParam = params.get('emo');
    if (emoParam !== null) {
      var emoEl = document.getElementById('statusEmoji');
      if (emoEl) {
        emoEl.textContent = emoParam.slice(0, 4) || '🙂';
        emoEl.hidden = false;
      }
    }
    if (params.get('holo') === '1') {
      document.body.classList.add('is-holo');
    }
    var bornParam = parseInt(params.get('born'), 10);
    if (bornParam > 1950 && bornParam <= new Date().getFullYear()) {
      var brn = document.getElementById('bornBadge'), brv = document.getElementById('bornVal');
      if (brn && brv) {
        brv.textContent = (new Date().getFullYear() - bornParam) + ' 年';
        brn.hidden = false;
      }
    }
    if (params.get('radar') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var rdr = document.createElement('div');
      rdr.className = 'radar-layer';
      rdr.setAttribute('aria-hidden', 'true');
      var inst6 = document.querySelector('.instrument-card, .instrument');
      (inst6 || document.body).appendChild(rdr);
    }
    if (params.get('hatch') === '1') {
      document.body.classList.add('is-hatch');
    }
    if (params.get('felt') === '1') {
      var ftb = document.getElementById('feltBadge'), ftv = document.getElementById('feltVal');
      if (ftb && ftv) {
        var ftUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var h = st && st.snapshot && st.snapshot.actualHourSalary;
          if (h != null) { ftv.textContent = '实际时薪 ' + window.SalaryApp.formatMoney(h, st.currency); ftb.hidden = false; }
        };
        ftUpd(); setInterval(ftUpd, 2000);
      }
    }
    if (params.get('stack') === '1') {
      document.body.classList.add('is-stack');
    }
    if (params.get('candle') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.classList.add('is-candle');
    }
    if (params.get('eta') === '1') {
      var etb = document.getElementById('etaBadge'), etv = document.getElementById('etaVal');
      if (etb && etv) {
        var etUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var r = st && st.snapshot && st.snapshot.remainingWorkSeconds;
          if (r != null) {
            if (!st.snapshot.isWorkday || r <= 0) { etv.textContent = '已收工'; }
            else { var d = new Date(Date.now() + r * 1000); etv.textContent = '预计 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' 下班'; }
            etb.hidden = false;
          }
        };
        etUpd(); setInterval(etUpd, 15000);
      }
    }
    if (params.get('lift') === '1') {
      document.body.classList.add('is-lift');
      var liftIv = setInterval(function () {
        var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        if (st && st.snapshot && st.snapshot.progress >= 1) document.body.classList.add('lift-on');
      }, 1000);
    }
    if (params.get('beam') === '1') {
      var bm = document.createElement('div');
      bm.className = 'beam-layer';
      bm.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bm);
    }
    if (params.get('cof') === '1') {
      var cfb = document.getElementById('cofBadge'), cfv = document.getElementById('cofVal');
      if (cfb && cfv) {
        var cfUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var w = st && st.snapshot && st.snapshot.workSecondsToday;
          if (w != null) { cfv.textContent = (w / 7200).toFixed(1) + ' 杯'; cfb.hidden = false; }
        };
        cfUpd(); setInterval(cfUpd, 5000);
      }
    }
    if (params.get('silk') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.classList.add('is-silk');
    }
    if (params.get('chek') === '1') {
      document.body.classList.add('is-chek');
    }
    if (params.get('yp') === '1') {
      var ypb = document.getElementById('ypBadge'), ypv = document.getElementById('ypVal');
      if (ypb && ypv) {
        var yd = new Date(), y0 = new Date(yd.getFullYear(), 0, 1), y1 = new Date(yd.getFullYear() + 1, 0, 1);
        ypv.textContent = ((yd - y0) / (y1 - y0) * 100).toFixed(1) + '%';
        ypb.hidden = false;
      }
    }
    if (params.get('zeb') === '1') {
      document.body.classList.add('is-zeb');
    }
    if (params.get('vel') === '1') {
      document.body.classList.add('is-vel');
    }
    if (params.get('syn') === '1') {
      var syb = document.getElementById('synBadge'), syv = document.getElementById('synVal');
      if (syb && syv) {
        var syMap = ['周日回血中', '周一综合征', '周二渐入状态', '周三过半啦', '周四冲刺', '周五快乐', '周六撒欢'];
        syv.textContent = syMap[new Date().getDay()];
        syb.hidden = false;
      }
    }
    if (params.get('frost') === '1') {
      document.body.classList.add('is-frost');
    }
    if (params.get('arg') === '1') {
      document.body.classList.add('is-arg');
    }
    if (params.get('brk') === '1') {
      var brb = document.getElementById('brkBadge'), brv = document.getElementById('brkVal');
      if (brb && brv) {
        var brUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var w = st && st.snapshot && st.snapshot.workSecondsToday;
          if (w != null) {
            var h = w / 3600;
            brv.textContent = h >= 4 ? '连续 ' + h.toFixed(1) + 'h — 该休息了' : '连续 ' + h.toFixed(1) + 'h';
            brb.hidden = false;
          }
        };
        brUpd(); setInterval(brUpd, 30000);
      }
    }
    if (params.get('blind') === '1') {
      document.body.classList.add('is-blind');
    }
    if (params.get('ink') === '1') {
      document.body.classList.add('is-ink');
    }
    if (params.get('smp') === '1') {
      var spb = document.getElementById('smpBadge'), spv = document.getElementById('smpVal');
      if (spb && spv) {
        var marks = [1, 10, 50, 100, 250, 500, 1000, 5000, 10000];
        var smUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var e = st && st.snapshot && st.snapshot.todayEarned;
          if (e != null) {
            var nxt = marks.find(function (m) { return e < m; });
            spv.textContent = nxt != null ? '下个里程碑 ' + window.SalaryApp.formatMoney(nxt, st.currency) : '已破万';
            spb.hidden = false;
          }
        };
        smUpd(); setInterval(smUpd, 500);
      }
    }
    if (params.get('twe') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.classList.add('is-twe');
    }
    if (params.get('crumb') === '1') {
      document.body.classList.add('is-crumb');
    }
    if (params.get('int') === '1') {
      var itb = document.getElementById('intBadge'), itv = document.getElementById('intVal');
      if (itb && itv) {
        var itUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var e = st && st.snapshot && st.snapshot.todayEarned;
          if (e != null) { itv.textContent = window.SalaryApp.formatMoney(Math.floor(e), st.currency); itb.hidden = false; }
        };
        itUpd(); setInterval(itUpd, 250);
      }
    }
    if (params.get('cel') === '1') {
      document.body.classList.add('is-cel');
    }
    if (params.get('emb') === '1') {
      document.body.classList.add('is-emb');
    }
    if (params.get('rem') === '1') {
      var rmb = document.getElementById('remBadge'), rmv = document.getElementById('remVal');
      if (rmb && rmv) {
        var rmUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          var r = st && st.snapshot && st.snapshot.remainingWorkSeconds;
          if (r != null) {
            var h = Math.floor(r / 3600), m = Math.floor((r % 3600) / 60);
            rmv.textContent = h + 'h' + String(m).padStart(2, '0') + 'm';
            rmb.hidden = false;
          }
        };
        rmUpd(); setInterval(rmUpd, 5000);
      }
    }
    if (params.get('ripple') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.classList.add('is-ripple');
    }
    if (params.get('moodbg') === '1') {
      document.body.classList.add('is-moodbg');
    }
    if (params.get('mos') === '1') {
      document.body.classList.add('is-mos');
    }
    if (params.get('lens') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var lensEl = document.getElementById('amountArea');
      if (lensEl) {
        lensEl.addEventListener('mouseenter', function () { document.body.classList.add('lens-on'); });
        lensEl.addEventListener('mouseleave', function () { document.body.classList.remove('lens-on'); });
      }
    }
    if (params.get('zig') === '1') {
      document.body.classList.add('is-zig');
    }
    if (params.get('eom') === '1') {
      var emb2 = document.getElementById('eomBadge'), emv = document.getElementById('eomVal');
      if (emb2 && emv) {
        var now = new Date();
        var nxt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        emv.textContent = '距月底 ' + Math.ceil((nxt - now) / 86400000) + ' 天';
        emb2.hidden = false;
      }
    }
    if (params.get('hue') === '1' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.body.classList.add('is-hue');
    }
    if (params.get('wire') === '1') {
      document.body.classList.add('is-wire');
    }
    if (params.get('wkn') === '1') {
      var wkb = document.getElementById('wknBadge'), wkv = document.getElementById('wknVal');
      if (wkb && wkv) {
        var wUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          if (!st) return;
          var d = new Date();
          var dow = (d.getDay() + 6) % 7;
          wkv.textContent = '本周第 ' + Math.min(dow + 1, 5) + '/5 个工作日';
          wkb.hidden = false;
        };
        wUpd();
      }
    }
    if (params.get('plaid') === '1') {
      document.body.classList.add('is-plaid');
    }
    if (params.get('gild') === '1') {
      document.body.classList.add('is-gild');
    }
    if (params.get('bonk') === '1') {
      var aa = document.getElementById('amountArea');
      if (aa) aa.addEventListener('click', function () {
        aa.classList.remove('bonk-pop');
        void aa.offsetWidth;
        aa.classList.add('bonk-pop');
      });
    }
    if (params.get('ray') === '1') {
      document.body.classList.add('is-ray');
    }
    if (params.get('vibe') === '1') {
      document.body.classList.add('is-vibe');
      var vUpd = function () {
        var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        if (!st || !st.snapshot) return;
        var p = Math.max(0, Math.min(1, st.snapshot.progress || 0));
        document.body.style.setProperty('--vibe-hue', String(Math.round(210 - p * 150)));
      };
      vUpd();
      setInterval(vUpd, 3000);
    }
    if (params.get('blip') === '1') {
      var bEl = document.createElement('div');
      bEl.className = 'blip-dot';
      bEl.setAttribute('aria-hidden', 'true');
      bEl.hidden = true;
      var host2 = document.getElementById('amountArea') || document.body;
      host2.appendChild(bEl);
      var bLast = null;
      var bUpd = function () {
        var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
        if (!st || !st.snapshot) return;
        var e = st.snapshot.todayEarned || 0;
        if (bLast !== null && e > bLast) {
          bEl.hidden = false;
          bEl.classList.remove('blip-pop');
          void bEl.offsetWidth;
          bEl.classList.add('blip-pop');
        }
        bLast = e;
      };
      setInterval(bUpd, 1000);
      setTimeout(bUpd, 300);
    }
    if (params.get('crisp') === '1') {
      document.body.classList.add('is-crisp');
    }
    if (params.get('matte') === '1') {
      document.body.classList.add('is-matte');
    }
    if (params.get('orbit') === '1') {
      document.body.classList.add('is-orbit');
      var oEl = document.createElement('div');
      oEl.className = 'orbit-ring';
      oEl.setAttribute('aria-hidden', 'true');
      var oHost = document.querySelector('.instrument');
      if (oHost) oHost.appendChild(oEl);
    }
    if (params.get('type') === '1') {
      var tEl = document.getElementById('incomeCaption');
      if (tEl && tEl.textContent) {
        var tFull = tEl.textContent;
        var tI = 0;
        tEl.textContent = '';
        var tTimer = setInterval(function () {
          tI++;
          tEl.textContent = tFull.slice(0, tI);
          if (tI >= tFull.length) clearInterval(tTimer);
        }, 60);
      }
    }
    if (params.get('laser') === '1') {
      document.body.classList.add('is-laser');
    }
    if (params.get('sun') === '1') {
      document.body.classList.add('is-sun');
    }
    if (params.get('waves') === '1') {
      document.body.classList.add('is-waves');
    }
    if (params.get('deep') === '1') {
      document.body.classList.add('is-deep');
    }
    if (params.get('dream') === '1') {
      var dB = document.getElementById('drmBadge'), dV = document.getElementById('drmVal');
      if (dB && dV) {
        var dUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          if (!st || !st.snapshot) return;
          var g = parseFloat(params.get('goal')) || 0;
          if (g <= 0) { dV.textContent = '设 ?goal= 金额启用'; dB.hidden = false; return; }
          var p = Math.min(100, ((st.snapshot.monthEarned || 0) / g) * 100);
          dV.textContent = p.toFixed(1) + '%';
          dB.hidden = false;
        };
        dUpd();
        setInterval(dUpd, 5000);
      }
    }
    if (params.get('allday') === '1') {
      var aB = document.getElementById('adBadge'), aV = document.getElementById('adVal');
      if (aB && aV) {
        var aT0 = Date.now();
        var aUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          if (!st || !st.snapshot) return;
          var sec = Math.floor((Date.now() - aT0) / 1000);
          var rate = st.snapshot.secondSalary || 0;
          aV.textContent = '本页 +' + window.SalaryApp.formatMoney(rate * sec, st.currency);
          aB.hidden = false;
        };
        aUpd();
        setInterval(aUpd, 1000);
      }
    }
    if (params.get('chalk') === '1') {
      document.body.classList.add('is-chalk');
    }
    if (params.get('pearl') === '1') {
      document.body.classList.add('is-pearl');
    }
    if (params.get('tide') === '1') {
      document.body.classList.add('is-tide');
    }
    if (params.get('terra') === '1') {
      document.body.classList.add('is-terra');
    }
    if (params.get('mocha') === '1') {
      document.body.classList.add('is-mocha');
    }
    if (params.get('arctic') === '1') {
      document.body.classList.add('is-arctic');
    }
    if (params.get('vapor') === '1') {
      document.body.classList.add('is-vapor');
    }
    if (params.get('am') === '1') {
      var pB = document.getElementById('ampmBadge'), pV = document.getElementById('ampmVal');
      if (pB && pV) {
        var pUpd = function () {
          var h = new Date().getHours();
          pV.textContent = h < 12 ? '上午 ' + (h === 0 ? 12 : h) + ' 点' : '下午 ' + (h === 12 ? 12 : h - 12) + ' 点';
          pB.hidden = false;
        };
        pUpd();
        setInterval(pUpd, 60000);
      }
    }
    if (params.get('olive') === '1') {
      document.body.classList.add('is-olive');
    }
    if (params.get('plasma') === '1') {
      document.body.classList.add('is-plasma');
    }
    if (params.get('shimmer') === '1') {
      document.body.classList.add('is-shimmer');
    }
    if (params.get('ice') === '1') {
      document.body.classList.add('is-ice');
    }
    if (params.get('fossil') === '1') {
      document.body.classList.add('is-fossil');
    }
    if (params.get('quartz') === '1') {
      document.body.classList.add('is-quartz');
    }
    if (params.get('velvet') === '1') {
      document.body.classList.add('is-velvet');
    }
    if (params.get('copper') === '1') {
      document.body.classList.add('is-copper');
    }
    if (params.get('hrs') === '1') {
      var hB = document.getElementById('hrsBadge'), hV = document.getElementById('hrsVal');
      if (hB && hV) {
        var hUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          if (!st || !st.snapshot) return;
          var rem = st.snapshot.remainingWorkSeconds || 0;
          var hh = Math.floor(rem / 3600), mm = Math.floor((rem % 3600) / 60);
          hV.textContent = hh + ' 时 ' + mm + ' 分';
          hB.hidden = false;
        };
        hUpd();
        setInterval(hUpd, 30000);
      }
    }
    if (params.get('up') === '1') {
      var uB = document.getElementById('upBadge'), uV = document.getElementById('upVal');
      if (uB && uV) {
        var uT0 = Date.now();
        var uUpd = function () {
          var sec = Math.floor((Date.now() - uT0) / 1000);
          var mm = Math.floor(sec / 60), ss = sec % 60;
          uV.textContent = '停留 ' + mm + ':' + String(ss).padStart(2, '0');
          uB.hidden = false;
        };
        uUpd();
        setInterval(uUpd, 1000);
      }
    }
    if (params.get('sage') === '1') {
      document.body.classList.add('is-sage');
    }
    if (params.get('amber') === '1') {
      document.body.classList.add('is-amber');
    }
    if (params.get('steel') === '1') {
      document.body.classList.add('is-steel');
    }
    if (params.get('lilac') === '1') {
      document.body.classList.add('is-lilac');
    }
    if (params.get('dleft') === '1') {
      var dlB = document.getElementById('dleftBadge'), dlV = document.getElementById('dleftVal');
      if (dlB && dlV) {
        var dlUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          if (!st || !st.snapshot) return;
          var left = Math.max(0, (st.snapshot.workdays || 0) - (st.snapshot.elapsedWorkdays || 0));
          dlV.textContent = '本月剩 ' + left + ' 个工作日';
          dlB.hidden = false;
        };
        dlUpd();
      }
    }
    if (params.get('cobalt') === '1') {
      document.body.classList.add('is-cobalt');
    }
    if (params.get('wine') === '1') {
      document.body.classList.add('is-wine');
    }
    if (params.get('slate') === '1') {
      document.body.classList.add('is-slate');
    }
    if (params.get('mint') === '1') {
      document.body.classList.add('is-mint');
    }
    if (params.get('char') === '1') {
      document.body.classList.add('is-char');
    }
    if (params.get('knit') === '1') {
      document.body.classList.add('is-knit');
    }
    if (params.get('ivory') === '1') {
      document.body.classList.add('is-ivory');
    }
    if (params.get('onyx') === '1') {
      document.body.classList.add('is-onyx');
    }
    if (params.get('coral') === '1') {
      document.body.classList.add('is-coral');
    }
    if (params.get('indigo') === '1') {
      document.body.classList.add('is-indigo');
    }
    if (params.get('moss') === '1') {
      document.body.classList.add('is-moss');
    }
    if (params.get('quota') === '1') {
      var qB = document.getElementById('quotaBadge'), qV = document.getElementById('quotaVal');
      if (qB && qV) {
        var qUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          if (!st || !st.snapshot) return;
          var ds = st.snapshot.daySalary || 0;
          var me = st.snapshot.monthEarned || 0;
          var ew = Math.max(1, st.snapshot.elapsedWorkdays || 1);
          var q = me / ew;
          qV.textContent = '日均 ' + window.SalaryApp.formatMoney(q, st.currency) + ' / 目标 ' + window.SalaryApp.formatMoney(ds, st.currency);
          qB.hidden = false;
        };
        qUpd();
        setInterval(qUpd, 10000);
      }
    }
    if (params.get('haze') === '1') {
      document.body.classList.add('is-haze');
    }
    if (params.get('dbl') === '1') {
      var dEl = document.getElementById('amountArea');
      if (dEl) dEl.addEventListener('dblclick', function () {
        dEl.classList.toggle('dbl-big');
      });
    }
    if (params.get('forest') === '1') {
      document.body.classList.add('is-forest');
    }
    if (params.get('sand') === '1') {
      document.body.classList.add('is-sand');
    }
    if (params.get('ocean') === '1') {
      document.body.classList.add('is-ocean');
    }
    if (params.get('lavender') === '1') {
      document.body.classList.add('is-lavender');
    }
    if (params.get('khaki') === '1') {
      document.body.classList.add('is-khaki');
    }
    if (params.get('ruby') === '1') {
      document.body.classList.add('is-ruby');
    }
    if (params.get('cyber') === '1') {
      document.body.classList.add('is-cyber');
    }
    if (params.get('mauve') === '1') {
      document.body.classList.add('is-mauve');
    }
    if (params.get('pine') === '1') {
      document.body.classList.add('is-pine');
    }
    if (params.get('bronze') === '1') {
      document.body.classList.add('is-bronze');
    }
    if (params.get('fjord') === '1') {
      document.body.classList.add('is-fjord');
    }
    if (params.get('blush') === '1') {
      document.body.classList.add('is-blush');
    }
    if (params.get('pulse') === '1') {
      document.body.classList.add('is-pulse');
    }
    if (params.get('rgb') === '1') {
      document.body.classList.add('is-rgb');
    }
    if (params.get('topo') === '1') {
      document.body.classList.add('is-topo');
    }
    if (params.get('trail') === '1') {
      document.body.classList.add('is-trail');
      var trN = 0;
      document.addEventListener('mousemove', function (ev) {
        if (trN > 40) return;
        trN++;
        var d = document.createElement('div');
        d.className = 'trail-dot';
        d.style.left = ev.clientX + 'px';
        d.style.top = ev.clientY + 'px';
        document.body.appendChild(d);
        setTimeout(function () { d.remove(); trN--; }, 900);
      });
    }
    if (params.get('web') === '1') {
      document.body.classList.add('is-web');
    }
    if (params.get('mirage') === '1') {
      document.body.classList.add('is-mirage');
    }
    if (params.get('emerald') === '1') {
      document.body.classList.add('is-emerald');
    }
    if (params.get('cream') === '1') {
      document.body.classList.add('is-cream');
    }
    if (params.get('navy') === '1') {
      document.body.classList.add('is-navy');
    }
    if (params.get('taupe') === '1') {
      document.body.classList.add('is-taupe');
    }
    if (params.get('jet') === '1') {
      document.body.classList.add('is-jet');
    }
    if (params.get('rose') === '1') {
      document.body.classList.add('is-rose');
    }
    if (params.get('ash') === '1') {
      document.body.classList.add('is-ash');
    }
    if (params.get('berry') === '1') {
      document.body.classList.add('is-berry');
    }
    if (params.get('coal') === '1') {
      document.body.classList.add('is-coal');
    }
    if (params.get('peach') === '1') {
      document.body.classList.add('is-peach');
    }
    if (params.get('plum') === '1') {
      document.body.classList.add('is-plum');
    }
    if (params.get('rust') === '1') {
      document.body.classList.add('is-rust');
    }
    if (params.get('denim') === '1') {
      document.body.classList.add('is-denim');
    }
    if (params.get('mango') === '1') {
      document.body.classList.add('is-mango');
    }
    if (params.get('graph') === '1') {
      document.body.classList.add('is-graph');
    }
    if (params.get('jade') === '1') {
      document.body.classList.add('is-jade');
    }
    if (params.get('azure') === '1') {
      document.body.classList.add('is-azure');
    }
    if (params.get('cocoa') === '1') {
      document.body.classList.add('is-cocoa');
    }
    if (params.get('latte') === '1') {
      document.body.classList.add('is-latte');
    }
    if (params.get('storm') === '1') {
      document.body.classList.add('is-storm');
    }
    if (params.get('citrus') === '1') {
      document.body.classList.add('is-citrus');
    }
    if (params.get('morale') === '1') {
      var mB = document.getElementById('moraleBadge'), mV = document.getElementById('moraleVal');
      if (mB && mV) {
        var mUpd = function () {
          var st = window.SalaryApp && window.SalaryApp.getState && window.SalaryApp.getState();
          if (!st || !st.snapshot) return;
          var p = Math.round(Math.max(0, Math.min(1, st.snapshot.progress || 0)) * 100);
          mV.textContent = '今日完成 ' + p + '%';
          mB.hidden = false;
        };
        mUpd();
        setInterval(mUpd, 5000);
      }
    }
    if (params.get('sunset') === '1') {
      document.body.classList.add('is-sunset');
    }
    if (params.get('glacier') === '1') {
      document.body.classList.add('is-glacier');
    }
    if (params.get('honey') === '1') {
      document.body.classList.add('is-honey');
    }
    if (params.get('iris') === '1') {
      document.body.classList.add('is-iris');
    }
    if (params.get('cedar') === '1') {
      document.body.classList.add('is-cedar');
    }
    if (params.get('wheat') === '1') {
      document.body.classList.add('is-wheat');
    }
    if (params.get('cave') === '1') {
      document.body.classList.add('is-cave');
    }
    if (params.get('meadow') === '1') {
      document.body.classList.add('is-meadow');
    }
    if (params.get('porcelain') === '1') {
      document.body.classList.add('is-porcelain');
    }
    if (params.get('twilight') === '1') {
      document.body.classList.add('is-twilight');
    }
    if (params.get('abyss') === '1') {
      document.body.classList.add('is-abyss');
    }
    if (params.get('lagoon') === '1') {
      document.body.classList.add('is-lagoon');
    }
    if (params.get('dune') === '1') {
      document.body.classList.add('is-dune');
    }
    if (params.get('orchid') === '1') {
      document.body.classList.add('is-orchid');
    }
    if (params.get('cinnabar') === '1') {
      document.body.classList.add('is-cinnabar');
    }
    if (params.get('alpine') === '1') {
      document.body.classList.add('is-alpine');
    }
    if (params.get('nectar') === '1') {
      document.body.classList.add('is-nectar');
    }
    if (params.get('clay') === '1') {
      document.body.classList.add('is-clay');
    }
    if (params.get('aurum') === '1') {
      document.body.classList.add('is-aurum');
    }
    if (params.get('breeze') === '1') {
      document.body.classList.add('is-breeze');
    }
    if (params.get('raven') === '1') {
      document.body.classList.add('is-raven');
    }
    if (params.get('saffron') === '1') {
      document.body.classList.add('is-saffron');
    }
    if (params.get('oasis') === '1') {
      document.body.classList.add('is-oasis');
    }
    if (params.get('tulip') === '1') {
      document.body.classList.add('is-tulip');
    }
    if (params.get('birch') === '1') {
      document.body.classList.add('is-birch');
    }
    if (params.get('smoke') === '1') {
      document.body.classList.add('is-smoke');
    }
    if (params.get('lotus') === '1') {
      document.body.classList.add('is-lotus');
    }
    if (params.get('ebony') === '1') {
      document.body.classList.add('is-ebony');
    }
    if (params.get('sprout') === '1') {
      document.body.classList.add('is-sprout');
    }
    if (params.get('harbor') === '1') {
      document.body.classList.add('is-harbor');
    }
    if (params.get('cosmos') === '1') {
      document.body.classList.add('is-cosmos');
    }
    if (params.get('ginger') === '1') {
      document.body.classList.add('is-ginger');
    }
    if (params.get('kelp') === '1') {
      document.body.classList.add('is-kelp');
    }
    if (params.get('maple') === '1') {
      document.body.classList.add('is-maple');
    }
    if (params.get('pewter') === '1') {
      document.body.classList.add('is-pewter');
    }
    if (params.get('dawn') === '1') {
      document.body.classList.add('is-dawn');
    }
    if (params.get('thicket') === '1') {
      document.body.classList.add('is-thicket');
    }
    if (params.get('blossom') === '1') {
      document.body.classList.add('is-blossom');
    }
    if (params.get('cliff') === '1') {
      document.body.classList.add('is-cliff');
    }
    if (params.get('tundra') === '1') {
      document.body.classList.add('is-tundra');
    }
    if (params.get('canyon') === '1') {
      document.body.classList.add('is-canyon');
    }
    if (params.get('reef') === '1') {
      document.body.classList.add('is-reef');
    }
    if (params.get('umber') === '1') {
      document.body.classList.add('is-umber');
    }
    if (params.get('violet') === '1') {
      document.body.classList.add('is-violet');
    }
    if (params.get('verdant') === '1') {
      document.body.classList.add('is-verdant');
    }
    if (params.get('dusk') === '1') {
      document.body.classList.add('is-dusk');
    }
    if (params.get('crimson') === '1') {
      document.body.classList.add('is-crimson');
    }
    if (params.get('opal') === '1') {
      document.body.classList.add('is-opal');
    }
    if (params.get('basalt') === '1') {
      document.body.classList.add('is-basalt');
    }
    if (params.get('tangerine') === '1') {
      document.body.classList.add('is-tangerine');
    }
    if (params.get('midnight') === '1') {
      document.body.classList.add('is-midnight');
    }
    if (params.get('clover') === '1') {
      document.body.classList.add('is-clover');
    }
    if (params.get('brick') === '1') {
      document.body.classList.add('is-brick');
    }
    if (params.get('rosewood') === '1') {
      document.body.classList.add('is-rosewood');
    }
    if (params.get('marsh') === '1') {
      document.body.classList.add('is-marsh');
    }
    if (params.get('iceberg') === '1') {
      document.body.classList.add('is-iceberg');
    }
    if (params.get('willow') === '1') {
      document.body.classList.add('is-willow');
    }
    if (params.get('volcano') === '1') {
      document.body.classList.add('is-volcano');
    }
    if (params.get('glade') === '1') {
      document.body.classList.add('is-glade');
    }
    if (params.get('delta') === '1') {
      document.body.classList.add('is-delta');
    }
    if (params.get('prairie') === '1') {
      document.body.classList.add('is-prairie');
    }
    if (params.get('cove') === '1') {
      document.body.classList.add('is-cove');
    }
    if (params.get('sierra') === '1') {
      document.body.classList.add('is-sierra');
    }
    if (params.get('dusty') === '1') {
      document.body.classList.add('is-dusty');
    }
    if (params.get('marine') === '1') {
      document.body.classList.add('is-marine');
    }
    if (params.get('autumn') === '1') {
      document.body.classList.add('is-autumn');
    }
    if (params.get('winter') === '1') {
      document.body.classList.add('is-winter');
    }
    if (params.get('spring') === '1') {
      document.body.classList.add('is-spring');
    }
    if (params.get('summer') === '1') {
      document.body.classList.add('is-summer');
    }
    if (params.get('bamboo') === '1') {
      document.body.classList.add('is-bamboo');
    }
    if (params.get('flame') === '1') {
      document.body.classList.add('is-flame');
    }
    if (params.get('pastel') === '1') {
      document.body.classList.add('is-pastel');
    }
    if (params.get('mahogany') === '1') {
      document.body.classList.add('is-mahogany');
    }
    if (params.get('lime') === '1') {
      document.body.classList.add('is-lime');
    }
    if (params.get('turquoise') === '1') {
      document.body.classList.add('is-turquoise');
    }
    if (params.get('walnut') === '1') {
      document.body.classList.add('is-walnut');
    }
    if (params.get('cherry') === '1') {
      document.body.classList.add('is-cherry');
    }
    if (params.get('espresso') === '1') {
      document.body.classList.add('is-espresso');
    }
    if (params.get('peridot') === '1') {
      document.body.classList.add('is-peridot');
    }
    if (params.get('amethyst') === '1') {
      document.body.classList.add('is-amethyst');
    }
    if (params.get('cerulean') === '1') {
      document.body.classList.add('is-cerulean');
    }
    if (params.get('garnet') === '1') {
      document.body.classList.add('is-garnet');
    }
    if (params.get('teak') === '1') {
      document.body.classList.add('is-teak');
    }
    if (params.get('fern') === '1') {
      document.body.classList.add('is-fern');
    }
    if (params.get('lapis') === '1') {
      document.body.classList.add('is-lapis');
    }
    if (params.get('topaz') === '1') {
      document.body.classList.add('is-topaz');
    }
    if (params.get('mystic') === '1') {
      document.body.classList.add('is-mystic');
    }
    if (params.get('cascade') === '1') {
      document.body.classList.add('is-cascade');
    }
    if (params.get('sunrise') === '1') {
      document.body.classList.add('is-sunrise');
    }
    if (params.get('sakura') === '1') {
      document.body.classList.add('is-sakura');
    }
    if (params.get('granite') === '1') {
      document.body.classList.add('is-granite');
    }
    if (params.get('ember') === '1') {
      document.body.classList.add('is-ember');
    }
    if (params.get('mulberry') === '1') {
      document.body.classList.add('is-mulberry');
    }
    if (params.get('sienna') === '1') {
      document.body.classList.add('is-sienna');
    }
    if (params.get('aqua') === '1') {
      document.body.classList.add('is-aqua');
    }
    if (params.get('flax') === '1') {
      document.body.classList.add('is-flax');
    }
    if (params.get('heather') === '1') {
      document.body.classList.add('is-moorer');
    }
    if (params.get('tawny') === '1') {
      document.body.classList.add('is-tawny');
    }
    if (params.get('vivid') === '1') {
      document.body.classList.add('is-vivid');
    }
    if (params.get('soft') === '1') {
      document.body.classList.add('is-soft');
    }
    if (params.get('edge') === '1') {
      document.body.classList.add('is-edge');
    }
    if (params.get('bramble') === '1') {
      document.body.classList.add('is-bramble');
    }
    if (params.get('cider') === '1') {
      document.body.classList.add('is-cider');
    }
    if (params.get('pebble') === '1') {
      document.body.classList.add('is-pebble');
    }
    if (params.get('suede') === '1') {
      document.body.classList.add('is-suede');
    }
    if (params.get('mimosa') === '1') {
      document.body.classList.add('is-mimosa');
    }
    if (params.get('canopy') === '1') {
      document.body.classList.add('is-canopy');
    }
    if (params.get('tinsel') === '1') {
      document.body.classList.add('is-tinsel');
    }
    if (params.get('marigold') === '1') {
      document.body.classList.add('is-marigold');
    }
    if (params.get('shadow') === '1') {
      document.body.classList.add('is-shadow');
    }
    if (params.get('amoled') === '1') {
      document.body.classList.add('is-amoled');
    }
    if (params.get('chestnut') === '1') {
      document.body.classList.add('is-chestnut');
    }
    if (params.get('seashell') === '1') {
      document.body.classList.add('is-seashell');
    }
    if (params.get('fawn') === '1') {
      document.body.classList.add('is-fawn');
    }
    if (params.get('bracken') === '1') {
      document.body.classList.add('is-bracken');
    }
    if (params.get('reed') === '1') {
      document.body.classList.add('is-reed');
    }
    if (params.get('beats') === '1') {
      var btb = document.getElementById('beatsBadge'), btv = document.getElementById('beatsVal');
      if (btb && btv) {
        var btUpd = function () {
          var d = new Date();
          var secs = (d.getUTCHours() + 1) % 24 * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
          btv.textContent = Math.floor(secs / 86.4);
          btb.hidden = false;
        };
        btUpd(); setInterval(btUpd, 8640);
      }
    }
    if (params.get('unix') === '1') {
      var unb = document.getElementById('unixBadge'), unv = document.getElementById('unixVal');
      if (unb && unv) {
        var unUpd = function () { unv.textContent = Math.floor(Date.now() / 1000); unb.hidden = false; };
        unUpd(); setInterval(unUpd, 1000);
      }
    }
    if (params.get('era') === '1') {
      var erb = document.getElementById('eraBadge'), erv = document.getElementById('eraVal');
      if (erb && erv) {
        var y = new Date().getFullYear();
        erv.textContent = '令和' + (y - 2018) + '年';
        erb.hidden = false;
      }
    }
    if (params.get('stardate') === '1') {
      var sdb = document.getElementById('stardateBadge'), sdv = document.getElementById('stardateVal');
      if (sdb && sdv) {
        var sdUpd = function () {
          sdv.textContent = (41000 + (Date.now() - new Date('2012-01-01').getTime()) / 31557600).toFixed(1);
          sdb.hidden = false;
        };
        sdUpd(); setInterval(sdUpd, 60000);
      }
    }
    if (params.get('easter') === '1') {
      var eab = document.getElementById('easterBadge'), eav = document.getElementById('easterDays');
      if (eab && eav) {
        var easterOf = function (y) {
          var a = y % 19, b = Math.floor(y / 100), c = y % 100, d2 = Math.floor(b / 4), e = b % 4;
          var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
          var h = (19 * a + b - d2 - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
          var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
          return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, (h + l - 7 * m + 114) % 31 + 1);
        };
        var eaUpd = function () {
          var now = new Date(), t = easterOf(now.getFullYear());
          if (t <= now) t = easterOf(now.getFullYear() + 1);
          eav.textContent = Math.max(0, Math.round((t - now) / 86400000));
          eab.hidden = false;
        };
        eaUpd(); setInterval(eaUpd, 3600000);
      }
    }
    if (params.get('olympic') === '1') {
      var olb = document.getElementById('olympicBadge'), olv = document.getElementById('olympicDays');
      if (olb && olv) {
        var olyTargets = [new Date('2028-07-14'), new Date('2030-02-08'), new Date('2032-07-23')];
        var olUpd = function () {
          var now = Date.now(), t = olyTargets.find(function (d) { return d.getTime() > now; });
          if (!t) { olb.hidden = true; return; }
          olv.textContent = Math.ceil((t.getTime() - now) / 86400000);
          olb.hidden = false;
        };
        olUpd(); setInterval(olUpd, 3600000);
      }
    }
    var dayCountdown = function (badgeId, valId, month, day) {
      var b = document.getElementById(badgeId), v = document.getElementById(valId);
      if (!b || !v) return;
      var upd = function () {
        var now = new Date();
        var t = new Date(now.getFullYear(), month - 1, day);
        if (t <= now) t = new Date(now.getFullYear() + 1, month - 1, day);
        v.textContent = Math.max(0, Math.ceil((t - now) / 86400000));
        b.hidden = false;
      };
      upd(); setInterval(upd, 3600000);
    };
    if (params.get('solstice') === '1') dayCountdown('solsticeBadge', 'solsticeDays', 12, 21);
    if (params.get('valentine') === '1') dayCountdown('valentineBadge', 'valentineDays', 2, 14);
    if (params.get('halloween') === '1') dayCountdown('halloweenBadge', 'halloweenDays', 10, 31);
    if (params.get('laborday') === '1') dayCountdown('labordayBadge', 'labordayDays', 5, 1);
    if (params.get('national') === '1') dayCountdown('nationalBadge', 'nationalDays', 10, 1);
    if (params.get('childrens') === '1') dayCountdown('childrensBadge', 'childrensDays', 6, 1);
    if (params.get('teachers') === '1') dayCountdown('teachersBadge', 'teachersDays', 9, 10);
    if (params.get('double11') === '1') dayCountdown('double11Badge', 'double11Days', 11, 11);
    if (params.get('womans') === '1') dayCountdown('womansBadge', 'womansDays', 3, 8);
    if (params.get('aprilfools') === '1') dayCountdown('aprilfoolsBadge', 'aprilfoolsDays', 4, 1);
    if (params.get('double12') === '1') dayCountdown('double12Badge', 'double12Days', 12, 12);
    if (params.get('lastday') === '1') dayCountdown('lastdayBadge', 'lastdayDays', 12, 31);
    if (params.get('oatmeal') === '1') {
      document.body.classList.add('is-oatmeal');
    }
    if (params.get('thyme') === '1') {
      document.body.classList.add('is-thyme');
    }
    if (params.get('russet') === '1') {
      document.body.classList.add('is-russet');
    }
    if (params.get('dijon') === '1') {
      document.body.classList.add('is-dijon');
    }
    if (params.get('spruce') === '1') {
      document.body.classList.add('is-spruce');
    }
    if (params.get('merlot') === '1') {
      document.body.classList.add('is-merlot');
    }
    if (params.get('camel') === '1') {
      document.body.classList.add('is-camel');
    }
    if (params.get('petrol') === '1') {
      document.body.classList.add('is-petrol');
    }
    if (params.get('sangria') === '1') {
      document.body.classList.add('is-sangria');
    }
    if (params.get('basil') === '1') {
      document.body.classList.add('is-basil');
    }
    if (params.get('falcon') === '1') {
      document.body.classList.add('is-falcon');
    }
    if (params.get('tweed') === '1') {
      document.body.classList.add('is-tweed');
    }
    if (params.get('caramel') === '1') {
      document.body.classList.add('is-caramel');
    }
    if (params.get('sable') === '1') {
      document.body.classList.add('is-sable');
    }
    if (params.get('pistachio') === '1') {
      document.body.classList.add('is-pistachio');
    }
    if (params.get('apricot') === '1') {
      document.body.classList.add('is-apricot');
    }
    if (params.get('dove') === '1') {
      document.body.classList.add('is-dove');
    }
    if (params.get('juniper') === '1') {
      document.body.classList.add('is-juniper');
    }
    if (params.get('maroon') === '1') {
      document.body.classList.add('is-maroon');
    }
    if (params.get('butterscotch') === '1') {
      document.body.classList.add('is-butterscotch');
    }
    if (params.get('mole') === '1') {
      document.body.classList.add('is-mole');
    }
    if (params.get('grotto') === '1') {
      document.body.classList.add('is-grotto');
    }
    if (params.get('peacock') === '1') {
      document.body.classList.add('is-peacock');
    }
    if (params.get('linen') === '1') {
      document.body.classList.add('is-linen');
    }
    if (params.get('zephyr') === '1') {
      document.body.classList.add('is-zephyr');
    }
    if (params.get('brass') === '1') {
      document.body.classList.add('is-brass');
    }
    if (params.get('paprika') === '1') {
      document.body.classList.add('is-paprika');
    }
    if (params.get('hazelnut') === '1') {
      document.body.classList.add('is-hazelnut');
    }
    if (params.get('lobster') === '1') {
      document.body.classList.add('is-lobster');
    }
    if (params.get('wisteria') === '1') {
      document.body.classList.add('is-wisteria');
    }
    if (params.get('ridge') === '1') {
      document.body.classList.add('is-ridge');
    }
    if (params.get('flint') === '1') {
      document.body.classList.add('is-flint');
    }
    if (params.get('sorrel') === '1') {
      document.body.classList.add('is-sorrel');
    }
    if (params.get('grove') === '1') {
      document.body.classList.add('is-grove');
    }
    if (params.get('moor') === '1') {
      document.body.classList.add('is-moor');
    }
    if (params.get('ochre') === '1') {
      document.body.classList.add('is-ochre');
    }
    if (params.get('timber') === '1') {
      document.body.classList.add('is-timber');
    }
    if (params.get('lily') === '1') {
      document.body.classList.add('is-lily');
    }
    if (params.get('otter') === '1') {
      document.body.classList.add('is-otter');
    }
    if (params.get('primrose') === '1') {
      document.body.classList.add('is-primrose');
    }
    if (params.get('cinder') === '1') {
      document.body.classList.add('is-cinder');
    }
    if (params.get('sedge') === '1') {
      document.body.classList.add('is-sedge');
    }
    if (params.get('crocus') === '1') {
      document.body.classList.add('is-crocus');
    }
    if (params.get('magpie') === '1') {
      document.body.classList.add('is-magpie');
    }
    if (params.get('tatami') === '1') {
      document.body.classList.add('is-tatami');
    }
    if (params.get('heron') === '1') {
      document.body.classList.add('is-heron');
    }
    if (params.get('yuzu') === '1') {
      document.body.classList.add('is-yuzu');
    }
    if (params.get('balsam') === '1') {
      document.body.classList.add('is-balsam');
    }
    if (params.get('quill') === '1') {
      document.body.classList.add('is-quill');
    }
    if (params.get('bison') === '1') {
      document.body.classList.add('is-bison');
    }
    if (params.get('wren') === '1') {
      document.body.classList.add('is-wren');
    }
    if (params.get('goose') === '1') {
      document.body.classList.add('is-goose');
    }
    if (params.get('malachite') === '1') {
      document.body.classList.add('is-malachite');
    }
    if (params.get('barley') === '1') {
      document.body.classList.add('is-barley');
    }
    if (params.get('sycamore') === '1') {
      document.body.classList.add('is-sycamore');
    }
    if (params.get('kraken') === '1') {
      document.body.classList.add('is-kraken');
    }
    if (params.get('pumice') === '1') {
      document.body.classList.add('is-pumice');
    }
    if (params.get('marsala') === '1') {
      document.body.classList.add('is-marsala');
    }
    if (params.get('lynx') === '1') {
      document.body.classList.add('is-lynx');
    }
    if (params.get('polar') === '1') {
      document.body.classList.add('is-polar');
    }
    if (params.get('mustard') === '1') {
      document.body.classList.add('is-mustard');
    }
    if (params.get('celery') === '1') {
      document.body.classList.add('is-celery');
    }
    if (params.get('oryx') === '1') {
      document.body.classList.add('is-oryx');
    }
    if (params.get('tortoise') === '1') {
      document.body.classList.add('is-tortoise');
    }
    if (params.get('mantis') === '1') {
      document.body.classList.add('is-mantis');
    }
    if (params.get('coriander') === '1') {
      document.body.classList.add('is-coriander');
    }
    if (params.get('fennel') === '1') {
      document.body.classList.add('is-fennel');
    }
    if (params.get('gecko') === '1') {
      document.body.classList.add('is-gecko');
    }
    if (params.get('walrus') === '1') {
      document.body.classList.add('is-walrus');
    }
    if (params.get('osprey') === '1') {
      document.body.classList.add('is-osprey');
    }
    if (params.get('plover') === '1') {
      document.body.classList.add('is-plover');
    }
    if (params.get('sesame') === '1') {
      document.body.classList.add('is-sesame');
    }
    if (params.get('chamois') === '1') {
      document.body.classList.add('is-chamois');
    }
    if (params.get('dill') === '1') {
      document.body.classList.add('is-dill');
    }
    if (params.get('ermine') === '1') {
      document.body.classList.add('is-ermine');
    }
    if (params.get('badger') === '1') {
      document.body.classList.add('is-badger');
    }
    if (params.get('marlin') === '1') {
      document.body.classList.add('is-marlin');
    }
    if (params.get('banyan') === '1') {
      document.body.classList.add('is-banyan');
    }
    if (params.get('kestrel') === '1') {
      document.body.classList.add('is-kestrel');
    }
    if (params.get('poppy') === '1') {
      document.body.classList.add('is-poppy');
    }
    if (params.get('yak') === '1') {
      document.body.classList.add('is-yak');
    }
    if (params.get('tern') === '1') {
      document.body.classList.add('is-tern');
    }
    if (params.get('cypress') === '1') {
      document.body.classList.add('is-cypress');
    }
    if (params.get('gazelle') === '1') {
      document.body.classList.add('is-gazelle');
    }
    if (params.get('ibis') === '1') {
      document.body.classList.add('is-ibis');
    }
    if (params.get('tamarind') === '1') {
      document.body.classList.add('is-tamarind');
    }
    if (params.get('dingo') === '1') {
      document.body.classList.add('is-dingo');
    }
    if (params.get('ocelot') === '1') {
      document.body.classList.add('is-ocelot');
    }
    if (params.get('safflower') === '1') {
      document.body.classList.add('is-safflower');
    }
    if (params.get('tapir') === '1') {
      document.body.classList.add('is-tapir');
    }
    if (params.get('eow') === '1') {
      var eb = document.getElementById('eowBadge');
      if (eb) {
        var edow = new Date().getDay();
        var edays = (6 - edow + 7) % 7;
        eb.hidden = false;
        var el = document.getElementById('eowLabel');
        var ed = document.getElementById('eowDays');
        var eu = document.getElementById('eowUnit');
        if (edays === 0) {
          if (el) el.textContent = '周末啦';
          if (ed) ed.textContent = '🎉';
          if (eu) eu.hidden = true;
        } else if (ed) ed.textContent = String(edays);
      }
    }
    if (params.get('rhea') === '1') {
      document.body.classList.add('is-rhea');
    }
    if (params.get('umbra') === '1') {
      document.body.classList.add('is-umbra');
    }
    if (params.get('vicuna') === '1') {
      document.body.classList.add('is-vicuna');
    }
    if (params.get('olivine') === '1') {
      document.body.classList.add('is-olivine');
    }
    if (params.get('damson') === '1') {
      document.body.classList.add('is-damson');
    }
    if (params.get('nutmeg') === '1') {
      document.body.classList.add('is-nutmeg');
    }
    if (params.get('scarab') === '1') {
      document.body.classList.add('is-scarab');
    }
    if (params.get('lichen') === '1') {
      document.body.classList.add('is-lichen');
    }
    if (params.get('manatee') === '1') {
      document.body.classList.add('is-manatee');
    }
    if (params.get('thistle') === '1') {
      document.body.classList.add('is-thistle');
    }
    if (params.get('raccoon') === '1') {
      document.body.classList.add('is-raccoon');
    }
    if (params.get('weasel') === '1') {
      document.body.classList.add('is-weasel');
    }
    if (params.get('rhubarb') === '1') {
      document.body.classList.add('is-rhubarb');
    }
    if (params.get('stork') === '1') {
      document.body.classList.add('is-stork');
    }
    if (params.get('goanna') === '1') {
      document.body.classList.add('is-goanna');
    }
    if (params.get('cumin') === '1') {
      document.body.classList.add('is-cumin');
    }
    if (params.get('chinchilla') === '1') {
      document.body.classList.add('is-chinchilla');
    }
    if (params.get('axolotl') === '1') {
      document.body.classList.add('is-axolotl');
    }
    if (params.get('azuki') === '1') {
      document.body.classList.add('is-azuki');
    }
    if (params.get('cassowary') === '1') {
      document.body.classList.add('is-cassowary');
    }
    if (params.get('pangolin') === '1') {
      document.body.classList.add('is-pangolin');
    }
    if (params.get('quince') === '1') {
      document.body.classList.add('is-quince');
    }
    if (params.get('guanaco') === '1') {
      document.body.classList.add('is-guanaco');
    }
    if (params.get('jacaranda') === '1') {
      document.body.classList.add('is-jacaranda');
    }
    if (params.get('lemur') === '1') {
      document.body.classList.add('is-lemur');
    }
    if (params.get('fig') === '1') {
      document.body.classList.add('is-fig');
    }
    if (params.get('narwhal') === '1') {
      document.body.classList.add('is-narwhal');
    }
    if (params.get('persimmon') === '1') {
      document.body.classList.add('is-persimmon');
    }
    if (params.get('capybara') === '1') {
      document.body.classList.add('is-capybara');
    }
    if (params.get('toucan') === '1') {
      document.body.classList.add('is-toucan');
    }
    if (params.get('taro') === '1') {
      document.body.classList.add('is-taro');
    }
    if (params.get('mongoose') === '1') {
      document.body.classList.add('is-mongoose');
    }
    if (params.get('hornbill') === '1') {
      document.body.classList.add('is-hornbill');
    }
    if (params.get('millet') === '1') {
      document.body.classList.add('is-millet');
    }
    if (params.get('wombat') === '1') {
      document.body.classList.add('is-wombat');
    }
    if (params.get('redpanda') === '1') {
      document.body.classList.add('is-redpanda');
    }
    if (params.get('dewberry') === '1') {
      document.body.classList.add('is-dewberry');
    }
    if (params.get('cormorant') === '1') {
      document.body.classList.add('is-cormorant');
    }
    if (params.get('armadillo') === '1') {
      document.body.classList.add('is-armadillo');
    }
    if (params.get('lychee') === '1') {
      document.body.classList.add('is-lychee');
    }
    if (params.get('wallaby') === '1') {
      document.body.classList.add('is-wallaby');
    }
    if (params.get('quokka') === '1') {
      document.body.classList.add('is-quokka');
    }
    if (params.get('jujube') === '1') {
      document.body.classList.add('is-jujube');
    }
    if (params.get('serval') === '1') {
      document.body.classList.add('is-serval');
    }
    if (params.get('saiga') === '1') { document.body.classList.add('is-saiga'); }
    if (params.get('longan') === '1') { document.body.classList.add('is-longan'); }
    if (params.get('koala') === '1') { document.body.classList.add('is-koala'); }
    if (params.get('okapi') === '1') { document.body.classList.add('is-okapi'); }
    if (params.get('parrot') === '1') { document.body.classList.add('is-parrot'); }
    if (params.get('panda') === '1') { document.body.classList.add('is-panda'); }
    if (params.get('salmon') === '1') { document.body.classList.add('is-salmon'); }
    if (params.get('egret') === '1') { document.body.classList.add('is-egret'); }
    if (params.get('morel') === '1') { document.body.classList.add('is-morel'); }
    if (params.get('hyena') === '1') { document.body.classList.add('is-hyena'); }
    if (params.get('urchin') === '1') { document.body.classList.add('is-urchin'); }
    if (params.get('viper') === '1') { document.body.classList.add('is-viper'); }
    if (params.get('wapiti') === '1') { document.body.classList.add('is-wapiti'); }
    if (params.get('xerus') === '1') { document.body.classList.add('is-xerus'); }
    if (params.get('yellowfin') === '1') { document.body.classList.add('is-yellowfin'); }
    if (params.get('zebu') === '1') { document.body.classList.add('is-zebu'); }
    if (params.get('anemone') === '1') { document.body.classList.add('is-anemone'); }
    if (params.get('bobcat') === '1') { document.body.classList.add('is-bobcat'); }
    if (params.get('caracal') === '1') { document.body.classList.add('is-caracal'); }
    if (params.get('dormouse') === '1') { document.body.classList.add('is-dormouse'); }
    if (params.get('eland') === '1') { document.body.classList.add('is-eland'); }
    if (params.get('fossa') === '1') { document.body.classList.add('is-fossa'); }
    if (params.get('gerenuk') === '1') { document.body.classList.add('is-gerenuk'); }
    if (params.get('hutia') === '1') { document.body.classList.add('is-hutia'); }
    if (params.get('impala') === '1') { document.body.classList.add('is-impala'); }
    if (params.get('jackdaw') === '1') { document.body.classList.add('is-jackdaw'); }
    if (params.get('kakapo') === '1') { document.body.classList.add('is-kakapo'); }
    if (params.get('lorikeet') === '1') { document.body.classList.add('is-lorikeet'); }
    if (params.get('markhor') === '1') { document.body.classList.add('is-markhor'); }
    if (params.get('numbat') === '1') { document.body.classList.add('is-numbat'); }
    if (params.get('puffin') === '1') { document.body.classList.add('is-puffin'); }
    if (params.get('quetzal') === '1') { document.body.classList.add('is-quetzal'); }
    if (params.get('springbok') === '1') { document.body.classList.add('is-springbok'); }
    if (params.get('takin') === '1') { document.body.classList.add('is-takin'); }
    if (params.get('uakari') === '1') { document.body.classList.add('is-uakari'); }
    if (params.get('vaquita') === '1') { document.body.classList.add('is-vaquita'); }
    if (params.get('xenops') === '1') { document.body.classList.add('is-xenops'); }
    if (params.get('yaffle') === '1') { document.body.classList.add('is-yaffle'); }
    if (params.get('zonkey') === '1') { document.body.classList.add('is-zonkey'); }
    if (params.get('binturong') === '1') { document.body.classList.add('is-binturong'); }
    if (params.get('caribou') === '1') { document.body.classList.add('is-caribou'); }
    if (params.get('dikdik') === '1') { document.body.classList.add('is-dikdik'); }
    if (params.get('echidna') === '1') { document.body.classList.add('is-echidna'); }
    if (params.get('gelada') === '1') { document.body.classList.add('is-gelada'); }
    if (params.get('hoopoe') === '1') { document.body.classList.add('is-hoopoe'); }
    if (params.get('indri') === '1') { document.body.classList.add('is-indri'); }
    if (params.get('jabiru') === '1') { document.body.classList.add('is-jabiru'); }
    if (params.get('klipspringer') === '1') { document.body.classList.add('is-klipspringer'); }
    if (params.get('lapwing') === '1') { document.body.classList.add('is-lapwing'); }
    if (params.get('mudskipper') === '1') { document.body.classList.add('is-mudskipper'); }
    if (params.get('nighthawk') === '1') { document.body.classList.add('is-nighthawk'); }
    if (params.get('potoo') === '1') { document.body.classList.add('is-potoo'); }
    if (params.get('solenodon') === '1') { document.body.classList.add('is-solenodon'); }
    if (params.get('tarsier') === '1') { document.body.classList.add('is-tarsier'); }
    if (params.get('wolverine') === '1') { document.body.classList.add('is-wolverine'); }
    if (params.get('xeme') === '1') { document.body.classList.add('is-xeme'); }
    if (params.get('zokor') === '1') { document.body.classList.add('is-zokor'); }
    if (params.get('addax') === '1') { document.body.classList.add('is-addax'); }
    if (params.get('bulbul') === '1') { document.body.classList.add('is-bulbul'); }
    if (params.get('cuscus') === '1') { document.body.classList.add('is-cuscus'); }
    if (params.get('duiker') === '1') { document.body.classList.add('is-duiker'); }
    if (params.get('elepaio') === '1') { document.body.classList.add('is-elepaio'); }
    if (params.get('fulmar') === '1') { document.body.classList.add('is-fulmar'); }
    if (params.get('genet') === '1') { document.body.classList.add('is-genet'); }
    if (params.get('hoolock') === '1') { document.body.classList.add('is-hoolock'); }
    if (params.get('jacana') === '1') { document.body.classList.add('is-jacana'); }
    if (params.get('kiskadee') === '1') { document.body.classList.add('is-kiskadee'); }
    if (params.get('lemming') === '1') { document.body.classList.add('is-lemming'); }
    if (params.get('moose') === '1') { document.body.classList.add('is-moose'); }
    if (params.get('nyala') === '1') { document.body.classList.add('is-nyala'); }
    if (params.get('pika') === '1') { document.body.classList.add('is-pika'); }
    if (params.get('quoll') === '1') { document.body.classList.add('is-quoll'); }
    if (params.get('spoonbill') === '1') { document.body.classList.add('is-spoonbill'); }
    if (params.get('sunfish') === '1') { document.body.classList.add('is-sunfish'); }
    if (params.get('tamarin') === '1') { document.body.classList.add('is-tamarin'); }
    if (params.get('turaco') === '1') { document.body.classList.add('is-turaco'); }
    if (params.get('urial') === '1') { document.body.classList.add('is-urial'); }
    if (params.get('wahoo') === '1') { document.body.classList.add('is-wahoo'); }
    if (params.get('yellowlegs') === '1') { document.body.classList.add('is-yellowlegs'); }
    if (params.get('zorilla') === '1') { document.body.classList.add('is-zorilla'); }
    if (params.get('agouti') === '1') { document.body.classList.add('is-agouti'); }
    if (params.get('bongo') === '1') { document.body.classList.add('is-bongo'); }
    if (params.get('civet') === '1') { document.body.classList.add('is-civet'); }
    if (params.get('dugong') === '1') { document.body.classList.add('is-dugong'); }
    if (params.get('fugu') === '1') { document.body.classList.add('is-fugu'); }
    if (params.get('goral') === '1') { document.body.classList.add('is-goral'); }
    if (params.get('hartebeest') === '1') { document.body.classList.add('is-hartebeest'); }
    if (params.get('iora') === '1') { document.body.classList.add('is-iora'); }
    if (params.get('jerboa') === '1') { document.body.classList.add('is-jerboa'); }
    if (params.get('katydid') === '1') { document.body.classList.add('is-katydid'); }
    if (params.get('nilgai') === '1') { document.body.classList.add('is-nilgai'); }
    if (params.get('oribi') === '1') { document.body.classList.add('is-oribi'); }
    if (params.get('pintail') === '1') { document.body.classList.add('is-pintail'); }
    if (params.get('sifaka') === '1') { document.body.classList.add('is-sifaka'); }
    if (params.get('tenrec') === '1') { document.body.classList.add('is-tenrec'); }
    if (params.get('vole') === '1') { document.body.classList.add('is-vole'); }
    if (params.get('wallaroo') === '1') { document.body.classList.add('is-wallaroo'); }
    if (params.get('xerinae') === '1') { document.body.classList.add('is-xerinae'); }
    if (params.get('yabby') === '1') { document.body.classList.add('is-yabby'); }
    if (params.get('avocet') === '1') { document.body.classList.add('is-avocet'); }
    if (params.get('bandicoot') === '1') { document.body.classList.add('is-bandicoot'); }
    if (params.get('cotinga') === '1') { document.body.classList.add('is-cotinga'); }
    if (params.get('dugite') === '1') { document.body.classList.add('is-dugite'); }
    if (params.get('firefinch') === '1') { document.body.classList.add('is-firefinch'); }
    if (params.get('goshawk') === '1') { document.body.classList.add('is-goshawk'); }
    if (params.get('hamerkop') === '1') { document.body.classList.add('is-hamerkop'); }
    if (params.get('ibisbill') === '1') { document.body.classList.add('is-ibisbill'); }
    if (params.get('joey') === '1') { document.body.classList.add('is-joey'); }
    if (params.get('kakariki') === '1') { document.body.classList.add('is-kakariki'); }
    if (params.get('limpet') === '1') { document.body.classList.add('is-limpet'); }
    if (params.get('mudfish') === '1') { document.body.classList.add('is-mudfish'); }
    if (params.get('potoroo') === '1') { document.body.classList.add('is-potoroo'); }
    if (params.get('quail') === '1') { document.body.classList.add('is-quail'); }
    if (params.get('ratel') === '1') { document.body.classList.add('is-ratel'); }
    if (params.get('shoebill') === '1') { document.body.classList.add('is-shoebill'); }
    if (params.get('tanuki') === '1') { document.body.classList.add('is-tanuki'); }
    if (params.get('zinnia') === '1') { document.body.classList.add('is-zinnia'); }
    if (params.get('urutu') === '1') { document.body.classList.add('is-urutu'); }
    if (params.get('weka') === '1') { document.body.classList.add('is-weka'); }
    if (params.get('xenopus') === '1') { document.body.classList.add('is-xenopus'); }
    if (params.get('coati') === '1') { document.body.classList.add('is-coati'); }
    if (params.get('dhole') === '1') { document.body.classList.add('is-dhole'); }
    if (params.get('grison') === '1') { document.body.classList.add('is-grison'); }
    if (params.get('harrier') === '1') { document.body.classList.add('is-harrier'); }
    if (params.get('ibex') === '1') { document.body.classList.add('is-ibex'); }
    if (params.get('jacamar') === '1') { document.body.classList.add('is-jacamar'); }
    if (params.get('kea') === '1') { document.body.classList.add('is-kea'); }
    if (params.get('langur') === '1') { document.body.classList.add('is-langur'); }
    if (params.get('marmoset') === '1') { document.body.classList.add('is-marmoset'); }
    if (params.get('nandu') === '1') { document.body.classList.add('is-nandu'); }
    if (params.get('padda') === '1') { document.body.classList.add('is-padda'); }
    if (params.get('tahr') === '1') { document.body.classList.add('is-tahr'); }
    if (params.get('vanga') === '1') { document.body.classList.add('is-vanga'); }
    if (params.get('wigeon') === '1') { document.body.classList.add('is-wigeon'); }
    if (params.get('yapok') === '1') { document.body.classList.add('is-yapok'); }
    if (params.get('zebrafish') === '1') { document.body.classList.add('is-zebrafish'); }
    if (params.get('tetra') === '1') { document.body.classList.add('is-tetra'); }
    if (params.get('betta') === '1') { document.body.classList.add('is-betta'); }
    if (params.get('cichlid') === '1') { document.body.classList.add('is-cichlid'); }
    if (params.get('guppy') === '1') { document.body.classList.add('is-guppy'); }
    if (params.get('loach') === '1') { document.body.classList.add('is-loach'); }
    if (params.get('molly') === '1') { document.body.classList.add('is-molly'); }
    if (params.get('perch') === '1') { document.body.classList.add('is-perch'); }
    if (params.get('rudd') === '1') { document.body.classList.add('is-rudd'); }
    if (params.get('smelt') === '1') { document.body.classList.add('is-smelt'); }
    if (params.get('tench') === '1') { document.body.classList.add('is-tench'); }
    if (params.get('wrasse') === '1') { document.body.classList.add('is-wrasse'); }
    if (params.get('barbel') === '1') { document.body.classList.add('is-barbel'); }
    if (params.get('dace') === '1') { document.body.classList.add('is-dace'); }
    if (params.get('grayling') === '1') { document.body.classList.add('is-grayling'); }
    if (params.get('minnow') === '1') { document.body.classList.add('is-minnow'); }
    if (params.get('gudgeon') === '1') { document.body.classList.add('is-gudgeon'); }
    if (params.get('bleak') === '1') { document.body.classList.add('is-bleak'); }
    if (params.get('sprat') === '1') { document.body.classList.add('is-sprat'); }
    if (params.get('anchovy') === '1') { document.body.classList.add('is-anchovy'); }
    if (params.get('herring') === '1') { document.body.classList.add('is-herring'); }
    if (params.get('sardine') === '1') { document.body.classList.add('is-sardine'); }
    if (params.get('capelin') === '1') { document.body.classList.add('is-capelin'); }
    if (params.get('mullet') === '1') { document.body.classList.add('is-mullet'); }
    if (params.get('mackerel') === '1') { document.body.classList.add('is-mackerel'); }
    if (params.get('bonito') === '1') { document.body.classList.add('is-bonito'); }
    if (params.get('albacore') === '1') { document.body.classList.add('is-albacore'); }
    if (params.get('yellowtail') === '1') { document.body.classList.add('is-yellowtail'); }
    if (params.get('amberjack') === '1') { document.body.classList.add('is-amberjack'); }
    if (params.get('cobia') === '1') { document.body.classList.add('is-cobia'); }
    if (params.get('dorado') === '1') { document.body.classList.add('is-dorado'); }
    if (params.get('tarpon') === '1') { document.body.classList.add('is-tarpon'); }
    if (params.get('grouper') === '1') { document.body.classList.add('is-grouper'); }
    if (params.get('snapper') === '1') { document.body.classList.add('is-snapper'); }
    if (params.get('bream') === '1') { document.body.classList.add('is-bream'); }
    if (params.get('pompano') === '1') { document.body.classList.add('is-pompano'); }
    if (params.get('tilapia') === '1') { document.body.classList.add('is-tilapia'); }
    if (params.get('catfish') === '1') { document.body.classList.add('is-catfish'); }
    if (params.get('carp') === '1') { document.body.classList.add('is-carp'); }
    if (params.get('trout') === '1') { document.body.classList.add('is-trout'); }
    if (params.get('bass') === '1') { document.body.classList.add('is-bass'); }
    if (params.get('pike') === '1') { document.body.classList.add('is-pike'); }
    if (params.get('sturgeon') === '1') { document.body.classList.add('is-sturgeon'); }
    if (params.get('paddlefish') === '1') { document.body.classList.add('is-paddlefish'); }
    if (params.get('gar') === '1') { document.body.classList.add('is-gar'); }
    if (params.get('bowfin') === '1') { document.body.classList.add('is-bowfin'); }
    if (params.get('burbot') === '1') { document.body.classList.add('is-burbot'); }
    if (params.get('lamprey') === '1') { document.body.classList.add('is-lamprey'); }
    if (params.get('hagfish') === '1') { document.body.classList.add('is-hagfish'); }
    if (params.get('oarfish') === '1') { document.body.classList.add('is-oarfish'); }
    if (params.get('moray') === '1') { document.body.classList.add('is-moray'); }
    if (params.get('conger') === '1') { document.body.classList.add('is-conger'); }
    if (params.get('remora') === '1') { document.body.classList.add('is-remora'); }
    if (params.get('skate') === '1') { document.body.classList.add('is-skate'); }
    if (params.get('stingray') === '1') { document.body.classList.add('is-stingray'); }
    if (params.get('manta') === '1') { document.body.classList.add('is-manta'); }
    if (params.get('flounder') === '1') { document.body.classList.add('is-flounder'); }
    if (params.get('halibut') === '1') { document.body.classList.add('is-halibut'); }
    if (params.get('turbot') === '1') { document.body.classList.add('is-turbot'); }
    if (params.get('sole') === '1') { document.body.classList.add('is-sole'); }
    if (params.get('plaice') === '1') { document.body.classList.add('is-plaice'); }
    if (params.get('dab') === '1') { document.body.classList.add('is-dab'); }
    if (params.get('fluke') === '1') { document.body.classList.add('is-fluke'); }
    if (params.get('pollock') === '1') { document.body.classList.add('is-pollock'); }
    if (params.get('haddock') === '1') { document.body.classList.add('is-haddock'); }
    if (params.get('whiting') === '1') { document.body.classList.add('is-whiting'); }
    if (params.get('cod') === '1') { document.body.classList.add('is-cod'); }
    if (params.get('hake') === '1') { document.body.classList.add('is-hake'); }
    if (params.get('ling') === '1') { document.body.classList.add('is-ling'); }
    if (params.get('saury') === '1') { document.body.classList.add('is-saury'); }
    if (params.get('needlefish') === '1') { document.body.classList.add('is-needlefish'); }
    if (params.get('flyingfish') === '1') { document.body.classList.add('is-flyingfish'); }
    if (params.get('opah') === '1') { document.body.classList.add('is-opah'); }
    if (params.get('pomfret') === '1') { document.body.classList.add('is-pomfret'); }
    if (params.get('croaker') === '1') { document.body.classList.add('is-croaker'); }
    if (params.get('tilefish') === '1') { document.body.classList.add('is-tilefish'); }
    if (params.get('hogfish') === '1') { document.body.classList.add('is-hogfish'); }
    if (params.get('parrotfish') === '1') { document.body.classList.add('is-parrotfish'); }
    if (params.get('damselfish') === '1') { document.body.classList.add('is-damselfish'); }
    if (params.get('clownfish') === '1') { document.body.classList.add('is-clownfish'); }
    if (params.get('angelfish') === '1') { document.body.classList.add('is-angelfish'); }
    if (params.get('goby') === '1') { document.body.classList.add('is-goby'); }
    if (params.get('blenny') === '1') { document.body.classList.add('is-blenny'); }
    if (params.get('sculpin') === '1') { document.body.classList.add('is-sculpin'); }
    if (params.get('lumpsucker') === '1') { document.body.classList.add('is-lumpsucker'); }
    if (params.get('stickleback') === '1') { document.body.classList.add('is-stickleback'); }
    if (params.get('shiner') === '1') { document.body.classList.add('is-shiner'); }
    if (params.get('killifish') === '1') { document.body.classList.add('is-killifish'); }
    if (params.get('medaka') === '1') { document.body.classList.add('is-medaka'); }
    if (params.get('mosquitofish') === '1') { document.body.classList.add('is-mosquitofish'); }
    if (params.get('platy') === '1') { document.body.classList.add('is-platy'); }
    if (params.get('swordtail') === '1') { document.body.classList.add('is-swordtail'); }
    if (params.get('danio') === '1') { document.body.classList.add('is-danio'); }
    if (params.get('gourami') === '1') { document.body.classList.add('is-gourami'); }
    if (params.get('rasbora') === '1') { document.body.classList.add('is-rasbora'); }
    if (params.get('koi') === '1') { document.body.classList.add('is-koi'); }
    if (params.get('arowana') === '1') { document.body.classList.add('is-arowana'); }
    if (params.get('discus') === '1') { document.body.classList.add('is-discus'); }
    if (params.get('oscarfish') === '1') { document.body.classList.add('is-oscarfish'); }
    if (params.get('pleco') === '1') { document.body.classList.add('is-pleco'); }
    if (params.get('corydoras') === '1') { document.body.classList.add('is-corydoras'); }
    if (params.get('flowerhorn') === '1') { document.body.classList.add('is-flowerhorn'); }
    if (params.get('newt') === '1') { document.body.classList.add('is-newt'); }
    if (params.get('salamander') === '1') { document.body.classList.add('is-salamander'); }
    if (params.get('treefrog') === '1') { document.body.classList.add('is-treefrog'); }
    if (params.get('iguana') === '1') { document.body.classList.add('is-iguana'); }
    if (params.get('chameleon') === '1') { document.body.classList.add('is-chameleon'); }
    if (params.get('beardeddragon') === '1') { document.body.classList.add('is-beardeddragon'); }
    if (params.get('cobra') === '1') { document.body.classList.add('is-cobra'); }
    if (params.get('boa') === '1') { document.body.classList.add('is-boa'); }
    if (params.get('mamba') === '1') { document.body.classList.add('is-mamba'); }
    if (params.get('anaconda') === '1') { document.body.classList.add('is-anaconda'); }
    if (params.get('taipan') === '1') { document.body.classList.add('is-taipan'); }
    if (params.get('krait') === '1') { document.body.classList.add('is-krait'); }
    if (params.get('skink') === '1') { document.body.classList.add('is-skink'); }
    if (params.get('agama') === '1') { document.body.classList.add('is-agama'); }
    if (params.get('basilisk') === '1') { document.body.classList.add('is-basilisk'); }
    if (params.get('hornet') === '1') { document.body.classList.add('is-hornet'); }
    if (params.get('cicada') === '1') { document.body.classList.add('is-cicada'); }
    if (params.get('moth') === '1') { document.body.classList.add('is-moth'); }
    if (params.get('ladybug') === '1') { document.body.classList.add('is-ladybug'); }
    if (params.get('beetle') === '1') { document.body.classList.add('is-beetle'); }
    if (params.get('dragonfly') === '1') { document.body.classList.add('is-dragonfly'); }
    if (params.get('butterfly') === '1') { document.body.classList.add('is-butterfly'); }
    if (params.get('scorpion') === '1') { document.body.classList.add('is-scorpion'); }
    if (params.get('tarantula') === '1') { document.body.classList.add('is-tarantula'); }
    if (params.get('centipede') === '1') { document.body.classList.add('is-centipede'); }
    if (params.get('millipede') === '1') { document.body.classList.add('is-millipede'); }
    if (params.get('silkworm') === '1') { document.body.classList.add('is-silkworm'); }
    if (params.get('squid') === '1') { document.body.classList.add('is-squid'); }
    if (params.get('octopus') === '1') { document.body.classList.add('is-octopus'); }
    if (params.get('cuttlefish') === '1') { document.body.classList.add('is-cuttlefish'); }
    if (params.get('jellyfish') === '1') { document.body.classList.add('is-jellyfish'); }
    if (params.get('starfish') === '1') { document.body.classList.add('is-starfish'); }
    if (params.get('seahorse') === '1') { document.body.classList.add('is-seahorse'); }
    if (params.get('shrimp') === '1') { document.body.classList.add('is-shrimp'); }
    if (params.get('krill') === '1') { document.body.classList.add('is-krill'); }
    if (params.get('clam') === '1') { document.body.classList.add('is-clam'); }
    if (params.get('oyster') === '1') { document.body.classList.add('is-oyster'); }
    if (params.get('mussel') === '1') { document.body.classList.add('is-mussel'); }
    if (params.get('scallop') === '1') { document.body.classList.add('is-scallop'); }
    if (params.get('abalone') === '1') { document.body.classList.add('is-abalone'); }
    if (params.get('conch') === '1') { document.body.classList.add('is-conch'); }
    if (params.get('nautilus') === '1') { document.body.classList.add('is-nautilus'); }
    if (params.get('crab') === '1') { document.body.classList.add('is-crab'); }
    if (params.get('crayfish') === '1') { document.body.classList.add('is-crayfish'); }
    if (params.get('hermit') === '1') { document.body.classList.add('is-hermit'); }
    if (params.get('dolphin') === '1') { document.body.classList.add('is-dolphin'); }
    if (params.get('orca') === '1') { document.body.classList.add('is-orca'); }
    if (params.get('beluga') === '1') { document.body.classList.add('is-beluga'); }
    if (params.get('sealion') === '1') { document.body.classList.add('is-sealion'); }
    if (params.get('penguin') === '1') { document.body.classList.add('is-penguin'); }
    if (params.get('polarbear') === '1') { document.body.classList.add('is-polarbear'); }
    if (params.get('redfox') === '1') { document.body.classList.add('is-redfox'); }
    if (params.get('grizzly') === '1') { document.body.classList.add('is-grizzly'); }
    if (params.get('puma') === '1') { document.body.classList.add('is-puma'); }
    if (params.get('tiger') === '1') { document.body.classList.add('is-tiger'); }
    if (params.get('leopard') === '1') { document.body.classList.add('is-leopard'); }
    if (params.get('jaguar') === '1') { document.body.classList.add('is-jaguar'); }
    if (params.get('lion') === '1') { document.body.classList.add('is-lion'); }
    if (params.get('cheetah') === '1') { document.body.classList.add('is-cheetah'); }
    if (params.get('panther') === '1') { document.body.classList.add('is-panther'); }
    if (params.get('snowleopard') === '1') { document.body.classList.add('is-snowleopard'); }
    if (params.get('clouded') === '1') { document.body.classList.add('is-clouded'); }
    if (params.get('sphynx') === '1') { document.body.classList.add('is-sphynx'); }
    if (params.get('bengal') === '1') { document.body.classList.add('is-bengal'); }
    if (params.get('ragdoll') === '1') { document.body.classList.add('is-ragdoll'); }
    if (params.get('persian') === '1') { document.body.classList.add('is-persian'); }
    if (params.get('siamese') === '1') { document.body.classList.add('is-siamese'); }
    if (params.get('mainecoon') === '1') { document.body.classList.add('is-mainecoon'); }
    if (params.get('shorthair') === '1') { document.body.classList.add('is-shorthair'); }
    if (params.get('husky') === '1') { document.body.classList.add('is-husky'); }
    if (params.get('corgi') === '1') { document.body.classList.add('is-corgi'); }
    if (params.get('shiba') === '1') { document.body.classList.add('is-shiba'); }
    if (params.get('golden') === '1') { document.body.classList.add('is-golden'); }
    if (params.get('poodle') === '1') { document.body.classList.add('is-poodle'); }
    if (params.get('bulldog') === '1') { document.body.classList.add('is-bulldog'); }
    if (params.get('labrador') === '1') { document.body.classList.add('is-labrador'); }
    if (params.get('beagle') === '1') { document.body.classList.add('is-beagle'); }
    if (params.get('dachshund') === '1') { document.body.classList.add('is-dachshund'); }
    if (params.get('samoyed') === '1') { document.body.classList.add('is-samoyed'); }
    if (params.get('akita') === '1') { document.body.classList.add('is-akita'); }
    if (params.get('malamute') === '1') { document.body.classList.add('is-malamute'); }
    if (params.get('eagle') === '1') { document.body.classList.add('is-eagle'); }
    if (params.get('sparrow') === '1') { document.body.classList.add('is-sparrow'); }
    if (params.get('finch') === '1') { document.body.classList.add('is-finch'); }
    if (params.get('robin') === '1') { document.body.classList.add('is-robin'); }
    if (params.get('swallow') === '1') { document.body.classList.add('is-swallow'); }
    if (params.get('swift') === '1') { document.body.classList.add('is-swift'); }
    if (params.get('crow') === '1') { document.body.classList.add('is-crow'); }
    if (params.get('pigeon') === '1') { document.body.classList.add('is-pigeon'); }
    if (params.get('pelican') === '1') { document.body.classList.add('is-pelican'); }
    if (params.get('flamingo') === '1') { document.body.classList.add('is-flamingo'); }
    if (params.get('swan') === '1') { document.body.classList.add('is-swan'); }
    if (params.get('crane') === '1') { document.body.classList.add('is-crane'); }
    if (params.get('hummingbird') === '1') { document.body.classList.add('is-hummingbird'); }
    if (params.get('woodpecker') === '1') { document.body.classList.add('is-woodpecker'); }
    if (params.get('kingfisher') === '1') { document.body.classList.add('is-kingfisher'); }
    if (params.get('macaw') === '1') { document.body.classList.add('is-macaw'); }
    if (params.get('cockatoo') === '1') { document.body.classList.add('is-cockatoo'); }
    if (params.get('albatross') === '1') { document.body.classList.add('is-albatross'); }
    if (params.get('seagull') === '1') { document.body.classList.add('is-seagull'); }
    if (params.get('oriole') === '1') { document.body.classList.add('is-oriole'); }
    if (params.get('nightingale') === '1') { document.body.classList.add('is-nightingale'); }
    if (params.get('kite') === '1') { document.body.classList.add('is-kite'); }
    if (params.get('vulture') === '1') { document.body.classList.add('is-vulture'); }
    if (params.get('condor') === '1') { document.body.classList.add('is-condor'); }
    if (params.get('kiwi') === '1') { document.body.classList.add('is-kiwi'); }
    if (params.get('emu') === '1') { document.body.classList.add('is-emu'); }
    if (params.get('ostrich') === '1') { document.body.classList.add('is-ostrich'); }
    if (params.get('dodo') === '1') { document.body.classList.add('is-dodo'); }
    if (params.get('gannet') === '1') { document.body.classList.add('is-gannet'); }
    if (params.get('lyrebird') === '1') { document.body.classList.add('is-lyrebird'); }
    if (params.get('tanager') === '1') { document.body.classList.add('is-tanager'); }
    if (params.get('starling') === '1') { document.body.classList.add('is-starling'); }
    if (params.get('myna') === '1') { document.body.classList.add('is-myna'); }
    if (params.get('warbler') === '1') { document.body.classList.add('is-warbler'); }
    if (params.get('cardinal') === '1') { document.body.classList.add('is-cardinal'); }
    if (params.get('canary') === '1') { document.body.classList.add('is-canary'); }
    if (params.get('goldfinch') === '1') { document.body.classList.add('is-goldfinch'); }
    if (params.get('siskin') === '1') { document.body.classList.add('is-siskin'); }
    if (params.get('thrush') === '1') { document.body.classList.add('is-thrush'); }
    if (params.get('lark') === '1') { document.body.classList.add('is-lark'); }
    if (params.get('pipit') === '1') { document.body.classList.add('is-pipit'); }
    if (params.get('bunting') === '1') { document.body.classList.add('is-bunting'); }
    if (params.get('grosbeak') === '1') { document.body.classList.add('is-grosbeak'); }
    if (params.get('sparrowhawk') === '1') { document.body.classList.add('is-sparrowhawk'); }
    if (params.get('wagtail') === '1') { document.body.classList.add('is-wagtail'); }
    if (params.get('shrike') === '1') { document.body.classList.add('is-shrike'); }
    if (params.get('dipper') === '1') { document.body.classList.add('is-dipper'); }
    if (params.get('nuthatch') === '1') { document.body.classList.add('is-nuthatch'); }
    if (params.get('treecreeper') === '1') { document.body.classList.add('is-treecreeper'); }
    if (params.get('chickadee') === '1') { document.body.classList.add('is-chickadee'); }
    if (params.get('redstart') === '1') { document.body.classList.add('is-redstart'); }
    if (params.get('whinchat') === '1') { document.body.classList.add('is-whinchat'); }
    if (params.get('wheatear') === '1') { document.body.classList.add('is-wheatear'); }
    if (params.get('stonechat') === '1') { document.body.classList.add('is-stonechat'); }
    if (params.get('flycatcher') === '1') { document.body.classList.add('is-flycatcher'); }
    if (params.get('crossbill') === '1') { document.body.classList.add('is-crossbill'); }
    if (params.get('brambling') === '1') { document.body.classList.add('is-brambling'); }
    if (params.get('chaffinch') === '1') { document.body.classList.add('is-chaffinch'); }
    if (params.get('hawfinch') === '1') { document.body.classList.add('is-hawfinch'); }
    if (params.get('serin') === '1') { document.body.classList.add('is-serin'); }
    if (params.get('linnet') === '1') { document.body.classList.add('is-linnet'); }
    if (params.get('redpoll') === '1') { document.body.classList.add('is-redpoll'); }
    if (params.get('bullfinch') === '1') { document.body.classList.add('is-bullfinch'); }
    if (params.get('greenfinch') === '1') { document.body.classList.add('is-greenfinch'); }
    if (params.get('waxwing') === '1') { document.body.classList.add('is-waxwing'); }
    if (params.get('snowfinch') === '1') { document.body.classList.add('is-snowfinch'); }
    if (params.get('sandpiper') === '1') { document.body.classList.add('is-sandpiper'); }
    if (params.get('curlew') === '1') { document.body.classList.add('is-curlew'); }
    if (params.get('godwit') === '1') { document.body.classList.add('is-godwit'); }
    if (params.get('snipe') === '1') { document.body.classList.add('is-snipe'); }
    if (params.get('dunlin') === '1') { document.body.classList.add('is-dunlin'); }
    if (params.get('redshank') === '1') { document.body.classList.add('is-redshank'); }
    if (params.get('stint') === '1') { document.body.classList.add('is-stint'); }
    if (params.get('turnstone') === '1') { document.body.classList.add('is-turnstone'); }
    if (params.get('greenshank') === '1') { document.body.classList.add('is-greenshank'); }
    if (params.get('knot') === '1') { document.body.classList.add('is-knot'); }
    if (params.get('ruff') === '1') { document.body.classList.add('is-ruff'); }
    if (params.get('sanderling') === '1') { document.body.classList.add('is-sanderling'); }
    if (params.get('whimbrel') === '1') { document.body.classList.add('is-whimbrel'); }
    if (params.get('oystercatcher') === '1') { document.body.classList.add('is-oystercatcher'); }
    if (params.get('pratincole') === '1') { document.body.classList.add('is-pratincole'); }
    if (params.get('phalarope') === '1') { document.body.classList.add('is-phalarope'); }
    if (params.get('courser') === '1') { document.body.classList.add('is-courser'); }
    if (params.get('coot') === '1') { document.body.classList.add('is-coot'); }
    if (params.get('gallinule') === '1') { document.body.classList.add('is-gallinule'); }
    if (params.get('moorhen') === '1') { document.body.classList.add('is-moorhen'); }
    if (params.get('crake') === '1') { document.body.classList.add('is-crake'); }
    if (params.get('corncrake') === '1') { document.body.classList.add('is-corncrake'); }
    if (params.get('swamphen') === '1') { document.body.classList.add('is-swamphen'); }
    if (params.get('grebe') === '1') { document.body.classList.add('is-grebe'); }
    if (params.get('dabchick') === '1') { document.body.classList.add('is-dabchick'); }
    if (params.get('loon') === '1') { document.body.classList.add('is-loon'); }
    if (params.get('auk') === '1') { document.body.classList.add('is-auk'); }
    if (params.get('murre') === '1') { document.body.classList.add('is-murre'); }
    if (params.get('guillemot') === '1') { document.body.classList.add('is-guillemot'); }
    if (params.get('razorbill') === '1') { document.body.classList.add('is-razorbill'); }
    if (params.get('auklet') === '1') { document.body.classList.add('is-auklet'); }
    if (params.get('shearwater') === '1') { document.body.classList.add('is-shearwater'); }
    if (params.get('petrel') === '1') { document.body.classList.add('is-petrel'); }
    if (params.get('skua') === '1') { document.body.classList.add('is-skua'); }
    if (params.get('jaeger') === '1') { document.body.classList.add('is-jaeger'); }
    if (params.get('tropicbird') === '1') { document.body.classList.add('is-tropicbird'); }
    if (params.get('frigatebird') === '1') { document.body.classList.add('is-frigatebird'); }
    if (params.get('booby') === '1') { document.body.classList.add('is-booby'); }
    if (params.get('noddy') === '1') { document.body.classList.add('is-noddy'); }
    if (params.get('kittiwake') === '1') { document.body.classList.add('is-kittiwake'); }
    if (params.get('sula') === '1') { document.body.classList.add('is-sula'); }
    if (params.get('prion') === '1') { document.body.classList.add('is-prion'); }
    if (params.get('chanterelle') === '1') { document.body.classList.add('is-chanterelle'); }
    if (params.get('porcini') === '1') { document.body.classList.add('is-porcini'); }
    if (params.get('shiitake') === '1') { document.body.classList.add('is-shiitake'); }
    if (params.get('truffle') === '1') { document.body.classList.add('is-truffle'); }
    if (params.get('enoki') === '1') { document.body.classList.add('is-enoki'); }
    if (params.get('matsutake') === '1') { document.body.classList.add('is-matsutake'); }
    if (params.get('amanita') === '1') { document.body.classList.add('is-amanita'); }
    if (params.get('reishi') === '1') { document.body.classList.add('is-reishi'); }
    if (params.get('portobello') === '1') { document.body.classList.add('is-portobello'); }
    if (params.get('bolete') === '1') { document.body.classList.add('is-bolete'); }
    if (params.get('puffball') === '1') { document.body.classList.add('is-puffball'); }
    if (params.get('russula') === '1') { document.body.classList.add('is-russula'); }
    if (params.get('lionsmane') === '1') { document.body.classList.add('is-lionsmane'); }
    if (params.get('woodblewit') === '1') { document.body.classList.add('is-woodblewit'); }
    if (params.get('cremini') === '1') { document.body.classList.add('is-cremini'); }
    if (params.get('saffronmilkcap') === '1') { document.body.classList.add('is-saffronmilkcap'); }
    if (params.get('kingoyster') === '1') { document.body.classList.add('is-kingoyster'); }
    if (params.get('shimeji') === '1') { document.body.classList.add('is-shimeji'); }
    if (params.get('nameko') === '1') { document.body.classList.add('is-nameko'); }
    if (params.get('maitake') === '1') { document.body.classList.add('is-maitake'); }
    if (params.get('woodear') === '1') { document.body.classList.add('is-woodear'); }
    if (params.get('tremella') === '1') { document.body.classList.add('is-tremella'); }
    if (params.get('cordyceps') === '1') { document.body.classList.add('is-cordyceps'); }
    if (params.get('chaga') === '1') { document.body.classList.add('is-chaga'); }
    if (params.get('cauliflower') === '1') { document.body.classList.add('is-cauliflower'); }
    if (params.get('winecap') === '1') { document.body.classList.add('is-winecap'); }
    if (params.get('parasol') === '1') { document.body.classList.add('is-parasol'); }
    if (params.get('dryad') === '1') { document.body.classList.add('is-dryad'); }
    if (params.get('gypsy') === '1') { document.body.classList.add('is-gypsy'); }
    if (params.get('webcap') === '1') { document.body.classList.add('is-webcap'); }
    if (params.get('milkcap') === '1') { document.body.classList.add('is-milkcap'); }
    if (params.get('fieldmushroom') === '1') { document.body.classList.add('is-fieldmushroom'); }
    if (params.get('blacktrumpet') === '1') { document.body.classList.add('is-blacktrumpet'); }
    if (params.get('reindeermoss') === '1') { document.body.classList.add('is-reindeermoss'); }
    if (params.get('oldmansbeard') === '1') { document.body.classList.add('is-oldmansbeard'); }
    if (params.get('britishsoldiers') === '1') { document.body.classList.add('is-britishsoldiers'); }
    if (params.get('pixiecups') === '1') { document.body.classList.add('is-pixiecups'); }
    if (params.get('mapdust') === '1') { document.body.classList.add('is-mapdust'); }
    if (params.get('rosette') === '1') { document.body.classList.add('is-rosette'); }
    if (params.get('wolflichen') === '1') { document.body.classList.add('is-wolflichen'); }
    if (params.get('sunburst') === '1') { document.body.classList.add('is-sunburst'); }
    if (params.get('tarspots') === '1') { document.body.classList.add('is-tarspots'); }
    if (params.get('bloodstain') === '1') { document.body.classList.add('is-bloodstain'); }
    if (params.get('firedot') === '1') { document.body.classList.add('is-firedot'); }
    if (params.get('lungwort') === '1') { document.body.classList.add('is-lungwort'); }
    if (params.get('rockposy') === '1') { document.body.classList.add('is-rockposy'); }
    if (params.get('golddust') === '1') { document.body.classList.add('is-golddust'); }
    if (params.get('blackeye') === '1') { document.body.classList.add('is-blackeye'); }
    if (params.get('greenshield') === '1') { document.body.classList.add('is-greenshield'); }
    if (params.get('waxpaper') === '1') { document.body.classList.add('is-waxpaper'); }
    if (params.get('cumberland') === '1') { document.body.classList.add('is-cumberland'); }
    if (params.get('foamlichen') === '1') { document.body.classList.add('is-foamlichen'); }
    if (params.get('pepperedrock') === '1') { document.body.classList.add('is-pepperedrock'); }
    if (params.get('rimlichen') === '1') { document.body.classList.add('is-rimlichen'); }
    if (params.get('haircap') === '1') { document.body.classList.add('is-haircap'); }
    if (params.get('sphagnum') === '1') { document.body.classList.add('is-sphagnum'); }
    if (params.get('cushionmoss') === '1') { document.body.classList.add('is-cushionmoss'); }
    if (params.get('fernmoss') === '1') { document.body.classList.add('is-fernmoss'); }
    if (params.get('spoonmoss') === '1') { document.body.classList.add('is-spoonmoss'); }
    if (params.get('broommoss') === '1') { document.body.classList.add('is-broommoss'); }
    if (params.get('stairstep') === '1') { document.body.classList.add('is-stairstep'); }
    if (params.get('rockmoss') === '1') { document.body.classList.add('is-rockmoss'); }
    if (params.get('junipermoss') === '1') { document.body.classList.add('is-junipermoss'); }
    if (params.get('swanneck') === '1') { document.body.classList.add('is-swanneck'); }
    if (params.get('pincushion') === '1') { document.body.classList.add('is-pincushion'); }
    if (params.get('watermoss') === '1') { document.body.classList.add('is-watermoss'); }
    if (params.get('silkywall') === '1') { document.body.classList.add('is-silkywall'); }
    if (params.get('feathermoss') === '1') { document.body.classList.add('is-feathermoss'); }
    if (params.get('cordmoss') === '1') { document.body.classList.add('is-cordmoss'); }
    if (params.get('applemoss') === '1') { document.body.classList.add('is-applemoss'); }
    if (params.get('bogmoss') === '1') { document.body.classList.add('is-bogmoss'); }
    if (params.get('coppermoss') === '1') { document.body.classList.add('is-coppermoss'); }
    if (params.get('maidenhair') === '1') { document.body.classList.add('is-maidenhair'); }
    if (params.get('hartstongue') === '1') { document.body.classList.add('is-hartstongue'); }
    if (params.get('polypody') === '1') { document.body.classList.add('is-polypody'); }
    if (params.get('spleenwort') === '1') { document.body.classList.add('is-spleenwort'); }
    if (params.get('shieldfern') === '1') { document.body.classList.add('is-shieldfern'); }
    if (params.get('oakfern') === '1') { document.body.classList.add('is-oakfern'); }
    if (params.get('ladyfern') === '1') { document.body.classList.add('is-ladyfern'); }
    if (params.get('malefern') === '1') { document.body.classList.add('is-malefern'); }
    if (params.get('hollyfern') === '1') { document.body.classList.add('is-hollyfern'); }
    if (params.get('sensitivefern') === '1') { document.body.classList.add('is-sensitivefern'); }
    if (params.get('cinnamonfern') === '1') { document.body.classList.add('is-cinnamonfern'); }
    if (params.get('royalfern') === '1') { document.body.classList.add('is-royalfern'); }
    if (params.get('brake') === '1') { document.body.classList.add('is-brake'); }
    if (params.get('chainfern') === '1') { document.body.classList.add('is-chainfern'); }
    if (params.get('adderstongue') === '1') { document.body.classList.add('is-adderstongue'); }
    if (params.get('moonwort') === '1') { document.body.classList.add('is-moonwort'); }
    if (params.get('grapefern') === '1') { document.body.classList.add('is-grapefern'); }
    if (params.get('rattlesnake') === '1') { document.body.classList.add('is-rattlesnake'); }
    if (params.get('staghorn') === '1') { document.body.classList.add('is-staghorn'); }
    if (params.get('elkhorn') === '1') { document.body.classList.add('is-elkhorn'); }
    if (params.get('birdsnest') === '1') { document.body.classList.add('is-birdsnest'); }
    if (params.get('swordfern') === '1') { document.body.classList.add('is-swordfern'); }
    if (params.get('bostonfern') === '1') { document.body.classList.add('is-bostonfern'); }
    if (params.get('rabbitfoot') === '1') { document.body.classList.add('is-rabbitfoot'); }
    if (params.get('buttonfern') === '1') { document.body.classList.add('is-buttonfern'); }
    if (params.get('cliffbrake') === '1') { document.body.classList.add('is-cliffbrake'); }
    if (params.get('lacefern') === '1') { document.body.classList.add('is-lacefern'); }
    if (params.get('silverfern') === '1') { document.body.classList.add('is-silverfern'); }
    if (params.get('treefern') === '1') { document.body.classList.add('is-treefern'); }
    if (params.get('filmyfern') === '1') { document.body.classList.add('is-filmyfern'); }
    if (params.get('whiskfern') === '1') { document.body.classList.add('is-whiskfern'); }
    if (params.get('quillwort') === '1') { document.body.classList.add('is-quillwort'); }
    if (params.get('clubmoss') === '1') { document.body.classList.add('is-clubmoss'); }
    if (params.get('horsetail') === '1') { document.body.classList.add('is-horsetail'); }
    if (params.get('scouringrush') === '1') { document.body.classList.add('is-scouringrush'); }
    if (params.get('spikemoss') === '1') { document.body.classList.add('is-spikemoss'); }
    if (params.get('ginkgo') === '1') { document.body.classList.add('is-ginkgo'); }
    if (params.get('cycad') === '1') { document.body.classList.add('is-cycad'); }
    if (params.get('monkeypuzzle') === '1') { document.body.classList.add('is-monkeypuzzle'); }
    if (params.get('sequoia') === '1') { document.body.classList.add('is-sequoia'); }
    if (params.get('redwood') === '1') { document.body.classList.add('is-redwood'); }
    if (params.get('bristlecone') === '1') { document.body.classList.add('is-bristlecone'); }
    if (params.get('dawnredwood') === '1') { document.body.classList.add('is-dawnredwood'); }
    if (params.get('hemlock') === '1') { document.body.classList.add('is-hemlock'); }
    if (params.get('larch') === '1') { document.body.classList.add('is-larch'); }
    if (params.get('douglasfir') === '1') { document.body.classList.add('is-douglasfir'); }
    if (params.get('ponderosa') === '1') { document.body.classList.add('is-ponderosa'); }
    if (params.get('yewtree') === '1') { document.body.classList.add('is-yewtree'); }
    if (params.get('fir') === '1') { document.body.classList.add('is-fir'); }
    if (params.get('blackpine') === '1') { document.body.classList.add('is-blackpine'); }
    if (params.get('scotspine') === '1') { document.body.classList.add('is-scotspine'); }
    if (params.get('whitepine') === '1') { document.body.classList.add('is-whitepine'); }
    if (params.get('stonepine') === '1') { document.body.classList.add('is-stonepine'); }
    if (params.get('pinon') === '1') { document.body.classList.add('is-pinon'); }
    if (params.get('oak') === '1') { document.body.classList.add('is-oak'); }
    if (params.get('elm') === '1') { document.body.classList.add('is-elm'); }
    if (params.get('beech') === '1') { document.body.classList.add('is-beech'); }
    if (params.get('alder') === '1') { document.body.classList.add('is-alder'); }
    if (params.get('aspen') === '1') { document.body.classList.add('is-aspen'); }
    if (params.get('poplar') === '1') { document.body.classList.add('is-poplar'); }
    if (params.get('hazel') === '1') { document.body.classList.add('is-hazel'); }
    if (params.get('hornbeam') === '1') { document.body.classList.add('is-hornbeam'); }
    if (params.get('linden') === '1') { document.body.classList.add('is-linden'); }
    if (params.get('rowan') === '1') { document.body.classList.add('is-rowan'); }
    if (params.get('hawthorn') === '1') { document.body.classList.add('is-hawthorn'); }
    if (params.get('holly') === '1') { document.body.classList.add('is-holly'); }
    if (params.get('magnolia') === '1') { document.body.classList.add('is-magnolia'); }
    if (params.get('dogwood') === '1') { document.body.classList.add('is-dogwood'); }
    if (params.get('redbud') === '1') { document.body.classList.add('is-redbud'); }
    if (params.get('catalpa') === '1') { document.body.classList.add('is-catalpa'); }
    if (params.get('sweetgum') === '1') { document.body.classList.add('is-sweetgum'); }
    if (params.get('hackberry') === '1') { document.body.classList.add('is-hackberry'); }
    if (params.get('elder') === '1') { document.body.classList.add('is-elder'); }
    if (params.get('sumac') === '1') { document.body.classList.add('is-sumac'); }
    if (params.get('buckeye') === '1') { document.body.classList.add('is-buckeye'); }
    if (params.get('tupelo') === '1') { document.body.classList.add('is-tupelo'); }
    if (params.get('locust') === '1') { document.body.classList.add('is-locust'); }
    if (params.get('smoketree') === '1') { document.body.classList.add('is-smoketree'); }
    if (params.get('euonymus') === '1') { document.body.classList.add('is-euonymus'); }
    if (params.get('figtree') === '1') { document.body.classList.add('is-figtree'); }
    if (params.get('plane') === '1') { document.body.classList.add('is-plane'); }
    if (params.get('baobab') === '1') { document.body.classList.add('is-baobab'); }
    if (params.get('kapok') === '1') { document.body.classList.add('is-kapok'); }
    if (params.get('paulownia') === '1') { document.body.classList.add('is-paulownia'); }
    if (params.get('ailanthus') === '1') { document.body.classList.add('is-ailanthus'); }
    if (params.get('toon') === '1') { document.body.classList.add('is-toon'); }
    if (params.get('chinaberry') === '1') { document.body.classList.add('is-chinaberry'); }
    if (params.get('neem') === '1') { document.body.classList.add('is-neem'); }
    if (params.get('camphor') === '1') { document.body.classList.add('is-camphor'); }
    if (params.get('goldenrain') === '1') { document.body.classList.add('is-goldenrain'); }
    if (params.get('tallowtree') === '1') { document.body.classList.add('is-tallowtree'); }
    if (params.get('osage') === '1') { document.body.classList.add('is-osage'); }
    if (params.get('soapberry') === '1') { document.body.classList.add('is-soapberry'); }
    if (params.get('fringetree') === '1') { document.body.classList.add('is-fringetree'); }
    if (params.get('katsura') === '1') { document.body.classList.add('is-katsura'); }
    if (params.get('styrax') === '1') { document.body.classList.add('is-styrax'); }
    if (params.get('ironwood') === '1') { document.body.classList.add('is-ironwood'); }
    if (params.get('serviceberry') === '1') { document.body.classList.add('is-serviceberry'); }
    if (params.get('pawpaw') === '1') { document.body.classList.add('is-pawpaw'); }
    if (params.get('hophornbeam') === '1') { document.body.classList.add('is-hophornbeam'); }
    if (params.get('musclewood') === '1') { document.body.classList.add('is-musclewood'); }
    if (params.get('yellowwood') === '1') { document.body.classList.add('is-yellowwood'); }
    if (params.get('silverbell') === '1') { document.body.classList.add('is-silverbell'); }
    if (params.get('snowbell') === '1') { document.body.classList.add('is-snowbell'); }
    if (params.get('persianironwood') === '1') { document.body.classList.add('is-persianironwood'); }
    if (params.get('hydrangea') === '1') { document.body.classList.add('is-hydrangea'); }
    if (params.get('rhododendron') === '1') { document.body.classList.add('is-rhododendron'); }
    if (params.get('azalea') === '1') { document.body.classList.add('is-azalea'); }
    if (params.get('camellia') === '1') { document.body.classList.add('is-camellia'); }
    if (params.get('gardenia') === '1') { document.body.classList.add('is-gardenia'); }
    if (params.get('hibiscus') === '1') { document.body.classList.add('is-hibiscus'); }
    if (params.get('jasmine') === '1') { document.body.classList.add('is-jasmine'); }
    if (params.get('bougainvillea') === '1') { document.body.classList.add('is-bougainvillea'); }
    if (params.get('clematis') === '1') { document.body.classList.add('is-clematis'); }
    if (params.get('ivy') === '1') { document.body.classList.add('is-ivy'); }
    if (params.get('honeysuckle') === '1') { document.body.classList.add('is-honeysuckle'); }
    if (params.get('osmanthus') === '1') { document.body.classList.add('is-osmanthus'); }
    if (params.get('peony') === '1') { document.body.classList.add('is-peony'); }
    if (params.get('dahlia') === '1') { document.body.classList.add('is-dahlia'); }
    if (params.get('kerria') === '1') { document.body.classList.add('is-kerria'); }
    if (params.get('forsythia') === '1') { document.body.classList.add('is-forsythia'); }
    if (params.get('spiraea') === '1') { document.body.classList.add('is-spiraea'); }
    if (params.get('weigela') === '1') { document.body.classList.add('is-weigela'); }
    if (params.get('mockorange') === '1') { document.body.classList.add('is-mockorange'); }
    if (params.get('deutzia') === '1') { document.body.classList.add('is-deutzia'); }
    if (params.get('barberry') === '1') { document.body.classList.add('is-barberry'); }
    if (params.get('pyracantha') === '1') { document.body.classList.add('is-pyracantha'); }
    if (params.get('cotoneaster') === '1') { document.body.classList.add('is-cotoneaster'); }
    if (params.get('viburnum') === '1') { document.body.classList.add('is-viburnum'); }
    if (params.get('abelia') === '1') { document.body.classList.add('is-abelia'); }
    if (params.get('nandina') === '1') { document.body.classList.add('is-nandina'); }
    if (params.get('pieris') === '1') { document.body.classList.add('is-pieris'); }
    if (params.get('beautyberry') === '1') { document.body.classList.add('is-beautyberry'); }
    if (params.get('snowberry') === '1') { document.body.classList.add('is-snowberry'); }
    if (params.get('winterberry') === '1') { document.body.classList.add('is-winterberry'); }
    if (params.get('beautybush') === '1') { document.body.classList.add('is-beautybush'); }
    if (params.get('ninebark') === '1') { document.body.classList.add('is-ninebark'); }
    if (params.get('aronia') === '1') { document.body.classList.add('is-aronia'); }
    if (params.get('fuchsia') === '1') { document.body.classList.add('is-fuchsia'); }
    if (params.get('oleander') === '1') { document.body.classList.add('is-oleander'); }
    if (params.get('buddleia') === '1') { document.body.classList.add('is-buddleia'); }
    if (params.get('gorse') === '1') { document.body.classList.add('is-gorse'); }
    if (params.get('broom') === '1') { document.body.classList.add('is-broom'); }
    if (params.get('lantana') === '1') { document.body.classList.add('is-lantana'); }
    if (params.get('hypericum') === '1') { document.body.classList.add('is-hypericum'); }
    if (params.get('daphne') === '1') { document.body.classList.add('is-daphne'); }
    if (params.get('potentilla') === '1') { document.body.classList.add('is-potentilla'); }
    if (params.get('mahonia') === '1') { document.body.classList.add('is-mahonia'); }
    if (params.get('photinia') === '1') { document.body.classList.add('is-photinia'); }
    if (params.get('aucuba') === '1') { document.body.classList.add('is-aucuba'); }
    if (params.get('skimmia') === '1') { document.body.classList.add('is-skimmia'); }
    if (params.get('hebe') === '1') { document.body.classList.add('is-hebe'); }
    if (params.get('escallonia') === '1') { document.body.classList.add('is-escallonia'); }
    if (params.get('pittosporum') === '1') { document.body.classList.add('is-pittosporum'); }
    if (params.get('choisya') === '1') { document.body.classList.add('is-choisya'); }
    if (params.get('sarcococca') === '1') { document.body.classList.add('is-sarcococca'); }
    if (params.get('kalmia') === '1') { document.body.classList.add('is-kalmia'); }
    if (params.get('leucothoe') === '1') { document.body.classList.add('is-leucothoe'); }
    if (params.get('andromeda') === '1') { document.body.classList.add('is-andromeda'); }
    if (params.get('rosemary') === '1') { document.body.classList.add('is-rosemary'); }
    if (params.get('oregano') === '1') { document.body.classList.add('is-oregano'); }
    if (params.get('tarragon') === '1') { document.body.classList.add('is-tarragon'); }
    if (params.get('chervil') === '1') { document.body.classList.add('is-chervil'); }
    if (params.get('lovage') === '1') { document.body.classList.add('is-lovage'); }
    if (params.get('marjoram') === '1') { document.body.classList.add('is-marjoram'); }
    if (params.get('hyssop') === '1') { document.body.classList.add('is-hyssop'); }
    if (params.get('savory') === '1') { document.body.classList.add('is-savory'); }
    if (params.get('epazote') === '1') { document.body.classList.add('is-epazote'); }
    if (params.get('caraway') === '1') { document.body.classList.add('is-caraway'); }
    if (params.get('cardamom') === '1') { document.body.classList.add('is-cardamom'); }
    if (params.get('turmeric') === '1') { document.body.classList.add('is-turmeric'); }
    if (params.get('anise') === '1') { document.body.classList.add('is-anise'); }
    if (params.get('fenugreek') === '1') { document.body.classList.add('is-fenugreek'); }
    if (params.get('allspice') === '1') { document.body.classList.add('is-allspice'); }
    if (params.get('clove') === '1') { document.body.classList.add('is-clove'); }
    if (params.get('vanilla') === '1') { document.body.classList.add('is-vanilla'); }
    if (params.get('galangal') === '1') { document.body.classList.add('is-galangal'); }
    if (params.get('lemongrass') === '1') { document.body.classList.add('is-lemongrass'); }
    if (params.get('pandan') === '1') { document.body.classList.add('is-pandan'); }
    if (params.get('kaffir') === '1') { document.body.classList.add('is-kaffir'); }
    if (params.get('quinoa') === '1') { document.body.classList.add('is-quinoa'); }
    if (params.get('amaranth') === '1') { document.body.classList.add('is-amaranth'); }
    if (params.get('spelt') === '1') { document.body.classList.add('is-spelt'); }
    if (params.get('farro') === '1') { document.body.classList.add('is-farro'); }
    if (params.get('teff') === '1') { document.body.classList.add('is-teff'); }
    if (params.get('buckwheat') === '1') { document.body.classList.add('is-buckwheat'); }
    if (params.get('sorghum') === '1') { document.body.classList.add('is-sorghum'); }
    if (params.get('einkorn') === '1') { document.body.classList.add('is-einkorn'); }
    if (params.get('kamut') === '1') { document.body.classList.add('is-kamut'); }
    if (params.get('freekeh') === '1') { document.body.classList.add('is-freekeh'); }
    if (params.get('bulgur') === '1') { document.body.classList.add('is-bulgur'); }
    if (params.get('couscous') === '1') { document.body.classList.add('is-couscous'); }
    if (params.get('chickpea') === '1') { document.body.classList.add('is-chickpea'); }
    if (params.get('lentil') === '1') { document.body.classList.add('is-lentil'); }
    if (params.get('adzuki') === '1') { document.body.classList.add('is-adzuki'); }
    if (params.get('blackbean') === '1') { document.body.classList.add('is-blackbean'); }
    if (params.get('kidneybean') === '1') { document.body.classList.add('is-kidneybean'); }
    if (params.get('mungbean') === '1') { document.body.classList.add('is-mungbean'); }
    if (params.get('navybean') === '1') { document.body.classList.add('is-navybean'); }
    if (params.get('pinto') === '1') { document.body.classList.add('is-pinto'); }
    if (params.get('limabean') === '1') { document.body.classList.add('is-limabean'); }
    if (params.get('fava') === '1') { document.body.classList.add('is-fava'); }
    if (params.get('edamame') === '1') { document.body.classList.add('is-edamame'); }
    if (params.get('cannellini') === '1') { document.body.classList.add('is-cannellini'); }
    if (params.get('almond') === '1') { document.body.classList.add('is-almond'); }
    if (params.get('cashew') === '1') { document.body.classList.add('is-cashew'); }
    if (params.get('pecan') === '1') { document.body.classList.add('is-pecan'); }
    if (params.get('macadamia') === '1') { document.body.classList.add('is-macadamia'); }
    if (params.get('brazilnut') === '1') { document.body.classList.add('is-brazilnut'); }
    if (params.get('pinenut') === '1') { document.body.classList.add('is-pinenut'); }
    if (params.get('guava') === '1') { document.body.classList.add('is-guava'); }
    if (params.get('papaya') === '1') { document.body.classList.add('is-papaya'); }
    if (params.get('dragonfruit') === '1') { document.body.classList.add('is-dragonfruit'); }
    if (params.get('mangosteen') === '1') { document.body.classList.add('is-mangosteen'); }
    if (params.get('rambutan') === '1') { document.body.classList.add('is-rambutan'); }
    if (params.get('durian') === '1') { document.body.classList.add('is-durian'); }
    if (params.get('kumquat') === '1') { document.body.classList.add('is-kumquat'); }
    if (params.get('clementine') === '1') { document.body.classList.add('is-clementine'); }
    if (params.get('satsuma') === '1') { document.body.classList.add('is-satsuma'); }
    if (params.get('gooseberry') === '1') { document.body.classList.add('is-gooseberry'); }
    if (params.get('cloudberry') === '1') { document.body.classList.add('is-cloudberry'); }
    if (params.get('lingonberry') === '1') { document.body.classList.add('is-lingonberry'); }
    if (params.get('elderberry') === '1') { document.body.classList.add('is-elderberry'); }
    if (params.get('acerola') === '1') { document.body.classList.add('is-acerola'); }
    if (params.get('seabuckthorn') === '1') { document.body.classList.add('is-seabuckthorn'); }
    if (params.get('artichoke') === '1') { document.body.classList.add('is-artichoke'); }
    if (params.get('kohlrabi') === '1') { document.body.classList.add('is-kohlrabi'); }
    if (params.get('rutabaga') === '1') { document.body.classList.add('is-rutabaga'); }
    if (params.get('parsnip') === '1') { document.body.classList.add('is-parsnip'); }
    if (params.get('celeriac') === '1') { document.body.classList.add('is-celeriac'); }
    if (params.get('jicama') === '1') { document.body.classList.add('is-jicama'); }
    if (params.get('arugula') === '1') { document.body.classList.add('is-arugula'); }
    if (params.get('radicchio') === '1') { document.body.classList.add('is-radicchio'); }
    if (params.get('mizuna') === '1') { document.body.classList.add('is-mizuna'); }
    if (params.get('endive') === '1') { document.body.classList.add('is-endive'); }
    if (params.get('tatsoi') === '1') { document.body.classList.add('is-tatsoi'); }
    if (params.get('escarole') === '1') { document.body.classList.add('is-escarole'); }
    if (params.get('kabocha') === '1') { document.body.classList.add('is-kabocha'); }
    if (params.get('butternut') === '1') { document.body.classList.add('is-butternut'); }
    if (params.get('delicata') === '1') { document.body.classList.add('is-delicata'); }
    if (params.get('honeydew') === '1') { document.body.classList.add('is-honeydew'); }
    if (params.get('cantaloupe') === '1') { document.body.classList.add('is-cantaloupe'); }
    if (params.get('galia') === '1') { document.body.classList.add('is-galia'); }
    if (params.get('poblano') === '1') { document.body.classList.add('is-poblano'); }
    if (params.get('jalapeno') === '1') { document.body.classList.add('is-jalapeno'); }
    if (params.get('habanero') === '1') { document.body.classList.add('is-habanero'); }
    if (params.get('serrano') === '1') { document.body.classList.add('is-serrano'); }
    if (params.get('shishito') === '1') { document.body.classList.add('is-shishito'); }
    if (params.get('scotchbonnet') === '1') { document.body.classList.add('is-scotchbonnet'); }
    if (params.get('shallot') === '1') { document.body.classList.add('is-shallot'); }
    if (params.get('chive') === '1') { document.body.classList.add('is-chive'); }
    if (params.get('ramp') === '1') { document.body.classList.add('is-ramp'); }
    if (params.get('pecorino') === '1') { document.body.classList.add('is-pecorino'); }
    if (params.get('gouda') === '1') { document.body.classList.add('is-gouda'); }
    if (params.get('brie') === '1') { document.body.classList.add('is-brie'); }
    if (params.get('gruyere') === '1') { document.body.classList.add('is-gruyere'); }
    if (params.get('manchego') === '1') { document.body.classList.add('is-manchego'); }
    if (params.get('camembert') === '1') { document.body.classList.add('is-camembert'); }
    if (params.get('brioche') === '1') { document.body.classList.add('is-brioche'); }
    if (params.get('focaccia') === '1') { document.body.classList.add('is-focaccia'); }
    if (params.get('ciabatta') === '1') { document.body.classList.add('is-ciabatta'); }
    if (params.get('sourdough') === '1') { document.body.classList.add('is-sourdough'); }
    if (params.get('pretzel') === '1') { document.body.classList.add('is-pretzel'); }
    if (params.get('baguette') === '1') { document.body.classList.add('is-baguette'); }
    if (params.get('uni') === '1') { document.body.classList.add('is-uni'); }
    if (params.get('ikura') === '1') { document.body.classList.add('is-ikura'); }
    if (params.get('tobiko') === '1') { document.body.classList.add('is-tobiko'); }
    if (params.get('unagi') === '1') { document.body.classList.add('is-unagi'); }
    if (params.get('hamachi') === '1') { document.body.classList.add('is-hamachi'); }
    if (params.get('maguro') === '1') { document.body.classList.add('is-maguro'); }
    if (params.get('umeshu') === '1') { document.body.classList.add('is-umeshu'); }
    if (params.get('soju') === '1') { document.body.classList.add('is-soju'); }
    if (params.get('makgeolli') === '1') { document.body.classList.add('is-makgeolli'); }
    if (params.get('baijiu') === '1') { document.body.classList.add('is-baijiu'); }
    if (params.get('awamori') === '1') { document.body.classList.add('is-awamori'); }
    if (params.get('shochu') === '1') { document.body.classList.add('is-shochu'); }
    if (params.get('whiskey') === '1') { document.body.classList.add('is-whiskey'); }
    if (params.get('brandy') === '1') { document.body.classList.add('is-brandy'); }
    if (params.get('rum') === '1') { document.body.classList.add('is-rum'); }
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
      var skins = ['pig', 'charge', 'meter', 'pixel', 'neon', 'mono', 'paper', 'term', 'ecg', 'wave', 'therm', 'receipt', 'sand', 'dial', 'trail', 'metro', 'lift', 'eclipse', 'flap', 'vinyl', 'const', 'plant', 'shadow', 'tide', 'rocket', 'balloon', 'aqua', 'kite', 'falls', 'toast', 'ember', 'cable', 'hive', 'lantern', 'abacus', 'ferris', 'globe', 'seismo', 'terrace', 'crane', 'slots', 'domino', 'match', 'popcorn', 'tetris', 'fishing', 'pottery', 'sparkler', 'origami', 'typewriter', 'aurora', 'catnap', 'prayer', 'piano', 'firejar', 'lava', 'knit', 'juice', 'rainbow', 'bonsai', 'vending', 'lighthouse', 'treadmill', 'oven', 'wishing', 'sandcastle', 'inkwash', 'candle', 'swing', 'gacha', 'surf', 'scope', 'bottle', 'pinball', 'lotus', 'ramen', 'gear', 'invader', 'mine', 'puppet', 'sprout', 'hop', 'mahjong', 'scale', 'tearoff', 'windmill', 'grill', 'dock', 'compass', 'sub', 'icicle', 'snowman', 'latte', 'train', 'ivy', 'forge', 'tanghulu', 'dragonboat', 'mill', 'laundry', 'muyu', 'sushi', 'mallow', 'top', 'fountain', 'sled', 'kaleido', 'gongfu', 'jigsaw', 'scroll', 'parasol', 'steamer', 'hotpot', 'waterwheel', 'firecrack', 'sugarart', 'sling', 'bigdrum', 'faceoff', 'liondance', 'chestnut', 'icesculpt', 'zoetrope', 'stoneskip', 'polaroid', 'seesaw', 'neontube', 'bubble', 'pizza', 'sugarman', 'skylantern', 'coin', 'sandart', 'rattle', 'ringtoss', 'inkjet', 'gaiwan', 'diabolo', 'stitch', 'tangram', 'knot', 'rubbing', 'loom', 'mosaic', 'seal', 'gong', 'bianzhong', 'zither', 'grind', 'copter', 'papercut', 'hula', 'rubik', 'nesting', 'curling', 'juggle', 'yoyo', 'pinwheel', 'marble', 'omikuji', 'darts', 'pinata', 'kendama', 'vaultbox', 'stilts', 'jumprope', 'plate', 'tightrope', 'shateki', 'fukuwarai', 'kagami', 'hagoita', 'shogi', 'karuta', 'suika', 'sumo', 'goldfish', 'noren', 'volcano', 'abyss', 'chrysalis', 'oyster', 'antfarm', 'sunflower', 'metronome', 'spiral', 'circuit', 'drawbridge', 'weathervane', 'bigben', 'telescope', 'aquarium', 'terrarium', 'nest', 'sourdough', 'ferment', 'archery', 'basketball', 'pendulum', 'zipline', 'carousel', 'ski', 'firefly', 'moonphase', 'teapot', 'spiderweb', 'snail', 'hummingbird', 'cicada', 'dam', 'potofgold', 'koipond', 'zengarden', 'orchard', 'constellation', 'solarsystem', 'bamboo', 'geode', 'mandala', 'catapult', 'sakura', 'incense', 'pagoda', 'radar', 'rover', 'iceberg', 'comet', 'nebula', 'tornado', 'rose', 'dandelion', 'chess', 'sunrise', 'moonrise', 'billiards', 'golf', 'bowling', 'meadow', 'geyser', 'vineyard', 'reef', 'fireplace', 'onsen', 'iceskate', 'jukebox', 'musicbox', 'bath', 'dive', 'observatory', 'darkroom', 'projector', 'trek', 'harbor', 'staircase', 'bakery', 'castle', 'voyage', 'sauna', 'tidepool', 'jacuzzi', 'movie', 'library', 'maze', 'greenhouse', 'carnival'];
      var cur = window.SalaryApp.getState().preferences.template;
      window.SalaryApp.setTemplate(skins[(skins.indexOf(cur) + 1) % skins.length]);
    } else if (e.key === 'p' && window.SalaryApp) {
      var st = window.SalaryApp.getState();
      window.SalaryApp.setPeriod(st.preferences.period === 'day' ? 'month' : 'day');
    } else if (/^[0-9]$/.test(e.key) && window.SalaryApp) {
      var skinKeys = ['pig','charge','meter','pixel','neon','mono','paper','term','ecg','wave','therm','receipt','sand','dial','trail','metro'];
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
      if (params.get('sum') === '1') u.searchParams.set('sum', '1');
      if (params.get('emo') !== null) u.searchParams.set('emo', params.get('emo'));
      if (params.get('holo') === '1') u.searchParams.set('holo', '1');
      if (params.get('born') !== null) u.searchParams.set('born', params.get('born'));
      if (params.get('radar') === '1') u.searchParams.set('radar', '1');
      if (params.get('hatch') === '1') u.searchParams.set('hatch', '1');
      if (params.get('felt') === '1') u.searchParams.set('felt', '1');
      if (params.get('stack') === '1') u.searchParams.set('stack', '1');
      if (params.get('candle') === '1') u.searchParams.set('candle', '1');
      if (params.get('eta') === '1') u.searchParams.set('eta', '1');
      if (params.get('lift') === '1') u.searchParams.set('lift', '1');
      if (params.get('beam') === '1') u.searchParams.set('beam', '1');
      if (params.get('cof') === '1') u.searchParams.set('cof', '1');
      if (params.get('silk') === '1') u.searchParams.set('silk', '1');
      if (params.get('chek') === '1') u.searchParams.set('chek', '1');
      if (params.get('yp') === '1') u.searchParams.set('yp', '1');
      if (params.get('zeb') === '1') u.searchParams.set('zeb', '1');
      if (params.get('vel') === '1') u.searchParams.set('vel', '1');
      if (params.get('syn') === '1') u.searchParams.set('syn', '1');
      if (params.get('frost') === '1') u.searchParams.set('frost', '1');
      if (params.get('arg') === '1') u.searchParams.set('arg', '1');
      if (params.get('brk') === '1') u.searchParams.set('brk', '1');
      if (params.get('blind') === '1') u.searchParams.set('blind', '1');
      if (params.get('ink') === '1') u.searchParams.set('ink', '1');
      if (params.get('smp') === '1') u.searchParams.set('smp', '1');
      if (params.get('twe') === '1') u.searchParams.set('twe', '1');
      if (params.get('crumb') === '1') u.searchParams.set('crumb', '1');
      if (params.get('int') === '1') u.searchParams.set('int', '1');
      if (params.get('cel') === '1') u.searchParams.set('cel', '1');
      if (params.get('emb') === '1') u.searchParams.set('emb', '1');
      if (params.get('rem') === '1') u.searchParams.set('rem', '1');
      if (params.get('ripple') === '1') u.searchParams.set('ripple', '1');
      if (params.get('moodbg') === '1') u.searchParams.set('moodbg', '1');
      if (params.get('mos') === '1') u.searchParams.set('mos', '1');
      if (params.get('lens') === '1') u.searchParams.set('lens', '1');
      if (params.get('zig') === '1') u.searchParams.set('zig', '1');
      if (params.get('eom') === '1') u.searchParams.set('eom', '1');
      if (params.get('hue') === '1') u.searchParams.set('hue', '1');
      if (params.get('wire') === '1') u.searchParams.set('wire', '1');
      if (params.get('wkn') === '1') u.searchParams.set('wkn', '1');
      if (params.get('plaid') === '1') u.searchParams.set('plaid', '1');
      if (params.get('gild') === '1') u.searchParams.set('gild', '1');
      if (params.get('bonk') === '1') u.searchParams.set('bonk', '1');
      if (params.get('ray') === '1') u.searchParams.set('ray', '1');
      if (params.get('vibe') === '1') u.searchParams.set('vibe', '1');
      if (params.get('blip') === '1') u.searchParams.set('blip', '1');
      if (params.get('crisp') === '1') u.searchParams.set('crisp', '1');
      if (params.get('matte') === '1') u.searchParams.set('matte', '1');
      if (params.get('orbit') === '1') u.searchParams.set('orbit', '1');
      if (params.get('type') === '1') u.searchParams.set('type', '1');
      if (params.get('laser') === '1') u.searchParams.set('laser', '1');
      if (params.get('sun') === '1') u.searchParams.set('sun', '1');
      if (params.get('waves') === '1') u.searchParams.set('waves', '1');
      if (params.get('deep') === '1') u.searchParams.set('deep', '1');
      if (params.get('dream') === '1') u.searchParams.set('dream', '1');
      if (params.get('allday') === '1') u.searchParams.set('allday', '1');
      if (params.get('chalk') === '1') u.searchParams.set('chalk', '1');
      if (params.get('pearl') === '1') u.searchParams.set('pearl', '1');
      if (params.get('tide') === '1') u.searchParams.set('tide', '1');
      if (params.get('terra') === '1') u.searchParams.set('terra', '1');
      if (params.get('mocha') === '1') u.searchParams.set('mocha', '1');
      if (params.get('arctic') === '1') u.searchParams.set('arctic', '1');
      if (params.get('vapor') === '1') u.searchParams.set('vapor', '1');
      if (params.get('am') === '1') u.searchParams.set('am', '1');
      if (params.get('olive') === '1') u.searchParams.set('olive', '1');
      if (params.get('plasma') === '1') u.searchParams.set('plasma', '1');
      if (params.get('shimmer') === '1') u.searchParams.set('shimmer', '1');
      if (params.get('ice') === '1') u.searchParams.set('ice', '1');
      if (params.get('fossil') === '1') u.searchParams.set('fossil', '1');
      if (params.get('quartz') === '1') u.searchParams.set('quartz', '1');
      if (params.get('velvet') === '1') u.searchParams.set('velvet', '1');
      if (params.get('copper') === '1') u.searchParams.set('copper', '1');
      if (params.get('hrs') === '1') u.searchParams.set('hrs', '1');
      if (params.get('up') === '1') u.searchParams.set('up', '1');
      if (params.get('sage') === '1') u.searchParams.set('sage', '1');
      if (params.get('amber') === '1') u.searchParams.set('amber', '1');
      if (params.get('steel') === '1') u.searchParams.set('steel', '1');
      if (params.get('lilac') === '1') u.searchParams.set('lilac', '1');
      if (params.get('dleft') === '1') u.searchParams.set('dleft', '1');
      if (params.get('cobalt') === '1') u.searchParams.set('cobalt', '1');
      if (params.get('wine') === '1') u.searchParams.set('wine', '1');
      if (params.get('slate') === '1') u.searchParams.set('slate', '1');
      if (params.get('mint') === '1') u.searchParams.set('mint', '1');
      if (params.get('char') === '1') u.searchParams.set('char', '1');
      if (params.get('knit') === '1') u.searchParams.set('knit', '1');
      if (params.get('ivory') === '1') u.searchParams.set('ivory', '1');
      if (params.get('onyx') === '1') u.searchParams.set('onyx', '1');
      if (params.get('coral') === '1') u.searchParams.set('coral', '1');
      if (params.get('indigo') === '1') u.searchParams.set('indigo', '1');
      if (params.get('moss') === '1') u.searchParams.set('moss', '1');
      if (params.get('quota') === '1') u.searchParams.set('quota', '1');
      if (params.get('haze') === '1') u.searchParams.set('haze', '1');
      if (params.get('dbl') === '1') u.searchParams.set('dbl', '1');
      if (params.get('forest') === '1') u.searchParams.set('forest', '1');
      if (params.get('sand') === '1') u.searchParams.set('sand', '1');
      if (params.get('ocean') === '1') u.searchParams.set('ocean', '1');
      if (params.get('lavender') === '1') u.searchParams.set('lavender', '1');
      if (params.get('khaki') === '1') u.searchParams.set('khaki', '1');
      if (params.get('ruby') === '1') u.searchParams.set('ruby', '1');
      if (params.get('cyber') === '1') u.searchParams.set('cyber', '1');
      if (params.get('mauve') === '1') u.searchParams.set('mauve', '1');
      if (params.get('pine') === '1') u.searchParams.set('pine', '1');
      if (params.get('bronze') === '1') u.searchParams.set('bronze', '1');
      if (params.get('fjord') === '1') u.searchParams.set('fjord', '1');
      if (params.get('blush') === '1') u.searchParams.set('blush', '1');
      if (params.get('pulse') === '1') u.searchParams.set('pulse', '1');
      if (params.get('rgb') === '1') u.searchParams.set('rgb', '1');
      if (params.get('topo') === '1') u.searchParams.set('topo', '1');
      if (params.get('trail') === '1') u.searchParams.set('trail', '1');
      if (params.get('web') === '1') u.searchParams.set('web', '1');
      if (params.get('mirage') === '1') u.searchParams.set('mirage', '1');
      if (params.get('emerald') === '1') u.searchParams.set('emerald', '1');
      if (params.get('cream') === '1') u.searchParams.set('cream', '1');
      if (params.get('navy') === '1') u.searchParams.set('navy', '1');
      if (params.get('taupe') === '1') u.searchParams.set('taupe', '1');
      if (params.get('jet') === '1') u.searchParams.set('jet', '1');
      if (params.get('rose') === '1') u.searchParams.set('rose', '1');
      if (params.get('ash') === '1') u.searchParams.set('ash', '1');
      if (params.get('berry') === '1') u.searchParams.set('berry', '1');
      if (params.get('coal') === '1') u.searchParams.set('coal', '1');
      if (params.get('peach') === '1') u.searchParams.set('peach', '1');
      if (params.get('plum') === '1') u.searchParams.set('plum', '1');
      if (params.get('rust') === '1') u.searchParams.set('rust', '1');
      if (params.get('denim') === '1') u.searchParams.set('denim', '1');
      if (params.get('mango') === '1') u.searchParams.set('mango', '1');
      if (params.get('graph') === '1') u.searchParams.set('graph', '1');
      if (params.get('jade') === '1') u.searchParams.set('jade', '1');
      if (params.get('azure') === '1') u.searchParams.set('azure', '1');
      if (params.get('cocoa') === '1') u.searchParams.set('cocoa', '1');
      if (params.get('latte') === '1') u.searchParams.set('latte', '1');
      if (params.get('storm') === '1') u.searchParams.set('storm', '1');
      if (params.get('citrus') === '1') u.searchParams.set('citrus', '1');
      if (params.get('morale') === '1') u.searchParams.set('morale', '1');
      if (params.get('sunset') === '1') u.searchParams.set('sunset', '1');
      if (params.get('glacier') === '1') u.searchParams.set('glacier', '1');
      if (params.get('honey') === '1') u.searchParams.set('honey', '1');
      if (params.get('iris') === '1') u.searchParams.set('iris', '1');
      if (params.get('cedar') === '1') u.searchParams.set('cedar', '1');
      if (params.get('wheat') === '1') u.searchParams.set('wheat', '1');
      if (params.get('cave') === '1') u.searchParams.set('cave', '1');
      if (params.get('meadow') === '1') u.searchParams.set('meadow', '1');
      if (params.get('porcelain') === '1') u.searchParams.set('porcelain', '1');
      if (params.get('twilight') === '1') u.searchParams.set('twilight', '1');
      if (params.get('abyss') === '1') u.searchParams.set('abyss', '1');
      if (params.get('lagoon') === '1') u.searchParams.set('lagoon', '1');
      if (params.get('dune') === '1') u.searchParams.set('dune', '1');
      if (params.get('orchid') === '1') u.searchParams.set('orchid', '1');
      if (params.get('cinnabar') === '1') u.searchParams.set('cinnabar', '1');
      if (params.get('alpine') === '1') u.searchParams.set('alpine', '1');
      if (params.get('nectar') === '1') u.searchParams.set('nectar', '1');
      if (params.get('clay') === '1') u.searchParams.set('clay', '1');
      if (params.get('aurum') === '1') u.searchParams.set('aurum', '1');
      if (params.get('breeze') === '1') u.searchParams.set('breeze', '1');
      if (params.get('raven') === '1') u.searchParams.set('raven', '1');
      if (params.get('saffron') === '1') u.searchParams.set('saffron', '1');
      if (params.get('oasis') === '1') u.searchParams.set('oasis', '1');
      if (params.get('tulip') === '1') u.searchParams.set('tulip', '1');
      if (params.get('birch') === '1') u.searchParams.set('birch', '1');
      if (params.get('smoke') === '1') u.searchParams.set('smoke', '1');
      if (params.get('lotus') === '1') u.searchParams.set('lotus', '1');
      if (params.get('ebony') === '1') u.searchParams.set('ebony', '1');
      if (params.get('sprout') === '1') u.searchParams.set('sprout', '1');
      if (params.get('harbor') === '1') u.searchParams.set('harbor', '1');
      if (params.get('cosmos') === '1') u.searchParams.set('cosmos', '1');
      if (params.get('ginger') === '1') u.searchParams.set('ginger', '1');
      if (params.get('kelp') === '1') u.searchParams.set('kelp', '1');
      if (params.get('maple') === '1') u.searchParams.set('maple', '1');
      if (params.get('pewter') === '1') u.searchParams.set('pewter', '1');
      if (params.get('dawn') === '1') u.searchParams.set('dawn', '1');
      if (params.get('thicket') === '1') u.searchParams.set('thicket', '1');
      if (params.get('blossom') === '1') u.searchParams.set('blossom', '1');
      if (params.get('cliff') === '1') u.searchParams.set('cliff', '1');
      if (params.get('tundra') === '1') u.searchParams.set('tundra', '1');
      if (params.get('canyon') === '1') u.searchParams.set('canyon', '1');
      if (params.get('reef') === '1') u.searchParams.set('reef', '1');
      if (params.get('umber') === '1') u.searchParams.set('umber', '1');
      if (params.get('violet') === '1') u.searchParams.set('violet', '1');
      if (params.get('verdant') === '1') u.searchParams.set('verdant', '1');
      if (params.get('dusk') === '1') u.searchParams.set('dusk', '1');
      if (params.get('crimson') === '1') u.searchParams.set('crimson', '1');
      if (params.get('opal') === '1') u.searchParams.set('opal', '1');
      if (params.get('basalt') === '1') u.searchParams.set('basalt', '1');
      if (params.get('tangerine') === '1') u.searchParams.set('tangerine', '1');
      if (params.get('midnight') === '1') u.searchParams.set('midnight', '1');
      if (params.get('clover') === '1') u.searchParams.set('clover', '1');
      if (params.get('brick') === '1') u.searchParams.set('brick', '1');
      if (params.get('rosewood') === '1') u.searchParams.set('rosewood', '1');
      if (params.get('marsh') === '1') u.searchParams.set('marsh', '1');
      if (params.get('iceberg') === '1') u.searchParams.set('iceberg', '1');
      if (params.get('willow') === '1') u.searchParams.set('willow', '1');
      if (params.get('volcano') === '1') u.searchParams.set('volcano', '1');
      if (params.get('glade') === '1') u.searchParams.set('glade', '1');
      if (params.get('delta') === '1') u.searchParams.set('delta', '1');
      if (params.get('prairie') === '1') u.searchParams.set('prairie', '1');
      if (params.get('cove') === '1') u.searchParams.set('cove', '1');
      if (params.get('sierra') === '1') u.searchParams.set('sierra', '1');
      if (params.get('dusty') === '1') u.searchParams.set('dusty', '1');
      if (params.get('marine') === '1') u.searchParams.set('marine', '1');
      if (params.get('autumn') === '1') u.searchParams.set('autumn', '1');
      if (params.get('winter') === '1') u.searchParams.set('winter', '1');
      if (params.get('spring') === '1') u.searchParams.set('spring', '1');
      if (params.get('summer') === '1') u.searchParams.set('summer', '1');
      if (params.get('bamboo') === '1') u.searchParams.set('bamboo', '1');
      if (params.get('flame') === '1') u.searchParams.set('flame', '1');
      if (params.get('pastel') === '1') u.searchParams.set('pastel', '1');
      if (params.get('mahogany') === '1') u.searchParams.set('mahogany', '1');
      if (params.get('lime') === '1') u.searchParams.set('lime', '1');
      if (params.get('turquoise') === '1') u.searchParams.set('turquoise', '1');
      if (params.get('walnut') === '1') u.searchParams.set('walnut', '1');
      if (params.get('cherry') === '1') u.searchParams.set('cherry', '1');
      if (params.get('espresso') === '1') u.searchParams.set('espresso', '1');
      if (params.get('peridot') === '1') u.searchParams.set('peridot', '1');
      if (params.get('amethyst') === '1') u.searchParams.set('amethyst', '1');
      if (params.get('cerulean') === '1') u.searchParams.set('cerulean', '1');
      if (params.get('garnet') === '1') u.searchParams.set('garnet', '1');
      if (params.get('teak') === '1') u.searchParams.set('teak', '1');
      if (params.get('fern') === '1') u.searchParams.set('fern', '1');
      if (params.get('lapis') === '1') u.searchParams.set('lapis', '1');
      if (params.get('topaz') === '1') u.searchParams.set('topaz', '1');
      if (params.get('mystic') === '1') u.searchParams.set('mystic', '1');
      if (params.get('cascade') === '1') u.searchParams.set('cascade', '1');
      if (params.get('sunrise') === '1') u.searchParams.set('sunrise', '1');
      if (params.get('sakura') === '1') u.searchParams.set('sakura', '1');
      if (params.get('granite') === '1') u.searchParams.set('granite', '1');
      if (params.get('ember') === '1') u.searchParams.set('ember', '1');
      if (params.get('mulberry') === '1') u.searchParams.set('mulberry', '1');
      if (params.get('sienna') === '1') u.searchParams.set('sienna', '1');
      if (params.get('aqua') === '1') u.searchParams.set('aqua', '1');
      if (params.get('flax') === '1') u.searchParams.set('flax', '1');
      if (params.get('heather') === '1') u.searchParams.set('heather', '1');
      if (params.get('tawny') === '1') u.searchParams.set('tawny', '1');
      if (params.get('vivid') === '1') u.searchParams.set('vivid', '1');
      if (params.get('soft') === '1') u.searchParams.set('soft', '1');
      if (params.get('edge') === '1') u.searchParams.set('edge', '1');
      if (params.get('bramble') === '1') u.searchParams.set('bramble', '1');
      if (params.get('cider') === '1') u.searchParams.set('cider', '1');
      if (params.get('pebble') === '1') u.searchParams.set('pebble', '1');
      if (params.get('suede') === '1') u.searchParams.set('suede', '1');
      if (params.get('mimosa') === '1') u.searchParams.set('mimosa', '1');
      if (params.get('canopy') === '1') u.searchParams.set('canopy', '1');
      if (params.get('tinsel') === '1') u.searchParams.set('tinsel', '1');
      if (params.get('marigold') === '1') u.searchParams.set('marigold', '1');
      if (params.get('shadow') === '1') u.searchParams.set('shadow', '1');
      if (params.get('amoled') === '1') u.searchParams.set('amoled', '1');
      if (params.get('chestnut') === '1') u.searchParams.set('chestnut', '1');
      if (params.get('seashell') === '1') u.searchParams.set('seashell', '1');
      if (params.get('fawn') === '1') u.searchParams.set('fawn', '1');
      if (params.get('bracken') === '1') u.searchParams.set('bracken', '1');
      if (params.get('reed') === '1') u.searchParams.set('reed', '1');
      if (params.get('beats') === '1') u.searchParams.set('beats', '1');
      if (params.get('unix') === '1') u.searchParams.set('unix', '1');
      if (params.get('era') === '1') u.searchParams.set('era', '1');
      if (params.get('stardate') === '1') u.searchParams.set('stardate', '1');
      if (params.get('easter') === '1') u.searchParams.set('easter', '1');
      if (params.get('olympic') === '1') u.searchParams.set('olympic', '1');
      if (params.get('solstice') === '1') u.searchParams.set('solstice', '1');
      if (params.get('valentine') === '1') u.searchParams.set('valentine', '1');
      if (params.get('halloween') === '1') u.searchParams.set('halloween', '1');
      if (params.get('laborday') === '1') u.searchParams.set('laborday', '1');
      if (params.get('national') === '1') u.searchParams.set('national', '1');
      if (params.get('childrens') === '1') u.searchParams.set('childrens', '1');
      if (params.get('teachers') === '1') u.searchParams.set('teachers', '1');
      if (params.get('double11') === '1') u.searchParams.set('double11', '1');
      if (params.get('womans') === '1') u.searchParams.set('womans', '1');
      if (params.get('aprilfools') === '1') u.searchParams.set('aprilfools', '1');
      if (params.get('double12') === '1') u.searchParams.set('double12', '1');
      if (params.get('lastday') === '1') u.searchParams.set('lastday', '1');
      if (params.get('oatmeal') === '1') u.searchParams.set('oatmeal', '1');
      if (params.get('thyme') === '1') u.searchParams.set('thyme', '1');
      if (params.get('russet') === '1') u.searchParams.set('russet', '1');
      if (params.get('dijon') === '1') u.searchParams.set('dijon', '1');
      if (params.get('spruce') === '1') u.searchParams.set('spruce', '1');
      if (params.get('merlot') === '1') u.searchParams.set('merlot', '1');
      if (params.get('camel') === '1') u.searchParams.set('camel', '1');
      if (params.get('petrol') === '1') u.searchParams.set('petrol', '1');
      if (params.get('sangria') === '1') u.searchParams.set('sangria', '1');
      if (params.get('basil') === '1') u.searchParams.set('basil', '1');
      if (params.get('falcon') === '1') u.searchParams.set('falcon', '1');
      if (params.get('tweed') === '1') u.searchParams.set('tweed', '1');
      if (params.get('caramel') === '1') u.searchParams.set('caramel', '1');
      if (params.get('sable') === '1') u.searchParams.set('sable', '1');
      if (params.get('pistachio') === '1') u.searchParams.set('pistachio', '1');
      if (params.get('apricot') === '1') u.searchParams.set('apricot', '1');
      if (params.get('dove') === '1') u.searchParams.set('dove', '1');
      if (params.get('juniper') === '1') u.searchParams.set('juniper', '1');
      if (params.get('maroon') === '1') u.searchParams.set('maroon', '1');
      if (params.get('butterscotch') === '1') u.searchParams.set('butterscotch', '1');
      if (params.get('mole') === '1') u.searchParams.set('mole', '1');
      if (params.get('grotto') === '1') u.searchParams.set('grotto', '1');
      if (params.get('peacock') === '1') u.searchParams.set('peacock', '1');
      if (params.get('linen') === '1') u.searchParams.set('linen', '1');
      if (params.get('zephyr') === '1') u.searchParams.set('zephyr', '1');
      if (params.get('brass') === '1') u.searchParams.set('brass', '1');
      if (params.get('paprika') === '1') u.searchParams.set('paprika', '1');
      if (params.get('hazelnut') === '1') u.searchParams.set('hazelnut', '1');
      if (params.get('lobster') === '1') u.searchParams.set('lobster', '1');
      if (params.get('wisteria') === '1') u.searchParams.set('wisteria', '1');
      if (params.get('ridge') === '1') u.searchParams.set('ridge', '1');
      if (params.get('flint') === '1') u.searchParams.set('flint', '1');
      if (params.get('sorrel') === '1') u.searchParams.set('sorrel', '1');
      if (params.get('grove') === '1') u.searchParams.set('grove', '1');
      if (params.get('moor') === '1') u.searchParams.set('moor', '1');
      if (params.get('ochre') === '1') u.searchParams.set('ochre', '1');
      if (params.get('timber') === '1') u.searchParams.set('timber', '1');
      if (params.get('lily') === '1') u.searchParams.set('lily', '1');
      if (params.get('otter') === '1') u.searchParams.set('otter', '1');
      if (params.get('primrose') === '1') u.searchParams.set('primrose', '1');
      if (params.get('cinder') === '1') u.searchParams.set('cinder', '1');
      if (params.get('sedge') === '1') u.searchParams.set('sedge', '1');
      if (params.get('crocus') === '1') u.searchParams.set('crocus', '1');
      if (params.get('magpie') === '1') u.searchParams.set('magpie', '1');
      if (params.get('tatami') === '1') u.searchParams.set('tatami', '1');
      if (params.get('heron') === '1') u.searchParams.set('heron', '1');
      if (params.get('yuzu') === '1') u.searchParams.set('yuzu', '1');
      if (params.get('balsam') === '1') u.searchParams.set('balsam', '1');
      if (params.get('quill') === '1') u.searchParams.set('quill', '1');
      if (params.get('bison') === '1') u.searchParams.set('bison', '1');
      if (params.get('wren') === '1') u.searchParams.set('wren', '1');
      if (params.get('goose') === '1') u.searchParams.set('goose', '1');
      if (params.get('malachite') === '1') u.searchParams.set('malachite', '1');
      if (params.get('barley') === '1') u.searchParams.set('barley', '1');
      if (params.get('sycamore') === '1') u.searchParams.set('sycamore', '1');
      if (params.get('kraken') === '1') u.searchParams.set('kraken', '1');
      if (params.get('pumice') === '1') u.searchParams.set('pumice', '1');
      if (params.get('marsala') === '1') u.searchParams.set('marsala', '1');
      if (params.get('lynx') === '1') u.searchParams.set('lynx', '1');
      if (params.get('polar') === '1') u.searchParams.set('polar', '1');
      if (params.get('mustard') === '1') u.searchParams.set('mustard', '1');
      if (params.get('celery') === '1') u.searchParams.set('celery', '1');
      if (params.get('oryx') === '1') u.searchParams.set('oryx', '1');
      if (params.get('tortoise') === '1') u.searchParams.set('tortoise', '1');
      if (params.get('mantis') === '1') u.searchParams.set('mantis', '1');
      if (params.get('coriander') === '1') u.searchParams.set('coriander', '1');
      if (params.get('fennel') === '1') u.searchParams.set('fennel', '1');
      if (params.get('gecko') === '1') u.searchParams.set('gecko', '1');
      if (params.get('walrus') === '1') u.searchParams.set('walrus', '1');
      if (params.get('osprey') === '1') u.searchParams.set('osprey', '1');
      if (params.get('plover') === '1') u.searchParams.set('plover', '1');
      if (params.get('sesame') === '1') u.searchParams.set('sesame', '1');
      if (params.get('chamois') === '1') u.searchParams.set('chamois', '1');
      if (params.get('dill') === '1') u.searchParams.set('dill', '1');
      if (params.get('ermine') === '1') u.searchParams.set('ermine', '1');
      if (params.get('badger') === '1') u.searchParams.set('badger', '1');
      if (params.get('marlin') === '1') u.searchParams.set('marlin', '1');
      if (params.get('banyan') === '1') u.searchParams.set('banyan', '1');
      if (params.get('kestrel') === '1') u.searchParams.set('kestrel', '1');
      if (params.get('poppy') === '1') u.searchParams.set('poppy', '1');
      if (params.get('yak') === '1') u.searchParams.set('yak', '1');
      if (params.get('tern') === '1') u.searchParams.set('tern', '1');
      if (params.get('cypress') === '1') u.searchParams.set('cypress', '1');
      if (params.get('gazelle') === '1') u.searchParams.set('gazelle', '1');
      if (params.get('ibis') === '1') u.searchParams.set('ibis', '1');
      if (params.get('tamarind') === '1') u.searchParams.set('tamarind', '1');
      if (params.get('dingo') === '1') u.searchParams.set('dingo', '1');
      if (params.get('ocelot') === '1') u.searchParams.set('ocelot', '1');
      if (params.get('safflower') === '1') u.searchParams.set('safflower', '1');
      if (params.get('tapir') === '1') u.searchParams.set('tapir', '1');
      if (params.get('eow') === '1') u.searchParams.set('eow', '1');
      if (params.get('rhea') === '1') u.searchParams.set('rhea', '1');
      if (params.get('umbra') === '1') u.searchParams.set('umbra', '1');
      if (params.get('vicuna') === '1') u.searchParams.set('vicuna', '1');
      if (params.get('olivine') === '1') u.searchParams.set('olivine', '1');
      if (params.get('damson') === '1') u.searchParams.set('damson', '1');
      if (params.get('nutmeg') === '1') u.searchParams.set('nutmeg', '1');
      if (params.get('scarab') === '1') u.searchParams.set('scarab', '1');
      if (params.get('lichen') === '1') u.searchParams.set('lichen', '1');
      if (params.get('manatee') === '1') u.searchParams.set('manatee', '1');
      if (params.get('thistle') === '1') u.searchParams.set('thistle', '1');
      if (params.get('raccoon') === '1') u.searchParams.set('raccoon', '1');
      if (params.get('weasel') === '1') u.searchParams.set('weasel', '1');
      if (params.get('rhubarb') === '1') u.searchParams.set('rhubarb', '1');
      if (params.get('stork') === '1') u.searchParams.set('stork', '1');
      if (params.get('goanna') === '1') u.searchParams.set('goanna', '1');
      if (params.get('cumin') === '1') u.searchParams.set('cumin', '1');
      if (params.get('chinchilla') === '1') u.searchParams.set('chinchilla', '1');
      if (params.get('axolotl') === '1') u.searchParams.set('axolotl', '1');
      if (params.get('azuki') === '1') u.searchParams.set('azuki', '1');
      if (params.get('cassowary') === '1') u.searchParams.set('cassowary', '1');
      if (params.get('pangolin') === '1') u.searchParams.set('pangolin', '1');
      if (params.get('quince') === '1') u.searchParams.set('quince', '1');
      if (params.get('guanaco') === '1') u.searchParams.set('guanaco', '1');
      if (params.get('jacaranda') === '1') u.searchParams.set('jacaranda', '1');
      if (params.get('lemur') === '1') u.searchParams.set('lemur', '1');
      if (params.get('fig') === '1') u.searchParams.set('fig', '1');
      if (params.get('narwhal') === '1') u.searchParams.set('narwhal', '1');
      if (params.get('persimmon') === '1') u.searchParams.set('persimmon', '1');
      if (params.get('capybara') === '1') u.searchParams.set('capybara', '1');
      if (params.get('toucan') === '1') u.searchParams.set('toucan', '1');
      if (params.get('taro') === '1') u.searchParams.set('taro', '1');
      if (params.get('mongoose') === '1') u.searchParams.set('mongoose', '1');
      if (params.get('hornbill') === '1') u.searchParams.set('hornbill', '1');
      if (params.get('millet') === '1') u.searchParams.set('millet', '1');
      if (params.get('wombat') === '1') u.searchParams.set('wombat', '1');
      if (params.get('redpanda') === '1') u.searchParams.set('redpanda', '1');
      if (params.get('dewberry') === '1') u.searchParams.set('dewberry', '1');
      if (params.get('cormorant') === '1') u.searchParams.set('cormorant', '1');
      if (params.get('armadillo') === '1') u.searchParams.set('armadillo', '1');
      if (params.get('lychee') === '1') u.searchParams.set('lychee', '1');
      if (params.get('wallaby') === '1') u.searchParams.set('wallaby', '1');
      if (params.get('quokka') === '1') u.searchParams.set('quokka', '1');
      if (params.get('jujube') === '1') u.searchParams.set('jujube', '1');
      if (params.get('serval') === '1') u.searchParams.set('serval', '1');
        if (params.get('saiga') === '1') u.searchParams.set('saiga', '1');
        if (params.get('longan') === '1') u.searchParams.set('longan', '1');
        if (params.get('koala') === '1') u.searchParams.set('koala', '1');
        if (params.get('okapi') === '1') u.searchParams.set('okapi', '1');
        if (params.get('parrot') === '1') u.searchParams.set('parrot', '1');
        if (params.get('panda') === '1') u.searchParams.set('panda', '1');
        if (params.get('salmon') === '1') u.searchParams.set('salmon', '1');
        if (params.get('egret') === '1') u.searchParams.set('egret', '1');
        if (params.get('morel') === '1') u.searchParams.set('morel', '1');
        if (params.get('hyena') === '1') u.searchParams.set('hyena', '1');
        if (params.get('urchin') === '1') u.searchParams.set('urchin', '1');
        if (params.get('viper') === '1') u.searchParams.set('viper', '1');
        if (params.get('wapiti') === '1') u.searchParams.set('wapiti', '1');
        if (params.get('xerus') === '1') u.searchParams.set('xerus', '1');
        if (params.get('yellowfin') === '1') u.searchParams.set('yellowfin', '1');
        if (params.get('zebu') === '1') u.searchParams.set('zebu', '1');
        if (params.get('anemone') === '1') u.searchParams.set('anemone', '1');
        if (params.get('bobcat') === '1') u.searchParams.set('bobcat', '1');
        if (params.get('caracal') === '1') u.searchParams.set('caracal', '1');
        if (params.get('dormouse') === '1') u.searchParams.set('dormouse', '1');
        if (params.get('eland') === '1') u.searchParams.set('eland', '1');
        if (params.get('fossa') === '1') u.searchParams.set('fossa', '1');
        if (params.get('gerenuk') === '1') u.searchParams.set('gerenuk', '1');
        if (params.get('hutia') === '1') u.searchParams.set('hutia', '1');
        if (params.get('impala') === '1') u.searchParams.set('impala', '1');
        if (params.get('jackdaw') === '1') u.searchParams.set('jackdaw', '1');
        if (params.get('kakapo') === '1') u.searchParams.set('kakapo', '1');
        if (params.get('lorikeet') === '1') u.searchParams.set('lorikeet', '1');
        if (params.get('markhor') === '1') u.searchParams.set('markhor', '1');
        if (params.get('numbat') === '1') u.searchParams.set('numbat', '1');
        if (params.get('puffin') === '1') u.searchParams.set('puffin', '1');
        if (params.get('quetzal') === '1') u.searchParams.set('quetzal', '1');
        if (params.get('springbok') === '1') u.searchParams.set('springbok', '1');
        if (params.get('takin') === '1') u.searchParams.set('takin', '1');
        if (params.get('uakari') === '1') u.searchParams.set('uakari', '1');
        if (params.get('vaquita') === '1') u.searchParams.set('vaquita', '1');
        if (params.get('xenops') === '1') u.searchParams.set('xenops', '1');
        if (params.get('yaffle') === '1') u.searchParams.set('yaffle', '1');
        if (params.get('zonkey') === '1') u.searchParams.set('zonkey', '1');
        if (params.get('binturong') === '1') u.searchParams.set('binturong', '1');
        if (params.get('caribou') === '1') u.searchParams.set('caribou', '1');
        if (params.get('dikdik') === '1') u.searchParams.set('dikdik', '1');
        if (params.get('echidna') === '1') u.searchParams.set('echidna', '1');
        if (params.get('gelada') === '1') u.searchParams.set('gelada', '1');
        if (params.get('hoopoe') === '1') u.searchParams.set('hoopoe', '1');
        if (params.get('indri') === '1') u.searchParams.set('indri', '1');
        if (params.get('jabiru') === '1') u.searchParams.set('jabiru', '1');
        if (params.get('klipspringer') === '1') u.searchParams.set('klipspringer', '1');
        if (params.get('lapwing') === '1') u.searchParams.set('lapwing', '1');
        if (params.get('mudskipper') === '1') u.searchParams.set('mudskipper', '1');
        if (params.get('nighthawk') === '1') u.searchParams.set('nighthawk', '1');
        if (params.get('potoo') === '1') u.searchParams.set('potoo', '1');
        if (params.get('solenodon') === '1') u.searchParams.set('solenodon', '1');
        if (params.get('tarsier') === '1') u.searchParams.set('tarsier', '1');
        if (params.get('wolverine') === '1') u.searchParams.set('wolverine', '1');
        if (params.get('xeme') === '1') u.searchParams.set('xeme', '1');
        if (params.get('zokor') === '1') u.searchParams.set('zokor', '1');
        if (params.get('addax') === '1') u.searchParams.set('addax', '1');
        if (params.get('bulbul') === '1') u.searchParams.set('bulbul', '1');
        if (params.get('cuscus') === '1') u.searchParams.set('cuscus', '1');
        if (params.get('duiker') === '1') u.searchParams.set('duiker', '1');
        if (params.get('elepaio') === '1') u.searchParams.set('elepaio', '1');
        if (params.get('fulmar') === '1') u.searchParams.set('fulmar', '1');
        if (params.get('genet') === '1') u.searchParams.set('genet', '1');
        if (params.get('hoolock') === '1') u.searchParams.set('hoolock', '1');
        if (params.get('jacana') === '1') u.searchParams.set('jacana', '1');
        if (params.get('kiskadee') === '1') u.searchParams.set('kiskadee', '1');
        if (params.get('lemming') === '1') u.searchParams.set('lemming', '1');
        if (params.get('moose') === '1') u.searchParams.set('moose', '1');
        if (params.get('nyala') === '1') u.searchParams.set('nyala', '1');
        if (params.get('pika') === '1') u.searchParams.set('pika', '1');
        if (params.get('quoll') === '1') u.searchParams.set('quoll', '1');
        if (params.get('spoonbill') === '1') u.searchParams.set('spoonbill', '1');
        if (params.get('sunfish') === '1') u.searchParams.set('sunfish', '1');
        if (params.get('tamarin') === '1') u.searchParams.set('tamarin', '1');
        if (params.get('turaco') === '1') u.searchParams.set('turaco', '1');
        if (params.get('urial') === '1') u.searchParams.set('urial', '1');
        if (params.get('wahoo') === '1') u.searchParams.set('wahoo', '1');
        if (params.get('yellowlegs') === '1') u.searchParams.set('yellowlegs', '1');
        if (params.get('zorilla') === '1') u.searchParams.set('zorilla', '1');
        if (params.get('agouti') === '1') u.searchParams.set('agouti', '1');
        if (params.get('bongo') === '1') u.searchParams.set('bongo', '1');
        if (params.get('civet') === '1') u.searchParams.set('civet', '1');
        if (params.get('dugong') === '1') u.searchParams.set('dugong', '1');
        if (params.get('fugu') === '1') u.searchParams.set('fugu', '1');
        if (params.get('goral') === '1') u.searchParams.set('goral', '1');
        if (params.get('hartebeest') === '1') u.searchParams.set('hartebeest', '1');
        if (params.get('iora') === '1') u.searchParams.set('iora', '1');
        if (params.get('jerboa') === '1') u.searchParams.set('jerboa', '1');
        if (params.get('katydid') === '1') u.searchParams.set('katydid', '1');
        if (params.get('nilgai') === '1') u.searchParams.set('nilgai', '1');
        if (params.get('oribi') === '1') u.searchParams.set('oribi', '1');
        if (params.get('pintail') === '1') u.searchParams.set('pintail', '1');
        if (params.get('sifaka') === '1') u.searchParams.set('sifaka', '1');
        if (params.get('tenrec') === '1') u.searchParams.set('tenrec', '1');
        if (params.get('vole') === '1') u.searchParams.set('vole', '1');
        if (params.get('wallaroo') === '1') u.searchParams.set('wallaroo', '1');
        if (params.get('xerinae') === '1') u.searchParams.set('xerinae', '1');
        if (params.get('yabby') === '1') u.searchParams.set('yabby', '1');
        if (params.get('avocet') === '1') u.searchParams.set('avocet', '1');
        if (params.get('bandicoot') === '1') u.searchParams.set('bandicoot', '1');
        if (params.get('cotinga') === '1') u.searchParams.set('cotinga', '1');
        if (params.get('dugite') === '1') u.searchParams.set('dugite', '1');
        if (params.get('firefinch') === '1') u.searchParams.set('firefinch', '1');
        if (params.get('goshawk') === '1') u.searchParams.set('goshawk', '1');
        if (params.get('hamerkop') === '1') u.searchParams.set('hamerkop', '1');
        if (params.get('ibisbill') === '1') u.searchParams.set('ibisbill', '1');
        if (params.get('joey') === '1') u.searchParams.set('joey', '1');
        if (params.get('kakariki') === '1') u.searchParams.set('kakariki', '1');
        if (params.get('limpet') === '1') u.searchParams.set('limpet', '1');
        if (params.get('mudfish') === '1') u.searchParams.set('mudfish', '1');
        if (params.get('potoroo') === '1') u.searchParams.set('potoroo', '1');
        if (params.get('quail') === '1') u.searchParams.set('quail', '1');
        if (params.get('ratel') === '1') u.searchParams.set('ratel', '1');
        if (params.get('shoebill') === '1') u.searchParams.set('shoebill', '1');
        if (params.get('tanuki') === '1') u.searchParams.set('tanuki', '1');
        if (params.get('zinnia') === '1') u.searchParams.set('zinnia', '1');
        if (params.get('urutu') === '1') u.searchParams.set('urutu', '1');
        if (params.get('weka') === '1') u.searchParams.set('weka', '1');
        if (params.get('xenopus') === '1') u.searchParams.set('xenopus', '1');
        if (params.get('coati') === '1') u.searchParams.set('coati', '1');
        if (params.get('dhole') === '1') u.searchParams.set('dhole', '1');
        if (params.get('grison') === '1') u.searchParams.set('grison', '1');
        if (params.get('harrier') === '1') u.searchParams.set('harrier', '1');
        if (params.get('ibex') === '1') u.searchParams.set('ibex', '1');
        if (params.get('jacamar') === '1') u.searchParams.set('jacamar', '1');
        if (params.get('kea') === '1') u.searchParams.set('kea', '1');
        if (params.get('langur') === '1') u.searchParams.set('langur', '1');
        if (params.get('marmoset') === '1') u.searchParams.set('marmoset', '1');
        if (params.get('nandu') === '1') u.searchParams.set('nandu', '1');
        if (params.get('padda') === '1') u.searchParams.set('padda', '1');
        if (params.get('tahr') === '1') u.searchParams.set('tahr', '1');
        if (params.get('vanga') === '1') u.searchParams.set('vanga', '1');
        if (params.get('wigeon') === '1') u.searchParams.set('wigeon', '1');
        if (params.get('yapok') === '1') u.searchParams.set('yapok', '1');
        if (params.get('zebrafish') === '1') u.searchParams.set('zebrafish', '1');
        if (params.get('tetra') === '1') u.searchParams.set('tetra', '1');
        if (params.get('betta') === '1') u.searchParams.set('betta', '1');
        if (params.get('cichlid') === '1') u.searchParams.set('cichlid', '1');
        if (params.get('guppy') === '1') u.searchParams.set('guppy', '1');
        if (params.get('loach') === '1') u.searchParams.set('loach', '1');
        if (params.get('molly') === '1') u.searchParams.set('molly', '1');
        if (params.get('perch') === '1') u.searchParams.set('perch', '1');
        if (params.get('rudd') === '1') u.searchParams.set('rudd', '1');
        if (params.get('smelt') === '1') u.searchParams.set('smelt', '1');
        if (params.get('tench') === '1') u.searchParams.set('tench', '1');
        if (params.get('wrasse') === '1') u.searchParams.set('wrasse', '1');
        if (params.get('barbel') === '1') u.searchParams.set('barbel', '1');
        if (params.get('dace') === '1') u.searchParams.set('dace', '1');
        if (params.get('grayling') === '1') u.searchParams.set('grayling', '1');
        if (params.get('minnow') === '1') u.searchParams.set('minnow', '1');
        if (params.get('gudgeon') === '1') u.searchParams.set('gudgeon', '1');
        if (params.get('bleak') === '1') u.searchParams.set('bleak', '1');
        if (params.get('sprat') === '1') u.searchParams.set('sprat', '1');
        if (params.get('anchovy') === '1') u.searchParams.set('anchovy', '1');
        if (params.get('herring') === '1') u.searchParams.set('herring', '1');
        if (params.get('sardine') === '1') u.searchParams.set('sardine', '1');
        if (params.get('capelin') === '1') u.searchParams.set('capelin', '1');
        if (params.get('mullet') === '1') u.searchParams.set('mullet', '1');
        if (params.get('mackerel') === '1') u.searchParams.set('mackerel', '1');
        if (params.get('bonito') === '1') u.searchParams.set('bonito', '1');
        if (params.get('albacore') === '1') u.searchParams.set('albacore', '1');
        if (params.get('yellowtail') === '1') u.searchParams.set('yellowtail', '1');
        if (params.get('amberjack') === '1') u.searchParams.set('amberjack', '1');
        if (params.get('cobia') === '1') u.searchParams.set('cobia', '1');
        if (params.get('dorado') === '1') u.searchParams.set('dorado', '1');
        if (params.get('tarpon') === '1') u.searchParams.set('tarpon', '1');
        if (params.get('grouper') === '1') u.searchParams.set('grouper', '1');
        if (params.get('snapper') === '1') u.searchParams.set('snapper', '1');
        if (params.get('bream') === '1') u.searchParams.set('bream', '1');
        if (params.get('pompano') === '1') u.searchParams.set('pompano', '1');
        if (params.get('tilapia') === '1') u.searchParams.set('tilapia', '1');
        if (params.get('catfish') === '1') u.searchParams.set('catfish', '1');
        if (params.get('carp') === '1') u.searchParams.set('carp', '1');
        if (params.get('trout') === '1') u.searchParams.set('trout', '1');
        if (params.get('bass') === '1') u.searchParams.set('bass', '1');
        if (params.get('pike') === '1') u.searchParams.set('pike', '1');
        if (params.get('sturgeon') === '1') u.searchParams.set('sturgeon', '1');
        if (params.get('paddlefish') === '1') u.searchParams.set('paddlefish', '1');
        if (params.get('gar') === '1') u.searchParams.set('gar', '1');
        if (params.get('bowfin') === '1') u.searchParams.set('bowfin', '1');
        if (params.get('burbot') === '1') u.searchParams.set('burbot', '1');
        if (params.get('lamprey') === '1') u.searchParams.set('lamprey', '1');
        if (params.get('hagfish') === '1') u.searchParams.set('hagfish', '1');
        if (params.get('oarfish') === '1') u.searchParams.set('oarfish', '1');
        if (params.get('moray') === '1') u.searchParams.set('moray', '1');
        if (params.get('conger') === '1') u.searchParams.set('conger', '1');
        if (params.get('remora') === '1') u.searchParams.set('remora', '1');
        if (params.get('skate') === '1') u.searchParams.set('skate', '1');
        if (params.get('stingray') === '1') u.searchParams.set('stingray', '1');
        if (params.get('manta') === '1') u.searchParams.set('manta', '1');
        if (params.get('flounder') === '1') u.searchParams.set('flounder', '1');
        if (params.get('halibut') === '1') u.searchParams.set('halibut', '1');
        if (params.get('turbot') === '1') u.searchParams.set('turbot', '1');
        if (params.get('sole') === '1') u.searchParams.set('sole', '1');
        if (params.get('plaice') === '1') u.searchParams.set('plaice', '1');
        if (params.get('dab') === '1') u.searchParams.set('dab', '1');
        if (params.get('fluke') === '1') u.searchParams.set('fluke', '1');
        if (params.get('pollock') === '1') u.searchParams.set('pollock', '1');
        if (params.get('haddock') === '1') u.searchParams.set('haddock', '1');
        if (params.get('whiting') === '1') u.searchParams.set('whiting', '1');
        if (params.get('cod') === '1') u.searchParams.set('cod', '1');
        if (params.get('hake') === '1') u.searchParams.set('hake', '1');
        if (params.get('ling') === '1') u.searchParams.set('ling', '1');
        if (params.get('saury') === '1') u.searchParams.set('saury', '1');
        if (params.get('needlefish') === '1') u.searchParams.set('needlefish', '1');
        if (params.get('flyingfish') === '1') u.searchParams.set('flyingfish', '1');
        if (params.get('opah') === '1') u.searchParams.set('opah', '1');
        if (params.get('pomfret') === '1') u.searchParams.set('pomfret', '1');
        if (params.get('croaker') === '1') u.searchParams.set('croaker', '1');
        if (params.get('tilefish') === '1') u.searchParams.set('tilefish', '1');
        if (params.get('hogfish') === '1') u.searchParams.set('hogfish', '1');
        if (params.get('parrotfish') === '1') u.searchParams.set('parrotfish', '1');
        if (params.get('damselfish') === '1') u.searchParams.set('damselfish', '1');
        if (params.get('clownfish') === '1') u.searchParams.set('clownfish', '1');
        if (params.get('angelfish') === '1') u.searchParams.set('angelfish', '1');
        if (params.get('goby') === '1') u.searchParams.set('goby', '1');
        if (params.get('blenny') === '1') u.searchParams.set('blenny', '1');
        if (params.get('sculpin') === '1') u.searchParams.set('sculpin', '1');
        if (params.get('lumpsucker') === '1') u.searchParams.set('lumpsucker', '1');
        if (params.get('stickleback') === '1') u.searchParams.set('stickleback', '1');
        if (params.get('shiner') === '1') u.searchParams.set('shiner', '1');
        if (params.get('killifish') === '1') u.searchParams.set('killifish', '1');
        if (params.get('medaka') === '1') u.searchParams.set('medaka', '1');
        if (params.get('mosquitofish') === '1') u.searchParams.set('mosquitofish', '1');
        if (params.get('platy') === '1') u.searchParams.set('platy', '1');
        if (params.get('swordtail') === '1') u.searchParams.set('swordtail', '1');
        if (params.get('danio') === '1') u.searchParams.set('danio', '1');
        if (params.get('gourami') === '1') u.searchParams.set('gourami', '1');
        if (params.get('rasbora') === '1') u.searchParams.set('rasbora', '1');
        if (params.get('koi') === '1') u.searchParams.set('koi', '1');
        if (params.get('arowana') === '1') u.searchParams.set('arowana', '1');
        if (params.get('discus') === '1') u.searchParams.set('discus', '1');
        if (params.get('oscarfish') === '1') u.searchParams.set('oscarfish', '1');
        if (params.get('pleco') === '1') u.searchParams.set('pleco', '1');
        if (params.get('corydoras') === '1') u.searchParams.set('corydoras', '1');
        if (params.get('flowerhorn') === '1') u.searchParams.set('flowerhorn', '1');
        if (params.get('newt') === '1') u.searchParams.set('newt', '1');
        if (params.get('salamander') === '1') u.searchParams.set('salamander', '1');
        if (params.get('treefrog') === '1') u.searchParams.set('treefrog', '1');
        if (params.get('iguana') === '1') u.searchParams.set('iguana', '1');
        if (params.get('chameleon') === '1') u.searchParams.set('chameleon', '1');
        if (params.get('beardeddragon') === '1') u.searchParams.set('beardeddragon', '1');
        if (params.get('cobra') === '1') u.searchParams.set('cobra', '1');
        if (params.get('boa') === '1') u.searchParams.set('boa', '1');
        if (params.get('mamba') === '1') u.searchParams.set('mamba', '1');
        if (params.get('anaconda') === '1') u.searchParams.set('anaconda', '1');
        if (params.get('taipan') === '1') u.searchParams.set('taipan', '1');
        if (params.get('krait') === '1') u.searchParams.set('krait', '1');
        if (params.get('skink') === '1') u.searchParams.set('skink', '1');
        if (params.get('agama') === '1') u.searchParams.set('agama', '1');
        if (params.get('basilisk') === '1') u.searchParams.set('basilisk', '1');
        if (params.get('hornet') === '1') u.searchParams.set('hornet', '1');
        if (params.get('cicada') === '1') u.searchParams.set('cicada', '1');
        if (params.get('moth') === '1') u.searchParams.set('moth', '1');
        if (params.get('ladybug') === '1') u.searchParams.set('ladybug', '1');
        if (params.get('beetle') === '1') u.searchParams.set('beetle', '1');
        if (params.get('dragonfly') === '1') u.searchParams.set('dragonfly', '1');
        if (params.get('butterfly') === '1') u.searchParams.set('butterfly', '1');
        if (params.get('scorpion') === '1') u.searchParams.set('scorpion', '1');
        if (params.get('tarantula') === '1') u.searchParams.set('tarantula', '1');
        if (params.get('centipede') === '1') u.searchParams.set('centipede', '1');
        if (params.get('millipede') === '1') u.searchParams.set('millipede', '1');
        if (params.get('silkworm') === '1') u.searchParams.set('silkworm', '1');
        if (params.get('squid') === '1') u.searchParams.set('squid', '1');
        if (params.get('octopus') === '1') u.searchParams.set('octopus', '1');
        if (params.get('cuttlefish') === '1') u.searchParams.set('cuttlefish', '1');
        if (params.get('jellyfish') === '1') u.searchParams.set('jellyfish', '1');
        if (params.get('starfish') === '1') u.searchParams.set('starfish', '1');
        if (params.get('seahorse') === '1') u.searchParams.set('seahorse', '1');
        if (params.get('shrimp') === '1') u.searchParams.set('shrimp', '1');
        if (params.get('krill') === '1') u.searchParams.set('krill', '1');
        if (params.get('clam') === '1') u.searchParams.set('clam', '1');
        if (params.get('oyster') === '1') u.searchParams.set('oyster', '1');
        if (params.get('mussel') === '1') u.searchParams.set('mussel', '1');
        if (params.get('scallop') === '1') u.searchParams.set('scallop', '1');
        if (params.get('abalone') === '1') u.searchParams.set('abalone', '1');
        if (params.get('conch') === '1') u.searchParams.set('conch', '1');
        if (params.get('nautilus') === '1') u.searchParams.set('nautilus', '1');
        if (params.get('crab') === '1') u.searchParams.set('crab', '1');
        if (params.get('crayfish') === '1') u.searchParams.set('crayfish', '1');
        if (params.get('hermit') === '1') u.searchParams.set('hermit', '1');
        if (params.get('dolphin') === '1') u.searchParams.set('dolphin', '1');
        if (params.get('orca') === '1') u.searchParams.set('orca', '1');
        if (params.get('beluga') === '1') u.searchParams.set('beluga', '1');
        if (params.get('sealion') === '1') u.searchParams.set('sealion', '1');
        if (params.get('penguin') === '1') u.searchParams.set('penguin', '1');
        if (params.get('polarbear') === '1') u.searchParams.set('polarbear', '1');
        if (params.get('redfox') === '1') u.searchParams.set('redfox', '1');
        if (params.get('grizzly') === '1') u.searchParams.set('grizzly', '1');
        if (params.get('puma') === '1') u.searchParams.set('puma', '1');
        if (params.get('tiger') === '1') u.searchParams.set('tiger', '1');
        if (params.get('leopard') === '1') u.searchParams.set('leopard', '1');
        if (params.get('jaguar') === '1') u.searchParams.set('jaguar', '1');
        if (params.get('lion') === '1') u.searchParams.set('lion', '1');
        if (params.get('cheetah') === '1') u.searchParams.set('cheetah', '1');
        if (params.get('panther') === '1') u.searchParams.set('panther', '1');
        if (params.get('snowleopard') === '1') u.searchParams.set('snowleopard', '1');
        if (params.get('clouded') === '1') u.searchParams.set('clouded', '1');
        if (params.get('sphynx') === '1') u.searchParams.set('sphynx', '1');
        if (params.get('bengal') === '1') u.searchParams.set('bengal', '1');
        if (params.get('ragdoll') === '1') u.searchParams.set('ragdoll', '1');
        if (params.get('persian') === '1') u.searchParams.set('persian', '1');
        if (params.get('siamese') === '1') u.searchParams.set('siamese', '1');
        if (params.get('mainecoon') === '1') u.searchParams.set('mainecoon', '1');
        if (params.get('shorthair') === '1') u.searchParams.set('shorthair', '1');
        if (params.get('husky') === '1') u.searchParams.set('husky', '1');
        if (params.get('corgi') === '1') u.searchParams.set('corgi', '1');
        if (params.get('shiba') === '1') u.searchParams.set('shiba', '1');
        if (params.get('golden') === '1') u.searchParams.set('golden', '1');
        if (params.get('poodle') === '1') u.searchParams.set('poodle', '1');
        if (params.get('bulldog') === '1') u.searchParams.set('bulldog', '1');
        if (params.get('labrador') === '1') u.searchParams.set('labrador', '1');
        if (params.get('beagle') === '1') u.searchParams.set('beagle', '1');
        if (params.get('dachshund') === '1') u.searchParams.set('dachshund', '1');
        if (params.get('samoyed') === '1') u.searchParams.set('samoyed', '1');
        if (params.get('akita') === '1') u.searchParams.set('akita', '1');
        if (params.get('malamute') === '1') u.searchParams.set('malamute', '1');
        if (params.get('eagle') === '1') u.searchParams.set('eagle', '1');
        if (params.get('sparrow') === '1') u.searchParams.set('sparrow', '1');
        if (params.get('finch') === '1') u.searchParams.set('finch', '1');
        if (params.get('robin') === '1') u.searchParams.set('robin', '1');
        if (params.get('swallow') === '1') u.searchParams.set('swallow', '1');
        if (params.get('swift') === '1') u.searchParams.set('swift', '1');
        if (params.get('crow') === '1') u.searchParams.set('crow', '1');
        if (params.get('pigeon') === '1') u.searchParams.set('pigeon', '1');
        if (params.get('pelican') === '1') u.searchParams.set('pelican', '1');
        if (params.get('flamingo') === '1') u.searchParams.set('flamingo', '1');
        if (params.get('swan') === '1') u.searchParams.set('swan', '1');
        if (params.get('crane') === '1') u.searchParams.set('crane', '1');
        if (params.get('hummingbird') === '1') u.searchParams.set('hummingbird', '1');
        if (params.get('woodpecker') === '1') u.searchParams.set('woodpecker', '1');
        if (params.get('kingfisher') === '1') u.searchParams.set('kingfisher', '1');
        if (params.get('macaw') === '1') u.searchParams.set('macaw', '1');
        if (params.get('cockatoo') === '1') u.searchParams.set('cockatoo', '1');
        if (params.get('albatross') === '1') u.searchParams.set('albatross', '1');
        if (params.get('seagull') === '1') u.searchParams.set('seagull', '1');
        if (params.get('oriole') === '1') u.searchParams.set('oriole', '1');
        if (params.get('nightingale') === '1') u.searchParams.set('nightingale', '1');
        if (params.get('kite') === '1') u.searchParams.set('kite', '1');
        if (params.get('vulture') === '1') u.searchParams.set('vulture', '1');
        if (params.get('condor') === '1') u.searchParams.set('condor', '1');
        if (params.get('kiwi') === '1') u.searchParams.set('kiwi', '1');
        if (params.get('emu') === '1') u.searchParams.set('emu', '1');
        if (params.get('ostrich') === '1') u.searchParams.set('ostrich', '1');
        if (params.get('dodo') === '1') u.searchParams.set('dodo', '1');
        if (params.get('gannet') === '1') u.searchParams.set('gannet', '1');
        if (params.get('lyrebird') === '1') u.searchParams.set('lyrebird', '1');
        if (params.get('tanager') === '1') u.searchParams.set('tanager', '1');
        if (params.get('starling') === '1') u.searchParams.set('starling', '1');
        if (params.get('myna') === '1') u.searchParams.set('myna', '1');
        if (params.get('warbler') === '1') u.searchParams.set('warbler', '1');
        if (params.get('cardinal') === '1') u.searchParams.set('cardinal', '1');
        if (params.get('canary') === '1') u.searchParams.set('canary', '1');
        if (params.get('goldfinch') === '1') u.searchParams.set('goldfinch', '1');
        if (params.get('siskin') === '1') u.searchParams.set('siskin', '1');
        if (params.get('thrush') === '1') u.searchParams.set('thrush', '1');
        if (params.get('lark') === '1') u.searchParams.set('lark', '1');
        if (params.get('pipit') === '1') u.searchParams.set('pipit', '1');
        if (params.get('bunting') === '1') u.searchParams.set('bunting', '1');
        if (params.get('grosbeak') === '1') u.searchParams.set('grosbeak', '1');
        if (params.get('sparrowhawk') === '1') u.searchParams.set('sparrowhawk', '1');
        if (params.get('wagtail') === '1') u.searchParams.set('wagtail', '1');
        if (params.get('shrike') === '1') u.searchParams.set('shrike', '1');
        if (params.get('dipper') === '1') u.searchParams.set('dipper', '1');
        if (params.get('nuthatch') === '1') u.searchParams.set('nuthatch', '1');
        if (params.get('treecreeper') === '1') u.searchParams.set('treecreeper', '1');
        if (params.get('chickadee') === '1') u.searchParams.set('chickadee', '1');
        if (params.get('redstart') === '1') u.searchParams.set('redstart', '1');
        if (params.get('whinchat') === '1') u.searchParams.set('whinchat', '1');
        if (params.get('wheatear') === '1') u.searchParams.set('wheatear', '1');
        if (params.get('stonechat') === '1') u.searchParams.set('stonechat', '1');
        if (params.get('flycatcher') === '1') u.searchParams.set('flycatcher', '1');
        if (params.get('crossbill') === '1') u.searchParams.set('crossbill', '1');
        if (params.get('brambling') === '1') u.searchParams.set('brambling', '1');
        if (params.get('chaffinch') === '1') u.searchParams.set('chaffinch', '1');
        if (params.get('hawfinch') === '1') u.searchParams.set('hawfinch', '1');
        if (params.get('serin') === '1') u.searchParams.set('serin', '1');
        if (params.get('linnet') === '1') u.searchParams.set('linnet', '1');
        if (params.get('redpoll') === '1') u.searchParams.set('redpoll', '1');
        if (params.get('bullfinch') === '1') u.searchParams.set('bullfinch', '1');
        if (params.get('greenfinch') === '1') u.searchParams.set('greenfinch', '1');
        if (params.get('waxwing') === '1') u.searchParams.set('waxwing', '1');
        if (params.get('snowfinch') === '1') u.searchParams.set('snowfinch', '1');
        if (params.get('sandpiper') === '1') u.searchParams.set('sandpiper', '1');
        if (params.get('curlew') === '1') u.searchParams.set('curlew', '1');
        if (params.get('godwit') === '1') u.searchParams.set('godwit', '1');
        if (params.get('snipe') === '1') u.searchParams.set('snipe', '1');
        if (params.get('dunlin') === '1') u.searchParams.set('dunlin', '1');
        if (params.get('redshank') === '1') u.searchParams.set('redshank', '1');
        if (params.get('stint') === '1') u.searchParams.set('stint', '1');
        if (params.get('turnstone') === '1') u.searchParams.set('turnstone', '1');
        if (params.get('greenshank') === '1') u.searchParams.set('greenshank', '1');
        if (params.get('knot') === '1') u.searchParams.set('knot', '1');
        if (params.get('ruff') === '1') u.searchParams.set('ruff', '1');
        if (params.get('sanderling') === '1') u.searchParams.set('sanderling', '1');
        if (params.get('whimbrel') === '1') u.searchParams.set('whimbrel', '1');
        if (params.get('oystercatcher') === '1') u.searchParams.set('oystercatcher', '1');
        if (params.get('pratincole') === '1') u.searchParams.set('pratincole', '1');
        if (params.get('phalarope') === '1') u.searchParams.set('phalarope', '1');
        if (params.get('courser') === '1') u.searchParams.set('courser', '1');
        if (params.get('coot') === '1') u.searchParams.set('coot', '1');
        if (params.get('gallinule') === '1') u.searchParams.set('gallinule', '1');
        if (params.get('moorhen') === '1') u.searchParams.set('moorhen', '1');
        if (params.get('crake') === '1') u.searchParams.set('crake', '1');
        if (params.get('corncrake') === '1') u.searchParams.set('corncrake', '1');
        if (params.get('swamphen') === '1') u.searchParams.set('swamphen', '1');
        if (params.get('grebe') === '1') u.searchParams.set('grebe', '1');
        if (params.get('dabchick') === '1') u.searchParams.set('dabchick', '1');
        if (params.get('loon') === '1') u.searchParams.set('loon', '1');
        if (params.get('auk') === '1') u.searchParams.set('auk', '1');
        if (params.get('murre') === '1') u.searchParams.set('murre', '1');
        if (params.get('guillemot') === '1') u.searchParams.set('guillemot', '1');
        if (params.get('razorbill') === '1') u.searchParams.set('razorbill', '1');
        if (params.get('auklet') === '1') u.searchParams.set('auklet', '1');
        if (params.get('shearwater') === '1') u.searchParams.set('shearwater', '1');
        if (params.get('petrel') === '1') u.searchParams.set('petrel', '1');
        if (params.get('skua') === '1') u.searchParams.set('skua', '1');
        if (params.get('jaeger') === '1') u.searchParams.set('jaeger', '1');
        if (params.get('tropicbird') === '1') u.searchParams.set('tropicbird', '1');
        if (params.get('frigatebird') === '1') u.searchParams.set('frigatebird', '1');
        if (params.get('booby') === '1') u.searchParams.set('booby', '1');
        if (params.get('noddy') === '1') u.searchParams.set('noddy', '1');
        if (params.get('kittiwake') === '1') u.searchParams.set('kittiwake', '1');
        if (params.get('sula') === '1') u.searchParams.set('sula', '1');
        if (params.get('prion') === '1') u.searchParams.set('prion', '1');
        if (params.get('chanterelle') === '1') u.searchParams.set('chanterelle', '1');
        if (params.get('porcini') === '1') u.searchParams.set('porcini', '1');
        if (params.get('shiitake') === '1') u.searchParams.set('shiitake', '1');
        if (params.get('truffle') === '1') u.searchParams.set('truffle', '1');
        if (params.get('enoki') === '1') u.searchParams.set('enoki', '1');
        if (params.get('matsutake') === '1') u.searchParams.set('matsutake', '1');
        if (params.get('amanita') === '1') u.searchParams.set('amanita', '1');
        if (params.get('reishi') === '1') u.searchParams.set('reishi', '1');
        if (params.get('portobello') === '1') u.searchParams.set('portobello', '1');
        if (params.get('bolete') === '1') u.searchParams.set('bolete', '1');
        if (params.get('puffball') === '1') u.searchParams.set('puffball', '1');
        if (params.get('russula') === '1') u.searchParams.set('russula', '1');
        if (params.get('lionsmane') === '1') u.searchParams.set('lionsmane', '1');
        if (params.get('woodblewit') === '1') u.searchParams.set('woodblewit', '1');
        if (params.get('cremini') === '1') u.searchParams.set('cremini', '1');
        if (params.get('saffronmilkcap') === '1') u.searchParams.set('saffronmilkcap', '1');
        if (params.get('kingoyster') === '1') u.searchParams.set('kingoyster', '1');
        if (params.get('shimeji') === '1') u.searchParams.set('shimeji', '1');
        if (params.get('nameko') === '1') u.searchParams.set('nameko', '1');
        if (params.get('maitake') === '1') u.searchParams.set('maitake', '1');
        if (params.get('woodear') === '1') u.searchParams.set('woodear', '1');
        if (params.get('tremella') === '1') u.searchParams.set('tremella', '1');
        if (params.get('cordyceps') === '1') u.searchParams.set('cordyceps', '1');
        if (params.get('chaga') === '1') u.searchParams.set('chaga', '1');
        if (params.get('cauliflower') === '1') u.searchParams.set('cauliflower', '1');
        if (params.get('winecap') === '1') u.searchParams.set('winecap', '1');
        if (params.get('parasol') === '1') u.searchParams.set('parasol', '1');
        if (params.get('dryad') === '1') u.searchParams.set('dryad', '1');
        if (params.get('gypsy') === '1') u.searchParams.set('gypsy', '1');
        if (params.get('webcap') === '1') u.searchParams.set('webcap', '1');
        if (params.get('milkcap') === '1') u.searchParams.set('milkcap', '1');
        if (params.get('fieldmushroom') === '1') u.searchParams.set('fieldmushroom', '1');
        if (params.get('blacktrumpet') === '1') u.searchParams.set('blacktrumpet', '1');
        if (params.get('reindeermoss') === '1') u.searchParams.set('reindeermoss', '1');
        if (params.get('oldmansbeard') === '1') u.searchParams.set('oldmansbeard', '1');
        if (params.get('britishsoldiers') === '1') u.searchParams.set('britishsoldiers', '1');
        if (params.get('pixiecups') === '1') u.searchParams.set('pixiecups', '1');
        if (params.get('mapdust') === '1') u.searchParams.set('mapdust', '1');
        if (params.get('rosette') === '1') u.searchParams.set('rosette', '1');
        if (params.get('wolflichen') === '1') u.searchParams.set('wolflichen', '1');
        if (params.get('sunburst') === '1') u.searchParams.set('sunburst', '1');
        if (params.get('tarspots') === '1') u.searchParams.set('tarspots', '1');
        if (params.get('bloodstain') === '1') u.searchParams.set('bloodstain', '1');
        if (params.get('firedot') === '1') u.searchParams.set('firedot', '1');
        if (params.get('lungwort') === '1') u.searchParams.set('lungwort', '1');
        if (params.get('rockposy') === '1') u.searchParams.set('rockposy', '1');
        if (params.get('golddust') === '1') u.searchParams.set('golddust', '1');
        if (params.get('blackeye') === '1') u.searchParams.set('blackeye', '1');
        if (params.get('greenshield') === '1') u.searchParams.set('greenshield', '1');
        if (params.get('waxpaper') === '1') u.searchParams.set('waxpaper', '1');
        if (params.get('cumberland') === '1') u.searchParams.set('cumberland', '1');
        if (params.get('foamlichen') === '1') u.searchParams.set('foamlichen', '1');
        if (params.get('pepperedrock') === '1') u.searchParams.set('pepperedrock', '1');
        if (params.get('rimlichen') === '1') u.searchParams.set('rimlichen', '1');
        if (params.get('haircap') === '1') u.searchParams.set('haircap', '1');
        if (params.get('sphagnum') === '1') u.searchParams.set('sphagnum', '1');
        if (params.get('cushionmoss') === '1') u.searchParams.set('cushionmoss', '1');
        if (params.get('fernmoss') === '1') u.searchParams.set('fernmoss', '1');
        if (params.get('spoonmoss') === '1') u.searchParams.set('spoonmoss', '1');
        if (params.get('broommoss') === '1') u.searchParams.set('broommoss', '1');
        if (params.get('stairstep') === '1') u.searchParams.set('stairstep', '1');
        if (params.get('rockmoss') === '1') u.searchParams.set('rockmoss', '1');
        if (params.get('junipermoss') === '1') u.searchParams.set('junipermoss', '1');
        if (params.get('swanneck') === '1') u.searchParams.set('swanneck', '1');
        if (params.get('pincushion') === '1') u.searchParams.set('pincushion', '1');
        if (params.get('watermoss') === '1') u.searchParams.set('watermoss', '1');
        if (params.get('silkywall') === '1') u.searchParams.set('silkywall', '1');
        if (params.get('feathermoss') === '1') u.searchParams.set('feathermoss', '1');
        if (params.get('cordmoss') === '1') u.searchParams.set('cordmoss', '1');
        if (params.get('applemoss') === '1') u.searchParams.set('applemoss', '1');
        if (params.get('bogmoss') === '1') u.searchParams.set('bogmoss', '1');
        if (params.get('coppermoss') === '1') u.searchParams.set('coppermoss', '1');
        if (params.get('maidenhair') === '1') u.searchParams.set('maidenhair', '1');
        if (params.get('hartstongue') === '1') u.searchParams.set('hartstongue', '1');
        if (params.get('polypody') === '1') u.searchParams.set('polypody', '1');
        if (params.get('spleenwort') === '1') u.searchParams.set('spleenwort', '1');
        if (params.get('shieldfern') === '1') u.searchParams.set('shieldfern', '1');
        if (params.get('oakfern') === '1') u.searchParams.set('oakfern', '1');
        if (params.get('ladyfern') === '1') u.searchParams.set('ladyfern', '1');
        if (params.get('malefern') === '1') u.searchParams.set('malefern', '1');
        if (params.get('hollyfern') === '1') u.searchParams.set('hollyfern', '1');
        if (params.get('sensitivefern') === '1') u.searchParams.set('sensitivefern', '1');
        if (params.get('cinnamonfern') === '1') u.searchParams.set('cinnamonfern', '1');
        if (params.get('royalfern') === '1') u.searchParams.set('royalfern', '1');
        if (params.get('brake') === '1') u.searchParams.set('brake', '1');
        if (params.get('chainfern') === '1') u.searchParams.set('chainfern', '1');
        if (params.get('adderstongue') === '1') u.searchParams.set('adderstongue', '1');
        if (params.get('moonwort') === '1') u.searchParams.set('moonwort', '1');
        if (params.get('grapefern') === '1') u.searchParams.set('grapefern', '1');
        if (params.get('rattlesnake') === '1') u.searchParams.set('rattlesnake', '1');
        if (params.get('staghorn') === '1') u.searchParams.set('staghorn', '1');
        if (params.get('elkhorn') === '1') u.searchParams.set('elkhorn', '1');
        if (params.get('birdsnest') === '1') u.searchParams.set('birdsnest', '1');
        if (params.get('swordfern') === '1') u.searchParams.set('swordfern', '1');
        if (params.get('bostonfern') === '1') u.searchParams.set('bostonfern', '1');
        if (params.get('rabbitfoot') === '1') u.searchParams.set('rabbitfoot', '1');
        if (params.get('buttonfern') === '1') u.searchParams.set('buttonfern', '1');
        if (params.get('cliffbrake') === '1') u.searchParams.set('cliffbrake', '1');
        if (params.get('lacefern') === '1') u.searchParams.set('lacefern', '1');
        if (params.get('silverfern') === '1') u.searchParams.set('silverfern', '1');
        if (params.get('treefern') === '1') u.searchParams.set('treefern', '1');
        if (params.get('filmyfern') === '1') u.searchParams.set('filmyfern', '1');
        if (params.get('whiskfern') === '1') u.searchParams.set('whiskfern', '1');
        if (params.get('quillwort') === '1') u.searchParams.set('quillwort', '1');
        if (params.get('clubmoss') === '1') u.searchParams.set('clubmoss', '1');
        if (params.get('horsetail') === '1') u.searchParams.set('horsetail', '1');
        if (params.get('scouringrush') === '1') u.searchParams.set('scouringrush', '1');
        if (params.get('spikemoss') === '1') u.searchParams.set('spikemoss', '1');
        if (params.get('ginkgo') === '1') u.searchParams.set('ginkgo', '1');
        if (params.get('cycad') === '1') u.searchParams.set('cycad', '1');
        if (params.get('monkeypuzzle') === '1') u.searchParams.set('monkeypuzzle', '1');
        if (params.get('sequoia') === '1') u.searchParams.set('sequoia', '1');
        if (params.get('redwood') === '1') u.searchParams.set('redwood', '1');
        if (params.get('bristlecone') === '1') u.searchParams.set('bristlecone', '1');
        if (params.get('dawnredwood') === '1') u.searchParams.set('dawnredwood', '1');
        if (params.get('hemlock') === '1') u.searchParams.set('hemlock', '1');
        if (params.get('larch') === '1') u.searchParams.set('larch', '1');
        if (params.get('douglasfir') === '1') u.searchParams.set('douglasfir', '1');
        if (params.get('ponderosa') === '1') u.searchParams.set('ponderosa', '1');
        if (params.get('yewtree') === '1') u.searchParams.set('yewtree', '1');
        if (params.get('fir') === '1') u.searchParams.set('fir', '1');
        if (params.get('blackpine') === '1') u.searchParams.set('blackpine', '1');
        if (params.get('scotspine') === '1') u.searchParams.set('scotspine', '1');
        if (params.get('whitepine') === '1') u.searchParams.set('whitepine', '1');
        if (params.get('stonepine') === '1') u.searchParams.set('stonepine', '1');
        if (params.get('pinon') === '1') u.searchParams.set('pinon', '1');
        if (params.get('oak') === '1') u.searchParams.set('oak', '1');
        if (params.get('elm') === '1') u.searchParams.set('elm', '1');
        if (params.get('beech') === '1') u.searchParams.set('beech', '1');
        if (params.get('alder') === '1') u.searchParams.set('alder', '1');
        if (params.get('aspen') === '1') u.searchParams.set('aspen', '1');
        if (params.get('poplar') === '1') u.searchParams.set('poplar', '1');
        if (params.get('hazel') === '1') u.searchParams.set('hazel', '1');
        if (params.get('hornbeam') === '1') u.searchParams.set('hornbeam', '1');
        if (params.get('linden') === '1') u.searchParams.set('linden', '1');
        if (params.get('rowan') === '1') u.searchParams.set('rowan', '1');
        if (params.get('hawthorn') === '1') u.searchParams.set('hawthorn', '1');
        if (params.get('holly') === '1') u.searchParams.set('holly', '1');
        if (params.get('magnolia') === '1') u.searchParams.set('magnolia', '1');
        if (params.get('dogwood') === '1') u.searchParams.set('dogwood', '1');
        if (params.get('redbud') === '1') u.searchParams.set('redbud', '1');
        if (params.get('catalpa') === '1') u.searchParams.set('catalpa', '1');
        if (params.get('sweetgum') === '1') u.searchParams.set('sweetgum', '1');
        if (params.get('hackberry') === '1') u.searchParams.set('hackberry', '1');
        if (params.get('elder') === '1') u.searchParams.set('elder', '1');
        if (params.get('sumac') === '1') u.searchParams.set('sumac', '1');
        if (params.get('buckeye') === '1') u.searchParams.set('buckeye', '1');
        if (params.get('tupelo') === '1') u.searchParams.set('tupelo', '1');
        if (params.get('locust') === '1') u.searchParams.set('locust', '1');
        if (params.get('smoketree') === '1') u.searchParams.set('smoketree', '1');
        if (params.get('euonymus') === '1') u.searchParams.set('euonymus', '1');
        if (params.get('figtree') === '1') u.searchParams.set('figtree', '1');
        if (params.get('plane') === '1') u.searchParams.set('plane', '1');
        if (params.get('baobab') === '1') u.searchParams.set('baobab', '1');
        if (params.get('kapok') === '1') u.searchParams.set('kapok', '1');
        if (params.get('paulownia') === '1') u.searchParams.set('paulownia', '1');
        if (params.get('ailanthus') === '1') u.searchParams.set('ailanthus', '1');
        if (params.get('toon') === '1') u.searchParams.set('toon', '1');
        if (params.get('chinaberry') === '1') u.searchParams.set('chinaberry', '1');
        if (params.get('neem') === '1') u.searchParams.set('neem', '1');
        if (params.get('camphor') === '1') u.searchParams.set('camphor', '1');
        if (params.get('goldenrain') === '1') u.searchParams.set('goldenrain', '1');
        if (params.get('tallowtree') === '1') u.searchParams.set('tallowtree', '1');
        if (params.get('osage') === '1') u.searchParams.set('osage', '1');
        if (params.get('soapberry') === '1') u.searchParams.set('soapberry', '1');
        if (params.get('fringetree') === '1') u.searchParams.set('fringetree', '1');
        if (params.get('katsura') === '1') u.searchParams.set('katsura', '1');
        if (params.get('styrax') === '1') u.searchParams.set('styrax', '1');
        if (params.get('ironwood') === '1') u.searchParams.set('ironwood', '1');
        if (params.get('serviceberry') === '1') u.searchParams.set('serviceberry', '1');
        if (params.get('pawpaw') === '1') u.searchParams.set('pawpaw', '1');
        if (params.get('hophornbeam') === '1') u.searchParams.set('hophornbeam', '1');
        if (params.get('musclewood') === '1') u.searchParams.set('musclewood', '1');
        if (params.get('yellowwood') === '1') u.searchParams.set('yellowwood', '1');
        if (params.get('silverbell') === '1') u.searchParams.set('silverbell', '1');
        if (params.get('snowbell') === '1') u.searchParams.set('snowbell', '1');
        if (params.get('persianironwood') === '1') u.searchParams.set('persianironwood', '1');
        if (params.get('hydrangea') === '1') u.searchParams.set('hydrangea', '1');
        if (params.get('rhododendron') === '1') u.searchParams.set('rhododendron', '1');
        if (params.get('azalea') === '1') u.searchParams.set('azalea', '1');
        if (params.get('camellia') === '1') u.searchParams.set('camellia', '1');
        if (params.get('gardenia') === '1') u.searchParams.set('gardenia', '1');
        if (params.get('hibiscus') === '1') u.searchParams.set('hibiscus', '1');
        if (params.get('jasmine') === '1') u.searchParams.set('jasmine', '1');
        if (params.get('bougainvillea') === '1') u.searchParams.set('bougainvillea', '1');
        if (params.get('clematis') === '1') u.searchParams.set('clematis', '1');
        if (params.get('ivy') === '1') u.searchParams.set('ivy', '1');
        if (params.get('honeysuckle') === '1') u.searchParams.set('honeysuckle', '1');
        if (params.get('osmanthus') === '1') u.searchParams.set('osmanthus', '1');
        if (params.get('peony') === '1') u.searchParams.set('peony', '1');
        if (params.get('dahlia') === '1') u.searchParams.set('dahlia', '1');
        if (params.get('kerria') === '1') u.searchParams.set('kerria', '1');
        if (params.get('forsythia') === '1') u.searchParams.set('forsythia', '1');
        if (params.get('spiraea') === '1') u.searchParams.set('spiraea', '1');
        if (params.get('weigela') === '1') u.searchParams.set('weigela', '1');
        if (params.get('mockorange') === '1') u.searchParams.set('mockorange', '1');
        if (params.get('deutzia') === '1') u.searchParams.set('deutzia', '1');
        if (params.get('barberry') === '1') u.searchParams.set('barberry', '1');
        if (params.get('pyracantha') === '1') u.searchParams.set('pyracantha', '1');
        if (params.get('cotoneaster') === '1') u.searchParams.set('cotoneaster', '1');
        if (params.get('viburnum') === '1') u.searchParams.set('viburnum', '1');
        if (params.get('abelia') === '1') u.searchParams.set('abelia', '1');
        if (params.get('nandina') === '1') u.searchParams.set('nandina', '1');
        if (params.get('pieris') === '1') u.searchParams.set('pieris', '1');
        if (params.get('skimmia') === '1') u.searchParams.set('skimmia', '1');
        if (params.get('hebe') === '1') u.searchParams.set('hebe', '1');
        if (params.get('escallonia') === '1') u.searchParams.set('escallonia', '1');
        if (params.get('beautyberry') === '1') u.searchParams.set('beautyberry', '1');
        if (params.get('snowberry') === '1') u.searchParams.set('snowberry', '1');
        if (params.get('winterberry') === '1') u.searchParams.set('winterberry', '1');
        if (params.get('beautybush') === '1') u.searchParams.set('beautybush', '1');
        if (params.get('ninebark') === '1') u.searchParams.set('ninebark', '1');
        if (params.get('aronia') === '1') u.searchParams.set('aronia', '1');
        if (params.get('pittosporum') === '1') u.searchParams.set('pittosporum', '1');
        if (params.get('choisya') === '1') u.searchParams.set('choisya', '1');
        if (params.get('sarcococca') === '1') u.searchParams.set('sarcococca', '1');
        if (params.get('kalmia') === '1') u.searchParams.set('kalmia', '1');
        if (params.get('leucothoe') === '1') u.searchParams.set('leucothoe', '1');
        if (params.get('andromeda') === '1') u.searchParams.set('andromeda', '1');
        if (params.get('rosemary') === '1') u.searchParams.set('rosemary', '1');
        if (params.get('oregano') === '1') u.searchParams.set('oregano', '1');
        if (params.get('tarragon') === '1') u.searchParams.set('tarragon', '1');
        if (params.get('chervil') === '1') u.searchParams.set('chervil', '1');
        if (params.get('lovage') === '1') u.searchParams.set('lovage', '1');
        if (params.get('marjoram') === '1') u.searchParams.set('marjoram', '1');
        if (params.get('hyssop') === '1') u.searchParams.set('hyssop', '1');
        if (params.get('savory') === '1') u.searchParams.set('savory', '1');
        if (params.get('epazote') === '1') u.searchParams.set('epazote', '1');
        if (params.get('caraway') === '1') u.searchParams.set('caraway', '1');
        if (params.get('cardamom') === '1') u.searchParams.set('cardamom', '1');
        if (params.get('turmeric') === '1') u.searchParams.set('turmeric', '1');
        if (params.get('anise') === '1') u.searchParams.set('anise', '1');
        if (params.get('fenugreek') === '1') u.searchParams.set('fenugreek', '1');
        if (params.get('allspice') === '1') u.searchParams.set('allspice', '1');
        if (params.get('clove') === '1') u.searchParams.set('clove', '1');
        if (params.get('vanilla') === '1') u.searchParams.set('vanilla', '1');
        if (params.get('galangal') === '1') u.searchParams.set('galangal', '1');
        if (params.get('lemongrass') === '1') u.searchParams.set('lemongrass', '1');
        if (params.get('pandan') === '1') u.searchParams.set('pandan', '1');
        if (params.get('kaffir') === '1') u.searchParams.set('kaffir', '1');
        if (params.get('quinoa') === '1') u.searchParams.set('quinoa', '1');
        if (params.get('amaranth') === '1') u.searchParams.set('amaranth', '1');
        if (params.get('spelt') === '1') u.searchParams.set('spelt', '1');
        if (params.get('farro') === '1') u.searchParams.set('farro', '1');
        if (params.get('teff') === '1') u.searchParams.set('teff', '1');
        if (params.get('buckwheat') === '1') u.searchParams.set('buckwheat', '1');
        if (params.get('sorghum') === '1') u.searchParams.set('sorghum', '1');
        if (params.get('einkorn') === '1') u.searchParams.set('einkorn', '1');
        if (params.get('kamut') === '1') u.searchParams.set('kamut', '1');
        if (params.get('freekeh') === '1') u.searchParams.set('freekeh', '1');
        if (params.get('bulgur') === '1') u.searchParams.set('bulgur', '1');
        if (params.get('couscous') === '1') u.searchParams.set('couscous', '1');
        if (params.get('chickpea') === '1') u.searchParams.set('chickpea', '1');
        if (params.get('lentil') === '1') u.searchParams.set('lentil', '1');
        if (params.get('adzuki') === '1') u.searchParams.set('adzuki', '1');
        if (params.get('blackbean') === '1') u.searchParams.set('blackbean', '1');
        if (params.get('kidneybean') === '1') u.searchParams.set('kidneybean', '1');
        if (params.get('mungbean') === '1') u.searchParams.set('mungbean', '1');
        if (params.get('navybean') === '1') u.searchParams.set('navybean', '1');
        if (params.get('pinto') === '1') u.searchParams.set('pinto', '1');
        if (params.get('limabean') === '1') u.searchParams.set('limabean', '1');
        if (params.get('fava') === '1') u.searchParams.set('fava', '1');
        if (params.get('edamame') === '1') u.searchParams.set('edamame', '1');
        if (params.get('cannellini') === '1') u.searchParams.set('cannellini', '1');
        if (params.get('almond') === '1') u.searchParams.set('almond', '1');
        if (params.get('cashew') === '1') u.searchParams.set('cashew', '1');
        if (params.get('pecan') === '1') u.searchParams.set('pecan', '1');
        if (params.get('macadamia') === '1') u.searchParams.set('macadamia', '1');
        if (params.get('brazilnut') === '1') u.searchParams.set('brazilnut', '1');
        if (params.get('pinenut') === '1') u.searchParams.set('pinenut', '1');
        if (params.get('guava') === '1') u.searchParams.set('guava', '1');
        if (params.get('papaya') === '1') u.searchParams.set('papaya', '1');
        if (params.get('dragonfruit') === '1') u.searchParams.set('dragonfruit', '1');
        if (params.get('mangosteen') === '1') u.searchParams.set('mangosteen', '1');
        if (params.get('rambutan') === '1') u.searchParams.set('rambutan', '1');
        if (params.get('durian') === '1') u.searchParams.set('durian', '1');
        if (params.get('kumquat') === '1') u.searchParams.set('kumquat', '1');
        if (params.get('clementine') === '1') u.searchParams.set('clementine', '1');
        if (params.get('satsuma') === '1') u.searchParams.set('satsuma', '1');
        if (params.get('gooseberry') === '1') u.searchParams.set('gooseberry', '1');
        if (params.get('cloudberry') === '1') u.searchParams.set('cloudberry', '1');
        if (params.get('lingonberry') === '1') u.searchParams.set('lingonberry', '1');
        if (params.get('elderberry') === '1') u.searchParams.set('elderberry', '1');
        if (params.get('acerola') === '1') u.searchParams.set('acerola', '1');
        if (params.get('seabuckthorn') === '1') u.searchParams.set('seabuckthorn', '1');
        if (params.get('artichoke') === '1') u.searchParams.set('artichoke', '1');
        if (params.get('kohlrabi') === '1') u.searchParams.set('kohlrabi', '1');
        if (params.get('rutabaga') === '1') u.searchParams.set('rutabaga', '1');
        if (params.get('parsnip') === '1') u.searchParams.set('parsnip', '1');
        if (params.get('celeriac') === '1') u.searchParams.set('celeriac', '1');
        if (params.get('jicama') === '1') u.searchParams.set('jicama', '1');
        if (params.get('arugula') === '1') u.searchParams.set('arugula', '1');
        if (params.get('radicchio') === '1') u.searchParams.set('radicchio', '1');
        if (params.get('mizuna') === '1') u.searchParams.set('mizuna', '1');
        if (params.get('endive') === '1') u.searchParams.set('endive', '1');
        if (params.get('tatsoi') === '1') u.searchParams.set('tatsoi', '1');
        if (params.get('escarole') === '1') u.searchParams.set('escarole', '1');
        if (params.get('kabocha') === '1') u.searchParams.set('kabocha', '1');
        if (params.get('butternut') === '1') u.searchParams.set('butternut', '1');
        if (params.get('delicata') === '1') u.searchParams.set('delicata', '1');
        if (params.get('honeydew') === '1') u.searchParams.set('honeydew', '1');
        if (params.get('cantaloupe') === '1') u.searchParams.set('cantaloupe', '1');
        if (params.get('galia') === '1') u.searchParams.set('galia', '1');
        if (params.get('poblano') === '1') u.searchParams.set('poblano', '1');
        if (params.get('jalapeno') === '1') u.searchParams.set('jalapeno', '1');
        if (params.get('habanero') === '1') u.searchParams.set('habanero', '1');
        if (params.get('serrano') === '1') u.searchParams.set('serrano', '1');
        if (params.get('shishito') === '1') u.searchParams.set('shishito', '1');
        if (params.get('scotchbonnet') === '1') u.searchParams.set('scotchbonnet', '1');
        if (params.get('shallot') === '1') u.searchParams.set('shallot', '1');
        if (params.get('chive') === '1') u.searchParams.set('chive', '1');
        if (params.get('ramp') === '1') u.searchParams.set('ramp', '1');
        if (params.get('pecorino') === '1') u.searchParams.set('pecorino', '1');
        if (params.get('gouda') === '1') u.searchParams.set('gouda', '1');
        if (params.get('brie') === '1') u.searchParams.set('brie', '1');
        if (params.get('gruyere') === '1') u.searchParams.set('gruyere', '1');
        if (params.get('manchego') === '1') u.searchParams.set('manchego', '1');
        if (params.get('camembert') === '1') u.searchParams.set('camembert', '1');
        if (params.get('brioche') === '1') u.searchParams.set('brioche', '1');
        if (params.get('focaccia') === '1') u.searchParams.set('focaccia', '1');
        if (params.get('ciabatta') === '1') u.searchParams.set('ciabatta', '1');
        if (params.get('sourdough') === '1') u.searchParams.set('sourdough', '1');
        if (params.get('pretzel') === '1') u.searchParams.set('pretzel', '1');
        if (params.get('baguette') === '1') u.searchParams.set('baguette', '1');
        if (params.get('uni') === '1') u.searchParams.set('uni', '1');
        if (params.get('ikura') === '1') u.searchParams.set('ikura', '1');
        if (params.get('tobiko') === '1') u.searchParams.set('tobiko', '1');
        if (params.get('unagi') === '1') u.searchParams.set('unagi', '1');
        if (params.get('hamachi') === '1') u.searchParams.set('hamachi', '1');
        if (params.get('maguro') === '1') u.searchParams.set('maguro', '1');
        if (params.get('umeshu') === '1') u.searchParams.set('umeshu', '1');
        if (params.get('soju') === '1') u.searchParams.set('soju', '1');
        if (params.get('makgeolli') === '1') u.searchParams.set('makgeolli', '1');
        if (params.get('baijiu') === '1') u.searchParams.set('baijiu', '1');
        if (params.get('awamori') === '1') u.searchParams.set('awamori', '1');
        if (params.get('shochu') === '1') u.searchParams.set('shochu', '1');
        if (params.get('whiskey') === '1') u.searchParams.set('whiskey', '1');
        if (params.get('brandy') === '1') u.searchParams.set('brandy', '1');
        if (params.get('rum') === '1') u.searchParams.set('rum', '1');
        if (params.get('fuchsia') === '1') u.searchParams.set('fuchsia', '1');
        if (params.get('oleander') === '1') u.searchParams.set('oleander', '1');
        if (params.get('buddleia') === '1') u.searchParams.set('buddleia', '1');
        if (params.get('gorse') === '1') u.searchParams.set('gorse', '1');
        if (params.get('broom') === '1') u.searchParams.set('broom', '1');
        if (params.get('lantana') === '1') u.searchParams.set('lantana', '1');
        if (params.get('mahonia') === '1') u.searchParams.set('mahonia', '1');
        if (params.get('photinia') === '1') u.searchParams.set('photinia', '1');
        if (params.get('aucuba') === '1') u.searchParams.set('aucuba', '1');
        if (params.get('hypericum') === '1') u.searchParams.set('hypericum', '1');
        if (params.get('daphne') === '1') u.searchParams.set('daphne', '1');
        if (params.get('potentilla') === '1') u.searchParams.set('potentilla', '1');
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
      if (params.get('chil') === '1') u.searchParams.set('chil', '1');
      if (params.get('ref') === '1') u.searchParams.set('ref', '1');
      if (params.get('duo') === '1') u.searchParams.set('duo', '1');
      if (params.get('sky') === '1') u.searchParams.set('sky', '1');
      if (params.get('bob') === '1') u.searchParams.set('bob', '1');
      if (params.get('cam') === '1') u.searchParams.set('cam', '1');
      if (params.get('lvl') === '1') u.searchParams.set('lvl', '1');
      if (params.get('dots') === '1') u.searchParams.set('dots', '1');
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

    // iter-1705: coin dig easter egg — dblclick the visual to dig out a +¥ coin
    document.addEventListener('dblclick', function (e) {
      var stage = e.target && e.target.closest ? e.target.closest('.energy-stage') : null;
      if (!stage) return;
      var sym = '¥';
      try { sym = (window.SalaryApp.getState().symbol) || '¥'; } catch (err) {}
      var coin = document.createElement('span');
      coin.className = 'dig-coin';
      coin.textContent = '+' + sym + '1';
      var r = stage.getBoundingClientRect();
      coin.style.left = (e.clientX - r.left) + 'px';
      coin.style.top = (e.clientY - r.top) + 'px';
      stage.appendChild(coin);
      setTimeout(function () { coin.remove(); }, 1600);
    });
