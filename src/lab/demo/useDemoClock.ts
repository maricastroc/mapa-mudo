"use client";

import { useCallback, useEffect, useState } from "react";

const START_DELAY = 0.9;
const AFTER_END = 3;

function clockNow() {
  return typeof performance === "undefined" ? 0 : performance.now();
}

export function useDemoClock(end: number, reducedMotion: boolean) {
  const [startedAt, setStartedAt] = useState(() => clockNow() + START_DELAY * 1000);
  const [now, setNow] = useState(clockNow);
  const t = reducedMotion ? end + AFTER_END : Math.max(0, (now - startedAt) / 1000);
  const running = t < end + AFTER_END;

  useEffect(() => {
    if (!running || reducedMotion) return;
    let frame = requestAnimationFrame(function loop() {
      setNow(performance.now());
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, [running, reducedMotion]);

  const replay = useCallback(() => {
    const at = performance.now();
    setStartedAt(at);
    setNow(at);
  }, []);

  return { t, now, replay };
}
