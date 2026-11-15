#!/usr/bin/env python3
"""Stage only the signed unified Android release; retire separate APKs."""
import json,hashlib,shutil,sys
from pathlib import Path
src=Path(sys.argv[1] if len(sys.argv)>1 else 'build/android-v6')
dst=Path('downloads/apps')
fingerprint='ee4e5f8887447d750263ce35798c3c0c0e5a7a01a03d678712ad49d48abdb729'
data=json.loads((src/'release.json').read_text())
assert list(data)==['unified']
row=data['unified']
path=src/row['file']
assert row['version']=='6.1.0' and row['versionCode']==61
assert row['certificate_sha256']==fingerprint
assert path.stat().st_size==row['bytes']
assert hashlib.sha256(path.read_bytes()).hexdigest()==row['sha256']
name='Kokab-Fodool-V6.1.apk'
shutil.copyfile(path,dst/name)
shutil.copyfile(path,dst/'kawkab-fudool.apk')
idsig=Path(str(path)+'.idsig')
alias=dst/'kawkab-fudool.apk.idsig'
if idsig.exists(): shutil.copyfile(idsig,alias)
elif alias.exists(): alias.unlink()
# Remove the public separate APKs only after the new signed APK is successfully copied.
for p in dst.iterdir():
    if p.is_file() and ('-offline.apk' in p.name.lower() or '-online.apk' in p.name.lower()):
        p.unlink()
row['file']=name
(dst/'release.json').write_text(json.dumps(data,indent=2)+'\n')
print('Official unified V6.1 staged; separate Android APKs retired.')
