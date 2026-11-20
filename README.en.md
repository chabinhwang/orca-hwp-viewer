# HWP Viewer for Orca

[한국어](README.md) | **English**

A plugin for [Orca](https://orca.dev) that displays Hangul word processor documents (`.hwp`, `.hwpx`) with their original page layout.

![An HWPX document opened in HWP Viewer](docs/screenshot.png)

- Open an `.hwp` or `.hwpx` file from the file explorer and it shows up right away in an **HWP Preview** tab.
- Tables, borders, background colors, images and page breaks are drawn from the document's own layout data.
- Opens with one page filling the window height. Zoom with a trackpad pinch (or Ctrl+wheel) or the buttons, and go back with Fit page or Fit width.
- Only pages near the viewport are loaded, so long documents stay light.
- When an agent or another program changes the file, the view re-renders automatically.
- Everything runs on your machine. No network requests, no data collection.

The rendering engine is [kordoc](https://github.com/chrisryugj/kordoc) (MIT). It is bundled with the plugin, so there is nothing else to install.

## Installation

Requires the Orca **desktop app** `1.4.248` or later. In the browser client, these files open in the Source view.

```sh
orca plugin install chabinhwang/orca-hwp-viewer
```

Once the plugin is listed in the community catalog, you can also install it by searching for `HWP Viewer` in Orca Settings → Plugins.

### Why does an approval prompt appear?

This plugin is a `trusted-worker`. kordoc, which parses Hangul documents, uses Node.js modules (`zlib`, `crypto` and others), so rendering runs in a separate Orca Node worker process. All the worker does is take the bytes of the open file and return an SVG per page. It does not request any additional capabilities. All of the code is public in this repository.

## Known limitations

These come directly from the kordoc renderer.

- Headers, footers and footnotes are not drawn.
- Equations and OLE objects are not drawn; the toolbar shows a warning instead.
- HWP 3.x and password-protected documents are not supported.
- If a font specified in the document (such as HCR Batang) is not installed, a similar system font is used instead.
- Read-only. Editing is not supported.

If a document renders incorrectly, please report it in the [issues](https://github.com/chabinhwang/orca-hwp-viewer/issues). When attaching a document, use a copy with personal information removed.

## Structure

| Path | Role |
|---|---|
| `orca-plugin.json` | Manifest: `trusted-worker`, custom editor `hwp` (`contentKind: bytes`, `frame: isolated`) |
| `src/protocol.ts` | Editor↔worker request contract (`hwp.chunk`, `hwp.render`, `hwp.page`) and chunk size |
| `worker/` | Worker source. Assembles chunks, builds per-page SVG with kordoc `renderDocumentToScene`, and caches the result |
| `dist/worker.mjs` | Worker bundle produced by `npm run build` (worker source + kordoc render path). This is the file Orca runs |
| `editor/` | Isolated-frame viewer: upload and lazy loading (`main.ts`), transport (`transport.ts`), SVG sanitizing (`svg.ts`), toolbar and pinch zoom (`view.ts`), zoom math (`zoom.ts`) |
| `scripts/build.mjs` | Generates the bundle and `THIRD_PARTY_NOTICES.txt`; `--check` verifies the committed bundle matches the source |
| `scripts/make-fixtures.mjs` | Generates test HWPX files with kordoc |

### Implementation notes

- The message size limit from the editor frame to the worker is not documented, and it is smaller than on the CLI (`orca plugin dev request`) path. Files are therefore uploaded in base64 chunks of 48,000 characters, and page SVGs are received in chunks of the same size. On a `too large` error, the chunk size is halved.
- kordoc reuses the same ids on every page, such as `#bin0` and `pgclip1`. With several pages on one screen, image references would collide, so each page gets a `p<page>-` prefix. The same step strips `script`, `foreignObject`, event attributes and external links.
- Orca does not allow npm imports in `.ts` sources. The worker is therefore shipped as a bundle, and the tests also run against the bundle.

## Development

```sh
npm install
npm run build          # dist/worker.mjs, dist/worker.d.mts, THIRD_PARTY_NOTICES.txt
npm run typecheck
npm test               # check the bundle is current → generate test HWPX → orca plugin test
orca plugin check .
orca plugin dev watch .    # load into Orca as a development plugin and stream logs and reloads (approval required)
orca plugin shot local.hwp-viewer --editor "$PWD/test/fixtures/generated/sample.hwpx" --out shot.png
```

- If you change the worker or the kordoc version, commit the `npm run build` output (`dist/`, `THIRD_PARTY_NOTICES.txt`) as well. `npm test` fails when the bundle differs from the source.
- The repository does not keep document files. To test with real HWP 5.x documents, put them in `test/fixtures/local/` (excluded from Git). `npm test` renders every document in that folder.

## Releasing

1. Bump `version` in `orca-plugin.json` and run `npm run build && npm test`.
2. Commit, then push a `vX.Y.Z` tag.
3. If the repository has the `orca-plugin` topic, the community catalog usually picks up the new version within an hour. A published version cannot be changed, so always ship fixes as a new version.

## License

[MIT](LICENSE). Licenses for kordoc and its dependencies bundled in `dist/worker.mjs` are in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt).
