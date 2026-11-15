"""Repair the 18 isolated CV syllables using labelled, licensed human speech."""
import csv,io,json,re,hashlib,subprocess,pathlib,math,wave,zlib
import requests
from remotezip import RemoteZip
import imageio_ffmpeg
import numpy as np
root=pathlib.Path('.')
base='https://data.mendeley.com/public-files/datasets/r5fy2dd98g/files/'
def get(key):
    r=requests.get(base+key+'/file_downloaded',timeout=45);r.raise_for_status();return r.content
labels={r['huruf']:int(r['no_huruf']) for r in csv.DictReader(io.StringIO(get('b5681e28-6cde-4c62-b7d4-02e9b729481a').decode('utf-8-sig')))}
metadata={r['source_id']:r for r in csv.DictReader(io.StringIO(get('81d29db4-0db2-4dd1-a96e-0ba9b419edfa').decode('utf-8-sig')))}
clips=json.loads(re.search(r'export const clips=(.*?);',(root/'assets/vowel-audio-review.js').read_text())[1])
todo=[c for c in clips if c['status']=='replace'];assert len(todo)==18
# (first gap starts, last gap ends): measured at -35 dB with 180ms minimum silence.
bounds={8:(1.218333,2.221083),11:(1.153375,1.969292),12:(1.080833,1.971625),14:(1.096,None),22:(1.354417,2.140583),23:(1.196792,2.227958),25:(1.130917,None),35:(1.282333,2.08125),36:(1.27275,2.095542),38:(1.214292,2.154458),52:(1.16125,1.983792),53:(1.128167,2.319083),58:(1.203667,2.181583),70:(1.318417,2.19575),74:(1.474167,2.606),75:(1.646708,2.548667),80:(1.242333,None),83:(1.424,2.405458)}
assert set(bounds)=={c['id'] for c in todo}
ff=imageio_ffmpeg.get_ffmpeg_exe();sr=24000
def decode(data):
    p=subprocess.run([ff,'-v','error','-i','pipe:0','-ac','1','-ar',str(sr),'-f','f32le','pipe:1'],input=data,capture_output=True,check=True)
    return np.frombuffer(p.stdout,dtype='<f4').copy()
def trim(x):
    # Keep the full consonant and vowel; remove only leading/trailing near-silence.
    win=240; n=len(x)//win
    rms=np.sqrt(np.mean(x[:n*win].reshape(n,win)**2,axis=1))
    peak=rms.max(); assert peak>0.0001
    ids=np.where(rms>peak*0.018)[0]
    assert len(ids)>0
    a=max(0,ids[0]*win-int(.085*sr));b=min(len(x),(ids[-1]+1)*win+int(.085*sr))
    return x[a:b]
def norm(x):
    peak=float(np.max(np.abs(x)));assert peak>0.0001
    return x*min(.86/peak, .11/max(float(np.sqrt(np.mean(x*x))),.0001))
def encode(x,p):
    subprocess.run([ff,'-v','error','-y','-f','f32le','-ar',str(sr),'-ac','1','-i','pipe:0','-codec:a','libmp3lame','-b:a','96k',str(p)],input=x.astype('<f4').tobytes(),check=True)
    assert p.stat().st_size>1500
    return len(decode(p.read_bytes()))/sr
