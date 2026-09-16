#!/usr/bin/env python3
"""
Gera os elementos gráficos próprios do site Fisio Valente:
  - texturas/fundos abstratos na paleta da marca (JPEG)
  - imagem Open Graph para partilha em redes sociais
  - placeholders SVG duotone (usados como fallback de qualquer fotografia)
  - vídeos ambiente em loop (MP4/H.264) para o herói e para a secção "Espaço"

Uso:  python3 scripts/generate_assets.py [--ffmpeg /caminho/para/ffmpeg]
Requisitos: pillow, numpy (pip install pillow numpy) e ffmpeg para os vídeos.
"""
import argparse, html, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA = os.path.join(ROOT, "assets", "media")
IMG = os.path.join(ROOT, "assets", "img")

# Paleta da marca (mantém em sincronia com os tokens --brand-* do styles.css)
BRAND = {
    "deep":   (6, 43, 52),
    "petrol": (11, 79, 92),
    "teal":   (18, 140, 153),
    "aqua":   (23, 160, 174),
    "mist":   (169, 222, 226),
    "sand":   (233, 177, 85),
    "cream":  (251, 248, 243),
}


def _canvas(w, h, base):
    img = np.zeros((h, w, 3), dtype=np.float32)
    img[:, :] = np.array(base, dtype=np.float32)
    return img


def _blob(img, cx, cy, radius, color, strength=1.0, power=2.0):
    """Mancha radial suave (gaussiana) somada ao fundo."""
    h, w, _ = img.shape
    ys, xs = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xs - cx) / radius) ** 2 + ((ys - cy) / radius) ** 2)
    mask = np.clip(1.0 - d, 0.0, 1.0) ** power
    mask *= strength
    col = np.array(color, dtype=np.float32)
    img += mask[..., None] * (col - img) * 1.0
    return img


def _grain(img, amount=5.0, seed=7):
    rng = np.random.default_rng(seed)
    noise = rng.normal(0.0, amount, img.shape[:2]).astype(np.float32)
    return img + noise[..., None]


def _vignette(img, strength=0.45):
    h, w, _ = img.shape
    ys, xs = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xs - w / 2) / (w / 2)) ** 2 + ((ys - h / 2) / (h / 2)) ** 2)
    m = np.clip(1.0 - strength * (d ** 2.2), 0.0, 1.0)
    return img * m[..., None]


def _to_pil(img, blur=0):
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    if blur:
        out = out.filter(ImageFilter.GaussianBlur(blur))
    return out


def gradient_scene(w, h, seed=0, warm=False, light=False):
    base = BRAND["cream"] if light else BRAND["deep"]
    img = _canvas(w, h, base)
    rng = np.random.default_rng(seed)
    palette = [BRAND["petrol"], BRAND["teal"], BRAND["aqua"]]
    if warm:
        palette += [BRAND["sand"]]
    if light:
        palette = [BRAND["mist"], BRAND["cream"], BRAND["aqua"], BRAND["sand"]]
    for i in range(7):
        cx = rng.uniform(-0.15, 1.15) * w
        cy = rng.uniform(-0.15, 1.15) * h
        r = rng.uniform(0.35, 0.95) * max(w, h)
        col = palette[i % len(palette)]
        img = _blob(img, cx, cy, r, col, strength=rng.uniform(0.35, 0.75))
    # bokeh
    for _ in range(26):
        cx, cy = rng.uniform(0, w), rng.uniform(0, h)
        r = rng.uniform(0.02, 0.12) * w
        col = BRAND["mist"] if not light else BRAND["aqua"]
        img = _blob(img, cx, cy, r, col, strength=rng.uniform(0.05, 0.16), power=1.4)
    img = _vignette(img, 0.3 if light else 0.5)
    img = _grain(img, 4.0, seed + 11)
    return _to_pil(img, blur=1.2)


