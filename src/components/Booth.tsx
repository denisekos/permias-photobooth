"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { PHOTO_RECTS, composeStory, composeStrip, encode, preloadAssets } from "@/lib/booth/compose";
import { gainFor, ghostOf, grabPhoto, sampleLuminance } from "@/lib/booth/photo";
import {
  CHAPTERS,
  DEFAULT_HOST,
  FILTERS,
  deviceId,
  loadHost,
  saveHost,
  type ChapterId,
  type FilterId,
  type HostSettings,
} from "@/lib/booth/settings";
import * as sound from "@/lib/booth/sound";
import NightScene from "./NightScene";
import Scenery, { Balloon, SceneryDefs } from "./Scenery";
import { useParallax } from "./useParallax";

type Screen = "attract" | "waking" | "denied" | "frame" | "capture" | "review" | "print";

type Upload =
  | { status: "idle" | "uploading" }
  | { status: "offline"; reason: string }
  | { status: "done"; url: string; qrSvg: string }
  | { status: "error"; message: string };

const REVIEW_AUTOPRINT_MS = 30_000;
const FINAL_IDLE_MS = 60_000;
const UPLOAD_RETRY_MS = 5_000;
const PRINT_MS = 6_400;
const PRINT_MS_REDUCED = 1_600;

class Cancelled extends Error {}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function SealButton({
  children,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "quiet";
  disabled?: boolean;
}) {
  return (
    <button type="button" className={`seal-btn ${variant}`} onClick={onClick} disabled={disabled}>
      <span className="seal" aria-hidden="true">
        <img src="/kit/wax-seal-blank.svg" alt="" />
        <span>SUM</span>
      </span>
      <span className="label">{children}</span>
    </button>
  );
}

function FrameCorners() {
  return (
    <>
      {[0, 90, 180, 270].map((deg) => (
        <img key={deg} className={`corner c${deg}`} src="/kit/frame-corner.svg" alt="" aria-hidden="true" />
      ))}
    </>
  );
}

/** A die-cut scrapbook sticker, optionally held on with a strip of washi tape. */
function Sticker({ src, className, tape }: { src: string; className: string; tape?: "rose" | "gold" | "ink" }) {
  return (
    <span className={`taped ${className}`} aria-hidden="true">
      <img className="sticker" src={src} alt="" />
      {tape && <i className={`tape ${tape}`} />}
    </span>
  );
}

function Quill() {
  return (
    <svg className="quill" viewBox="0 0 120 60" aria-hidden="true">
      <path className="ink-line" d="M8 44 C20 30 28 52 40 40 C52 28 58 50 70 38 C80 28 88 46 98 36" fill="none" stroke="#1B1A1F" strokeWidth="2" strokeLinecap="round" />
      <g className="nib">
        <path d="M98 36 L112 6 C116 2 118 6 116 10 L101 38 Z" fill="#4A4744" />
        <path d="M98 36 L101 38" stroke="#1B1A1F" strokeWidth="2" />
      </g>
    </svg>
  );
}

