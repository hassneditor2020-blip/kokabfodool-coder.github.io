#!/usr/bin/env bash
set -euo pipefail

package=com.kokabfodool.offline
activity="$package/com.kokabfodool.shell.MainActivity"
apk=build/android-v6/kawkab-fudool-unified.apk
mkdir -p build/v6-screenshots

adb shell wm size 390x844
adb shell wm density 160
adb shell input keyevent 82
adb install downloads/apps/Kokab-Fodool-V6.4.apk
adb install -r "$apk"
adb shell dumpsys package "$package" | grep -F 'versionCode=66'
adb shell dumpsys package "$package" | grep -F 'versionName=6.5.0'
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
import unicodedata
import xml.etree.ElementTree as ET

label, tap = sys.argv[1:]
def normalize(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text)
                   if not unicodedata.combining(c) and unicodedata.category(c) != 'Cf').strip()

needle = normalize(label)
visible = []
for attempt in range(15):
    dump = subprocess.run(['adb','shell','uiautomator','dump','/sdcard/fudool-ui.xml'], capture_output=True)
    if dump.returncode == 0:
        xml = subprocess.check_output(['adb','exec-out','cat','/sdcard/fudool-ui.xml'])
        if xml.startswith(b'<?xml'):
            root = ET.fromstring(xml)
            candidates = []
            visible = []
            behind_navigation = False
            for node in root.iter('node'):
                x1,y1,x2,y2 = map(int,re.findall(r'\d+',node.get('bounds','')))
                if x2 <= x1 or y2 <= y1:
                    continue
                captions = [normalize(node.get(key, '')) for key in ('text', 'content-desc')]
                visible.extend(text for text in captions if text)
                exact = needle in captions
                if not any(needle in text for text in captions):
                    continue
                clickable = node.get('clickable') == 'true'
                if tap == 'yes' and not (exact or clickable):
                    continue
                center_y = (y1+y2)//2
                if tap == 'yes' and label != 'الألعاب' and center_y >= 740:
                    behind_navigation = True
                    continue
                priority = (not exact, not clickable)
                point = (str((x1+x2)//2),str(center_y))
                candidates.append((priority,point))
            if candidates:
                _, point = min(candidates)
                if tap == 'yes':
                    subprocess.run(['adb','shell','input','tap',*point],check=True)
                print('Android UI:', label, 'tapped' if tap == 'yes' else 'visible', flush=True)
                sys.exit(0)
            if behind_navigation:
                subprocess.run(['adb','shell','input','swipe','193','690','193','490','280'],check=True)
                time.sleep(.5)
                continue
    if attempt in (3,6,9,12):
        subprocess.run(['adb','shell','input','swipe','193','725','193','370','350'],check=True)
    time.sleep(1)
print('Visible controls:', visible, flush=True)
raise SystemExit('Offline Android view did not display: ' + label)
PY
}

find_label 'الألعاب' yes
find_label 'سيارة الحركات' yes
find_label 'ابدأ المستوى 1' no
find_label '6–7 سنوات' yes
find_label 'ابدأ المستوى 4' yes
find_label 'المستوى 4' no
find_label 'الجولة 1' no
find_label 'انطلق' no
adb exec-out screencap -p > build/v6-screenshots/android-offline-drive.png

adb shell input keyevent KEYCODE_BACK
sleep 1
adb shell input swipe 193 225 193 720 300
adb shell input swipe 193 225 193 720 300
find_label 'التحديات' yes
find_label 'مختبر روبو' yes
find_label '8–10 سنوات' yes
find_label 'ابدأ المستوى 11' yes
find_label 'يريد روبو معرفة أثر الضوء' no
find_label 'كمية الضوء فقط' yes
find_label 'الجولة التالية' yes
find_label 'تجربة ذوبان الثلج' no
find_label 'شغّل المؤقّت' no
adb exec-out screencap -p > build/v6-screenshots/android-offline-robo.png

adb shell input keyevent KEYCODE_BACK
sleep 1
adb shell input swipe 193 225 193 720 300
adb shell input swipe 193 225 193 720 300
find_label 'التحديات' yes
find_label 'ذاكرة فضول' yes
find_label 'ابدأ المستوى 1' yes
find_label 'احفظ أماكن الصور' no
find_label 'ابدأ المطابقة' yes
find_label 'بطاقة مغلقة' no
adb exec-out screencap -p > build/v6-screenshots/android-offline-memory.png
adb shell input keyevent KEYCODE_BACK
sleep 1
adb shell input swipe 193 225 193 720 300
adb shell input swipe 193 225 193 720 300
find_label 'الحروف' yes
find_label 'اكتب مع لُمعة' yes
find_label '8–10 سنوات' yes
find_label 'ابدأ المستوى 11' yes
find_label 'اسمع الكلمة واكتبها على السطر' no
find_label 'تُقبل الكتابة عند تجاوز 75%' no
find_label 'اسمع الكلمة' yes
find_label 'استمع ببطء' yes
adb exec-out screencap -p > build/v6-screenshots/android-offline-writing.png
echo 'PASS Android 6.5.0 upgrades from 6.4 and opens dictation, memory and age-based games in airplane mode.'
