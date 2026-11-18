# Genera inquadrature con Runway (image_to_video). Uso: python3 rw.py  (chiave messa dal proxy)
import json,base64,urllib.request,time,subprocess,sys
H={"Authorization":"Bearer proxy-injected","X-Runway-Version":"2024-11-06","Content-Type":"application/json"}
def call(url,data=None):
    req=urllib.request.Request(url,data=json.dumps(data).encode() if data else None,headers=H)
    try: return json.load(urllib.request.urlopen(req,timeout=180))
    except urllib.error.HTTPError as e: return {"error":e.code,"body":e.read().decode()[:600]}
def shot(name,image,prompt,dur=5,model="kling3.0_pro",ratio="1080:1920"):
    subprocess.run(["ffmpeg","-loglevel","error","-y","-i",image,"-q:v","3","/tmp/_rw.jpg"],check=True)
    img="data:image/jpeg;base64,"+base64.b64encode(open("/tmp/_rw.jpg","rb").read()).decode()
    r=call("https://api.dev.runwayml.com/v1/image_to_video",{"model":model,"promptImage":img,"ratio":ratio,"duration":dur,"audio":False,"promptText":prompt})
    print(name,r,flush=True)
    if "id" not in r: return 0
    for i in range(90):
        time.sleep(10); t=call("https://api.dev.runwayml.com/v1/tasks/"+r["id"])
        if t.get("status") in ("SUCCEEDED","FAILED"): break
    print(name,t.get("status"),t.get("failure"),flush=True)
    if t.get("output"): urllib.request.urlretrieve(t["output"][0],name+".mp4")
    return r.get("estimatedCost",{}).get("credits",0)
