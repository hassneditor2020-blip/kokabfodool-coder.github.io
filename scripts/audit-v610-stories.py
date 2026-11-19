"""Fail release if story catalog, assets, questions or age distribution are incomplete."""
import argparse, json, re
from pathlib import Path
from collections import Counter
from PIL import Image

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--root",type=Path,default=Path("."))
    p.add_argument("--expected",type=int,choices=[8,16],default=16)
    a=p.parse_args()
    root=a.root/"stories"
    catalog=json.loads((root/"catalog.json").read_text(encoding="utf-8"))["stories"]
    errors=[]; ids=set(); ages=Counter(); pages=0
    def check(ok,msg):
        if not ok: errors.append(msg)
    def artwork(folder,name):
        if not isinstance(name,str) or not re.fullmatch(r"[A-Za-z0-9_-]+\\.webp",name):
            errors.append(f"{folder}: invalid image path {name}"); return
        try:
            with Image.open(folder/name) as im:
                im.load()
                check(im.format=="WEBP" and min(im.size)>0 and im.n_frames==1,f"{folder/name}: invalid image")
        except Exception as e: errors.append(f"{folder/name}: {e}")
    check(len(catalog)==a.expected,"Incorrect catalog count")
    for c in catalog:
        i=c["id"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",i):
            errors.append("Invalid ID"); continue
        check(i not in ids,f"Duplicate {i}"); ids.add(i)
        folder=root/i
        try: s=json.loads((folder/"story.json").read_text(encoding="utf-8"))
        except Exception as e: errors.append(str(e)); continue
        age=(s.get("ageMin"),s.get("ageMax")); ages[age]+=1
        for k in ("id","titleAr","ageMin","ageMax","pageCount","cover"):
            check(c.get(k)==s.get(k),f"{i}: mismatch {k}")
        check(s.get("status")=="published" and s.get("isFree") is True,f"{i}: status")
        check((folder/"index.html").is_file(),f"{i}: missing HTML")
        artwork(folder,s.get("cover"))
        pp=s.get("pages",[]); pages+=len(pp)
        check(len(pp)==s.get("pageCount") and len(pp)>=2,f"{i}: page count")
        check([x.get("number") for x in pp]==list(range(1,len(pp)+1)),f"{i}: page order")
        for x in pp:
            check(isinstance(x.get("text"),str) and bool(x["text"].strip()),f"{i}: empty text")
            artwork(folder,x.get("image"))
        for q in s.get("questions",[]):
            opts=q.get("options",[]); answer=q.get("correctIndex")
            check(isinstance(q.get("question"),str) and bool(q["question"].strip()) and len(opts)>=2 and type(answer) is int and 0<=answer<len(opts),f"{i}: invalid quiz")
    check(ages==Counter({(3,4):a.expected//4,(5,6):a.expected//4,(7,8):a.expected//4,(9,10):a.expected//4}),f"Age distribution: {ages}")
    check({x.parent.name for x in root.glob("*/story.json")}==ids,"Unindexed or missing story directories")
    print(f"{len(ids)} stories, {pages} pages; {len(errors)} errors")
    for e in errors: print(e)
    raise SystemExit(bool(errors))
if __name__=="__main__": main()
