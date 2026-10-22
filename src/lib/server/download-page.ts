import "server-only";
import { SCENERY_HTML } from "./scenery-html";
import type { StripRecord } from "./types";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Special+Elite&family=Metal+Mania&family=Oswald:wght@500&family=Homemade+Apple&display=swap";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Mirrors the booth's vintage-album styles in src/app/globals.css for the pieces used here.
const CSS = `
:root{--page:#171311;--film:#141110;--cream:#EDE6D6;--paper:#E6DCC5;--ink:#1B1A1F;--ash:#4A4038;--ivory:#E8DCC4;--blood:#C4161C;--blood-dk:#7A1014;
--serif:"Cormorant Garamond",Georgia,serif;--type:"Special Elite","Courier New",monospace;--display:"Metal Mania",serif;--label:"Oswald","Arial Narrow",sans-serif;--hand:"Homemade Apple","Bradley Hand",cursive}
*{box-sizing:border-box}html,body{margin:0}html{background:#0b0807}
body{background:radial-gradient(ellipse 60% 40% at 50% 55%,rgba(150,18,22,.18),transparent 70%) fixed,radial-gradient(ellipse 90% 80% at 50% 45%,#231b17 0%,#171311 60%,#0b0807 100%) fixed;
color:var(--ivory);font-family:var(--serif);min-height:100svh;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;background:url(/kit/parchment-texture.png) center/cover;mix-blend-mode:soft-light;opacity:.45;pointer-events:none}
.collage{position:fixed;inset:0;pointer-events:none;overflow:hidden}
.clg-item{position:absolute}.clg-body{position:relative;container-type:inline-size;transform:rotate(var(--rot))}.clg-body>img{display:block;width:100%;height:auto}
.clg-string{position:absolute;left:50%;bottom:100%;width:1.5px;background:#8a8a86}
.sticker{filter:drop-shadow(2px 0 0 #F2EADA) drop-shadow(-2px 0 0 #F2EADA) drop-shadow(0 2px 0 #F2EADA) drop-shadow(0 -2px 0 #F2EADA) drop-shadow(0 8px 10px rgba(0,0,0,.6))}
.witch-fly{position:absolute;top:13vh;left:0;width:110px;animation:fly 26s linear infinite}.witch-fly img{width:100%;display:block}
@keyframes fly{0%{transform:translateX(calc(100vw + 160px))}100%{transform:translateX(-160px)}}
.bat{position:absolute}.bat img{width:100%;display:block;filter:drop-shadow(0 6px 8px rgba(0,0,0,.5));animation:flap .32s ease-in-out infinite alternate}
@keyframes flap{from{transform:scaleY(1)}to{transform:scaleY(.6)}}
main{position:relative;z-index:1;width:100%;max-width:440px;margin:0 auto;padding:12vh 22px 20vh;display:flex;flex-direction:column;align-items:center;text-align:center;gap:22px}
.ticket{position:relative;width:100%;padding:12px 26px 16px;color:var(--ink);transform:rotate(-1.2deg);filter:drop-shadow(0 10px 14px rgba(0,0,0,.7));
background:radial-gradient(circle at 0 50%,transparent 11px,var(--cream) 12px) left/51% 100% no-repeat,radial-gradient(circle at 100% 50%,transparent 11px,var(--cream) 12px) right/51% 100% no-repeat}
.ticket::after{content:"";position:absolute;inset:7px 16px;border:1.5px dashed rgba(122,16,20,.6);pointer-events:none}
.kicker{font-family:var(--label);font-weight:500;font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--ink);margin:0 0 6px}
h1{font-family:var(--display);font-weight:400;font-size:30px;line-height:1;margin:0;color:var(--blood);text-transform:uppercase}
h1 em{font-style:normal;font-size:40px;display:block}
.strip{display:block;width:min(56vw,250px);aspect-ratio:1/3;background:var(--film);box-shadow:0 22px 40px -10px rgba(0,0,0,.8);transform:rotate(-1.2deg)}
.strip img{width:100%;height:100%;display:block;object-fit:cover}
.card{position:relative;isolation:isolate;width:100%;color:var(--ink)}
.card .fabric{position:absolute;z-index:-1;box-shadow:0 12px 20px -8px rgba(0,0,0,.7)}
.card .ticking{top:-14px;bottom:30%;left:-12px;right:30%;transform:rotate(-2.2deg);background:repeating-linear-gradient(90deg,#232a3b 0 8px,#e9e1cf 8px 13px,#232a3b 13px 14px,#e9e1cf 14px 24px)}
.card .gingham{top:50%;bottom:-18px;left:-16px;right:44%;transform:rotate(1.6deg);background:linear-gradient(90deg,rgba(196,22,28,.5) 50%,transparent 0) 0 0/22px 22px,linear-gradient(rgba(196,22,28,.5) 50%,transparent 0) 0 0/22px 22px,#efe6d6}
.card .clip{position:absolute;top:-20px;right:26px;width:24px;z-index:3;transform:rotate(5deg)}
.card .foil{position:absolute;z-index:3;width:48px;top:-24px;left:-20px;transform:rotate(-14deg)}
.panel{position:relative;padding:24px 20px 24px;display:flex;flex-direction:column;align-items:center;gap:12px;filter:drop-shadow(0 12px 18px rgba(0,0,0,.75))}
.panel::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(110,76,34,.38) 100%),url(/kit/parchment-texture.png) center/cover,var(--paper);
background-blend-mode:normal,multiply,normal;box-shadow:inset 0 0 20px rgba(90,58,24,.45);clip-path:polygon(0.00% 0.23%, 6.25% 0.97%, 12.50% 0.89%, 18.75% 0.67%, 25.00% 0.30%, 31.25% 1.11%, 37.50% 1.13%, 43.75% 0.72%, 50.00% 0.71%, 56.25% 0.33%, 62.50% 0.00%, 68.75% 0.52%, 75.00% 0.82%, 81.25% 0.10%, 87.50% 1.11%, 93.75% 0.33%, 100.00% 0.33%, 99.95% 6.25%, 98.90% 12.50%, 99.19% 18.75%, 99.04% 25.00%, 99.32% 31.25%, 99.96% 37.50%, 99.64% 43.75%, 99.45% 50.00%, 99.87% 56.25%, 98.95% 62.50%, 99.59% 68.75%, 99.83% 75.00%, 99.10% 81.25%, 99.86% 87.50%, 98.98% 93.75%, 99.50% 100.00%, 93.75% 99.23%, 87.50% 99.52%, 81.25% 99.32%, 75.00% 99.74%, 68.75% 99.95%, 62.50% 98.79%, 56.25% 99.67%, 50.00% 98.91%, 43.75% 99.71%, 37.50% 98.64%, 31.25% 98.75%, 25.00% 98.94%, 18.75% 98.93%, 12.50% 99.19%, 6.25% 98.98%, 0.00% 99.83%, 0.52% 93.75%, 0.91% 87.50%, 0.22% 81.25%, 1.02% 75.00%, 0.98% 68.75%, 0.45% 62.50%, 0.40% 56.25%, 0.50% 50.00%, 0.42% 43.75%, 1.09% 37.50%, 0.43% 31.25%, 0.03% 25.00%, 0.10% 18.75%, 0.79% 12.50%, 1.09% 6.25%)}
.fade{font-family:var(--type);font-size:14px;color:var(--ash);letter-spacing:.04em;margin:0}
.fade b{color:var(--ink);font-weight:400}
.actions{display:flex;flex-direction:column;gap:10px;width:100%}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;min-height:52px;border-radius:999px;font-family:var(--label);font-size:18px;font-weight:500;text-transform:uppercase;letter-spacing:.1em;
text-decoration:none;border:1.5px solid var(--ink);color:var(--ink);background:transparent;cursor:pointer;width:100%}
.btn.primary{background:var(--blood-dk);border-color:#3a0608;color:var(--ivory)}
.btn .seal{width:30px;height:30px;margin-left:-6px}
.btn:active{transform:translateY(1px)}
.note{font-size:15px;color:var(--ash);font-style:italic;margin:0;max-width:30ch}
.costume{font-family:var(--hand);font-size:17px;color:var(--cream);margin:4px 0 0;transform:rotate(-3deg)}
.mist{padding-top:18vh}
.mist .note{color:var(--ivory)}
.haze{position:fixed;inset:auto 0 0 0;height:45vh;pointer-events:none;z-index:1;
background:radial-gradient(60% 50% at 30% 100%,rgba(196,22,28,.3),transparent 70%),radial-gradient(60% 50% at 75% 100%,rgba(237,230,214,.2),transparent 70%)}
@media (prefers-reduced-motion:no-preference){.haze{animation:drift 14s ease-in-out infinite alternate}}
@media (prefers-reduced-motion:reduce){.witch-fly,.bat img{animation:none}.witch-fly{transform:translateX(55vw)}}
@keyframes drift{from{transform:translateX(-4%)}to{transform:translateX(4%)}}
`;

