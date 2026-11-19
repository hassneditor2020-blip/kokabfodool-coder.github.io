"""Reassemble and validate both handoff archives without extracting or publishing."""
import argparse, base64, hashlib, io, json, re, stat
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

PACKS = [
 ("v6.9", "handover/v6.9", "pack.part-", False, "75707018d12ae71208c7fe82e463ee71bc6fd704d10eca7c09370d3f26df1842"),
 ("v6.10", "content-packs/v6.10", "part-", True, "05e877492cb93afe3a89c0a3cf50bfb1c9b4d294bcf6bdc77e3976afa90aeb50"),
]
def main():
    p = argparse.ArgumentParser()
    p.add_argument("--root", type=Path, default=Path("."))
    p.add_argument("--output", type=Path, required=True)
    a = p.parse_args()
    a.output.mkdir(parents=True, exist_ok=True)
    for version, folder, prefix, encoded, expected in PACKS:
        paths = [a.root / folder / (prefix + f"{i:02d}" + (".b64" if encoded else "")) for i in range(1,17)]
        data = b"".join(x.read_bytes() for x in paths)
        if encoded:
            data = base64.b64decode(data, validate=True)
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError(f"{version}: checksum mismatch")
        with ZipFile(io.BytesIO(data)) as z:
            seen = set()
            if sum(x.file_size for x in z.infolist()) > 512 * 1024**2:
                raise ValueError("Expanded archive too large")
            for x in z.infolist():
                n = x.filename
                if n in seen or n.startswith("/") or ".." in PurePosixPath(n).parts or chr(92) in n or ":" in n or stat.S_ISLNK(x.external_attr >> 16):
                    raise ValueError(f"Unsafe member: {n}")
                seen.add(n)
            if z.testzip() is not None:
                raise ValueError("CRC failure")
            inventory = [{"path": x.filename, "bytes": x.file_size} for x in z.infolist()]
        (a.output / f"{version}.zip").write_bytes(data)
        (a.output / f"{version}-inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8")
        print(version, "verified", len(inventory), "members")
if __name__ == "__main__":
    main()