def save_jpg(pil, name, quality=82):
    path = os.path.join(MEDIA, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pil.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    print(f"  · {os.path.relpath(path, ROOT)}  ({os.path.getsize(path)//1024} KB)")


# ---------------------------------------------------------------- placeholders
PLACEHOLDERS = [
    ("fisioterapia", "Fisioterapia", "#0B4F5C", "#128C99"),
    ("massagem", "Massagem", "#0E6B78", "#17A0AE"),
    ("pilates", "Exercício & Pilates", "#128C99", "#6FC7CE"),
    ("nutricao", "Nutrição", "#0B4F5C", "#E9B155"),
    ("psicologia", "Psicologia", "#083B47", "#0E6B78"),
    ("espaco", "O Espaço", "#0E6B78", "#A9DEE2"),
    ("equipa", "Equipa", "#062B34", "#128C99"),
]

SVG_TPL = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="{label} — Fisio Valente">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>
    </linearGradient>
    <radialGradient id="h" cx="0.25" cy="0.2" r="0.8">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <rect width="800" height="600" fill="url(#h)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2">
    <path d="M-40 430c120 0 160-150 260-150s150 150 270 150 160-120 270-120"/>
    <path d="M-40 480c120 0 160-150 260-150s150 150 270 150 160-120 270-120"/>
    <path d="M-40 530c120 0 160-150 260-150s150 150 270 150 160-120 270-120"/>
  </g>
  <g opacity="0.9" transform="translate(340 236)">
    <rect width="120" height="120" rx="34" fill="#ffffff" fill-opacity="0.14"/>
    <path d="M28 82c14 0 18-42 28-42s14 42 28 42" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <circle cx="56" cy="32" r="7" fill="#E9B155"/>
  </g>
  <text x="400" y="404" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="21" letter-spacing="5" fill="#ffffff" fill-opacity="0.82">{label_upper}</text>
</svg>
"""


def write_placeholders():
    for slug, label, c1, c2 in PLACEHOLDERS:
        path = os.path.join(IMG, f"ph-{slug}.svg")
        safe = html.escape(label)          # "&" tem de ser escapado: SVG é XML
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(SVG_TPL.format(label=safe, label_upper=html.escape(label.upper()), c1=c1, c2=c2))
        print(f"  · {os.path.relpath(path, ROOT)}")


# ---------------------------------------------------------------------- vídeo
def video_frame(w, h, t, variant=0):
    """Um fotograma do loop ambiente. t em [0,1) -> loop perfeito."""
    a = 2 * math.pi * t
    img = _canvas(w, h, BRAND["deep"])
    specs = [
        (0.30 + 0.16 * math.cos(a), 0.34 + 0.13 * math.sin(a), 0.85, BRAND["petrol"], 0.85),
        (0.72 + 0.14 * math.sin(a + 1.1), 0.30 + 0.12 * math.cos(a * 1.0 + 0.6), 0.62, BRAND["teal"], 0.6),
        (0.55 + 0.20 * math.cos(a - 0.8), 0.78 + 0.10 * math.sin(a * 1.0 + 2.1), 0.7, BRAND["aqua"], 0.45),
        (0.18 + 0.10 * math.sin(a + 2.4), 0.80 + 0.09 * math.cos(a + 0.3), 0.45, BRAND["sand"], 0.18),
        (0.85 + 0.08 * math.cos(a + 3.0), 0.68 + 0.10 * math.sin(a + 1.7), 0.4, BRAND["mist"], 0.16),
    ]
    if variant == 1:
        specs = [(1 - x, y, r * 1.1, c, s) for (x, y, r, c, s) in specs]
    for cx, cy, r, col, strength in specs:
        img = _blob(img, cx * w, cy * h, r * max(w, h), col, strength=strength)
    # ondas suaves sobrepostas
    ys, xs = np.mgrid[0:h, 0:w]
    wave = (np.sin(xs / (w / 3.2) * math.pi + a) * np.cos(ys / (h / 2.6) * math.pi - a)).astype(np.float32)
    img += wave[..., None] * 9.0
    img = _vignette(img, 0.55)
    img = _grain(img, 3.2, int(t * 1000) % 977)
    return _to_pil(img, blur=2.0)


def render_video(ffmpeg, name, seconds=10, fps=25, w=1280, h=720, variant=0, poster=None):
    frames = seconds * fps
    cmd = [ffmpeg, "-y", "-f", "image2pipe", "-vcodec", "mjpeg", "-r", str(fps), "-i", "-",
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-crf", "30",
           "-preset", "slow", "-movflags", "+faststart", "-an", os.path.join(MEDIA, name)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for i in range(frames):
        frame = video_frame(w, h, i / frames, variant)
        if poster and i == int(frames * 0.35):
            save_jpg(frame, poster, quality=78)
        frame.save(proc.stdin, "JPEG", quality=92)
        if i % 25 == 0:
            print(f"    … {name}: {i}/{frames}", end="\r")
    proc.stdin.close()
    proc.wait()
    path = os.path.join(MEDIA, name)
    print(f"  · {os.path.relpath(path, ROOT)}  ({os.path.getsize(path)//1024} KB)      ")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ffmpeg", default=os.environ.get("FFMPEG", "ffmpeg"))
    ap.add_argument("--skip-video", action="store_true")
    args = ap.parse_args()

    os.makedirs(MEDIA, exist_ok=True)
    print("Placeholders SVG:")
    write_placeholders()

    print("Texturas e imagens:")
    save_jpg(gradient_scene(1600, 900, seed=3, warm=True), "texture-hero.jpg")
    save_jpg(gradient_scene(1200, 800, seed=9), "texture-dark.jpg")
    save_jpg(gradient_scene(1200, 800, seed=21, light=True), "texture-light.jpg")
    save_jpg(gradient_scene(1200, 630, seed=5, warm=True), "og-image.jpg", quality=86)
    save_jpg(gradient_scene(1600, 700, seed=14), "texture-band.jpg")

    if not args.skip_video:
        print("Vídeos ambiente:")
        try:
            render_video(args.ffmpeg, "ambient-hero.mp4", seconds=10, variant=0, poster="ambient-hero-poster.jpg")
            render_video(args.ffmpeg, "ambient-space.mp4", seconds=8, w=1152, h=648, variant=1,
                         poster="ambient-space-poster.jpg")
        except FileNotFoundError:
            print("  ! ffmpeg não encontrado — vídeos ignorados (use --ffmpeg /caminho)", file=sys.stderr)
    print("Concluído.")


if __name__ == "__main__":
    main()
