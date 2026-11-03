"use client";

import { useEffect, useRef, useState } from "react";

// 메뉴의 밑줄이 누른 항목으로 미끄러져 가게 한다.
// 항목에 data-indicator-key를 달고, 돌려받은 ref를 항목들을 감싼 relative 요소에 건다.
export function useSlidingIndicator(activeKey: string | undefined, deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const measure = () => {
      const el = activeKey
        ? containerRef.current?.querySelector<HTMLElement>(`[data-indicator-key="${activeKey}"]`)
        : null;
      setBox(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    // 처음 자리를 잡을 때는 움직이지 않고, 그 뒤 바뀔 때만 미끄러지게 한다.
    const frame = requestAnimationFrame(() => setAnimate(true));
    window.addEventListener("resize", measure);
    // 글꼴이 늦게 들어오면 글자 폭이 바뀌므로 한 번 더 잰다.
    void document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, ...deps]);

  const style: React.CSSProperties = box
    ? {
        transform: `translateX(${box.left}px)`,
        width: box.width,
        transition: animate ? "transform 300ms cubic-bezier(0.2, 0.7, 0.2, 1), width 300ms cubic-bezier(0.2, 0.7, 0.2, 1)" : "none",
      }
    : { opacity: 0 };

  return { containerRef, style };
}
