#!/usr/bin/env python3
"""Static preflight for V5. Never modifies site files."""
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
catalog=json.loads((root/'assets/app-learning-v5.json').read_text())
assert len(catalog['series'])==8
assert '/assets/english-numbers-badge.webp' in paths
assert all(any(e.get('category')=='numbers' for e in next(g for g in catalog['series'] if g['id']=='english-fun')[lang]['episodes']) for lang in ('ar','en'))
for lang,prefix in [('ar',''),('en','en/')]:
    pages=list((root/(prefix+'games')).glob('*/index.html'))
    assert len(pages)==20,(lang,len(pages))
    assert all('/'+p.parent.as_posix()+'/' in paths for p in pages)
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
            assert ep['image'] in paths,ep['image']
            assert file_for(ep['image']).is_file()
            count+=1
    assert count>=54
    print(lang,'20 games, 5 views,',count,'episodes')
assert '/assets/app-learning-v5.json' in paths
print('Offline:',len(paths),'files;',sum(file_for(p).stat().st_size for p in paths),'bytes')
print('Static preflight PASS. This does not replace Android/device testing.')
