#!/usr/bin/env python3
"""Keep the crew's live data safe when republishing the app.

The published artifact stores the tracker's data inside index.html itself, in
the <script id="app-state"> tag. The source file in this folder keeps that tag
empty ("null") so a fresh copy starts clean — which means publishing the source
as-is would wipe whatever the crew has entered.

Workflow when changing the app:
    1. save the live data first:      python3 sync-live-state.py backup <fetched-artifact.html>
    2. edit index.html as normal
    3. inject the data before publishing:  python3 sync-live-state.py inject
    4. publish index.html
    5. put the source back to clean:       python3 sync-live-state.py clear
"""
import json, re, sys, pathlib

HERE = pathlib.Path(__file__).parent
APP = HERE / 'index.html'
BACKUP = HERE / 'live-state-backup.json'
PAT = re.compile(r'(<script id="app-state" type="application/json">)(.*?)(</script>)', re.S)

def swap(new_json: str) -> None:
    html = APP.read_text(encoding='utf-8')
    if not PAT.search(html):
        sys.exit('app-state tag not found in index.html')
    APP.write_text(PAT.sub(lambda m: m.group(1) + new_json + m.group(3), html, count=1), encoding='utf-8')

cmd = sys.argv[1] if len(sys.argv) > 1 else ''
if cmd == 'backup':
    src = pathlib.Path(sys.argv[2]).read_text(encoding='utf-8')
    m = PAT.search(src)
    if not m:
        sys.exit('no app-state in that file')
    BACKUP.write_text(json.dumps(json.loads(m.group(2)), indent=2, ensure_ascii=False), encoding='utf-8')
    print('saved live data to', BACKUP.name)
elif cmd == 'inject':
    data = json.loads(BACKUP.read_text(encoding='utf-8'))
    swap(json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))
    print('injected', len(data.get('jobs', [])), 'jobs into index.html — publish now, then run: clear')
elif cmd == 'clear':
    swap('null')
    print('index.html reset to a clean tracker')
else:
    sys.exit(__doc__)
