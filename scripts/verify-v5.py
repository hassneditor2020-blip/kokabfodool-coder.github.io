#!/usr/bin/env python3
"""Static preflight for the unified website and Android app. Never modifies site files."""
from pathlib import Path
import json,re,urllib.parse,hashlib
from html.parser import HTMLParser
root=Path('.')
pack=json.loads((root/'offline-pack.json').read_text())
paths=set(pack['files'])
def file_for(url):
    p=urllib.parse.unquote(urllib.parse.urlsplit(url).path).lstrip('/')
    return root/(p+'index.html' if url.split('?')[0].endswith('/') else p)
for url in paths:
    assert file_for(url).is_file(),f"Missing offline file: {url}"
assert len(paths)==len(pack['files'])
world_files={p.name for p in (root/'assets/worlds').glob('*.webp')}
assert len(world_files)==32
assert all('/assets/worlds/'+p in paths for p in world_files)
catalog=json.loads((root/'assets/app-learning-v5.json').read_text())
assert len(catalog['series'])==8
assert '/assets/english-numbers-badge.webp' in paths
assert '/assets/fudool-premium-art.svg' in paths
assert (root/'assets/fudool-premium-art.svg').read_text().count('<symbol id=')>=40
assert file_for('/assets/fudool-premium-art.svg').is_file()
assert all(any(e.get('category')=='numbers' for e in next(g for g in catalog['series'] if g['id']=='english-fun')[lang]['episodes']) for lang in ('ar','en'))
for lang,prefix in [('ar',''),('en','en/')]:
    pages=list((root/(prefix+'games')).glob('*/index.html'))
    assert len(pages)==20,(lang,len(pages))
    level_count=0
    for page in pages:
        assert page.parent.name+'.webp' in world_files
        data=re.search(r'<script id="(?:game|drive|match)-data" type="application/json">(.*?)</script>',page.read_text(),re.S)
        assert data,page
        levels=json.loads(data.group(1))['levels']
        assert all(level['rounds'] for level in levels),page
        if page.parent.name == 'trace':
            dictation = levels[10:]
            assert [len(level['rounds']) for level in dictation] == [3, 3, 3]
            assert all('audio' not in task for level in levels[:10] for task in level['rounds'])
            for stage, lengths in zip(dictation, [{3}, {4}, {5, 6}]):
                for task in stage['rounds']:
                    assert len(task['word']) in lengths
                    assert task['kind'] == 'trace' and task['word'] not in task['prompt']
                    assert task['audio'] in paths and task['image'] in paths
        if page.parent.name == 'memory':
            assert [stage['rounds'][0]['match'] for stage in levels[-2:]] == ['word', 'sound']
            for stage in levels[-2:]:
                for task in stage['rounds']:
                    assert len({pair['id'] for pair in task['pairs']}) == len(task['pairs'])
                    if task['match'] == 'sound':
                        assert all(pair['audio'] in paths for pair in task['pairs'])
        if page.parent.name == 'robo-lab':
            for task in levels[-1]['rounds']:
                assert task['kind'] == 'magnet-distance'
                assert len(task['results']) == len(set(task['distances'])) == 3
                assert 0 <= min(task['results']) < max(task['results']) <= task['clips']
        if page.parent.name == 'fudool-shop':
            for task in levels[-1]['rounds']:
                assert task['kind'] == 'purchase'
                subtotal = sum(item['price'] * item['quantity'] for item in task['items'])
                offers = [subtotal - offer.get('amount', subtotal * offer.get('percent', 0) / 100)
                          for offer in task['offers']]
                assert all(price > 0 and int(price) == price for price in offers)
                assert min(offers) < max(offers) and min(offers) <= task['budget']
        if page.parent.name == 'code-robo':
            directions = {(0, -1): 'U', (-1, 0): 'L', (0, 1): 'D', (1, 0): 'R'}
            for task in levels[-1]['rounds']:
                coordinates = task['path']
                commands = [directions[b[0]-a[0], b[1]-a[1]] for a, b in zip(coordinates, coordinates[1:])]
                assert len(commands) == len(task['program'])
                assert sum(a != b for a, b in zip(commands, task['program'])) == 1
                original = task['program']
                open_cells = set(map(tuple, coordinates))
                deltas = {direction: delta for delta, direction in directions.items()}
                solutions = 0
                for slot in range(len(original)):
                    for command in set(deltas) - {original[slot]}:
                        trial = original[:slot] + [command] + original[slot+1:]
                        x, y = coordinates[0]
                        for direction in trial:
                            dx,dy = deltas[direction]
                            x,y = x + dx,y + dy
                            if (x,y) not in open_cells:
                                break
                        else:
                            solutions += int([x,y] == coordinates[-1])
                assert solutions == 1
        if page.parent.name == 'puzzle':
            assert all(task['rotate'] and task['cols'] == task['rows'] and task['image'] in paths
                       for task in levels[-1]['rounds'])
        level_count+=len(levels)
    assert level_count==306,(lang,level_count)
    assert all('/'+p.parent.as_posix()+'/' in paths for p in pages)
    download=(root/(prefix+'app/index.html')).read_text()
    assert download.count('data-release-mode="unified"')==1
    assert 'data-release-mode="offline"' not in download and 'data-release-mode="online"' not in download
    html=(root/(prefix+'play-app/index.html')).read_text()
    for view in ['home','learn','games','achievements','more']:
        assert html.count('data-v5-view="'+view+'"')==1,(lang,view)
    for hook in ['data-app-games','data-app-stats','data-app-avatar','data-app-resume','data-profile-list']:
        assert html.count(hook)==1,(lang,hook)
    for src in re.findall(r'(?:href|src)="(/assets/[^"]+)"',html):
        assert file_for(src).is_file(),src
        assert urllib.parse.urlsplit(src).path in paths,src
    ids=[m.group(1) for m in re.finditer(r'\bid="([^"]+)"',html)]
    assert len(ids)==len(set(ids)),(lang,'duplicate IDs')
    count=0
    for group in catalog['series']:
        for ep in group[lang]['episodes']:
            assert file_for(ep['route']).is_file(),ep['route']
            assert re.fullmatch(r'https://www\.youtube\.com/(?:shorts/|watch\?v=)[A-Za-z0-9_-]{11}',ep['video']),ep['video']
            assert ep['image'] in paths,ep['image']
            assert file_for(ep['image']).is_file()
            count+=1
    assert count>=54
    print(lang,'20 games, 5 views,',count,'episodes')
assert '/assets/app-learning-v5.json' in paths
print('Offline:',len(paths),'files;',sum(file_for(p).stat().st_size for p in paths),'bytes')
print('Static preflight PASS. This does not replace Android/device testing.')
