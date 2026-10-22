import "server-only";
import { SCENERY_HTML } from "./scenery-html";
import type { StripRecord } from "./types";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Metal+Mania&family=Oswald:wght@400;500&display=swap";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Mirrors the booth's styles in src/app/globals.css for the pieces used here.
const CSS = `
:root{--bg:#261D1B;--bg-deep:#170F0D;--paper:#C0BBB1;--ink:#1B1A1F;--ash:#574F44;--greige:#C0BBB1;--pumpkin:#C0622F;--rust:#4F1C10;--terracotta:#B5531F;--film:#131010;
--serif:"Cormorant Garamond",Georgia,serif;--type:"Oswald","Arial Narrow",sans-serif;--display:"Metal Mania",serif;--label:"Oswald","Arial Narrow",sans-serif}
*{box-sizing:border-box}html,body{margin:0}html{background:var(--bg-deep)}
body{background:radial-gradient(ellipse 80% 60% at 50% 40%,#30251F 0%,var(--bg) 55%,var(--bg-deep) 100%) fixed;color:var(--greige);font-family:var(--serif);min-height:100svh;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;background:url(/kit/parchment-texture.png) center/cover;mix-blend-mode:soft-light;opacity:.35;pointer-events:none}
.collage{position:fixed;inset:0;pointer-events:none;overflow:hidden}
.art{position:absolute;height:auto;filter:drop-shadow(0 10px 12px rgba(0,0,0,.45))}
.phone-ghost{left:3vw;bottom:2vh;width:22vw;max-width:120px;transform:rotate(-5deg)}
.phone-bat{right:4vw;top:2vh;width:24vw;max-width:130px;transform:rotate(8deg)}
.phone-witch{right:3vw;bottom:2vh;width:22vw;max-width:110px}
main{position:relative;z-index:1;width:100%;max-width:440px;margin:0 auto;padding:14vh 22px 22vh;display:flex;flex-direction:column;align-items:center;text-align:center;gap:22px}
.kicker{font-family:var(--label);font-weight:500;font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--terracotta);margin:0 0 8px}
h1{font-family:var(--display);font-weight:400;font-size:30px;line-height:1;margin:0;color:var(--pumpkin);text-transform:uppercase}
h1 em{font-style:normal;font-size:40px;display:block}
.strip{display:block;width:min(56vw,250px);aspect-ratio:1/3;background:var(--film);box-shadow:0 22px 40px -10px rgba(0,0,0,.75);transform:rotate(-1.2deg)}
.strip img{width:100%;height:100%;display:block;object-fit:cover}
.panel{position:relative;width:100%;color:var(--ink);padding:26px 22px;display:flex;flex-direction:column;align-items:center;gap:12px;filter:drop-shadow(0 14px 20px rgba(0,0,0,.55))}
.panel::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 50% 45%,transparent 60%,rgba(87,79,68,.35) 100%),url(/kit/parchment-texture.png) center/cover,var(--paper);
background-blend-mode:normal,multiply,normal;clip-path:polygon(0.00% 0.23%, 6.25% 0.97%, 12.50% 0.89%, 18.75% 0.67%, 25.00% 0.30%, 31.25% 1.11%, 37.50% 1.13%, 43.75% 0.72%, 50.00% 0.71%, 56.25% 0.33%, 62.50% 0.00%, 68.75% 0.52%, 75.00% 0.82%, 81.25% 0.10%, 87.50% 1.11%, 93.75% 0.33%, 100.00% 0.33%, 99.95% 6.25%, 98.90% 12.50%, 99.19% 18.75%, 99.04% 25.00%, 99.32% 31.25%, 99.96% 37.50%, 99.64% 43.75%, 99.45% 50.00%, 99.87% 56.25%, 98.95% 62.50%, 99.59% 68.75%, 99.83% 75.00%, 99.10% 81.25%, 99.86% 87.50%, 98.98% 93.75%, 99.50% 100.00%, 93.75% 99.23%, 87.50% 99.52%, 81.25% 99.32%, 75.00% 99.74%, 68.75% 99.95%, 62.50% 98.79%, 56.25% 99.67%, 50.00% 98.91%, 43.75% 99.71%, 37.50% 98.64%, 31.25% 98.75%, 25.00% 98.94%, 18.75% 98.93%, 12.50% 99.19%, 6.25% 98.98%, 0.00% 99.83%, 0.52% 93.75%, 0.91% 87.50%, 0.22% 81.25%, 1.02% 75.00%, 0.98% 68.75%, 0.45% 62.50%, 0.40% 56.25%, 0.50% 50.00%, 0.42% 43.75%, 1.09% 37.50%, 0.43% 31.25%, 0.03% 25.00%, 0.10% 18.75%, 0.79% 12.50%, 1.09% 6.25%)}
.fade{font-family:var(--type);font-size:14px;color:var(--ash);letter-spacing:.04em;margin:0}
.fade b{color:var(--ink);font-weight:400}
.actions{display:flex;flex-direction:column;gap:10px;width:100%}
.btn{display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:999px;font-family:var(--label);font-size:18px;font-weight:500;text-transform:uppercase;letter-spacing:.1em;
text-decoration:none;border:1.5px solid var(--ink);color:var(--ink);background:transparent;cursor:pointer;width:100%}
.btn.primary{background:var(--rust);border-color:var(--rust);color:var(--greige)}
.btn:active{transform:translateY(1px)}
.note{font-size:15px;color:var(--ash);font-style:italic;margin:0;max-width:30ch}
.costume{font-family:var(--serif);font-weight:500;font-size:13px;letter-spacing:.4em;text-transform:uppercase;color:var(--greige);margin:4px 0 0}
.mist{padding-top:24vh}
.mist .note{color:var(--greige)}
`;

function shell(title: string, body: string, script = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#261D1B"><title>${esc(title)}</title>
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
<header><p class="kicker">Permias NYC ◆ Halloween</p>
<h1><em>Sebelum Uber Menjemput</em>Your tale is printed</h1></header>
<a class="strip" href="${img}" aria-label="Open the photo strip full size"><img src="${img}" alt="Your three-photo strip"></a>
<div class="panel">
<p class="fade" id="fade" data-expires="${esc(r.expires_at)}">This story fades in <b id="left">48h</b></p>
<div class="actions">
  <a class="btn primary" href="${img}?dl=1">Download</a>
  ${story}
  <button class="btn" id="share" hidden type="button">Share</button>
</div>
<p class="note">On iPhone, tap Share, then Save Image to keep it in Photos.</p>
</div>
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
    `<main class="mist"><header><p class="kicker">Permias NYC ◆ Halloween</p>
<h1>This story has faded into the mist.</h1></header>
<p class="note">Strips are kept for 48 hours, then deleted for good.</p></main>
`,
  );
}
