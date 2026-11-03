"use client";

import { useRef, useState } from "react";

type Tab = { id: string; label: string; content: React.ReactNode };

// 공연정보 / 판매정보 / 장소정보 탭. 탭 줄은 헤더 아래에 붙어 따라온다.
export default function ShowTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const rootRef = useRef<HTMLDivElement>(null);

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
              className={`relative h-[52px] flex-1 text-[15px] ${
                selected ? "font-bold text-ink" : "font-medium text-ink-3 hover:text-ink"
              }`}
            >
              {tab.label}
              {selected && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-ink" />}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          className="py-8 lg:py-10"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