function shortUrl(url: string) {
  return url.replace(/^https?:\/\//, "");
}

export default function Booth() {
  const reduced = useReducedMotion();
  const [screen, setScreen] = useState<Screen>("attract");
  const [turnKey, setTurnKey] = useState(0);
  const [leafDone, setLeafDone] = useState(0);
  const [host, setHost] = useState<HostSettings>(DEFAULT_HOST);
  const [hostOpen, setHostOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  const [filter, setFilter] = useState<FilterId>("candle");
  const [chapter, setChapter] = useState<ChapterId>("raven");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [gain, setGain] = useState(1);

  const [shots, setShots] = useState<string[]>([]);
  const [shotIndex, setShotIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [retakesLeft, setRetakesLeft] = useState(1);

  const [strip, setStrip] = useState<{ url: string; ghosts: string[] } | null>(null);
  const [upload, setUpload] = useState<Upload>({ status: "idle" });
  const [ready, setReady] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  useParallax(rootRef, reduced);
  const session = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photos = useRef<HTMLCanvasElement[]>([]);
  const stripBlob = useRef<Blob | null>(null);
  const storyBlob = useRef<Promise<Blob | null> | null>(null);
  const gainRef = useRef(1);
  const filterRef = useRef<FilterId>("candle");
  const capturingRef = useRef(false);
  const printingRef = useRef(false);
  filterRef.current = filter;
  gainRef.current = gain;

  useEffect(() => {
    const h = loadHost();
    setHost(h);
    setSoundOn(h.soundOn);
    preloadAssets();
  }, []);

  useEffect(() => {
    sound.setSoundEnabled(soundOn);
    if (soundOn && screen === "attract") sound.startAmbient();
    else sound.stopAmbient();
  }, [soundOn, screen]);

  /** Throws Cancelled once the session has been reset, so async flows stop cleanly. */
  const sleep = useCallback((ms: number, token: number) => {
    return new Promise<void>((resolve, reject) =>
      setTimeout(() => (token === session.current ? resolve() : reject(new Cancelled())), ms),
    );
  }, []);

  const goTo = useCallback(
    (next: Screen, turn = true) => {
      setScreen(next);
      if (turn && !reduced) {
        setTurnKey((k) => k + 1);
        sound.pageTurn();
      }
    },
    [reduced],
  );

  const releasePhotos = () => {
    for (const c of photos.current) c.width = 0;
    photos.current = [];
    setShots([]);
  };

  const releaseStrip = () => {
    setStrip((s) => {
      if (s) URL.revokeObjectURL(s.url);
      return null;
    });
    stripBlob.current = null;
    storyBlob.current = null;
  };

  const resetSession = useCallback(() => {
    session.current++;
    capturingRef.current = false;
    printingRef.current = false;
    setStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
    if (videoRef.current) videoRef.current.srcObject = null;
    releasePhotos();
    releaseStrip();
    setCountdown(null);
    setFlash(false);
    setCapturing(false);
    setRetakesLeft(1);
    setUpload({ status: "idle" });
    setReady(false);
    setLightbox(false);
    setFilter("candle");
    setChapter("raven");
    setGain(1);
    goTo("attract");
  }, [goTo]);

  const openBook = useCallback(async () => {
    if (screen !== "attract" && screen !== "denied") return;
    const token = session.current;
    setScreen("waking");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" },
        audio: false,
      });
      if (token !== session.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      setStream(s);
      goTo("frame");
    } catch {
      if (token === session.current) goTo("denied");
    }
  }, [screen, goTo]);

  const attachVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && stream && el.srcObject !== stream) {
        el.srcObject = stream;
        el.play().catch(() => {});
      }
    },
    [stream],
  );

  // Dark-room brightness boost: sample the feed and lift the preview (and the captured photos).
  useEffect(() => {
    if (!stream || (screen !== "frame" && screen !== "capture")) return;
    const scratch = document.createElement("canvas");
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.videoWidth === 0) return;
      const target = gainFor(sampleLuminance(v, scratch));
      setGain((g) => Math.round((g + (target - g) * 0.35) * 100) / 100);
    }, 600);
    return () => {
      clearInterval(id);
      scratch.width = 0;
    };
  }, [stream, screen]);

  const buildStrip = useCallback(
    async (token: number) => {
      const canvas = await composeStrip({ photos: photos.current, chapter, host });
      const blob = await encode(canvas);
      if (token !== session.current) {
        canvas.width = 0;
        return;
      }
      stripBlob.current = blob;
      setStrip({ url: URL.createObjectURL(blob), ghosts: photos.current.map(ghostOf) });
      storyBlob.current = composeStory(canvas, host)
        .then(async (story) => {
          const b = await encode(story);
          story.width = 0;
          return b;
        })
        .catch(() => null)
        .finally(() => {
          canvas.width = 0;
        });
    },
    [chapter, host],
  );

  const startCapture = useCallback(async () => {
    if (capturingRef.current || screen !== "frame") return;
    const video = videoRef.current;
    if (!video) return;
    capturingRef.current = true;
    setCapturing(true);
    const token = session.current;
    releasePhotos();
    setScreen("capture");
    try {
      while (video.videoWidth === 0) await sleep(100, token);
      for (let i = 0; i < 3; i++) {
        setShotIndex(i);
        for (const n of [3, 2, 1]) {
          setCountdown(n);
          sound.tick();
          await sleep(1000, token);
        }
        setCountdown(null);
        setFlash(true);
        await sleep(170, token); // let the flash light the room before the frame is grabbed
        const photo = grabPhoto(video, filterRef.current, gainRef.current);
        sound.shutter();
        photos.current.push(photo);
        setShots((s) => [...s, photo.toDataURL("image/jpeg", 0.8)]);
        await sleep(160, token);
        setFlash(false);
        await sleep(1500, token);
      }
      capturingRef.current = false;
      setCapturing(false);
      goTo("review");
      await buildStrip(token);
    } catch (err) {
      if (!(err instanceof Cancelled)) throw err;
    }
  }, [screen, sleep, goTo, buildStrip]);

  const retake = useCallback(() => {
    if (retakesLeft < 1 || screen !== "review") return;
    setRetakesLeft(0);
    releaseStrip();
    releasePhotos();
    goTo("frame");
  }, [retakesLeft, screen, goTo]);

  const runUpload = useCallback(
    async (token: number) => {
      setUpload({ status: "uploading" });
      const story = await storyBlob.current;
      while (token === session.current) {
        const blob = stripBlob.current;
        if (!blob) return;
        let reason = navigator.onLine ? "the press is jammed" : "offline";
        try {
          const fd = new FormData();
          fd.append("strip", blob, blob.type === "image/jpeg" ? "strip.jpg" : "strip.png");
          if (story) fd.append("story", story, story.type === "image/jpeg" ? "story.jpg" : "story.png");
          const res = await fetch("/api/strips", { method: "POST", body: fd, headers: { "x-booth-device": deviceId() } });
          if (res.ok) {
            const { url } = (await res.json()) as { url: string };
            const qrSvg = await QRCode.toString(url, {
              type: "svg",
              errorCorrectionLevel: "M",
              margin: 1,
              color: { dark: "#1B1A1F", light: "#F5EFE3" },
            });
            if (token === session.current) setUpload({ status: "done", url, qrSvg });
            return;
          }
          if (res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408) {
            if (token === session.current) setUpload({ status: "error", message: await res.text() });
            return;
          }
          if (res.status === 429) reason = "too many tales at once";
        } catch {
          reason = navigator.onLine ? "the connection dropped" : "offline";
        }
        if (token !== session.current) return;
        setUpload({ status: "offline", reason });
        try {
          await sleep(UPLOAD_RETRY_MS, token);
        } catch {
          return;
        }
      }
    },
    [sleep],
  );

  const print = useCallback(async () => {
    if (screen !== "review" || !strip || printingRef.current) return;
    printingRef.current = true;
    const token = session.current;
    setReady(false);
    goTo("print");
    sound.printer([0.8, 2.15, 3.5]);
    runUpload(token);
    try {
      await sleep(reduced ? PRINT_MS_REDUCED : PRINT_MS, token);
      setReady(true);
    } catch {}
  }, [screen, strip, goTo, runUpload, sleep, reduced]);

  // Review: print automatically if nobody touches anything for 30 s.
  useEffect(() => {
    if (screen !== "review" || !strip) return;
    let t = setTimeout(print, REVIEW_AUTOPRINT_MS);
    const bump = () => {
      clearTimeout(t);
      t = setTimeout(print, REVIEW_AUTOPRINT_MS);
    };
    window.addEventListener("pointermove", bump);
    window.addEventListener("keydown", bump);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointermove", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [screen, strip, print]);

  // Final screen: back to the cover after 60 s idle. Held while an upload is still retrying,
  // so the host has time to save the strip locally.
  const settled = upload.status === "done" || upload.status === "error";
  useEffect(() => {
    if (screen !== "print" || !ready || !settled || hostOpen) return;
    let t = setTimeout(resetSession, FINAL_IDLE_MS);
    const bump = () => {
      clearTimeout(t);
      t = setTimeout(resetSession, FINAL_IDLE_MS);
    };
    window.addEventListener("pointermove", bump);
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointermove", bump);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [screen, ready, settled, hostOpen, resetSession]);

  const saveLocally = useCallback(() => {
    if (!strip) return;
    const a = document.createElement("a");
    a.href = strip.url;
    a.download = `sebelum-uber-menjemput-${Date.now()}.${stripBlob.current?.type === "image/jpeg" ? "jpg" : "png"}`;
    a.click();
  }, [strip]);

  // Keyboard: space/enter drive the primary action on each page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      if (e.key === "H" && e.shiftKey) {
        e.preventDefault();
        setHostOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && e.shiftKey) {
        e.preventDefault();
        resetSession();
        return;
      }
      if (e.key === "Escape") {
        setLightbox(false);
        setHostOpen(false);
        return;
      }
      if (hostOpen || lightbox) return;
      const primary = e.key === " " || e.key === "Enter";
      if (primary) {
        // Let a focused button handle its own Enter; space always means "the main thing".
        if (e.key === "Enter" && t.tagName === "BUTTON") return;
        e.preventDefault();
        if (screen === "attract" || screen === "denied") openBook();
        else if (screen === "frame") startCapture();
        else if (screen === "review") print();
      } else if ((e.key === "r" || e.key === "R") && screen === "review") {
        retake();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, hostOpen, lightbox, openBook, startCapture, print, retake, resetSession]);

  const updateHost = (patch: Partial<HostSettings>) => {
    const next = { ...host, ...patch };
    setHost(next);
    saveHost(next);
    if ("soundOn" in patch) setSoundOn(Boolean(patch.soundOn));
  };

  const filterCss = FILTERS.find((f) => f.id === filter)!.css;
  const previewStyle = { filter: `${filterCss} brightness(${gain})` };
  const showCamera = screen === "frame" || screen === "capture";

  return (
    <div ref={rootRef} className={`booth${reduced ? " reduced" : ""}`}>
      <SceneryDefs />
      <Scenery variant={screen === "attract" || screen === "waking" ? "full" : "page"} />
      {(screen === "attract" || screen === "waking") && (
        <section className="screen attract" aria-label="Cover">
          <Dust />
          <Balloon className="attract-balloon" />
          <Balloon className="attract-balloon small" />
          <Sticker src="/decor/skeleton-lady.svg" className="fig lady" />
          <Sticker src="/decor/skeleton-gent.svg" className="fig gent" />
          <Sticker src="/decor/candelabra.svg" className="fig candelabra" />
          <Sticker src="/decor/gramophone.svg" className="fig gramophone" />
          <div className="panel cover-mat">
            <Sticker src="/decor/skull.svg" className="mat-skull" tape="rose" />
            <Sticker src="/decor/witch-hat.svg" className="mat-hat" tape="gold" />
            <img className="mat-web" src="/decor/web.svg" alt="" aria-hidden="true" />
            <div className="cover">
              <FrameCorners />
              <p className="cover-kicker">A storybook photobooth</p>
              <div className="window">
                <NightScene still={reduced} />
              </div>
              <h1 className="cover-title">Sebelum Uber Menjemput</h1>
              <p className="cover-script">{host.subtitle}</p>
              <div className="cover-rule" aria-hidden="true"><i /></div>
              <SealButton onClick={openBook} disabled={screen === "waking"}>
                {screen === "waking" ? "Waking the camera…" : "Open the book"}
              </SealButton>
            </div>
          </div>
          <p className="privacy">Photos are kept for 48 hours so you can download them, then deleted.</p>
        </section>
      )}

      {screen === "denied" && (
        <section className="screen page denied" aria-label="Camera needed">
          <div className="panel denied-panel">
            <img src="/kit/moth.svg" alt="" className="denied-moth" />
            <p className="kicker">An interruption</p>
            <h1 className="page-title">The camera is still asleep</h1>
            <p className="lede">This book needs the camera to draw your portrait. Nothing is recorded until you press Begin.</p>
            <ol className="howto">
              <li><b>Chrome or Edge:</b> click the camera icon at the right end of the address bar, choose <i>Always allow</i>, then try again.</li>
              <li><b>Safari:</b> Safari menu → Settings for This Website → Camera → <i>Allow</i>.</li>
              <li><b>macOS:</b> System Settings → Privacy &amp; Security → Camera → turn on your browser.</li>
            </ol>
            <SealButton onClick={openBook}>Try again</SealButton>
          </div>
        </section>
      )}

      {showCamera && (
        <section className="screen page camera" aria-label={screen === "frame" ? "Frame your portrait" : "Taking photos"}>
          <header className="page-head">
            <p className="kicker">{screen === "frame" ? "Chapter one · Gather close" : `Page ${shotIndex + 1} of 3`}</p>
            <h1 className="page-title">
              {screen === "frame" ? (
                <>Step into the <em>portrait</em></>
              ) : countdown ? (
                "Hold still…"
              ) : (
                <>Pinned to the <em>page</em></>
              )}
            </h1>
          </header>

          <div className="gilt">
            <FrameCorners />
            <img className="gilt-web" src="/decor/web.svg" alt="" aria-hidden="true" />
            <div className="mat">
              <video ref={attachVideo} className="live" style={previewStyle} playsInline muted autoPlay />
              <div className="guide" aria-hidden="true">
                <span>stay inside the frame</span>
              </div>
              {countdown !== null && (
                <div className="countdown" key={`${shotIndex}-${countdown}`} aria-live="assertive">
                  {countdown}
                </div>
              )}
            </div>
          </div>

          <aside className="side panel">
            <Sticker src="/decor/skull.svg" className="panel-skull" tape="ink" />
            {screen === "frame" ? (
              <>
                <fieldset className="choices">
                  <legend>Choose your chapter</legend>
                  <div className="chapters">
                    {CHAPTERS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`chapter${chapter === c.id ? " on" : ""}`}
                        aria-pressed={chapter === c.id}
                        onClick={() => setChapter(c.id)}
                      >
                        <img src={`/kit/${c.motif}.svg`} alt="" />
                        <span>{c.title}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="choices">
                  <legend>Choose your light</legend>
                  <div className="filters">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`chip f-${f.id}${filter === f.id ? " on" : ""}`}
                        aria-pressed={filter === f.id}
                        onClick={() => setFilter(f.id)}
                      >
                        <i aria-hidden="true" />
                        {f.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="begin">
                  <SealButton onClick={startCapture} disabled={capturing}>
                    Begin
                  </SealButton>
                  <p className="hint">or press the spacebar · three portraits, three seconds each</p>
                  {retakesLeft === 0 && <p className="hint">This is your retake, make it count.</p>}
                </div>
              </>
            ) : (
              <ol className="slots" aria-label="Captured photos">
                {[0, 1, 2].map((i) => (
                  <li key={i} className={`slot-photo${shots[i] ? " pinned" : ""}${i === shotIndex && !shots[i] ? " next" : ""}`}>
                    {shots[i] ? <img src={shots[i]} alt={`Photo ${i + 1}`} /> : <span>Page {i + 1}</span>}
                    <b className="pc tl" /><b className="pc tr" /><b className="pc bl" /><b className="pc br" />
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </section>
      )}

      {screen === "review" && (
        <section className="screen page review" aria-label="Review your strip">
          <div className="draft">
            {strip ? (
              <img src={strip.url} alt="Your three photos laid out as a strip" />
            ) : (
              <div className="binding">
                <Quill />
                <span>Binding the pages…</span>
              </div>
            )}
          </div>
          <Balloon className="review-balloon" />
          <Sticker src="/decor/skeleton-gent.svg" className="fig review-gent" />
          <div className="review-copy panel">
            <Sticker src="/decor/skull.svg" className="panel-skull" tape="rose" />
            <p className="kicker">Chapter two · The proof</p>
            <h1 className="page-title">
              Is this your <em>tale?</em>
            </h1>
            <img className="pumpkin" src="/kit/pumpkin.svg" alt="" />
            <div className="review-actions">
              <SealButton onClick={print} disabled={!strip}>
                Print my tale
              </SealButton>
              <SealButton onClick={retake} variant="quiet" disabled={retakesLeft < 1}>
                {retakesLeft < 1 ? "Retake used" : "Retake"}
              </SealButton>
            </div>
            <p className="hint">
              Space to print{retakesLeft > 0 ? " · R to retake" : ""}. The press starts on its own after 30 seconds.
            </p>
          </div>
        </section>
      )}

      {screen === "print" && strip && (
        <section className={`screen page print${ready ? " ready" : ""}`} aria-label="Your strip">
          <div className="print-left">
            <div className="candle-row" aria-hidden="true">
              <Sticker src="/decor/candelabra.svg" className="print-candelabra" />
              <Sticker src="/decor/skull.svg" className="print-skull" tape="gold" />
            </div>
            <div className="caption" aria-live="polite">
              {ready && (
                <div className="panel caption-panel">
                  <Sticker src="/decor/witch-hat.svg" className="caption-hat" tape="rose" />
                  <p className="caption-text">
                    Scan to keep your story.
                    <br />
                    <em>It fades in 48 hours.</em>
                  </p>
                  <div className="final-actions">
                    <SealButton onClick={() => setLightbox(true)} variant="quiet">
                      View up close
                    </SealButton>
                    <SealButton onClick={resetSession}>
                      Start a new story
                    </SealButton>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="press">
            <p className="sign">
              <span className="sign-text">Your tale is being printed</span>
              <span className="arrow" aria-hidden="true">↓</span>
            </p>
            <div className="slot" aria-hidden="true" />
            <div className="mask">
              <div className="feed">
                <div className="sway">
                  <button type="button" className="strip" onClick={() => setLightbox(true)} aria-label="View the strip up close">
                    <img src={strip.url} alt="Your printed photo strip" />
                    {strip.ghosts.map((g, i) => (
                      <span
                        key={i}
                        className={`ghost g${i}`}
                        style={{
                          backgroundImage: `url(${g})`,
                          left: `${PHOTO_RECTS[i].left * 100}%`,
                          top: `${PHOTO_RECTS[i].top * 100}%`,
                          width: `${PHOTO_RECTS[i].width * 100}%`,
                          height: `${PHOTO_RECTS[i].height * 100}%`,
                        }}
                      />
                    ))}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="tag-col">
            <div className="tag">
              <span className="twine" aria-hidden="true" />
              <img className="tag-art" src="/kit/gift-tag-blank.svg" alt="" />
              <div className="tag-body">
                {upload.status === "done" ? (
                  <>
                    <div className="qr" role="img" aria-label="QR code to download your strip" dangerouslySetInnerHTML={{ __html: upload.qrSvg }} />
                    <p className="tag-url">{shortUrl(upload.url)}</p>
                  </>
                ) : upload.status === "error" ? (
                  <div className="qr waiting">
                    <p className="tag-wait">The press refused this one.</p>
                    <button type="button" className="text-btn" onClick={saveLocally}>Save on this laptop</button>
                  </div>
                ) : (
                  <div className="qr waiting">
                    <Quill />
                    <p className="tag-wait">
                      {upload.status === "offline" ? `Waiting for the spirits (${upload.reason})` : "Writing your link…"}
                    </p>
                    {upload.status === "offline" && (
                      <button type="button" className="text-btn" onClick={saveLocally}>Save on this laptop</button>
                    )}
                  </div>
                )}
                <p className="tag-scan">Scan to keep<br />your story</p>
                <p className="tag-fades">Fades in 48 hours</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {lightbox && strip && (
        <div className="lightbox" role="dialog" aria-label="Strip up close" onClick={() => setLightbox(false)}>
          <img src={strip.url} alt="Your photo strip, full height" />
          <button type="button" className="text-btn close" onClick={() => setLightbox(false)}>Close</button>
        </div>
      )}

      <div className={`flash${flash ? " on" : ""}`} aria-hidden="true" />
      {turnKey > leafDone && (
        <div key={turnKey} className="leaf" aria-hidden="true" onAnimationEnd={(e) => e.target === e.currentTarget && setLeafDone(turnKey)} />
      )}

      <button
        type="button"
        className="sound-toggle"
        aria-pressed={soundOn}
        onClick={() => setSoundOn((s) => !s)}
      >
        Sound {soundOn ? "on" : "off"}
      </button>
      <button type="button" className="host-gear" onClick={() => setHostOpen(true)} aria-label="Host settings (Shift+H)">
        ✦
      </button>

      {hostOpen && (
        <div className="host-backdrop" onClick={() => setHostOpen(false)}>
          <form className="host" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setHostOpen(false); }}>
            <h2>Host settings</h2>
            <label>
              Event name (strip footer)
              <input value={host.eventName} onChange={(e) => updateHost({ eventName: e.target.value })} maxLength={48} />
            </label>
            <label>
              Date (after “Chapter I ·”)
              <input value={host.eventDate} onChange={(e) => updateHost({ eventDate: e.target.value })} maxLength={40} />
            </label>
            <label>
              Subtitle (cover and strip header)
              <input value={host.subtitle} onChange={(e) => updateHost({ subtitle: e.target.value })} maxLength={40} />
            </label>
            <label className="check">
              <input type="checkbox" checked={host.soundOn} onChange={(e) => updateHost({ soundOn: e.target.checked })} />
              Sound on by default
            </label>
            <div className="host-actions">
              <button type="button" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
                Enter full screen
              </button>
              <button type="button" onClick={() => { setHostOpen(false); resetSession(); }}>
                Reset session
              </button>
              {strip && <button type="button" onClick={saveLocally}>Save current strip</button>}
              <button type="submit">Done</button>
            </div>
            <p className="host-note">Shift+H opens this panel. Shift+Esc resets a stuck session from anywhere.</p>
          </form>
        </div>
      )}
    </div>
  );
}

function Dust() {
  return (
    <div className="dust" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            animationDuration: `${18 + ((i * 7) % 14)}s`,
            animationDelay: `${-((i * 3) % 17)}s`,
            opacity: 0.25 + ((i * 13) % 5) / 10,
          }}
        />
      ))}
    </div>
  );
}
