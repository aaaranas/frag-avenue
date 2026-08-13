Place PWA icons here:

- `icon-192.png` (192×192, any)
- `icon-512.png` (512×512, any)
- `icon-maskable-512.png` (512×512, maskable — safe zone at 80% of canvas)

These are referenced by `public/manifest.webmanifest`. Until real icons are added, the manifest will reference missing files and installability will fail — that is intentional for the foundation pass.