function shell(title: string, body: string, script = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#171311"><title>${esc(title)}</title>
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
<header class="ticket"><p class="kicker">Permias NYC ◆ Halloween</p>
<h1><em>Sebelum Uber Menjemput</em>Your tale is printed</h1></header>
<a class="strip" href="${img}" aria-label="Open the photo strip full size"><img src="${img}" alt="Your three-photo strip"></a>
<div class="card"><i class="fabric ticking"></i><i class="fabric gingham"></i><div class="panel">
<p class="fade" id="fade" data-expires="${esc(r.expires_at)}">This story fades in <b id="left">48h</b></p>
<div class="actions">
  <a class="btn primary" href="${img}?dl=1"><img class="seal" src="/kit/wax-seal-blank.svg" alt="">Download</a>
  ${story}
  <button class="btn" id="share" hidden type="button">Share</button>
</div>
<p class="note">On iPhone, tap Share, then Save Image to keep it in Photos.</p>
</div><img class="clip" src="/decor/paperclip.svg" alt=""><img class="foil sticker" src="/decor/star-gold.svg" alt=""></div>
<p class="costume">see you in costume</p>
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
    `<main class="mist"><header class="ticket"><p class="kicker">Permias NYC ◆ Halloween</p>
<h1>This story has faded into the mist.</h1></header>
<p class="note">Strips are kept for 48 hours, then deleted for good.</p></main>
<div class="haze" aria-hidden="true"></div>`,
  );
}
