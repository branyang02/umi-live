#!/usr/bin/env python3
"""Build the software-processing video: the camera-ready diagram revealed one module at a time,
in the same cumulative crossfade style as the teaser."""

from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
DIAGRAM = ROOT / "static/images/software-processing-diagram.png"
VIDEO = ROOT / "static/videos/software-processing.mp4"
POSTER = ROOT / "static/images/software-processing-poster.jpg"
K = 2376 / 2000  # boxes below are in 2000-pixel-wide figure units

PANEL_A = (244, 249, 249)
PANEL_B = (251, 236, 243)
PANEL_C = (245, 241, 229)
WHITE = (255, 255, 255)

A = (0, 0, 2000, 524)
A_TO_B = (66, 522, 104, 568)
B = (0, 566, 1366, 1222)
B_TO_C = (1366, 778, 1404, 818)
C = (1404, 566, 2000, 1222)

TIMELINE = (445, 68, 1990, 505)
WORKERS = (142, 625, 1345, 1205)  # stacked job cards and the queue arrow into them
B_ARROW_TAIL = (1336, 785, 1359, 812)
B_BORDER = (1359, 785, 1368, 812)  # where that arrow crosses panel (b)'s border
SYNC = (195, 1005, 875, 1192)
TRAJECTORIES = (880, 712, 1300, 1185)
C_LOWER = (1430, 898, 1992, 1212)  # publish, Hugging Face Hub, training targets

# Each stage: (regions shown, regions blanked with their panel colour, or with None, patched from
# the plain border just above).
STAGES = [
    ([A], [(TIMELINE, PANEL_A)]),
    ([A], []),
    ([A, A_TO_B, B], [(WORKERS, PANEL_B), (B_ARROW_TAIL, PANEL_B), (B_BORDER, None)]),
    ([A, A_TO_B, B], [(SYNC, WHITE), (TRAJECTORIES, WHITE), (B_ARROW_TAIL, PANEL_B), (B_BORDER, None)]),
    ([A, A_TO_B, B], [(B_ARROW_TAIL, PANEL_B), (B_BORDER, None)]),
    ([A, A_TO_B, B, B_TO_C, C], [(C_LOWER, PANEL_C)]),
    ([A, A_TO_B, B, B_TO_C, C], []),
]

FIRST_HOLD = 0.6   # seconds of the first panel alone
STEP = 1.1         # seconds between later fades
FADE = 0.3         # crossfade length
FINAL_HOLD = 1.0   # last stage; the video then rests on the full figure
FPS = 24


def box(b):
    return tuple(round(v * K) for v in b)


def make_stage(src, shown, blanked):
    out = Image.new("RGB", src.size, WHITE)
    for b in shown:
        out.paste(src.crop(box(b)), box(b)[:2])
    d = ImageDraw.Draw(out)
    for b, color in blanked:
        x1, y1, x2, y2 = box(b)
        if color is None:
            out.paste(src.crop((x1, y1 - (y2 - y1) - 20, x2, y1 - 20)), (x1, y1))
            continue
        d.rectangle((x1, y1, x2 - 1, y2 - 1), fill=color)
    # H.264 codes 16-pixel blocks: pad 1452 rows to 1456 with white so no decoder samples padding.
    padded = Image.new("RGB", (out.width, (out.height + 15) // 16 * 16), WHITE)
    padded.paste(out, (0, 0))
    return padded


def ffmpeg():
    found = shutil.which("ffmpeg")
    if found:
        return found
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def main():
    src = Image.open(DIAGRAM).convert("RGB")
    frames = []
    for i, (shown, blanked) in enumerate(STAGES):
        frames.append(make_stage(src, shown, blanked))
    frames[0].save(POSTER, quality=92)  # the poster matches the first frame, so playback starts without a jump
    w, h = frames[0].size
    # Crossfades are blended here rather than with ffmpeg's xfade, so any ffmpeg build works.
    hold = lambda sec: [None] * round(sec * FPS)
    n_fade = round(FADE * FPS)
    cmd = [ffmpeg(), "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
           "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p",
           "-color_range", "tv", "-movflags", "+faststart", str(VIDEO)]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    write = lambda img, count=1: [enc.stdin.write(img.tobytes()) for _ in range(count)]
    write(frames[0], round(FIRST_HOLD * FPS))
    for prev, nxt in zip(frames, frames[1:]):
        for k in range(1, n_fade + 1):
            write(Image.blend(prev, nxt, k / n_fade))
        write(nxt, round((STEP if nxt is not frames[-1] else FINAL_HOLD) * FPS) - n_fade)
    enc.stdin.close()
    if enc.wait():
        raise SystemExit("ffmpeg failed")


if __name__ == "__main__":
    main()
