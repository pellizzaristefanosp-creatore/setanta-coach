import json, base64, urllib.request, sys, os
STYLE = ("Stylized 3D animated feature-film look: soft subsurface skin, big expressive eyes with catchlights, sculpted appealing shapes, "
         "warm cinematic three-point lighting, shallow depth of field background bokeh, high detail hair and fabric, original characters, no text, no logos.")
P = {
 "marco": "Portrait, vertical, of MARCO, a friendly 45-year-old Italian football fitness coach: short dark beard, warm brown eyes, slight ironic raised eyebrow, black baseball cap, orange tracksuit with a thin white stripe, gold whistle on a cord. Background: blurred indoor gym with racks. " + STYLE,
 "luca": "Portrait, vertical, of LUCA, a confident 20-year-old Italian footballer: messy brown hair, blue eyes, cocky grin, green football jersey with the number 10, white shorts. Background: blurred football pitch at golden hour. " + STYLE,
 "scena": "Vertical 9:16 shot on a football pitch at golden hour: MARCO (45, short dark beard, black cap, orange tracksuit, gold whistle) stands with hands on hips and a deadpan raised eyebrow, while LUCA (20, messy brown hair, green jersey number 10, white shorts) flexes proudly next to a football, goal net in the background. Comedic, warm. " + STYLE,
}
for name in sys.argv[1:]:
    body = json.dumps({"model": "gpt-image-2", "prompt": P[name], "size": "1024x1536", "n": 1}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body, headers={"Authorization": "Bearer proxy-injected", "Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=300))
    open(f"{name}.png", "wb").write(base64.b64decode(r["data"][0]["b64_json"]))
    print(name, "ok", r.get("usage"))
