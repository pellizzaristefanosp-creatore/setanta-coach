#!/bin/bash
# Rifà tutte le puntate con i personaggi nuovi (voci già pronte): 13 puntate + la 5.1
cd /home/user/setanta-coach/studio/spiega && . puntate/env.sh
for c in 4.1 4.2 4.3 4.4 4.5 5.2 5.3 6.1 6.2 6.3 7.1 7.2 7.3; do node puntate/fai.mjs $c 2>&1 | grep -E '^\{|Error'; done
# 5.1 (cartone a sé)
rm -rf out/frames-cartone && node render-cartone.cjs out/frames-cartone >/dev/null && \
ffmpeg -y -loglevel error -framerate 30 -i out/frames-cartone/%05d.png -i out/mix-cartone.wav -vf scale=1080:1920:flags=lanczos -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -shortest out/puntata-5.1.mp4 && \
ffmpeg -y -loglevel error -i out/puntata-5.1.mp4 -vf scale=720:1280 -c:v libx264 -crf 26 -preset slow -movflags +faststart -c:a aac -b:a 96k out/app-5.1.mp4 && \
ffmpeg -y -loglevel error -ss 14 -i out/puntata-5.1.mp4 -frames:v 1 -vf scale=720:1280 -q:v 4 out/app-5.1.jpg && echo '{"code":"5.1","ok":true}'
