#!/usr/bin/env bash
set -euo pipefail

package=com.kokabfodool.offline
activity="$package/com.kokabfodool.shell.MainActivity"
apk=build/android-v6/kawkab-fudool-unified.apk
mkdir -p build/v6-screenshots

adb shell wm size 390x844
adb shell wm density 160
adb shell input keyevent 82
adb install downloads/apps/Kokab-Fodool-V6.0.apk
adb install -r "$apk"
adb shell dumpsys package "$package" | grep -F 'versionCode=61'
adb shell dumpsys package "$package" | grep -F 'versionName=6.1.0'
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
test "$(adb shell settings get global airplane_mode_on | tr -d '\r')" = 1
adb shell am start -W -n "$activity"

find_label() {
  local label=$1 tap=$2
  python3 - "$label" "$tap" <<'PY'
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

label, tap = sys.argv[1:]
for attempt in range(12):
    dump = subprocess.run(['adb','shell','uiautomator','dump','/sdcard/fudool-ui.xml'], capture_output=True)
    if dump.returncode == 0:
        xml = subprocess.check_output(['adb','exec-out','cat','/sdcard/fudool-ui.xml'])
        if xml.startswith(b'<?xml'):
            root = ET.fromstring(xml)
            for node in root.iter('node'):
                caption = node.get('text', '') + ' ' + node.get('content-desc', '')
                if label not in caption:
                    continue
                x1,y1,x2,y2 = map(int,re.findall(r'\d+',node.get('bounds','')))
                if x2 <= x1 or y2 <= y1:
                    continue
                if tap == 'yes':
                    subprocess.run(['adb','shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)],check=True)
                sys.exit(0)
    if attempt in (4,8):
        subprocess.run(['adb','shell','input','swipe','193','725','193','370','350'],check=True)
    time.sleep(1)
raise SystemExit('Offline Android view did not display: ' + label)
PY
}

find_label 'الألعاب' yes
find_label 'سيارة الحركات' yes
find_label 'من أ إلى ث' yes
find_label 'الجولة 1' no
find_label 'انطلق' no
adb exec-out screencap -p > build/v6-screenshots/android-offline-drive.png

adb shell am force-stop "$package"
adb shell am start -W -n "$activity"
find_label 'الألعاب' yes
find_label 'مختبر روبو' yes
find_label 'تجارب روبو' yes
find_label 'البنفسجي' yes
find_label 'أضف الأزرق' yes
find_label 'أضف الأصفر' yes
find_label 'اخلط' yes
find_label 'ظهر اللون الأخضر' no
adb exec-out screencap -p > build/v6-screenshots/android-offline-robo.png
echo 'PASS Android 6.1.0 upgrades from 6.0.0 and opens V6.1 driving and paint controls in airplane mode.'
