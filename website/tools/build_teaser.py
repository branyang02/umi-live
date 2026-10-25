#!/usr/bin/env python3
"""Rebuild the paper teaser video from the camera-ready figure's source assets."""

from pathlib import Path
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "static/images/teaser-components"
STAGES = ROOT / "static/images/teaser-stages"
VIDEO = ROOT / "static/videos/teaser.mp4"
W, H = 1920, 1106
S = W / 500

INK = "#293636"
TEAL = "#278C8D"
BORDER = "#BCD8D5"
ROSE = "#E0589B"
YELLOW = "#F5F1E5"
GOLD = "#DFBF75"
WHITE = "#FFFFFF"

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_UNICODE = "/System/Library/Fonts/Supplemental/STIXGeneralItalic.otf"


def px(value):
    return round(value * S)


def font(size, bold=False):
    path = FONT_BOLD if bold else FONT_REGULAR
    return ImageFont.truetype(path, px(size))


def center_text(draw, xy, text, size=8, bold=False, fill=INK):
    selected_font = ImageFont.truetype(FONT_UNICODE, px(size)) if "π" in text else font(size, bold)
    draw.text((px(xy[0]), px(xy[1])), text, font=selected_font, fill=fill, anchor="mm")


def pi05(draw, center):
    pi_font = ImageFont.truetype(FONT_UNICODE, px(11))
    sub_font = font(7)
    main_w, sub_w = pi_font.getlength("π"), sub_font.getlength("0.5")
    left = px(center[0]) - (main_w + sub_w) / 2
    draw.text((left, px(center[1])), "π", font=pi_font, fill=INK, anchor="lm")
    draw.text((left + main_w, px(center[1]) + px(2)), "0.5", font=sub_font, fill=INK, anchor="lm")


def image_at(canvas, name, center_x, top_y, width, height=None):
    img = Image.open(ASSETS / name).convert("RGBA")
    out_w = px(width)
    if height is None:
        out_h = round(out_w * img.height / img.width)
    else:
        out_h = px(height)
    img.thumbnail((out_w, out_h), Image.Resampling.LANCZOS)
    left, top = px(center_x) - img.width // 2, px(top_y)
    canvas.alpha_composite(img, (left, top))


def card(draw, box, fill=WHITE, outline=BORDER, radius=4, dotted=False, width=.6):
    x1, y1, x2, y2 = [px(v) for v in box]
    r, stroke = px(radius), max(1, px(width))
    if not dotted:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=r, fill=fill, outline=outline, width=stroke)
        return
    draw.rounded_rectangle((x1, y1, x2, y2), radius=r, fill=fill)
    # Sample the rounded perimeter to keep the figure's dotted outline treatment.
    points = []
    for i in range(41):
        t = i / 40
        points.append((x1 + r + t * (x2 - x1 - 2 * r), y1))
    for i in range(21):
        a = -90 + 90 * i / 20
        from math import cos, radians, sin
        points.append((x2 - r + r * cos(radians(a)), y1 + r + r * sin(radians(a))))
    for i in range(41):
        t = i / 40
        points.append((x2, y1 + r + t * (y2 - y1 - 2 * r)))
    for i in range(21):
        a = 0 + 90 * i / 20
        from math import cos, radians, sin
        points.append((x2 - r + r * cos(radians(a)), y2 - r + r * sin(radians(a))))
    for i in range(41):
        t = i / 40
        points.append((x2 - r - t * (x2 - x1 - 2 * r), y2))
    for i in range(21):
        a = 90 + 90 * i / 20
        from math import cos, radians, sin
        points.append((x1 + r + r * cos(radians(a)), y2 - r + r * sin(radians(a))))
    for i in range(41):
        t = i / 40
        points.append((x1, y2 - r - t * (y2 - y1 - 2 * r)))
    for i in range(21):
        a = 180 + 90 * i / 20
        from math import cos, radians, sin
        points.append((x1 + r + r * cos(radians(a)), y1 + r + r * sin(radians(a))))
    dot_r = max(1, round(stroke * .55))
    spacing = px(2.05)
    distance = 0
    last = points[0]
    for p in points[1:]:
        dx, dy = p[0] - last[0], p[1] - last[1]
        seg = (dx * dx + dy * dy) ** .5
        distance += seg
        if distance >= spacing:
            draw.ellipse((p[0] - dot_r, p[1] - dot_r, p[0] + dot_r, p[1] + dot_r), fill=TEAL)
            distance = 0
        last = p


def arrow(draw, points, color=TEAL, width=.8, head=2.6):
    pts = [(px(x), px(y)) for x, y in points]
    draw.line(pts, fill=color, width=max(1, px(width)), joint="curve")
    from math import atan2, cos, sin
    x1, y1 = pts[-2]
    x2, y2 = pts[-1]
    a = atan2(y2 - y1, x2 - x1)
    length, half = px(head), px(head * .72)
    back = (x2 - length * cos(a), y2 - length * sin(a))
    p1 = (x2, y2)
    p2 = (back[0] + half * sin(a), back[1] - half * cos(a))
    p3 = (back[0] - half * sin(a), back[1] + half * cos(a))
    draw.polygon([p1, p2, p3], fill=color)


