# UMI-Live project page

This is a static project page based on the original [Nerfies website template](https://github.com/nerfies/nerfies.github.io), checked out at commit `657409a62d59a93163872c0e4921cf651b987810`. The adapted page keeps the template's simple Bulma-based paper layout and attribution. The page links separately to UMI Flow, UMI Teleop, and AfterQuery LeRobot.

Serve the page locally from the repository root:

```sh
python3 -m http.server 8765 --directory website
```

## Hardware reproduction guide

`hardware.html` is the UMI-Live hardware reproduction guide, accessed through the homepage's **Hardware setup guide** button and hardware-components section. It shares the site's base styles, with page-specific styles in `static/css/hardware.css`. Native expandable document previews work without JavaScript; `static/js/hardware.js` also opens a preview when its section link or URL fragment is followed.

Keep the guide consistent with the homepage's Bulma base, 960px desktop content width, Google Sans/Noto Sans typography, shared color variables, and Nerfies template attribution. Keep page-specific CSS and JavaScript separate so changes to the guide do not affect the homepage. The page is plain static HTML and needs no additional build step or dependencies.

The page follows the build in order: source parts, print components, assemble and wire, then configure and test. Source documents sit within the corresponding step; the parts list, print settings, and assembly guide are expanded by default. The printable tag sheet is part of assembly, and robot-side YAM accessories are an optional section. Avoid adding a separate card directory that duplicates these sections.

Each embedded sheet has an independent zoom selector (50%–200%). JavaScript scales each preview within its frame; it does not edit the sheet or affect the PDF viewers. Without JavaScript, the original sheet embeds remain usable at 100%. Bump the hardware CSS/JS URL version in `hardware.html` when changing these assets so returning visitors load the new controls.

The YAM section embeds the same live `3D Printed` sheet through its sheet-preview endpoint, anchored to row 35 (`#1199623244R34`). Its shorter frame starts with the YAM heading in view; visitors can still scroll within the sheet. The direct-open link selects `A35:F46` in Google Sheets. If the YAM section moves, update both the row anchor and direct-open range and verify the embedded view in a browser.

The guide follows the draft source organization reviewed on 2026-10-20: the parts workbook has `Off the Shelf` and `3D Printed` tabs; the assembly PDF combines mechanical assembly, wiring, power checks, and final inspection; a separate PDF supplies printable ArUco tags; CAD folders separate UMI-Live and I2RT YAM accessories. The YAM finger backbones and pads reuse UMI-Live files. Software setup is a separate repository handoff.

This is a preliminary view test, not a finalized hardware release. It links to the authorized draft Drive files and embeds the v5 assembly PDF, both spreadsheet tabs, and the printable tag PDF. The embedded sources have anyone-with-link reader access; no sharing settings are changed. Direct-open links remain available if a browser blocks a preview. CAD files stay in Drive rather than being duplicated in this repository.

When updating resources, edit the corresponding section links and preview URLs in `hardware.html`, plus any displayed document version or page count. Updates to a Google file with the same ID appear in its live preview; replacing it with a new file ID requires updating this page. Folder links continue to show their current contents. Preserve per-part print overrides and distinguish build quantities from fractions of purchased packs. The folder does not yet include a separate YAM assembly guide, slicer-profile download, or release manifest; do not imply that these exist.

## Video assets

The opening teaser is an approximately 16-second, step-by-step animation of Figure 1 from the camera-ready Overleaf project `6acd3f78f81551cc5346d095` (source commit `8bf87321f65175207f96d9879669f2c3147ff0d2`). It is rebuilt from the figure's actual image assets plus editable labels, cards, and arrows; it is not cut from a PDF screenshot. It reveals the six existing panels in order, holds each step for about 2.4 seconds, and finishes on the complete figure. The robot evaluation image is illustrative; the linked orange-placement video is a π0.5 rollout, not a MolmoAct2 rollout. Source asset paths and processing notes are in `static/images/teaser-components/SOURCES.md`; the paper checkout is not modified.

The other clips are derived from videos in `~/Desktop/umi assets/` and encoded as MP4 for the page:

- `fruit-episode.mp4`: the original synchronized fruit episode with wrist-camera views and trajectory visualization; retained as a separate clip when it was replaced as the page's hero teaser.
- `bottle-episode.mp4`: synchronized bottle episode.
- `shirt-folding-timelapse.mp4`: shirt-folding session sped up 16x.
- `match-lighting-from-12s.mp4`: a 40.4-second, normal-speed match-lighting segment beginning 12 seconds into the original recording.
- `precision-grasping-normal-speed.mp4`: the original-speed segment of the small-object handling clip.
- `orange-wrist-cams-only.mp4`: the full `IMG_1684.MOV` camera-ablation clip at normal speed.
- `orange-pi05-no-top.mp4`: the full `IMG_1686.MOV` π0.5 camera-ablation clip at normal speed.
- `orange-eval-img8534.mp4`: the new frontal orange-placement trial at normal speed. An operator enters the workspace and the clip ends before all oranges are placed.
- `orange-teleop.mp4`: operator-driven YAM-arm control, shown in its own Teleoperation setup section.
- `robot-match-action.mp4`: YAM-arm match-lighting task, shown in Teleoperation setup alongside the orange teleoperation clip.

The shirt-folding, match-lighting, and precision-grasping source files carry a
portrait display-rotation tag even though the recorded scene is landscape.
Their website encodes and posters now use the intended landscape orientation,
with the display-rotation tag cleared to prevent browser-dependent rotation.

`IMG_1767.MOV` is an additional shirt-folding clip that is not included because the page already has the longer shirt-folding session as a time-lapse. The one-button capture-to-saved-dataset recording placeholder was removed because there is no clip showing that sequence clearly.

## Interactive viewers

The hardware-components section reproduces the paper's exploded CAD view from `overleaf-paper/figures/cad_modules.pdf` as a 300 dpi PNG. The LeRobot dataset visualizer is embedded across the page width and links to its full Hugging Face Space. The 3D Gaussian Splat section uses `@mkkellogg/gaussian-splats-3d` 0.4.7 in a small, white canvas viewer rather than a SuperSplat iframe. It loads `static/splats/umi-live.ksplat`, a device-only splat of one UMI-Live unit reconstructed from three handheld phone videos (COLMAP cameras, SAM 2 device masks, gsplat training on random backgrounds). The asset is in the viewer's own `.ksplat` format: +Y is up, the device is one unit tall and stands at the origin. The orbit stays above the table plane because the underside was never filmed.
