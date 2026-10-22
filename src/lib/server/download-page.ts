import "server-only";
import type { StripRecord } from "./types";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Pinyon+Script&family=Special+Elite&display=swap";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const CSS = `
:root{--parchment:#E9DFC9;--ink:#1B1A1F;--ash:#4A4744;--ivory:#F5EFE3;--ember:#C8742B;--gold:#A88A4E;--rose:#8E2C2C;
--serif:"Cormorant Garamond","IM Fell English",Georgia,serif;--type:"Special Elite","Courier New",monospace;--script:"Pinyon Script",cursive}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--parchment);color:var(--ink);font-family:var(--serif);
min-height:100svh;display:flex;flex-direction:column;align-items:center;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;z-index:-1;background:var(--parchment) url(/kit/parchment-texture.png) center/cover no-repeat}
.lace{width:100%;height:28px;background:url(/kit/lace-border.svg) left top/280px 28px repeat-x;flex:none}
main{width:100%;max-width:440px;padding:20px 16px 40px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:18px}
.kicker{font-family:var(--type);font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--ash);margin:8px 0 0}
h1{font-weight:500;font-size:34px;line-height:1.05;margin:0}
h1 em{font-family:var(--script);font-style:normal;font-weight:400;font-size:44px;display:block;color:var(--ink)}
.strip{width:min(62vw,260px);aspect-ratio:1/3;background:var(--ivory);box-shadow:0 1px 0 rgba(27,26,31,.2),0 18px 40px -12px rgba(27,26,31,.45);transform:rotate(-1.2deg)}
.strip img{width:100%;height:100%;display:block;object-fit:cover}
.fade{font-family:var(--type);font-size:14px;color:var(--ash);letter-spacing:.04em;margin:0}
.fade b{color:var(--ink);font-weight:400}
.actions{display:flex;flex-direction:column;gap:10px;width:100%}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;min-height:52px;border-radius:999px;font-family:var(--serif);font-size:21px;font-weight:600;
text-decoration:none;border:1.5px solid var(--ink);color:var(--ink);background:transparent;cursor:pointer;width:100%}
.btn.primary{background:var(--ink);color:var(--ivory)}
.btn .seal{width:30px;height:30px;margin-left:-6px}
.btn:active{transform:translateY(1px)}
.note{font-size:15px;color:var(--ash);font-style:italic;margin:0;max-width:30ch}
.mist{width:100%;max-width:420px;padding:56px 20px;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center}
.mist img{width:120px;opacity:.85}
.mist h1{font-size:38px}
.mist .haze{position:fixed;inset:auto 0 0 0;height:45vh;pointer-events:none;
background:radial-gradient(60% 50% at 30% 100%,rgba(245,239,227,.9),transparent 70%),radial-gradient(60% 50% at 75% 100%,rgba(245,239,227,.8),transparent 70%)}
@media (prefers-reduced-motion:no-preference){.mist .haze{animation:drift 14s ease-in-out infinite alternate}}
@keyframes drift{from{transform:translateX(-4%)}to{transform:translateX(4%)}}
`;

function shell(title: string, body: string, script = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#E9DFC9"><title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}"><style>${CSS}</style></head>
<body><div class="lace" aria-hidden="true"></div>${body}${script}</body></html>`;
}

export function downloadPage(r: StripRecord): string {
  const img = `/api/strips/${r.id}/image`;
  const story = r.story_key
    ? `<a class="btn" href="${img}?kind=story&dl=1" data-track>Download for Story</a>`
    : "";
  const body = `<main>
<p class="kicker">Sebelum Uber Menjemput</p>
<h1><em>Your tale</em>has been printed</h1>
<a class="strip" href="${img}" aria-label="Open the photo strip full size"><img src="${img}" alt="Your three-photo strip"></a>
<p class="fade" id="fade" data-expires="${esc(r.expires_at)}">This story fades in <b id="left">48h</b></p>
<div class="actions">
  <a class="btn primary" href="${img}?dl=1"><img class="seal" src="/kit/wax-seal-blank.svg" alt="">Download</a>
  ${story}
  <button class="btn" id="share" hidden type="button">Share</button>
</div>
<p class="note">On iPhone, tap Share, then Save Image to keep it in Photos.</p>
</main>`;
  const script = `<script>
(function(){
  var el=document.getElementById('left'),exp=Date.parse(document.getElementById('fade').dataset.expires);
  function tick(){var ms=exp-Date.now();if(ms<=0){location.reload();return}
    var m=Math.floor(ms/60000),h=Math.floor(m/60);el.textContent=h>0?(h+'h '+(m%60)+'m'):(m>0?m+'m':Math.ceil(ms/1000)+'s');}
  tick();setInterval(tick,1000);
  var btn=document.getElementById('share');
  if(navigator.share){btn.hidden=false;btn.addEventListener('click',async function(){
    try{
      var res=await fetch('${img}?proxy=1'+(${r.story_key ? "true" : "false"}?'&kind=story':''));
      if(!res.ok){location.reload();return}
      var blob=await res.blob(),file=new File([blob],'sebelum-uber-menjemput.'+(blob.type==='image/jpeg'?'jpg':'png'),{type:blob.type});
      if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:'Sebelum Uber Menjemput'});
      else await navigator.share({title:'Sebelum Uber Menjemput',url:location.href});
    }catch(e){}
  });}
})();
</script>`;
  return shell("Your tale · Sebelum Uber Menjemput", body, script);
}

export function fadedPage(): string {
  return shell(
    "Faded · Sebelum Uber Menjemput",
    `<div class="mist"><img src="/kit/crescent-moon.svg" alt="">
<p class="kicker">Sebelum Uber Menjemput</p>
<h1>This story has faded into the mist.</h1>
<p class="note">Strips are kept for 48 hours, then deleted for good.</p>
<div class="haze" aria-hidden="true"></div></div>`,
  );
}
