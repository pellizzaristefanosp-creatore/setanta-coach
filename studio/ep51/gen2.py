# Seconda parte dei 30 secondi di «Nervi saldi»: entra Elena, definizione di ipertrofia, la battuta dello specchio.
import sys, os, math, subprocess; sys.path.insert(0, "../concept"); os.chdir(os.path.dirname(os.path.abspath(__file__)))
from rw import talk, shot
C = "../concept/"; S = "3D animated feature film, same characters and same gym as the reference image, realistic body mechanics and weight. "
def d(a): return max(2, math.ceil(float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",a]))))
def need(n): return not os.path.exists(n + ".mp4")
tot = 0
if need("out/j1"): tot += shot("out/j1", C+"h1.png", S+"The physiologist in the white lab coat walks confidently through the gym toward camera with a natural stride, coat swaying, tablet in hand; the blond striker in the foreground turns his head toward her. Camera slowly pulls back.", dur=3, model="kling3.0_standard", ratio="720:1280")
if need("out/j2"): tot += talk("out/j2", C+"h2.png", "out/b6t.mp3", S+"Medium close-up of the physiologist with round glasses and white lab coat. She speaks the line in the audio with accurate lip sync, amused and precise: she taps the tablet, then turns it slightly as if showing a definition, small confident nod on the last words. Slow push-in.", dur=d("out/b6t.mp3"))
if need("out/j3"): tot += talk("out/j3", C+"h3.png", "out/b7t.mp3", S+"Medium close-up of the coach in the orange tracksuit leaning on a power rack. He speaks the line in the audio with accurate lip sync, dry and deadpan, barely moving, a slight sideways glance and a tiny shrug at the end. Static camera.", dur=d("out/b7t.mp3"))
if need("out/j4"): tot += talk("out/j4", C+"h4.png", "out/b8t.mp3", S+"Low-angle close-up of the young footballer in the green number 10 jersey sitting on a box. He asks the question in the audio with accurate lip sync, sincerely curious, opening one hand. Static camera.", dur=d("out/b8t.mp3"))
if need("out/j5"): tot += talk("out/j5", C+"h2.png", "out/b9t.mp3", S+"Medium close-up of the physiologist with round glasses. She speaks the line in the audio with accurate lip sync, counting two on her fingers: one finger for strength, a second finger for aesthetics, with a playful half-smile on the last word. Camera drifts slightly to the side.", dur=d("out/b9t.mp3"))
if need("out/j6"): tot += talk("out/j6", C+"h5.png", "out/b10t.mp3", S+"Close-up of the blond striker with hands on hips. He says the line in the audio with accurate lip sync, smug and cocky, flexing his chest and winking. Quick push-in.", dur=d("out/b10t.mp3"))
if need("out/j7"): tot += talk("out/j7", C+"h6.png", "out/b11t.mp3", S+"Over-the-shoulder shot. The coach in the orange tracksuit looks at the blond striker and says the line in the audio with accurate lip sync, completely deadpan; after the pause he raises one eyebrow. The striker in the foreground deflates slightly. Static camera.", dur=d("out/b11t.mp3"))
print("crediti stimati", tot)
