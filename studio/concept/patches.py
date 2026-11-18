# Ritaglia le varianti come "toppe" trasparenti sfumate, con il colore allineato all'originale.
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
R = json.load(open("regions.json"))
for img, parts in R.items():
    a = np.asarray(Image.open(f"{img}.png").convert("RGB"), float)
    for part, (x0, y0, x1, y1) in parts.items():
        b = np.asarray(Image.open(f"{img}_{part}.png").convert("RGB").resize((1024, 1536)), float)
        inner = Image.new("L", (1024, 1536), 0); ImageDraw.Draw(inner).ellipse([x0 - 4, y0 - 4, x1 + 4, y1 + 4], fill=255)
        ring = Image.new("L", (1024, 1536), 0); ImageDraw.Draw(ring).ellipse([x0 - 40, y0 - 40, x1 + 40, y1 + 40], fill=255)
        ring = (np.asarray(ring) > 0) & ~(np.asarray(inner) > 0)
        shift = a[ring].mean(0) - b[ring].mean(0)
        b = np.clip(b + shift, 0, 255)
        alpha = inner.filter(ImageFilter.GaussianBlur(10))
        out = np.dstack([b, np.asarray(alpha, float)]).astype(np.uint8)
        im = Image.fromarray(out, "RGBA"); bbox = alpha.getbbox()
        im.crop(bbox).save(f"patch_{img}_{part}.png")
        print(img, part, bbox, shift.round(1))
json.dump({f"{i}_{p}": list(Image.new("L", (1, 1)).getbbox() or []) for i in []}, open("/dev/null", "w"))
