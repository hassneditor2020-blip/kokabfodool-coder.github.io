#!/usr/bin/env python3
"""Stage only an authenticated V5 release; never publish preview-signed APKs."""
import json,hashlib,shutil,sys
from pathlib import Path
src=Path(sys.argv[1] if len(sys.argv)>1 else 'build/android-v5')
dst=Path('downloads/apps')
fingerprint='ee4e5f8887447d750263ce35798c3c0c0e5a7a01a03d678712ad49d48abdb729'
data=json.loads((src/'release.json').read_text())
for mode in ('online','offline'):
    row=data[mode]
    path=src/row['file']
    assert row['version']=='5.0.2' and row['versionCode']==52
    assert row['certificate_sha256']==fingerprint, 'Refuse preview or unknown certificate'
    assert path.stat().st_size==row['bytes']
    assert hashlib.sha256(path.read_bytes()).hexdigest()==row['sha256']
    name='Kokab-Fodool-V5.0.2-'+mode.title()+'.apk'
    shutil.copyfile(path,dst/name)
    shutil.copyfile(path,dst/('kawkab-fudool-'+mode+'.apk'))
    idsig=Path(str(path)+'.idsig')
    alias=dst/('kawkab-fudool-'+mode+'.apk.idsig')
    if idsig.exists(): shutil.copyfile(idsig,alias)
    elif alias.exists(): alias.unlink()
    row['file']=name
(dst/'release.json').write_text(json.dumps(data,indent=2)+'\n')
print('Official V5 release staged with pinned certificate, exact sizes and SHA-256 checksums.')
