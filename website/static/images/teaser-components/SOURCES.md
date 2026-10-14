# Paper teaser source assets

These image files are direct copies from the camera-ready Overleaf project
`6acd3f78f81551cc5346d095`, checked out locally at commit
`8bf87321f65175207f96d9879669f2c3147ff0d2`. The figure layout, labels, cards,
and arrows follow `figures/teaser/teaser-redesigned.tex`. The website teaser is
rendered from these components; it does not use a crop of the paper PDF.

| Website asset | Source path in the Overleaf checkout |
| --- | --- |
| `umi-live-gripper.png`, `huggingface-logo.png` | `figures/teaser/teaser-assets/` |
| `bimanual-recording*.png`, `left-lidar.png`, `right-lidar.png`, `left-tags.png`, `right-tags.png`, `slam-trajectories.png`, `dataset-grid.png`, `molmoact2-logo.png`, `yam-evaluation.png` | `figures/teaser/teaser-redesign-assets/` |

All copied PNGs are retained byte-for-byte. The renderer scales them into the
paper's 500-by-288 layout and redraws the vector geometry and text for a six-
stage reveal. The trajectory graphic follows the paper's source asset, which
the Overleaf manifest describes as schematic rather than measured.
