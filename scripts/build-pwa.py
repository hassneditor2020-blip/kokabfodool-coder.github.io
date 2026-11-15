"""Regenerate PWA icons, integration and the versioned offline games pack after site changes."""
import pathlib,json,hashlib,re,urllib.parse
from PIL import Image,ImageOps,ImageDraw
root=pathlib.Path('.');assets=root/'assets'
logo=Image.open(assets/'brand.webp').convert('RGBA')
for size,name,fraction in [(192,'app-icon-192.png',.88),(512,'app-icon-512.png',.88),(512,'app-maskable-512.png',.64)]:
    icon=Image.new('RGBA',(size,size),'#f4efff')
    inner=ImageOps.contain(logo,(round(size*fraction),round(size*fraction)),Image.Resampling.LANCZOS)
    icon.alpha_composite(inner,((size-inner.width)//2,(size-inner.height)//2))
    icon.convert('RGB').save(assets/name,optimize=True)
integration='<link rel="manifest" href="/manifest.webmanifest"/>\n<link rel="apple-touch-icon" href="/assets/app-icon-192.png"/>\n<link rel="stylesheet" href="/assets/pwa.css"/>\n<script defer src="/assets/pwa.js"></script>\n'
for p in root.rglob('index.html'):
    if '.git' in p.parts:continue
    s=p.read_text()
    if 'assets/site.js' not in s or 'name="robots" content="noindex' in s or 'content="noindex' in s:continue
    if '/manifest.webmanifest' not in s:s=s.replace('</head>',integration+'</head>',1)
    if p.as_posix() in ['index.html','en/index.html','games/index.html','en/games/index.html'] and 'data-pwa-slot' not in s:
        if p.as_posix() in ['index.html','en/index.html']:
            s=s.replace('<section class="home-stats-section"','<div class="wrap" data-pwa-slot></div>\n<section class="home-stats-section"',1)
        else:s=s.replace('<section class="age-journey"','<div data-pwa-slot></div>\n<section class="age-journey"',1)
    # Safe areas for installed mobile devices.
    s=s.replace('width=device-width,initial-scale=1"','width=device-width,initial-scale=1,viewport-fit=cover"')
    p.write_text(s)
# Pack includes the current canonical app/game pages, all local media and code required by the games.
pages=['/','/en/','/games/','/en/games/','/app/','/en/app/','/offline/','/en/offline/','/grown-ups/','/en/grown-ups/','/episodes/','/en/episodes/','/privacy/','/en/privacy/']
for prefix in ['', 'en/']:
    pages += ['/'+p.parent.as_posix()+'/' for p in (root/(prefix+'games')).glob('*/index.html')]
assert len([x for x in pages if re.match(r'^/(?:en/)?games/[^/]+/$',x)])==40
files={u:root/(u.lstrip('/')+'index.html') for u in pages}
files['/manifest.webmanifest']=root/'manifest.webmanifest'
# All original audio variants are retained in the pack, including old references that may still occur.
for p in assets.rglob('*'):
    if p.is_file() and p.suffix.lower() in {'.js','.css','.svg','.webp','.png','.jpg','.jpeg','.mp3','.ogg','.wav','.woff2','.json'}:
        files['/'+urllib.parse.quote(p.as_posix(),safe='/')]=p
h=hashlib.sha256();total=0
for url,p in sorted(files.items()):
    assert p.is_file(),(url,p)
    data=p.read_bytes();h.update(url.encode());h.update(hashlib.sha256(data).digest());total+=len(data)
pack={'version':h.hexdigest()[:16],'bytes':total,'files':sorted(files)}
(root/'offline-pack.json').write_text(json.dumps(pack,ensure_ascii=False,separators=(',',':'))+'\n')
print('Offline pack:',len(files),'files',total,'bytes, release',pack['version'])
