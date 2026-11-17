#!/usr/bin/env bash
set -euo pipefail
mkdir -p build/play-device
adb shell wm size 390x844
adb shell wm density 160
adb shell input keyevent 82
adb install build/play/Kawkab-Fudool-6.8.1.apk
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
test "$(adb shell settings get global airplane_mode_on | tr -d '\r')" = 1
adb shell am start -W -n com.kokabfodool.offline/com.kokabfodool.shell.MainActivity

find_label() {
  local label=$1 tap=$2 node_class=${3:-}
  python3 - "$label" "$tap" "$node_class" <<'PY'
import re
import subprocess
import sys
import time
import unicodedata
import xml.etree.ElementTree as ET

label, tap, node_class = sys.argv[1:]
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
                if node_class:
                    if node.get('class') != node_class or node.get('enabled') != 'true':
                        continue
                    exact = True
                elif not any(needle in text for text in captions):
                    continue
                clickable = node.get('clickable') == 'true'
                if tap == 'yes' and not (exact or clickable):
                    continue
                center_y = (y1+y2)//2
                if tap == 'yes' and label not in ('الألعاب', 'المزيد') and center_y >= 740:
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

find_label 'صفحات فضول' yes
find_label 'روبو والبذرة الصغيرة' yes
find_label '1/7' no
find_label 'التالي' yes
find_label '2/7' no
find_label 'وَجَدَ رُوبُو بَذْرَةً' no
adb exec-out screencap -p > build/play-device/story-offline-reader.png
adb shell getconf PAGE_SIZE > build/play-device/emulator-page-size.txt
echo 'PASS: Android 16 launched the packaged story with radios off and turned to page 2.'
