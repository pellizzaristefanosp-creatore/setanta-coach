#!/bin/bash
# fotogrammi di prova in un foglio: puntate/prova.sh 4.3 "1,9,13,18,24,30,36,48"
set -e; D=puntate/$1/out/test; rm -rf $D; mkdir -p $D
node puntate/render.cjs $1 $D "$2"
python3 -c "
from PIL import Image; import glob
fs=sorted(glob.glob('$D/0*.png')); ims=[Image.open(f).resize((360,640)) for f in fs]
s=Image.new('RGB',(360*4,640*((len(ims)+3)//4))); [s.paste(im,((i%4)*360,(i//4)*640)) for i,im in enumerate(ims)]; s.save('$D/sheet.png')"
