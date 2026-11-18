#!/bin/bash
# Monta i primi 30 secondi di «Nervi saldi»: 8 inquadrature, voci dentro le clip, base ed effetti sintetizzati.
set -e
cd "$(dirname "$0")"
FONT="/usr/share/fonts/opentype/inter/Inter-SemiBoldItalic.otf"
n=0; : > out/_list.txt
for i in 1 2 3 4 5 6 7 8; do
  if ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 out/i$i.mp4 | grep -q audio; then A="-i out/i$i.mp4 -map 0:v -map 0:a"; else A="-i out/i$i.mp4 -f lavfi -i anullsrc=r=44100:cl=stereo -map 0:v -map 1:a -shortest"; fi
  ffmpeg -loglevel error -y $A -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,setsar=1" -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -ar 44100 -ac 2 out/_c$i.mp4
  echo "file _c$i.mp4" >> out/_list.txt
done
ffmpeg -loglevel error -y -f concat -i out/_list.txt -c copy out/_cut.mp4
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/_cut.mp4)
# base musicale leggera + colpo del bilanciere + stacco finale
ffmpeg -loglevel error -y -f lavfi -i "sine=f=110:d=$D" -f lavfi -i "sine=f=164.8:d=$D" -f lavfi -i "sine=f=220:d=$D" -filter_complex "amix=inputs=3,lowpass=f=900,tremolo=f=0.3:d=0.3,volume='if(lt(t,4.6),0.55,0.10)':eval=frame,afade=t=in:d=0.3,afade=t=out:st=$(echo "$D-1" | bc):d=1" out/_pad.wav
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=c=white:d=0.5:a=0.6,bandpass=f=2200:w=1800,afade=t=out:st=0.02:d=0.45" -f lavfi -i "sine=f=70:d=0.3,afade=t=out:st=0:d=0.3,volume=2" -filter_complex "amix=inputs=2:normalize=0" out/_clank.wav
ffmpeg -loglevel error -y -i out/_cut.mp4 -i out/_pad.wav -i out/_clank.wav -filter_complex "[2:a]adelay=2600:all=1[ck];[0:a]asplit=2[v][vk];[1:a][vk]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[pd];[v][pd][ck]amix=inputs=3:normalize=0,loudnorm=I=-16:TP=-1.5[a];[0:v]drawbox=x=28:y=44:w=330:h=74:color=0xC4471D@0.95:t=fill:enable='between(t,0.4,4.4)',drawtext=fontfile=$FONT:text='CAMPO E SCIENZA':fontcolor=white:fontsize=28:x=44:y=54:enable='between(t,0.4,4.4)',drawtext=fontfile=$FONT:text='Ep. 5.1 · Nervi saldi':fontcolor=white:fontsize=20:x=44:y=88:enable='between(t,0.4,4.4)',drawtext=fontfile=$FONT:text='NERVI SALDI':fontcolor=white:fontsize=72:borderw=4:bordercolor=0x2B2118:x=(w-text_w)/2:y=h*0.72:enable='gte(t,$(echo "$D-2.2" | bc))',fade=t=in:d=0.3,fade=t=out:st=$(echo "$D-0.5" | bc):d=0.5[vv]" -map "[vv]" -map "[a]" -c:v libx264 -crf 19 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart ../../nervi-saldi-30s.mp4
rm -f out/_c*.mp4 out/_cut.mp4 out/_pad.wav out/_clank.wav out/_list.txt
ffprobe -v error -show_entries format=duration -of csv=p=0 ../../nervi-saldi-30s.mp4
