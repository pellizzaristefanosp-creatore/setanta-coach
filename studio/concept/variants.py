import json, sys
from PIL import Image, ImageDraw
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, "."); from edit import edit
R = json.load(open("regions.json"))
P = {"mouth": "Edit ONLY the masked mouth area: the same mouth now open mid-speech as if saying 'a', teeth slightly visible, natural for this character. Keep the face, lighting and every other pixel identical.",
     "eyes": "Edit ONLY the masked eye area: the same eyes now gently closed (eyelids down, mid-blink), natural for this character. Keep everything else identical."}
jobs = []
for img, parts in R.items():
    for part, (x0, y0, x1, y1) in parts.items():
        m = Image.new("RGBA", (1024, 1536), (0, 0, 0, 255)); d = ImageDraw.Draw(m)
        pad = 18; d.ellipse([x0 - pad, y0 - pad, x1 + pad, y1 + pad], fill=(0, 0, 0, 0))
        mf = f"mask_{img}_{part}.png"; m.save(mf); jobs.append((f"{img}_{part}.png", [f"{img}.png"], P[part], mf))
with ThreadPoolExecutor(4) as ex: list(ex.map(lambda j: edit(*j), jobs))
