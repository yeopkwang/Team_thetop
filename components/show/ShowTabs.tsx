"use client";

import { useEffect, useRef, useState } from "react";

type Tab = { id: string; label: string; content: React.ReactNode };

// 공연정보 / 판매정보 / 장소정보 탭. 탭 줄은 헤더 아래에 붙어 따라온다.
export default function ShowTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const rootRef = useRef<HTMLDivElement>(null);

  // /show#sales 처럼 들어오면 그 탭을 열고 탭 위치로 내려 준다(예매 화면의 환불 규정 링크).
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!tabs.some((t) => t.id === id)) return;
    setActive(id);
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0;
    const root = rootRef.current;
    if (root) window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - headerH });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tabs.length === 0) return null;

  const select = (id: string) => {
    setActive(id);
    // 아래로 내려 읽다가 탭을 바꾸면 새 내용의 처음으로 올려 준다.
    const root = rootRef.current;
    if (!root) return;
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 0;
    const top = root.getBoundingClientRect().top + window.scrollY - headerH;
    if (window.scrollY > top) window.scrollTo({ top });
  };

  return (
    <div ref={rootRef} className="mt-10 lg:mt-14">
      <div
        role="tablist"
        className="sticky top-[var(--header-h)] z-20 -mx-4 flex border-b border-line-strong bg-white md:-mx-6 lg:mx-0"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => select(tab.id)}
              className={`h-[52px] flex-1 text-[15px] transition-colors duration-200 ${
                selected ? "font-bold text-ink" : "font-medium text-ink-3 hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        {/* 탭 너비가 모두 같아서, 고른 탭 순서만큼 밑줄을 옮긴다 */}
        <span
          aria-hidden
          className="absolute -bottom-px left-0 h-[2px] bg-ink transition-transform duration-300 ease-out"
          style={{
            width: `${100 / tabs.length}%`,
            transform: `translateX(${Math.max(0, tabs.findIndex((t) => t.id === active)) * 100}%)`,
          }}
        />
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          className={`py-8 lg:py-10 ${tab.id === active ? "page-enter" : ""}`}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
