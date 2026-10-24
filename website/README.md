# UMI-Live project page

This is a static project page based on the original [Nerfies website template](https://github.com/nerfies/nerfies.github.io), checked out at commit `657409a62d59a93163872c0e4921cf651b987810`. The adapted page keeps the template's simple Bulma-based paper layout and attribution. The page links separately to UMI Flow, UMI Teleop, and AfterQuery LeRobot.

Serve the page locally from the repository root:

```sh
python3 -m http.server 8765 --directory website
```

## Hardware reproduction guide

`hardware.html` is the UMI-Live hardware reproduction guide, accessed through the homepage's **Hardware setup guide** button and hardware-components section. It shares the site's base styles, with page-specific styles in `static/css/hardware.css`. Native expandable document previews work without JavaScript; `static/js/hardware.js` also opens a preview when its section link or URL fragment is followed.

Keep the guide consistent with the homepage's Bulma base, 900px desktop content width, Google Sans/Noto Sans typography, shared color variables, and Nerfies template attribution. Keep page-specific CSS and JavaScript separate so changes to the guide do not affect the homepage. The page is plain static HTML and needs no additional build step or dependencies.

The page follows the build in order: source parts, print components, assemble and wire, then configure and test. Source documents sit within the corresponding step; the parts list, print settings, and assembly guide are expanded by default. The printable tag sheet is part of assembly, and robot-side YAM accessories are an optional section. Avoid adding a separate card directory that duplicates these sections.

Each embedded sheet has an independent zoom selector (50%–200%). JavaScript scales each preview within its frame; it does not edit the sheet or affect the PDF viewers. Without JavaScript, the original sheet embeds remain usable at 100%. Bump the hardware CSS/JS URL version in `hardware.html` when changing these assets so returning visitors load the new controls.

The YAM section embeds the same live `3D Printed` sheet through its sheet-preview endpoint, anchored to row 35 (`#1199623244R34`). Its shorter frame starts with the YAM heading in view; visitors can still scroll within the sheet. The direct-open link selects `A35:F46` in Google Sheets. If the YAM section moves, update both the row anchor and direct-open range and verify the embedded view in a browser.

The source documents were checked on 2026-10-24: the parts workbook has `Off the Shelf` and `3D Printed` tabs; the assembly PDF combines mechanical assembly, wiring, power checks, and final inspection; a separate PDF supplies printable ArUco tags; CAD folders separate UMI-Live and I2RT YAM accessories. The YAM finger backbones and pads reuse UMI-Live files. Software setup is a separate repository handoff.

The guide serves an unchanged copy of the [v6 assembly PDF uploaded to Drive on 2026-10-24](https://drive.google.com/file/d/1ahF2i_Ngj_bhMl7pmpdbxdiEHCNoWhMF/view) from `static/docs/UMI-Live-Hardware-Instructions-v6.pdf` (27 pages). It embeds both spreadsheet tabs and the printable tag PDF from Drive. The embedded Drive sources have anyone-with-link reader access; no sharing settings are changed. Direct-open links remain available if a browser blocks a preview. CAD files stay in Drive rather than being duplicated in this repository.

Keep the STL orientation note beside the download step and the charging procedure in the assembly section. Distinguish the battery's bare-wire leads to the WAGO harness from its charging barrel socket and the harness's accessory barrel output to the Airy. The battery must be disconnected from the harness before charging with its supplied charger.

When updating resources, edit the corresponding section links and preview URLs in `hardware.html`, plus any displayed document version or page count. When replacing the bundled PDF, update its URL version in both the direct link and iframe to refresh cached copies. Updates to a Google file with the same ID appear in its live preview; replacing it with a new file ID requires updating this page. Folder links continue to show their current contents. Preserve per-part print overrides and distinguish build quantities from fractions of purchased packs. The folder does not yet include a separate YAM assembly guide, slicer-profile download, or release manifest; do not imply that these exist.

## Video assets

The opening figure plays `static/videos/teaser.mp4` automatically once, muted and inline. It reveals the six workflow panels and holds on the complete final frame; there is no `loop` attribute or replay handler. `static/images/teaser-poster.jpg` shows the complete figure while the video loads or if autoplay is unavailable. It comes from Figure 1 in the camera-ready Overleaf project `6acd3f78f81551cc5346d095` (source commit `8bf87321f65175207f96d9879669f2c3147ff0d2`). The image is built from the figure's source assets, labels, cards, and arrows. The existing build script can regenerate the animation and its poster. The robot evaluation image is illustrative. Source asset paths and processing notes are in `static/images/teaser-components/SOURCES.md`.

The other clips are derived from videos in `~/Desktop/umi assets/` and encoded as MP4 for the page:

- `fruit-episode.mp4`: the original synchronized fruit episode with wrist-camera views and trajectory visualization; retained as a separate clip when it was replaced as the page's hero teaser.
- `bottle-episode.mp4`: synchronized bottle episode.
- `shirt-folding-timelapse.mp4`: shirt-folding session sped up 16x.
- `match-lighting-from-12s.mp4`: a 40.4-second, normal-speed match-lighting segment beginning 12 seconds into the original recording.
- `precision-grasping-normal-speed.mp4`: the original-speed segment of the small-object handling clip.
- `orange-wrist-cams-only.mp4`: the full `IMG_1684.MOV` camera-ablation clip at normal speed.
- `orange-pi05-no-top.mp4`: the full `IMG_1686.MOV` π0.5 camera-ablation clip at normal speed.
- `orange-eval-img8534.mp4`: the new frontal orange-placement trial at normal speed. An operator enters the workspace and the clip ends before all oranges are placed.
- `orange-teleop.mp4`: operator-driven YAM-arm control, shown in its own Teleoperation setup section. The operator's face and the face of the person seated in the background are blurred throughout the clip, and the poster is generated from the blurred video.
- `robot-match-action.mp4`: YAM-arm match-lighting task, shown in Teleoperation setup alongside the orange teleoperation clip.

The shirt-folding, match-lighting, and precision-grasping source files carry a
portrait display-rotation tag even though the recorded scene is landscape.
Their website encodes and posters now use the intended landscape orientation,
with the display-rotation tag cleared to prevent browser-dependent rotation.

`IMG_1767.MOV` is an additional shirt-folding clip that is not included because the page already has the longer shirt-folding session as a time-lapse. The one-button capture-to-saved-dataset recording placeholder was removed because there is no clip showing that sequence clearly.

All shipped video assets have no audio tracks. All HTML players autoplay muted and inline. Demonstration clips retain playback controls, and the opening animation still stops on its final frame. The π0.5 + RTC rollout and its poster have been removed. When replacing clips, strip audio from the files themselves and preserve the teleoperation face blur in both the video and its poster.

## Interactive viewers

The hardware-components section reproduces the paper's exploded CAD view from `overleaf-paper/figures/cad_modules.pdf` as a 300 dpi PNG. The LeRobot dataset visualizer is directly interactive in its compact frame, using the shared content width and capped at 400px tall (320px on mobile). Clicking and scrolling inside the iframe work normally, and the **Open viewer** link remains available for a full-page view. No overlay or interaction toggle is used. The 3D Gaussian Splat section uses `@mkkellogg/gaussian-splats-3d` 0.4.7 in a small, white canvas viewer rather than a SuperSplat iframe. It loads `static/splats/umi-live.ksplat`, a device-only splat of one UMI-Live unit reconstructed from three handheld phone videos (COLMAP cameras, SAM 2 device masks, gsplat training on random backgrounds with refined camera poses and a learned per-frame blur that absorbs hand-motion blur, antialiased rasterization). The asset is in the viewer's own `.ksplat` format: +Y is up, the device is one unit tall and stands at the origin. The viewer renders it with `antialiased: true` to match training, and the orbit stays within the angles the videos covered well: above the table and away from the cable side of the unit.


## Layout standard

The homepage and hardware guide share `--content-width: 900px` and `--page-gutter` in `static/css/index.css`. Every homepage section, figure, and viewer uses the same content edges. All video groups use `.media-grid` with a 1rem gap. Recorded demonstrations use `.media-grid--episodes` to stack the panoramic clips at full content width. Groups of three videos use `.media-grid--three` to place all three in one desktop row; two-video groups use two columns. All groups stack into one column at 768px. Videos retain their original aspect ratios so synchronized camera views are not cropped. Section spacing uses `--section-space`. Keep card titles and substantive content; omit descriptive sub-captions and duplicate figure captions.