def make_stage(stage):
    image = Image.new("RGBA", (W, H), WHITE)
    d = ImageDraw.Draw(image)

    # Hardware and collection photos (the paper's first row).
    card(d, (4, 4, 146, 116), dotted=True, outline=TEAL)
    center_text(d, (75, 16), "UMI-Live Grippers", 8.5, True)
    image_at(image, "umi-live-gripper.png", 42, 27, 56)
    image_at(image, "umi-live-gripper.png", 108, 27, 56)
    center_text(d, (75, 105), "Camera + LiDAR + IMU", 7.5)
    if stage >= 2:
        arrow(d, [(148, 60), (156, 60)])
        card(d, (158, 4, 496, 116), dotted=True, outline=TEAL)
        center_text(d, (327, 16), "In-the-wild Bimanual Collection", 8.5, True)
        for x, name in [(218, "bimanual-recording.png"), (327, "bimanual-recording-27.5.png"), (436, "bimanual-recording-37.5.png")]:
            image_at(image, name, x, 27, 104)
        center_text(d, (327, 107), "One-button recording", 8)

    if stage >= 3:
        arrow(d, [(327, 118), (327, 122), (107, 122), (107, 126)])
        card(d, (4, 128, 210, 284), fill="#F1F8F7")
        center_text(d, (107, 140), "Live + Async Data Processing", 8.5, True)
        card(d, (18, 147, 116, 278), fill="#E3F2F1", outline="#A9CECA", radius=3)
        card(d, (14, 149, 112, 280), fill="#EFF7F6", outline="#8DBFBB", radius=3)
        card(d, (10, 151, 108, 282), fill=WHITE, outline=BORDER, radius=3)
        center_text(d, (59, 159), "SLAM + IMU pipeline", 7.2, True)
        center_text(d, (59, 172), "LiDAR + IMU", 7.2)
        center_text(d, (160, 158), "Wrist views", 8)
        image_at(image, "left-lidar.png", 37, 183, 39)
        image_at(image, "right-lidar.png", 81, 183, 39)
        arrow(d, [(59, 215), (59, 222)])
        image_at(image, "slam-trajectories.png", 59, 226, 82)
        center_text(d, (59, 277), "6-DOF gripper poses", 7.2)
        image_at(image, "left-tags.png", 160, 170, 64)
        image_at(image, "right-tags.png", 160, 222, 64)
        center_text(d, (160, 277), "ArUco detection", 7.2)

    if stage >= 4:
        arrow(d, [(212, 206), (220, 206)])
        card(d, (222, 128, 354, 284), fill=YELLOW, outline=GOLD)
        # The logo itself is an unmodified Overleaf image, scaled like the TeX node.
        center_text(d, (288, 140), "LeRobot Datasets", 8.2, True)
        image_at(image, "dataset-grid.png", 288, 149, 124)

    if stage >= 5:
        arrow(d, [(356, 206), (360, 206), (360, 150), (364, 150)])
        card(d, (366, 128, 496, 167), fill="#FDF5FA", outline="#EDB8D4")
        center_text(d, (431, 140), "Policy Training", 8.5, True)
        # Keep both policy names fully inside the short training card. Use a
        # transparent derivative so the logo sits on the same pink card fill.
        image_at(image, "molmoact2-logo-transparent.png", 413, 152, 70)
        pi05(d, (477, 155))

    if stage >= 6:
        arrow(d, [(431, 169), (431, 175)])
        card(d, (366, 177, 496, 284), dotted=True, outline=TEAL)
        center_text(d, (431, 189), "Physical Robot Evaluation", 8.5, True)
        image_at(image, "yam-evaluation.png", 431, 200, 108)
        center_text(d, (431, 277), "Illustrative evaluation scene", 7.2)

    return image.convert("RGB")


def write_video():
    # Cumulative frames match the six modules in teaser-redesigned.tex.
    STAGES.mkdir(parents=True, exist_ok=True)
    frames = [make_stage(n) for n in range(1, 7)]
    for i, frame in enumerate(frames, start=1):
        frame.save(STAGES / f"stage-{i:02d}.jpg", quality=94, subsampling=0)
    frames[-1].save(ROOT / "static/images/teaser-poster.jpg", quality=94, subsampling=0)

    encode_video()


# The first panel only holds briefly before "In-the-wild Bimanual Collection" fades in;
# later panels each get time to read, then the full figure holds longer.
FIRST_HOLD = 1.0   # seconds of the first panel alone (video time; the page plays at 1.54x)
STEP = 2.4         # seconds between later fades
FADE = 0.35        # crossfade length
FINAL_HOLD = 4.35  # last panel, including its fade-in
# Encode at 1920x1104: H.264 works in 16-pixel blocks, and a 1106-pixel frame leaves padding rows
# that some hardware decoders can sample as a flickering dark line along the bottom edge.
# The two trimmed rows are blank margin.
OUT_H = 1104


def encode_video():
    ffmpeg_bin = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
    durations = [FIRST_HOLD + FADE] + [STEP + FADE] * 4 + [FINAL_HOLD]
    cmd = [ffmpeg_bin, "-y", "-loglevel", "error"]
    for i, dur in enumerate(durations, start=1):
        cmd += ["-loop", "1", "-framerate", "24", "-t", f"{dur:.2f}", "-i", str(STAGES / f"stage-{i:02d}.jpg")]
    chain, prev, offset = [], "0:v", FIRST_HOLD
    for i in range(1, 6):
        out = f"x{i}" if i < 5 else "v"
        tail = f",crop={W}:{OUT_H}:0:{(H - OUT_H) // 2},format=yuv420p" if i == 5 else ""
        chain.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={FADE}:offset={offset:.2f}{tail}[{out}]")
        prev, offset = out, offset + STEP
    cmd += ["-filter_complex", ";".join(chain), "-map", "[v]", "-r", "24", "-an",
            "-c:v", "libx264", "-crf", "19", "-color_range", "tv", "-movflags", "+faststart", str(VIDEO)]
    subprocess.run(cmd, check=True)


if __name__ == "__main__":
    # `--encode-only` re-times the video from the saved stage images without redrawing them.
    encode_video() if "--encode-only" in sys.argv else write_video()
