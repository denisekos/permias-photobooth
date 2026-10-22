"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { PHOTO_RECTS, composeStory, composeStrip, encode, encodeJpeg, preloadAssets } from "@/lib/booth/compose";
import { gainFor, ghostOf, grabPhoto, sampleLuminance } from "@/lib/booth/photo";
import { DEFAULT_HOST, deviceId, loadHost, saveHost, type HostSettings } from "@/lib/booth/settings";

type Screen = "attract" | "waking" | "denied" | "frame" | "capture" | "review" | "print";

type Upload =
  | { status: "idle" | "uploading" }
  | { status: "offline"; reason: string }
  | { status: "done"; url: string; qrSvg: string }
  | { status: "error"; message: string };

const REVIEW_AUTOPRINT_MS = 30_000;
const FINAL_IDLE_MS = 60_000;
const UPLOAD_RETRY_MS = 5_000;
const UPLOAD_TIMEOUT_MS = 20_000;

/** The server's plain-text reason, or "" for an HTML error page from the platform. */
async function serverText(res: Response): Promise<string> {
  const text = (await res.text().catch(() => "")).trim();
  return text.startsWith("<") ? "" : text.slice(0, 240);
}
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

function PillButton({
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
    <button type="button" className={`pill ${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** A card of pencil-textured paper. Readable content sits on these. */
function Card({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <div className={`card ${className}`}>
      <div className="panel">{children}</div>
    </div>
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

  const session = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photos = useRef<HTMLCanvasElement[]>([]);
  const stripBlob = useRef<Blob | null>(null);
  const storyBlob = useRef<Promise<Blob | null> | null>(null);
  const gainRef = useRef(1);
  const capturingRef = useRef(false);
  const printingRef = useRef(false);
  const uploadRunning = useRef(false);
  const uploadInflight = useRef<AbortController | null>(null);
  const uploadWake = useRef<(() => void) | null>(null);
  const uploadManual = useRef(false);
  gainRef.current = gain;

  useEffect(() => {
    const h = loadHost();
    setHost(h);
    preloadAssets();
  }, []);

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
      const canvas = await composeStrip({ photos: photos.current, host });
      const blob = await encode(canvas);
      if (token !== session.current) {
        canvas.width = 0;
        return;
      }
      stripBlob.current = blob;
      setStrip({ url: URL.createObjectURL(blob), ghosts: photos.current.map(ghostOf) });
      storyBlob.current = composeStory(canvas, host)
        .then(async (story) => {
          const b = await encodeJpeg(story);
          story.width = 0;
          return b;
        })
        .catch(() => null)
        .finally(() => {
          canvas.width = 0;
        });
    },
    [host],
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
        for (const n of [5, 4, 3, 2, 1]) {
          setCountdown(n);
          await sleep(1000, token);
        }
        setCountdown(null);
        setFlash(true);
        await sleep(170, token); // let the flash light the room before the frame is grabbed
        const photo = grabPhoto(video, gainRef.current);
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

  /** Waits for the retry delay, or less if the host presses Reload QR. */
  const waitForRetry = useCallback((ms: number, token: number) => {
    return new Promise<void>((resolve, reject) => {
      const done = () => {
        clearTimeout(timer);
        uploadWake.current = null;
        if (token === session.current) resolve();
        else reject(new Cancelled());
      };
      const timer = setTimeout(done, ms);
      uploadWake.current = done;
    });
  }, []);

  const runUpload = useCallback(
    async (token: number) => {
      if (uploadRunning.current) return;
      uploadRunning.current = true;
      setUpload({ status: "uploading" });
      try {
        const story = await storyBlob.current;
        while (token === session.current) {
          const blob = stripBlob.current;
          if (!blob) return;
          let reason = navigator.onLine ? "the press is jammed" : "offline";
          const ctrl = new AbortController();
          uploadInflight.current = ctrl;
          const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
          try {
            const fd = new FormData();
            fd.append("strip", blob, blob.type === "image/jpeg" ? "strip.jpg" : "strip.png");
            if (story) fd.append("story", story, story.type === "image/jpeg" ? "story.jpg" : "story.png");
            const res = await fetch("/api/strips", {
              method: "POST",
              body: fd,
              headers: { "x-booth-device": deviceId() },
              signal: ctrl.signal,
            });
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
            const fatal = res.headers.get("x-booth-fatal") === "1";
            if (fatal || (res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408)) {
              const message = (await serverText(res)) || `HTTP ${res.status}`;
              if (token === session.current) setUpload({ status: "error", message });
              return;
            }
            if (res.status === 429) reason = "too many tales at once";
            else reason = (await serverText(res)) || `server error ${res.status}`;
          } catch {
            if (uploadManual.current) reason = "retrying";
            else if (ctrl.signal.aborted) reason = "the press is slow";
            else reason = navigator.onLine ? "the connection dropped" : "offline";
          } finally {
            clearTimeout(timer);
            uploadInflight.current = null;
          }
          if (token !== session.current) return;
          if (uploadManual.current) {
            // Reload QR pressed mid-attempt: go again straight away.
            uploadManual.current = false;
            setUpload({ status: "uploading" });
            continue;
          }
          setUpload({ status: "offline", reason });
          try {
            await waitForRetry(UPLOAD_RETRY_MS, token);
          } catch {
            return;
          }
          setUpload({ status: "uploading" });
        }
      } finally {
        uploadRunning.current = false;
        uploadInflight.current = null;
        uploadWake.current = null;
        uploadManual.current = false;
      }
    },
    [waitForRetry],
  );

  /** Reload QR: cut short a slow attempt or the retry wait, or start over after a refusal. */
  const reloadQr = useCallback(() => {
    if (!stripBlob.current) return;
    if (!uploadRunning.current) {
      runUpload(session.current);
      return;
    }
    setUpload({ status: "uploading" });
    if (uploadInflight.current) {
      uploadManual.current = true;
      uploadInflight.current.abort();
    } else {
      uploadWake.current?.();
    }
  }, [runUpload]);

  const print = useCallback(async () => {
    if (screen !== "review" || !strip || printingRef.current) return;
    printingRef.current = true;
    const token = session.current;
    setReady(false);
    goTo("print");
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
  };

  const previewStyle = { filter: `brightness(${gain})` };
  const showCamera = screen === "frame" || screen === "capture";

  return (
    <div className={`booth${reduced ? " reduced" : ""}`}>
      {(screen === "attract" || screen === "waking") && (
        <section className={`screen home${screen === "waking" ? " waking" : ""}`} aria-label="Start">
          <button type="button" className="pumpkin-start" onClick={openBook} disabled={screen === "waking"}>
            <img src="/art/pumpkin.webp" alt="" />
            <span className="sr-only">Start the photobooth</span>
          </button>
          <p className="home-hint" aria-hidden="true">
            {screen === "waking" ? "waking the camera…" : "click the pumpkin"}
          </p>
          <p className="privacy">Photos are kept for 48 hours so you can download them, then deleted.</p>
        </section>
      )}

      {screen === "denied" && (
        <section className="screen page denied" aria-label="Camera needed">
          <Card className="denied-card">
            <p className="kicker">An interruption</p>
            <h1 className="page-title">The camera is still asleep</h1>
            <p className="lede">This booth needs the camera to take your portrait. Nothing is recorded until you press Begin.</p>
            <ol className="howto">
              <li><b>Chrome or Edge:</b> click the camera icon at the right end of the address bar, choose <i>Always allow</i>, then try again.</li>
              <li><b>Safari:</b> Safari menu → Settings for This Website → Camera → <i>Allow</i>.</li>
              <li><b>macOS:</b> System Settings → Privacy &amp; Security → Camera → turn on your browser.</li>
            </ol>
            <PillButton onClick={openBook}>Try again</PillButton>
          </Card>
        </section>
      )}

      {showCamera && (
        <section className="screen page camera" aria-label={screen === "frame" ? "Frame your portrait" : "Taking photos"}>
          <header className="page-head">
            <p className="kicker">{screen === "frame" ? "Roll one · Gather close" : `Frame ${shotIndex + 1} of 3`}</p>
            <h1 className="page-title">{screen === "frame" ? "Step into the frame" : countdown ? "Hold still…" : "Got it!"}</h1>
          </header>

          <div className="filmframe">
            <span className="edge top" aria-hidden="true">
              <b>{shotIndex + 12}</b>
              <b>▶ {shotIndex + 12}A</b>
              <b>SUM 400</b>
            </span>
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
            <span className="edge bottom" aria-hidden="true">
              <b>HALLOWEEN 2026</b>
              <b>{shotIndex + 13}</b>
            </span>
          </div>

          <img className="art screen-hat" src="/art/witch-hat.webp" alt="" aria-hidden="true" />
          <Card className="side">
            {screen === "frame" ? (
              <>
                <div className="ready-note">
                  <p className="kicker">Strike a pose</p>
                  <p className="ready-text">Three portraits, with a five-second countdown before each one.</p>
                  <p className="ready-text">Squeeze everyone inside the dashed frame and look at the camera.</p>
                </div>
                <div className="begin">
                  <PillButton onClick={startCapture} disabled={capturing}>
                    Begin
                  </PillButton>
                  <p className="hint">or press the spacebar</p>
                  {retakesLeft === 0 && <p className="hint">This is your retake, make it count.</p>}
                </div>
              </>
            ) : (
              <ol className="slots" aria-label="Captured photos">
                {[0, 1, 2].map((i) => (
                  <li key={i} className={`slot-photo${shots[i] ? " pinned" : ""}${i === shotIndex && !shots[i] ? " next" : ""}`}>
                    {shots[i] ? <img src={shots[i]} alt={`Photo ${i + 1}`} /> : <span>{i + 1}</span>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </section>
      )}

      {screen === "review" && (
        <section className="screen page review" aria-label="Review your strip">
          <div className="draft">
            {strip ? (
              <img src={strip.url} alt="Your three photos laid out as a film strip" />
            ) : (
              <div className="binding">
                <Quill />
                <span>Developing the film…</span>
              </div>
            )}
          </div>
          <img className="art screen-cat" src="/art/cat-banjo.webp" alt="" aria-hidden="true" />
          <img className="art screen-bat" src="/art/bat.webp" alt="" aria-hidden="true" />
          <Card className="review-copy">
            <p className="kicker">Roll two · The proof</p>
            <h1 className="page-title">Is this your tale?</h1>
            <div className="review-actions">
              <PillButton onClick={print} disabled={!strip}>
                Print my tale
              </PillButton>
              <PillButton onClick={retake} variant="quiet" disabled={retakesLeft < 1}>
                {retakesLeft < 1 ? "Retake used" : "Retake"}
              </PillButton>
            </div>
            <p className="hint">
              Space to print{retakesLeft > 0 ? " · R to retake" : ""}. The press starts on its own after 30 seconds.
            </p>
          </Card>
        </section>
      )}

      {screen === "print" && strip && (
        <section className={`screen page print${ready ? " ready" : ""}`} aria-label="Your strip">
          <div className="print-left">
            <img className="art print-ghost" src="/art/ghost.webp" alt="" aria-hidden="true" />
            <img className="art print-witch" src="/art/witch-broom.webp" alt="" aria-hidden="true" />
            <div className="caption" aria-live="polite">
              {ready && (
                <Card className="caption-card">
                  <p className="caption-text">
                    Scan to keep your story.
                    <br />
                    <em>It fades in 48 hours.</em>
                  </p>
                  <div className="final-actions">
                    <PillButton onClick={() => setLightbox(true)} variant="quiet">
                      View up close
                    </PillButton>
                    <PillButton onClick={resetSession}>Start a new story</PillButton>
                  </div>
                </Card>
              )}
            </div>
          </div>

          <div className="press">
            <p className="sign">
              <span className="sign-text">Developing your film</span>
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
              <div className="tag-pic">
                {upload.status === "done" ? (
                  <div className="qr" role="img" aria-label="QR code to download your strip" dangerouslySetInnerHTML={{ __html: upload.qrSvg }} />
                ) : upload.status === "error" ? (
                  <div className="qr waiting">
                    <p className="tag-wait">The press refused this one.</p>
                    <p className="tag-why">{upload.message}</p>
                    <button type="button" className="reload-qr" onClick={reloadQr}>↻ Reload QR</button>
                    <button type="button" className="text-btn" onClick={saveLocally}>Save on this laptop</button>
                  </div>
                ) : (
                  <div className="qr waiting">
                    <Quill />
                    <p className="tag-wait">
                      {upload.status === "offline" ? `Waiting for the spirits (${upload.reason})` : "Writing your link…"}
                    </p>
                    <button type="button" className="reload-qr" onClick={reloadQr}>↻ Reload QR</button>
                    {upload.status === "offline" && (
                      <button type="button" className="text-btn" onClick={saveLocally}>Save on this laptop</button>
                    )}
                  </div>
                )}
              </div>
              <p className="tag-scan">scan to keep your story ♡</p>
              {upload.status === "done" && <p className="tag-url">{shortUrl(upload.url)}</p>}
              <p className="tag-fades">Fades in 48 hours</p>
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

      <button type="button" className="host-gear" onClick={() => setHostOpen(true)} aria-label="Host settings (Shift+H)">
        ✦
      </button>

      {hostOpen && (
        <div className="host-backdrop" onClick={() => setHostOpen(false)}>
          <form className="host" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setHostOpen(false); }}>
            <h2>Host settings</h2>
            <label>
              Event name (title on the strip)
              <input value={host.eventName} onChange={(e) => updateHost({ eventName: e.target.value })} maxLength={48} />
            </label>
            {(
              [
                ["presenter", "Presented by (strip title frame)"],
                ["subtitle", "Label beside it"],
                ["eventDate", "Date"],
                ["eventDay", "Day"],
                ["eventTime", "Time"],
                ["doors", "Doors line"],
                ["venue", "Venue"],
                ["city", "City"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input value={host[key]} onChange={(e) => updateHost({ [key]: e.target.value })} maxLength={48} />
              </label>
            ))}
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
