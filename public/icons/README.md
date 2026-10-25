# Icons

| File                    | Size    | Used by                                                                   |
| ----------------------- | ------- | ------------------------------------------------------------------------- |
| `icon.svg`              | any     | favicon; manifest fallback                                                |
| `icon-192.png`          | 192×192 | manifest (`any`); favicon fallback                                        |
| `icon-512.png`          | 512×512 | manifest (`any`); install / splash                                        |
| `icon-maskable-512.png` | 512×512 | manifest (`maskable`); mark inside the 80% safe zone                      |
| `apple-touch-icon.png`  | 180×180 | iOS home screen (iOS ignores SVG touch icons; it masks the square itself) |

The mark is plain shapes (no font), greyscale with the one accent (`#a5b4fc`,
the dark-theme `--accent-color`) as the rule under the F. To change it, edit
the SVG geometry, re-render each PNG at its exact size (a headless-browser
screenshot of the SVG works), and bump `VERSION` in `public/sw.js`.
