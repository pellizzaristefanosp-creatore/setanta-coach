# Nuove inquadrature dagli stessi personaggi (immagini di riferimento) e varianti con maschera (bocca/occhi).
import json, base64, sys, subprocess
STYLE = " Same stylized 3D animated feature-film look, same lighting quality, same character design exactly (face, hair, beard, clothes, colors). No text, no logos."
def edit(out, refs, prompt, mask=None):
    cmd = ["curl", "-s", "https://api.openai.com/v1/images/edits", "-H", "Authorization: Bearer proxy-injected",
           "-F", "model=gpt-image-2", "-F", "size=1024x1536", "-F", f"prompt={prompt} {STYLE}"]
    for r in refs: cmd += ["-F", f"image[]=@{r}"]
    if mask: cmd += ["-F", f"mask=@{mask}"]
    r = json.loads(subprocess.run(cmd, capture_output=True, text=True, timeout=600).stdout)
    if "data" not in r: print(out, "ERRORE", str(r)[:300]); return
    open(out, "wb").write(base64.b64decode(r["data"][0]["b64_json"])); print(out, "ok")
JOBS = {
 "luca_sorpreso": (["luca.png"], "Vertical close-up portrait of this same young footballer LUCA, now with a surprised 'aha!' expression: eyebrows raised high, eyes wide, mouth closed in a small amazed smile, arms relaxed, on the same football pitch at golden hour, blurred background."),
 "marco_camera": (["marco.png"], "Vertical close-up of this same coach MARCO looking straight into the camera at the viewer, one eyebrow raised, knowing half-smile, pointing his index finger at the viewer, mouth closed, on a football pitch at golden hour with blurred goal in the background."),
 "marco_campo": (["marco.png"], "Vertical medium close-up of this same coach MARCO on a football pitch at golden hour, arms crossed, deadpan unimpressed expression with one eyebrow raised, mouth closed, looking slightly to the right of camera, blurred goal behind."),
 "luca_esulta": (["luca.png"], "Vertical medium shot of this same young footballer LUCA celebrating like after scoring a goal: both arms raised high, fists clenched, huge joyful open-mouth smile, on the same football pitch at golden hour."),
 "scena_finale": (["scena.png"], "Same scene, same two characters, same framing: now LUCA has his shoulders slumped and a deflated pouting face, while coach MARCO looks at him with a deadpan expression, hands on hips. Mouths closed."),
 "palla": (["scena.png"], "Cinematic low-angle shot in slow motion: a football flying into the net of the goal at golden hour, net bulging, grass and sunlight flares, no people, vertical 9:16 composition."),
}
if __name__ == "__main__":
  for name in sys.argv[1:]:
      refs, prompt = JOBS[name]; edit(f"{name}.png", refs, prompt)
