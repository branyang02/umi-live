# UMI-Live project page

This is a static project page based on the original [Nerfies website template](https://github.com/nerfies/nerfies.github.io), checked out at commit `657409a62d59a93163872c0e4921cf651b987810`. The adapted page keeps the template's simple Bulma-based paper layout and attribution. The page links separately to UMI Flow, UMI Teleop, and AfterQuery LeRobot.

Serve the page locally from the repository root:

```sh
python3 -m http.server 8765 --directory website
```

## Video assets

The opening teaser is an approximately 16-second, step-by-step animation of Figure 1 from the camera-ready Overleaf project `6acd3f78f81551cc5346d095` (source commit `8bf87321f65175207f96d9879669f2c3147ff0d2`). It is rebuilt from the figure's actual image assets plus editable labels, cards, and arrows; it is not cut from a PDF screenshot. It reveals the six existing panels in order, holds each step for about 2.4 seconds, and finishes on the complete figure. The robot evaluation image is illustrative; the linked orange-placement video is a π0.5 rollout, not a MolmoAct2 rollout. Source asset paths and processing notes are in `static/images/teaser-components/SOURCES.md`; the paper checkout is not modified.

The other clips are derived from videos in `~/Desktop/umi assets/` and encoded as MP4 for the page:

- `fruit-episode.mp4`: the original synchronized fruit episode with wrist-camera views and trajectory visualization; retained as a separate clip when it was replaced as the page's hero teaser.
- `bottle-episode.mp4`: synchronized bottle episode.
- `shirt-folding-timelapse.mp4`: shirt-folding session sped up 16x.
- `match-lighting-normal-speed.mp4`: a 52.4-second normal-speed segment from the original match-lighting demonstration.
- `precision-grasping.mp4`: shortened small-object handling clip, sped up 1.25x.
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

The hardware-components section reproduces the paper's exploded CAD view from `overleaf-paper/figures/cad_modules.pdf` as a 300 dpi PNG. The LeRobot dataset visualizer is embedded across the page width and links to its full Hugging Face Space. The 3D Gaussian Splat section uses `@mkkellogg/gaussian-splats-3d` 0.4.7 in a small, white canvas viewer rather than a SuperSplat iframe. It loads the public SuperSplat `Adapter` example by smartdatascan and keeps attribution; it is a temporary example, not a reconstruction of the UMI-Live hardware. Replace it once a UMI-Live splat is ready.
