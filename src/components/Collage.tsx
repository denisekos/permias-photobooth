/**
 * Vintage photo-album collage behind every screen: a black album page scattered with
 * ephemera (vintage camera, records, cassette, clock, ribbons, foil stars, tickets,
 * polaroids) and Halloween pieces (skulls, pumpkins, bats, a witch flying past). No hooks,
 * so the phone download page renders the same markup on the server (scripts/gen-scenery.tsx).
 */
import type { CSSProperties } from "react";

export type CollageVariant = "full" | "page" | "phone";

type Pos = { left?: string; right?: string; top?: string; bottom?: string };

type Piece = Pos & {
  /** decor or kit image */
  src?: string;
  /** polaroid holding an illustration, with a handwritten caption */
  polaroid?: { img: string; caption: string; dark?: boolean };
  /** horizontal or vertical strip of empty film frames */
  film?: { frames: number; vertical?: boolean };
  w: string;
  rot: number;
  depth: number;
  tape?: boolean;
  hang?: string;
  noOutline?: boolean;
};

const FULL: Piece[] = [
  { film: { frames: 5 }, left: "-6%", top: "64vh", w: "62vh", rot: -14, depth: 2 },
  { film: { frames: 5 }, right: "-8%", top: "4vh", w: "56vh", rot: 12, depth: 2 },
  { polaroid: { img: "/decor/door.svg", caption: "the door at midnight", dark: true }, left: "3%", top: "7vh", w: "23vh", rot: -7, depth: 6, tape: true },
  { src: "/decor/bow-gingham.svg", left: "17%", top: "3vh", w: "13vh", rot: 12, depth: 9 },
  { src: "/decor/star-gold.svg", left: "21%", top: "26vh", w: "7vh", rot: -12, depth: 8 },
  { src: "/decor/vinyl.svg", left: "-3%", top: "44vh", w: "27vh", rot: 0, depth: 3 },
  { polaroid: { img: "/decor/skeleton-lady.svg", caption: "mrs. bones" }, left: "10%", top: "41vh", w: "19vh", rot: 6, depth: 7, tape: true },
  { src: "/decor/clock.svg", left: "15%", bottom: "4vh", w: "15vh", rot: -8, depth: 8 },
  { src: "/kit/pumpkin.svg", left: "2%", bottom: "3vh", w: "15vh", rot: -4, depth: 9 },
  { src: "/decor/star-silver.svg", left: "1%", top: "36vh", w: "6vh", rot: 14, depth: 10 },
  { src: "/decor/disco-ball.svg", right: "23%", top: "0", w: "13vh", rot: 0, depth: 5, hang: "4vh" },
  { polaroid: { img: "/decor/skeleton-gent.svg", caption: "mr. bones" }, right: "4%", top: "8vh", w: "20vh", rot: 7, depth: 6, tape: true },
  { src: "/decor/star-red.svg", right: "19%", top: "27vh", w: "6vh", rot: 10, depth: 9 },
  { src: "/decor/cassette.svg", right: "12%", top: "44vh", w: "23vh", rot: -10, depth: 7 },
  { src: "/decor/matchbox.svg", right: "2%", top: "42vh", w: "9vh", rot: 9, depth: 8 },
  { src: "/decor/bow-velvet.svg", right: "18%", bottom: "17vh", w: "12vh", rot: -8, depth: 9 },
  { src: "/decor/ticket.svg", right: "4%", bottom: "5vh", w: "23vh", rot: 6, depth: 8, tape: true },
  { src: "/decor/skull.svg", right: "19%", bottom: "3vh", w: "9vh", rot: 10, depth: 10 },
  { src: "/decor/envelope.svg", left: "25%", bottom: "14vh", w: "13vh", rot: 8, depth: 6 },
  { src: "/decor/star-gold.svg", right: "27%", bottom: "28vh", w: "5vh", rot: -18, depth: 10 },
];

