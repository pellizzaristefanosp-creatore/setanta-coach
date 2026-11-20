#!/bin/bash
# voci + tempi + foglio di prova con 8 istanti presi dalle battute
set -e; STOP=1 node puntate/fai.mjs $1 >/dev/null
T=$(node -e 'const t=require("./puntate/'$1'/out/timeline.json");const s=t.lines.map(l=>(l.start+l.dur*0.7).toFixed(2));const extra=t.lines.slice(1,-1).map(l=>(l.start+l.dur*0.3).toFixed(2));console.log([...s,...extra].sort((a,b)=>a-b).filter((_,i,a)=>a.length<=8||i%Math.ceil(a.length/8)===0).slice(0,8).join(","))')
puntate/prova.sh $1 "$T"
