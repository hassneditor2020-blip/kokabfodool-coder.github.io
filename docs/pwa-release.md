# PWA release maintenance
- The one installable app uses the existing domain and preserves the same game storage keys; no accounts, tracking or sync were added.
- After every change affecting the offline games, run `python3 scripts/build-pwa.py` (Pillow required) and commit the regenerated offline-pack.json and any generated icons/integration together with the release **before** publishing to Pages. This keeps the pack revision aligned with the site. Do not publish a stale pack manifest.
- Install/update via /app/ or /en/app/. The user explicitly downloads the complete pack; old packs remain usable until a complete replacement is saved.
- The offline pack includes both homepages, game hubs, all 40 bilingual game pages, app settings, basic episodes/parents/privacies pages and local assets. PDFs and external video playback require connectivity. If the browser evicts storage, download again.
- PWA is not a Google Play/App Store release. Safari installation uses Share > Add to Home Screen. Physical-device installation/eviction behavior should be checked separately.
