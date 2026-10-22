import "server-only";
import { SCENERY_HTML } from "./scenery-html";
import type { StripRecord } from "./types";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Pinyon+Script&family=Special+Elite&display=swap";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const CSS = `
:root{--parchment:#E9DFC9;--ink:#1B1A1F;--ash:#4A4744;--ivory:#F5EFE3;--ember:#C8742B;--gold:#A88A4E;--rose:#8E2C2C;
--serif:"Cormorant Garamond","IM Fell English",Georgia,serif;--type:"Special Elite","Courier New",monospace;--script:"Pinyon Script",cursive;
--col-w:13vw}
*{box-sizing:border-box}html,body{margin:0}html{background:#1B1A1F}
body{background:radial-gradient(ellipse 90% 70% at 50% 40%,#2c2935 0%,#211f28 55%,#141317 100%) fixed;color:var(--ivory);font-family:var(--serif);
min-height:100svh;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;background:url(/kit/parchment-texture.png) center/cover;mix-blend-mode:overlay;opacity:.22;pointer-events:none}
.scenery{position:fixed;inset:0;pointer-events:none;overflow:hidden}
.scn-layer{position:absolute}.scn-layer>svg{display:block;width:100%;height:100%}
.scn-stars{inset:0}.scn-fill{width:100%;height:100%}
.scn-top{top:calc(-8px - 4vh);left:-20px;right:-20px;height:19vh}
.scn-bottom{bottom:-8px;left:-20px;right:-20px;height:16vh}
.scn-col{top:-20px;bottom:-20px;width:var(--col-w)}.scn-col.left{left:-14px}.scn-col.right{right:-14px}.scn-col.right>svg{transform:scaleX(-1)}
.scn-hangers{inset:0}
.hang{position:absolute;top:0;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%);transform-origin:50% 0;animation:sway 5s ease-in-out infinite alternate}
.hang .thread{width:1px;background:#A88A4E}.hang img,.hang svg{display:block;margin-top:-2px;max-width:42px;height:auto}
@keyframes sway{from{transform:translateX(-50%) rotate(-3.5deg)}to{transform:translateX(-50%) rotate(3.5deg)}}
.sticker{filter:drop-shadow(2px 0 0 #F5EFE3) drop-shadow(-2px 0 0 #F5EFE3) drop-shadow(0 2px 0 #F5EFE3) drop-shadow(0 -2px 0 #F5EFE3)}
.scn-top.tall{height:calc(19vh * 400 / 240)}.scn-night{inset:0}
.witch-fly{position:absolute;top:13vh;left:0;width:120px;animation:fly 26s linear infinite}.witch-fly img{width:100%;display:block}
@keyframes fly{0%{transform:translateX(-160px)}100%{transform:translateX(calc(100vw + 160px))}}
.bat{position:absolute}.bat img{width:100%;display:block;filter:drop-shadow(1.5px 0 0 #F5EFE3) drop-shadow(-1.5px 0 0 #F5EFE3) drop-shadow(0 1.5px 0 #F5EFE3) drop-shadow(0 -1.5px 0 #F5EFE3);animation:flap .32s ease-in-out infinite alternate}
@keyframes flap{from{transform:scaleY(1)}to{transform:scaleY(.45)}}
.twinkle{animation:twinkle 4.2s ease-in-out infinite}@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.35}}
main{position:relative;z-index:1;width:100%;max-width:440px;margin:0 auto;padding:11vh calc(var(--col-w) + 6px) 18vh;display:flex;flex-direction:column;align-items:center;text-align:center;gap:20px}
.placard{background:rgba(27,26,31,.9);border:1px solid rgba(168,138,78,.8);box-shadow:inset 0 0 0 4px rgba(27,26,31,.9),inset 0 0 0 5px rgba(168,138,78,.45),0 10px 24px rgba(0,0,0,.5);
border-radius:4px;padding:12px 20px 16px;width:100%}
.kicker{font-family:var(--type);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#C9AE72;margin:0 0 4px}
h1{font-weight:500;font-size:30px;line-height:1.05;margin:0;color:var(--ivory)}
h1 em{font-family:var(--script);font-style:normal;font-weight:400;font-size:40px;display:block}
.strip{display:block;width:min(56vw,250px);aspect-ratio:1/3;background:var(--ivory);box-shadow:0 22px 40px -10px rgba(0,0,0,.7);transform:rotate(-1.2deg)}
.strip img{width:100%;height:100%;display:block;object-fit:cover}
.panel{position:relative;width:100%;color:var(--ink);border:14px solid transparent;border-image:url(/decor/scallop.svg) 14 round;
background:url(/decor/engrave-faint.svg) 0 0/90px 90px,url(/kit/parchment-texture.png) center/cover,#E6DCC5;background-clip:padding-box;
filter:drop-shadow(0 10px 16px rgba(0,0,0,.55));padding:8px 6px 10px;display:flex;flex-direction:column;align-items:center;gap:12px}
.fade{font-family:var(--type);font-size:14px;color:var(--ash);letter-spacing:.04em;margin:0}
.fade b{color:var(--ink);font-weight:400}
.actions{display:flex;flex-direction:column;gap:10px;width:100%}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;min-height:52px;border-radius:999px;font-family:var(--serif);font-size:21px;font-weight:600;
text-decoration:none;border:1.5px solid var(--ink);color:var(--ink);background:transparent;cursor:pointer;width:100%}
.btn.primary{background:var(--ink);color:var(--ivory)}
.btn .seal{width:30px;height:30px;margin-left:-6px}
.btn:active{transform:translateY(1px)}
.note{font-size:15px;color:var(--ash);font-style:italic;margin:0;max-width:30ch}
.mist{padding-top:16vh}
.mist .moon{width:110px;filter:drop-shadow(0 8px 14px rgba(0,0,0,.6))}
.mist h1{font-size:34px}
.mist .note{color:#E6DCC5}
.haze{position:fixed;inset:auto 0 0 0;height:45vh;pointer-events:none;z-index:1;
background:radial-gradient(60% 50% at 30% 100%,rgba(245,239,227,.55),transparent 70%),radial-gradient(60% 50% at 75% 100%,rgba(245,239,227,.45),transparent 70%)}
@media (prefers-reduced-motion:no-preference){.haze{animation:drift 14s ease-in-out infinite alternate}}
@media (prefers-reduced-motion:reduce){.hang,.twinkle,.witch-fly,.bat img{animation:none}.witch-fly{transform:translateX(55vw)}}
@keyframes drift{from{transform:translateX(-4%)}to{transform:translateX(4%)}}
`;

function shell(title: string, body: string, script = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#E9DFC9"><title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}"><style>${CSS}</style></head>
<body>${SCENERY_HTML}${body}${script}</body></html>`;
}

export function downloadPage(r: StripRecord): string {
  const img = `/api/strips/${r.id}/image`;
  const story = r.story_key
    ? `<a class="btn" href="${img}?kind=story&dl=1" data-track>Download for Story</a>`
    : "";
  const body = `<main>
<header class="placard"><p class="kicker">Sebelum Uber Menjemput</p>
<h1><em>Your tale</em>has been printed</h1></header>
<a class="strip" href="${img}" aria-label="Open the photo strip full size"><img src="${img}" alt="Your three-photo strip"></a>
<div class="panel">
<p class="fade" id="fade" data-expires="${esc(r.expires_at)}">This story fades in <b id="left">48h</b></p>
<div class="actions">
  <a class="btn primary" href="${img}?dl=1"><img class="seal" src="/kit/wax-seal-blank.svg" alt="">Download</a>
  ${story}
  <button class="btn" id="share" hidden type="button">Share</button>
</div>
<p class="note">On iPhone, tap Share, then Save Image to keep it in Photos.</p>
</div>
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
    `<main class="mist"><img class="moon" src="/kit/crescent-moon.svg" alt="">
<header class="placard"><p class="kicker">Sebelum Uber Menjemput</p>
<h1>This story has faded into the mist.</h1></header>
<p class="note">Strips are kept for 48 hours, then deleted for good.</p></main>
<div class="haze" aria-hidden="true"></div>`,
  );
}
