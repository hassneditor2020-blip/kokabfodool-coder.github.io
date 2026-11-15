import json,pathlib,hashlib,urllib.parse,requests,subprocess,imageio_ffmpeg,re,html,concurrent.futures
from collections import defaultdict
root=pathlib.Path('.');data=json.loads((root/'scripts/real-sound-sources.json').read_text());sources=data['source'];levels=data['levels']
out=root/'assets/real-sounds';out.mkdir(exist_ok=True);ff=imageio_ffmpeg.get_ffmpeg_exe()
def get_sound(row):
    id,ar,en,art,file,author,license,start,duration=row
    name=file.replace(' ','_');digest=hashlib.md5(name.encode()).hexdigest()
    url='https://upload.wikimedia.org/wikipedia/commons/'+digest[0]+'/'+digest[:2]+'/'+urllib.parse.quote(name)
    response=requests.get(url,headers={'User-Agent':'KawkabFudoolEducationalSoundGame/1.0 (https://kokabfodool.com; kokabfodool@gmail.com)'},timeout=45);response.raise_for_status()
    p=out/(id+'.mp3')
    cmd=[ff,'-v','error','-y','-i','pipe:0','-ss',str(start)]
    if duration:cmd+=['-t',str(duration)]
    cmd+=['-vn','-ac','1','-ar','32000','-af','loudnorm=I=-21:TP=-3:LRA=7','-codec:a','libmp3lame','-b:a','96k',str(p)]
    subprocess.run(cmd,input=response.content,check=True,capture_output=True)
    decoded=subprocess.run([ff,'-v','error','-i',str(p),'-f','s16le','-ac','1','-ar','32000','pipe:1'],capture_output=True,check=True).stdout
    sec=len(decoded)/64000;assert .35<=sec<=20 and p.stat().st_size>2000,(id,sec)
    licurl={'PD':'https://creativecommons.org/publicdomain/mark/1.0/','CC0-1.0':'https://creativecommons.org/publicdomain/zero/1.0/','CC-BY-SA-3.0':'https://creativecommons.org/licenses/by-sa/3.0/','CC-BY-SA-4.0':'https://creativecommons.org/licenses/by-sa/4.0/'}[license]
    record={'id':id,'ar':ar,'en':en,'art':art,'source':'https://commons.wikimedia.org/wiki/File:'+urllib.parse.quote(name),'author':author,'license':license,'licenseUrl':licurl,'duration':round(sec,2),'modification':'Mono MP3; excerpt where indicated; loudness normalization. Adapted audio remains under its source license.'}
    print(id,sec,p.stat().st_size,flush=True);return record
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex: records=list(ex.map(get_sound,sources))
(out/'credits.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
lookup={r['id']:r for r in records};byart={r['art']:r for r in reversed(records)}
# Distractors are distinct sources, not near-identical background sounds.
pools=[['sheep','cow','cat','dog','horse','rooster'],['sheep','cow','cat','dog','horse','rooster'],['bird','frog','cat','rooster','dog'],['rain','water','waves','storm','bird','frog'],['car','train','bell','door','clock'],['clock','tap','door','cat','bell','dog'],['dog','frog','train','rain','bell','horse','cat'],['sheep','horse','cow','bird','rooster','cat'],['waves','storm','clock','tap','door','bird'],['rooster','car','frog','sheep','clock','train']]
for pre in ['','en/']:
    p=root/(pre+'games/sound-quiz/index.html');s=p.read_text()
    m=re.search(r'(<script id="game-data"[^>]*>)([\s\S]*?)(</script>)',s);old=json.loads(m[2])
    newlevels=[]
    for i,(ar,en,ids,n) in enumerate(levels):
        rounds=[]
        for j,id in enumerate(ids):
            r=lookup[id];art=r['art'];pool=[x for x in pools[i] if x!=art and x in byart]
            # Avoid storm/rain in the same choices. Use other distinct sources.
            if art=='storm':pool=[x for x in pool if x!='rain']
            if art=='rain':pool=[x for x in pool if x!='storm']
            if art=='tap':pool=[x for x in pool if x not in ['rain','waves','storm']]
            if art=='waves':pool=[x for x in pool if x not in ['rain','tap','storm']]
            pool=list(dict.fromkeys(pool+['clock','cat','car','bird','door','horse']))
            pool=[x for x in pool if x!=art]
            distractors=[pool[(j+k)%len(pool)] for k in range(n-1)]
            choices=[{'id':x,'ar':byart[x]['ar'],'en':byart[x]['en'],'art':x} for x in [art]+distractors]
            assert len({x['id'] for x in choices})==n
            rounds.append({'kind':'recorded-sound','audio':'/assets/real-sounds/'+id+'.mp3','soundId':id,'answer':art,'choices':choices})
        newlevels.append({'title':en if pre else ar,'rounds':rounds})
    assert len(newlevels)==len(old['levels'])==10 and sum(len(l['rounds']) for l in newlevels)==sum(len(l['rounds']) for l in old['levels'])==41
    old['levels']=newlevels;old['prompt']='Listen carefully. What made that sound?' if pre else 'استمع جيدًا. ما مصدر هذا الصوت؟'
    s=s[:m.start(2)]+json.dumps(old,ensure_ascii=False,separators=(',',':'))+s[m.end(2):]
    desc='Listen to real animal, nature and everyday sounds, then choose the matching picture.' if pre else 'استمع إلى أصوات الحيوانات والطبيعة والأشياء الحقيقية، ثم اختر الصورة المطابقة.'
    s=s.replace('Listen to words and sound patterns and choose.',desc).replace('استمع للكلمات والأنماط الصوتية واختر.',desc)
    s=s.replace('"name":"Count & Pick"','"name":"Guess the Sound"')
    s=re.sub(r'/assets/games\.js\?v=\d+','/assets/sound-world.js?v=1',s)
    s=s.replace('</head>','<link rel="stylesheet" href="/assets/sound-world.css?v=1"/>\n</head>')
    intro='<div class="sound-world-banner"><img src="/assets/lumaa.webp" alt="" width="100" height="100"/><div><strong>'+('Sound detective with Lumaa' if pre else 'المحقق الصوتي مع لُمعة')+'</strong><p>'+('Real recordings • 10 levels • No reading required' if pre else 'تسجيلات حقيقية • 10 مستويات • لا تحتاج إلى القراءة')+'</p></div><svg viewBox="0 0 90 65" aria-hidden="true"><path d="M5 32h10l7-19 9 39 12-48 10 51 9-23h23" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
    s=s.replace('<div class="game-sound-bar">',intro+'<div class="game-sound-bar">',1)
    credit='<details class="sound-credits"><summary>'+('Recording sources and licenses' if pre else 'مصادر التسجيلات وتراخيصها')+'</summary><p>'+('Real field recordings; edited for length, mono and listening level. Each adapted clip retains its source license.' if pre else 'تسجيلات حقيقية؛ قصّت عند الحاجة وحُوّلت إلى صوت أحادي وضُبط مستوى الصوت. يحتفظ كل مقطع بترخيصه الأصلي.')+'</p><ul>'+''.join('<li><a href="'+html.escape(r['source'],quote=True)+'">'+html.escape(r['en'] if pre else r['ar'])+' — '+html.escape(r['author'])+'</a> · <a href="'+r['licenseUrl']+'">'+r['license']+'</a></li>' for r in records)+'</ul></details>'
    s=s.replace('<noscript>',credit+'<noscript>',1);p.write_text(s)
for p in [root/'index.html',root/'en/index.html',root/'games/index.html',root/'en/games/index.html']:
    s=p.read_text().replace('استمع للكلمات والأنماط الصوتية واختر.','استمع إلى أصوات حقيقية وتعرّف على مصدرها.').replace('Listen to words and sound patterns and choose.','Listen to real sounds and identify their source.')
    p.write_text(s)
print('Created 19 licensed MP3s, 41 rounds in each language, 10 levels, updated home and hub copy.')
