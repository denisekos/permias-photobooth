"use client";

import { useEffect, type RefObject } from "react";

/**
 * Writes --px / --py (-1…1) on the element, easing toward the cursor. With no cursor movement
 * for a few seconds it drifts on its own, so an unattended kiosk never looks frozen.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, still: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || still) {
      el?.style.setProperty("--px", "0");
      el?.style.setProperty("--py", "0");
      return;
    }
    let tx = 0, ty = 0, x = 0, y = 0;
    let lastMove = 0;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      lastMove = performance.now();
    };
    const loop = (t: number) => {
      if (t - lastMove > 4000) {
        tx = Math.sin(t / 5200) * 0.6;
        ty = Math.cos(t / 7100) * 0.35;
      }
      x += (tx - x) * 0.05;
      y += (ty - y) * 0.05;
      el.style.setProperty("--px", x.toFixed(4));
      el.style.setProperty("--py", y.toFixed(4));
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [ref, still]);
}
