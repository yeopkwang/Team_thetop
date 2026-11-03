"use client";

import { useState } from "react";
import { setlistPerformers, songCount, type SetlistSection } from "@/lib/setlist";

// 셋리스트 탭: 묶음(1부·2부)별 곡 목록과 곡마다 무대에 서는 사람.
// 공연자를 누르면 그 사람이 나오는 곡만 또렷하게 남는다.
export default function SetlistView({ sections }: { sections: SetlistSection[] }) {
  const performers = setlistPerformers(sections);
  const [picked, setPicked] = useState<string | null>(null);
  const pickedCount = picked
    ? sections.reduce((sum, s) => sum + s.songs.filter((song) => song.lineup.some((row) => row.names.includes(picked))).length, 0)
    : 0;

  return (
    <div>
      {performers.length > 0 && (
        <div className="mb-8">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="공연자로 곡 찾기">
            {[null, ...performers].map((name) => {
              const on = picked === name;
              return (
                <button
                  key={name ?? "__all"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked(name)}
                  className={`h-9 shrink-0 rounded-full border px-3.5 text-meta font-semibold transition-colors ${
                    on ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink-2 hover:border-ink-3"
                  }`}
                >
                  {name ?? `전체 ${songCount(sections)}곡`}
                </button>
              );
            })}
          </div>
          <p className="mt-3 min-h-[20px] text-meta text-ink-3" aria-live="polite">
            {picked ? `${picked} 님이 무대에 서는 곡은 ${pickedCount}곡이에요.` : "공연자를 누르면 그 사람이 나오는 곡을 볼 수 있어요."}
          </p>
        </div>
      )}

      <div className="space-y-10">
        {sections.map((section, si) => (
          <section key={si}>
            <h3 className="flex items-baseline justify-between border-b border-ink pb-2.5">
              <span className="text-[16px] font-bold">{section.name || "셋리스트"}</span>
              <span className="text-meta text-ink-3">{section.songs.length}곡</span>
            </h3>
            <ol>
              {section.songs.map((song, i) => {
                const dim = picked !== null && !song.lineup.some((row) => row.names.includes(picked));
                return (
                  <li
                    key={i}
                    className={`flex gap-4 border-b border-line py-4 transition-opacity duration-200 ${dim ? "opacity-35" : ""}`}
                  >
                    <span className="w-6 shrink-0 pt-px text-right text-ui tabular-nums text-ink-3">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-6 text-ink">{song.title}</p>
                      {song.artist && <p className="text-meta text-ink-3">{song.artist}</p>}
                      {song.lineup.length > 0 && (
                        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-meta">
                          {song.lineup.map((row, ri) => (
                            <div key={ri} className="flex gap-1.5">
                              <dt className="text-ink-3">{row.role || "출연"}</dt>
                              <dd className="text-ink-2">
                                {row.names.map((name, ni) => (
                                  <span key={ni}>
                                    {ni > 0 && ", "}
                                    <span className={name === picked ? "font-bold text-brand-600" : ""}>{name}</span>
                                  </span>
                                ))}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
