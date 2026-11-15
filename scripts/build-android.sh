#!/usr/bin/env bash
set -euo pipefail
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:?Android SDK missing}}"
BT="$(find "$SDK/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)"
PLATFORM="$(find "$SDK/platforms" -name android.jar | sort -V | tail -1)"
test -x "$BT/aapt2" && test -f "$PLATFORM"
echo "SDK $BT $PLATFORM"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
OUT="${FUDOOL_OUTPUT_DIR:-build/android-v5}"
mkdir -p "$OUT"
# Use a stable private signing key. A new key requires explicit opt-in; outputs are staged, not published.
: "${FUDOOL_KEYSTORE:?Original signing keystore required}"
: "${FUDOOL_KEY_ALIAS:?Original key alias required}"
: "${FUDOOL_STORE_PASSWORD:?Signing store password required}"
: "${FUDOOL_KEY_PASSWORD:?Signing key password required}"
if [ "${FUDOOL_ALLOW_NEW_KEY:-0}" != 1 ]; then
  : "${FUDOOL_CERT_SHA256:?Original published certificate SHA-256 required}"
fi
test -f "$FUDOOL_KEYSTORE"
if [ "${FUDOOL_ALLOW_NEW_KEY:-0}" != 1 ]; then
for mode in online offline; do
  cert=$("$BT/apksigner" verify --print-certs "downloads/apps/kawkab-fudool-$mode.apk" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p' | head -1)
  test -n "$cert" && test "${cert,,}" = "${FUDOOL_CERT_SHA256,,}" || { echo "Original APK certificate mismatch: $mode" >&2; exit 1; }
done
fi
export FUDOOL_STORE_PASSWORD FUDOOL_KEY_PASSWORD
for mode in online offline; do
  W="$WORK/$mode";mkdir -p "$W/res/drawable" "$W/classes" "$W/dex" "$W/assets"
  cp assets/app-icon-512.png "$W/res/drawable/app_icon.png"
  permission="";label="كوكب فضول أونلاين"
  if [ "$mode" = online ]; then permission='<uses-permission android:name="android.permission.INTERNET"/>'; else label="كوكب فضول بدون نت"; fi
  cat > "$W/AndroidManifest.xml" <<EOF
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.kokabfodool.$mode" android:versionCode="50" android:versionName="5.0">
<uses-sdk android:minSdkVersion="23" android:targetSdkVersion="32"/>
$permission
<application android:label="$label" android:icon="@drawable/app_icon" android:theme="@android:style/Theme.Material.Light.NoActionBar" android:allowBackup="false" android:usesCleartextTraffic="false">
<activity android:name="com.kokabfodool.shell.MainActivity" android:exported="true" android:configChanges="orientation|screenSize|keyboardHidden">
<intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter>
</activity>
</application></manifest>
EOF
  if [ "$mode" = offline ]; then
    python3 - "$W/assets/site" <<'PY'
import pathlib,shutil,json,urllib.parse,sys
dest=pathlib.Path(sys.argv[1]);dest.mkdir(parents=True)
pack=json.loads(pathlib.Path('offline-pack.json').read_text())
for url in pack['files']:
    p=urllib.parse.unquote(url.lstrip('/'))
    if url.endswith('/'):p+='index.html'
    target=dest/p;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
print('Bundled',len(pack['files']),'files')
PY
  fi
  "$BT/aapt2" compile --dir "$W/res" -o "$W/res.zip"
  "$BT/aapt2" link -o "$W/base.apk" -I "$PLATFORM" --manifest "$W/AndroidManifest.xml" -A "$W/assets" "$W/res.zip"
  javac -source 8 -target 8 -classpath "$PLATFORM" -d "$W/classes" android-app/MainActivity.java
  "$BT/d8" --lib "$PLATFORM" --min-api 23 --output "$W/dex" $(find "$W/classes" -name '*.class')
  (cd "$W/dex"; zip -q "$W/base.apk" classes.dex)
  "$BT/zipalign" -f 4 "$W/base.apk" "$W/aligned.apk"
  "$BT/apksigner" sign --ks "$FUDOOL_KEYSTORE" --ks-key-alias "$FUDOOL_KEY_ALIAS" --ks-pass env:FUDOOL_STORE_PASSWORD --key-pass env:FUDOOL_KEY_PASSWORD --out "$OUT/kawkab-fudool-$mode.apk" "$W/aligned.apk"
  "$BT/apksigner" verify --verbose --print-certs "$OUT/kawkab-fudool-$mode.apk"
  cert=$("$BT/apksigner" verify --print-certs "$OUT/kawkab-fudool-$mode.apk" | sed -n 's/^Signer #1 certificate SHA-256 digest: //p' | head -1)
  test -n "$cert"
  test -z "${FUDOOL_CERT_SHA256:-}" || test "${cert,,}" = "${FUDOOL_CERT_SHA256,,}" || { echo "New APK certificate mismatch: $mode" >&2; exit 1; }
  "$BT/aapt" dump badging "$OUT/kawkab-fudool-$mode.apk" | head -8 || true
done
python3 - "$OUT" <<'PY'
import zipfile,pathlib,json,hashlib,sys
p=pathlib.Path(sys.argv[1])
out={}
for mode in ['online','offline']:
 f=p/f'kawkab-fudool-{mode}.apk'
 with zipfile.ZipFile(f) as z:
  names=z.namelist()
  assert 'classes.dex' in names and 'AndroidManifest.xml' in names
  assert ('assets/site/play-app/index.html' in names)==(mode=='offline')
  if mode=='offline':
   assert 'assets/site/assets/real-sounds/sheep.mp3' in names
   assert 'assets/site/assets/app-learning-v5.json' in names
   assert len([n for n in names if n.startswith('assets/site/')])>=780
 out[mode]={'file':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
(p/'release.json').write_text(json.dumps(out,indent=2)+'\n')
print(out)
PY
