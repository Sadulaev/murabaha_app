"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent, type WheelEvent } from "react";

const TRANSITION_LOCK_MS = 860;
const WHEEL_THRESHOLD = 90;
const SWIPE_THRESHOLD = 72;

export function useSectionNavigator(totalSections: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const lockRef = useRef(false);
  const deltaRef = useRef(0);
  const touchStartRef = useRef<number | null>(null);
  const unlockTimerRef = useRef<number | null>(null);

  const scheduleUnlock = useCallback(() => {
    if (unlockTimerRef.current !== null) {
      window.clearTimeout(unlockTimerRef.current);
    }

    unlockTimerRef.current = window.setTimeout(() => {
      lockRef.current = false;
    }, TRANSITION_LOCK_MS);
  }, []);

  const navigateTo = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(totalSections - 1, nextIndex));

      deltaRef.current = 0;
      if (clamped === activeIndex || lockRef.current) {
        return;
      }

      lockRef.current = true;
      setActiveIndex(clamped);
      scheduleUnlock();
    },
    [activeIndex, scheduleUnlock, totalSections],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      if (lockRef.current) {
        return;
      }

      const nextIndex = activeIndex + direction;
      if (nextIndex < 0 || nextIndex >= totalSections) {
        deltaRef.current = 0;
        return;
      }

      navigateTo(nextIndex);
    },
    [activeIndex, navigateTo, totalSections],
  );

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLElement>) => {
      event.preventDefault();

      if (lockRef.current) {
        return;
      }

      deltaRef.current += event.deltaY;
      if (Math.abs(deltaRef.current) < WHEEL_THRESHOLD) {
        return;
      }

      const direction = deltaRef.current > 0 ? 1 : -1;
      deltaRef.current = 0;
      step(direction);
    },
    [step],
  );

  const handleTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    touchStartRef.current = event.changedTouches[0]?.clientY ?? null;
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    if (lockRef.current) {
      event.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (touchStartRef.current === null || lockRef.current) {
        return;
      }

      const endY = event.changedTouches[0]?.clientY ?? touchStartRef.current;
      const delta = touchStartRef.current - endY;
      touchStartRef.current = null;

      if (Math.abs(delta) < SWIPE_THRESHOLD) {
        return;
      }

      step(delta > 0 ? 1 : -1);
    },
    [step],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        step(1);
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        step(-1);
      }

      if (event.key === "Home") {
        event.preventDefault();
        navigateTo(0);
      }

      if (event.key === "End") {
        event.preventDefault();
        navigateTo(totalSections - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigateTo, step, totalSections]);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current !== null) {
        window.clearTimeout(unlockTimerRef.current);
      }
    };
  }, []);

  return {
    activeIndex,
    navigateTo,
    handleWheel,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
  };
}
