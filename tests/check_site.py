"""Smoke check: every local asset referenced by index.html exists on disk,
and required SEO/GEO files are present. Exits non-zero on failure."""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

missing = []
for m in re.finditer(r'(?:src|href)="(\./[^"#?]+)', html):
    path = os.path.join(ROOT, m.group(1)[2:])
    if not os.path.exists(path):
        missing.append(m.group(1))

required = ['robots.txt', 'sitemap.xml', 'site.webmanifest', 'sw.js',
            'llms.txt', '404.html', 'assets/css/app.css',
            'assets/js/app.js', 'assets/js/salary-engine.js', 'assets/js/deep-link.js']
for rel in required:
    if not os.path.exists(os.path.join(ROOT, rel)):
        missing.append(rel)

for snippet in ['<title>', 'canonical', 'description', 'application/ld+json']:
    if snippet not in html:
        missing.append('index.html missing ' + snippet)

import json
manifest = json.load(open(os.path.join(ROOT, 'site.webmanifest'), encoding='utf-8'))
for sc in manifest.get('shortcuts', []):
    if 'url' not in sc or 'name' not in sc:
        missing.append('manifest shortcut missing name/url')
for ic in manifest.get('icons', []):
    ipath = os.path.join(ROOT, ic['src'].lstrip('./'))
    if not os.path.exists(ipath):
        missing.append('manifest icon ' + ic['src'])

buttons = set(re.findall(r'data-template="(\w+)"', html))
js = open(os.path.join(ROOT, 'assets/js/app.js'), encoding='utf-8').read()
valid = re.search(r"\['charge','meter','pixel','pig','neon','mono','paper','term','ecg','wave','therm','receipt','sand','dial','trail','metro','lift','eclipse','flap','vinyl','const','plant','shadow','tide','rocket','balloon','aqua','kite','falls','toast','ember','cable','hive','lantern','abacus','ferris','globe','seismo','terrace','crane','slots','domino','match','popcorn','tetris','fishing','pottery','sparkler','origami','typewriter','aurora','catnap','prayer','piano','firejar'\]", js)
if not valid:
    missing.append('app.js template whitelist missing a skin')
extra = buttons - {'charge','meter','pixel','pig','neon','mono','paper','term','ecg','wave','therm','receipt','sand','dial','trail','metro','lift','eclipse','flap','vinyl','const','plant','shadow','tide','rocket','balloon','aqua','kite','falls','toast','ember','cable','hive','lantern','abacus','ferris','globe','seismo','terrace','crane','slots','domino','match','popcorn','tetris','fishing','pottery','sparkler','origami','typewriter','aurora','catnap','prayer','piano','firejar'}
if extra:
    missing.append('template buttons not in JS whitelist: ' + ','.join(sorted(extra)))

# iter-111: ?dialog targets must be real dialog ids
dl = open(os.path.join(ROOT, 'assets/js/deep-link.js'), encoding='utf-8').read()
dialogs = set(re.findall(r'id="(\w+Dialog)"', html))
for t in ['shareDialog','aboutDialog','settingsDialog','goalDialog','calendarDialog','currencyDialog','overtimeDialog']:
    if t not in dialogs:
        missing.append('dialog target missing: ' + t)

# iter-85: shortcuts + share + new skins actually wired
if 'kbd-hint' not in html:
    missing.append('footer kbd-hint missing')
for skin in ['neon', 'mono', 'paper']:
    if 'data-template="' + skin + '"' not in html:
        missing.append('template button ' + skin + ' missing')

for needle in ['navigator.share', "e.key === 'z'", "e.key === 'm'", "e.key === 'p'", 'is-focus']:
    if needle not in dl:
        missing.append('deep-link.js missing ' + needle)

if missing:
    print('SMOKE CHECK FAILED:')
    for m in missing:
        print('  -', m)
    sys.exit(1)
print('smoke check passed:',
      len(re.findall(r'(?:src|href)="\./', html)), 'local refs OK,',
      len(required), 'required files present')

# iter-1724: guard against duplicate top-level const/let in functions (parse-fatal)
lines = js.split('\n')
func_ranges = []
i = 0
while i < len(lines):
    if re.match(r'\s*(?:async\s+)?function\s+\w+\s*\(', lines[i]):
        depth = 0
        start = i
        while True:
            depth += lines[i].count('{') - lines[i].count('}')
            i += 1
            if depth <= 0 or i >= len(lines):
                break
        func_ranges.append((start+1, i))
    else:
        i += 1
dup_err = []
for a, b in func_ranges:
    seen = {}
    for j in range(a-1, b):
        m2 = re.match(r'    (?:const|let) (\w+)\s*=', lines[j])
        if m2:
            if m2.group(1) in seen: dup_err.append((m2.group(1), j+1))
            seen[m2.group(1)] = j+1
assert not dup_err, f"duplicate top-level const in function: {dup_err}"
