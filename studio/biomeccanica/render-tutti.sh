#!/bin/bash
# Video di prova dei 7 esercizi (pagina completa, con tabelle): esempio-<id>.mp4
S=/tmp/claude-0/-home-user/56ad1aee-3375-5891-a125-b037f2837f32/scratchpad
for ex in ${@:-rdl plank carry pallof salto strappo tirata}; do
  node $S/re.cjs $ex $S/v_$ex all && ffmpeg -y -loglevel error -framerate 30 -i $S/v_$ex/%05d.png -vf scale=1080:1920:flags=lanczos -c:v libx264 -pix_fmt yuv420p -crf 21 -movflags +faststart esempio-$ex.mp4 && echo "fatto $ex"
done