out=root/'assets/vowel-drive-audio-v4';out.mkdir(exist_ok=True)
items=[]
with RemoteZip(base+'bc20baae-7152-439a-a56a-73699fa23381/file_downloaded') as z:
    for c in todo:
        i=c['id'];letter=c['letter'];n=labels[letter];v=c['vowel']+1
        # One speaker, five labelled repetitions; choose the compact, intact recording.
        candidates=[]
        for rep in range(1,6):
            filename=f'{n}-{v}-{rep}.wav';source=f'benar/1/{filename}';row=metadata[source]
            assert row['category']=='benar' and int(row['huruf_no'])==n and int(row['sub'])==v and row['flag_error']=='False',row
            entry=f'Data Benar/1/{filename}';raw=z.read(entry)
            assert zlib.crc32(raw)&0xffffffff==z.getinfo(entry).CRC,entry
            with wave.open(io.BytesIO(raw),'rb') as w:
                assert w.getnchannels()==1 and w.getframerate()==int(row['sr']),entry
                actual_duration=w.getnframes()/w.getframerate()
                pcm=w.readframes(w.getnframes())
            assert abs(actual_duration-float(row['duration']))<.04,(entry,actual_duration,row['duration'])
            digest=hashlib.md5(raw).hexdigest();pcm_digest=hashlib.md5(pcm).hexdigest()
            print('Source',entry,'duration',round(actual_duration,3),'hash match',row['md5'] in (digest,pcm_digest))
            audio=trim(decode(raw));d=len(audio)/sr
            if .17<=d<=1.15:candidates.append((abs(d-.48),rep,audio,entry,digest,row['md5']))
        assert candidates,(i,n,v)
        _,rep,mid,entry,digest,declared=min(candidates,key=lambda x:x[0])
        original=decode((root/f'assets/vowel-drive-audio-v3/{i}.mp3').read_bytes())
        end_header,start_example=bounds[i]
        head=trim(original[:int((end_header+.055)*sr)])
        segments=[norm(head),np.zeros(int(sr*.29),dtype=np.float32),norm(mid)]
        if start_example is not None:
            tail=trim(original[max(0,int((start_example-.055)*sr)):]);assert len(tail)>sr*.12
            segments.extend([np.zeros(int(sr*.30),dtype=np.float32),norm(tail)])
        full=np.concatenate([np.zeros(int(sr*.08),dtype=np.float32),*segments,np.zeros(int(sr*.1),dtype=np.float32)])
        length=encode(full,out/f'{i}.mp3')
        middle_length=encode(norm(mid),out/f'{i}-syllable.mp3')
        item={'id':i,'letter':letter,'vowel':c['vowel'],'syllable':c['syllable'],'example':c['example'],'mode':'full' if start_example is not None else 'letter-vowel-only','dataset_file':entry,'source_md5':digest,'metadata_md5':declared,'middle_seconds':round(middle_length,3),'recording_seconds':round(length,3),'source_class':'correct/benar','human_listening_review':False}
        items.append(item);print(json.dumps(item,ensure_ascii=False))
assert len(items)==18 and sum(x['mode']=='full' for x in items)==15
(out/'credits.json').write_text(json.dumps({'source':'Azis, Aaz M Hafidz (2026), Hijaiyah Letter Pronunciation Audio Dataset for Articulation Characteristic Classification, Mendeley Data, V1','doi':'https://doi.org/10.17632/r5fy2dd98g.1','license':'https://creativecommons.org/licenses/by/4.0/','modifications':'Selected the labelled correct recordings, trimmed leading/trailing silence, resampled, normalized and spliced with the original game intro/example. No endorsement is implied. Not independently listening-reviewed.','records':items},ensure_ascii=False,indent=2)+'\n')
(out/'README.md').write_text('''# Human-recorded vowel repairs
Middle syllables selected from the dataset labelled correct (Data Benar), using the exact letter/vowel metadata, ZIP CRC, sample rate and duration. The supplied metadata MD5 did not consistently match the WAV bytes; actual file and metadata hashes are recorded separately. No synthetic isolated syllables. Fifteen recordings retain the original intro and example; three retain only the intro and syllable because the original example was wrong or missing. The corrected examples are shown in writing in the game.

Source: Azis, Aaz M Hafidz (2026), *Hijaiyah Letter Pronunciation Audio Dataset for Articulation Characteristic Classification*, Mendeley Data, V1, https://doi.org/10.17632/r5fy2dd98g.1. License: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/. Selected, trimmed, normalized, resampled and combined with game speech. No endorsement implied. See credits.json for source paths and checksums. Not independently reviewed by a listener.
''')
print('18 human syllables and 18 repaired audio sequences created')
