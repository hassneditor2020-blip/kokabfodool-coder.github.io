"""Compare the AAB and APK content against the published offline pack inputs."""
from pathlib import Path
import json
import sys
from urllib.parse import unquote
from zipfile import ZipFile

out = Path(sys.argv[1])
pack = json.loads(Path('offline-pack.json').read_text())
paths = [unquote(url.lstrip('/')) + ('index.html' if url.endswith('/') else '')
         for url in pack['files']]
paths.extend(str(path) for path in sorted(Path('print').glob('*/*.pdf')))
for artifact, prefix in [('apk', ''), ('aab', 'base/')]:
    with ZipFile(out / ('Kawkab-Fudool-6.8.7.' + artifact)) as archive:
        names = archive.namelist()
        assert not any(name.endswith('.so') for name in names), 'Unexpected native library'
        assert ('base/dex/classes.dex' if prefix else 'classes.dex') in names
        for path in paths:
            assert archive.read(prefix + 'assets/site/' + path) == Path(path).read_bytes(), path
    print(artifact.upper(), len(paths), 'exact shared assets; no native libraries')