const PAGE: Piece[] = [
  { film: { frames: 6 }, left: "-10%", bottom: "-4vh", w: "70vh", rot: -8, depth: 2 },
  { src: "/decor/bow-gingham.svg", left: "1%", top: "1vh", w: "11vh", rot: -14, depth: 8 },
  { src: "/decor/disco-ball.svg", right: "30%", top: "0", w: "10vh", rot: 0, depth: 5, hang: "1vh" },
  { src: "/decor/star-gold.svg", right: "2%", top: "4vh", w: "7vh", rot: 12, depth: 9 },
  { src: "/decor/vinyl.svg", left: "-4%", bottom: "-5vh", w: "24vh", rot: 0, depth: 3 },
  { src: "/kit/pumpkin.svg", left: "5%", bottom: "1vh", w: "12vh", rot: -6, depth: 9 },
  { src: "/decor/cassette.svg", right: "1%", bottom: "2vh", w: "20vh", rot: -9, depth: 7 },
  { src: "/decor/skull.svg", right: "18%", bottom: "1vh", w: "8vh", rot: 10, depth: 9 },
  { src: "/decor/star-silver.svg", right: "14%", top: "2vh", w: "5vh", rot: -10, depth: 9 },
];

const PHONE: Piece[] = [
  { src: "/decor/bow-gingham.svg", left: "-4%", top: "0", w: "26vw", rot: -14, depth: 0 },
  { src: "/decor/disco-ball.svg", right: "6%", top: "0", w: "20vw", rot: 0, depth: 0, hang: "2vh" },
  { src: "/decor/star-gold.svg", right: "-2%", top: "17vh", w: "12vw", rot: 12, depth: 0 },
  { src: "/decor/vinyl.svg", left: "-10%", bottom: "-3vh", w: "38vw", rot: 0, depth: 0 },
  { src: "/kit/pumpkin.svg", left: "14%", bottom: "1vh", w: "20vw", rot: -6, depth: 0 },
  { src: "/decor/cassette.svg", right: "-6%", bottom: "2vh", w: "36vw", rot: -9, depth: 0 },
];

const VARIANTS: Record<CollageVariant, Piece[]> = { full: FULL, page: PAGE, phone: PHONE };

function FilmDeco({ frames, vertical }: { frames: number; vertical?: boolean }) {
  return (
    <div className={`film-deco${vertical ? " vertical" : ""}`}>
      {Array.from({ length: frames }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}

function PieceView({ p }: { p: Piece }) {
  const pos: CSSProperties = {
    left: p.left,
    right: p.right,
    top: p.top,
    bottom: p.bottom,
    width: p.w,
    ["--rot" as string]: `${p.rot}deg`,
    ["--d" as string]: p.depth,
  };
  let body;
  if (p.film) body = <FilmDeco {...p.film} />;
  else if (p.polaroid)
    body = (
      <figure className={`polaroid${p.polaroid.dark ? " dark" : ""}`}>
        <span className="pic">
          <img src={p.polaroid.img} alt="" />
        </span>
        <figcaption>{p.polaroid.caption}</figcaption>
      </figure>
    );
  else body = <img className={p.noOutline ? undefined : "sticker"} src={p.src} alt="" />;
  return (
    <div className="clg-item" style={pos}>
      {p.hang && <span className="clg-string" style={{ height: p.hang }} />}
      <div className="clg-body">
        {body}
        {p.tape && <i className="mtape" />}
      </div>
    </div>
  );
}

const BATS = [
  { left: "36%", top: "24vh", w: 46 },
  { left: "41%", top: "18vh", w: 30 },
  { left: "61%", top: "21vh", w: 40 },
  { left: "83%", top: "36vh", w: 34 },
];

export default function Collage({ variant = "full" }: { variant?: CollageVariant }) {
  return (
    <div className={`collage ${variant}`} aria-hidden="true">
      {VARIANTS[variant].map((p, i) => (
        <PieceView key={i} p={p} />
      ))}
      <div className="witch-fly">
        <img src="/decor/witch.svg" alt="" />
      </div>
      {BATS.slice(0, variant === "full" ? 4 : 2).map((b, i) => (
        <div key={i} className="bat" style={{ left: b.left, top: b.top, width: b.w, animationDelay: `${-i * 1.7}s` }}>
          <img src="/decor/bat.svg" alt="" style={{ animationDelay: `${-i * 0.13}s` }} />
        </div>
      ))}
    </div>
  );
}
