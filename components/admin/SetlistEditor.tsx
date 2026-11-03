"use client";

import type { ClipboardEvent } from "react";
import { parseCredits } from "@/lib/credits";
import { setlistFromText } from "@/lib/setlist";
import { applyPaste, cloneSetlist, emptySong, readCell, setlistColumns, toEditSetlist, writeCell, type EditSection } from "@/lib/setlist-edit";
import { ChevronRightIcon, CloseIcon } from "../icons";

export type { EditSection } from "@/lib/setlist-edit";
export { fromEditSetlist, setlistColumns, toEditSetlist } from "@/lib/setlist-edit";

const cell =
  "h-9 w-full rounded border border-transparent bg-transparent px-2 text-meta text-ink placeholder:text-ink-4 hover:border-line focus:border-brand-600 focus:bg-white focus:outline-none";
const iconButton = "flex h-8 w-8 items-center justify-center rounded text-ink-3 hover:bg-surface hover:text-ink disabled:text-ink-4 disabled:hover:bg-transparent";

// 셋리스트 표 편집기. 곡마다 파트별로 무대에 서는 사람을 적는다.
// 엑셀·구글 시트에서 여러 칸을 복사해 붙여 넣으면 그 자리부터 표가 채워진다.
export default function SetlistEditor({
  value,
  onChange,
  credits,
  introText,
}: {
  value: EditSection[];
  onChange: (next: EditSection[]) => void;
  credits: string;
  introText: string;
}) {
  const columns = setlistColumns(credits, value);
  const keys = ["title", "artist", ...columns];
  const creditRows = parseCredits(credits);
  const fromText = value.length === 0 ? setlistFromText(introText) : [];
  const fromTextCount = fromText.reduce((sum, s) => sum + s.songs.length, 0);

  const update = (change: (draft: EditSection[]) => void) => {
    const draft = cloneSetlist(value);
    change(draft);
    onChange(draft);
  };

  const paste = (si: number, gi: number, ki: number, event: ClipboardEvent<HTMLInputElement>) => {
    const next = applyPaste(value, si, gi, keys, ki, event.clipboardData.getData("text/plain"));
    if (!next) return; // 한 칸짜리는 그냥 붙여 넣는다
    event.preventDefault();
    onChange(next);
  };

  if (value.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong px-5 py-8 text-center">
        <p className="text-ui text-ink-2">아직 셋리스트가 없어요.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => onChange([{ name: "1부", songs: [emptySong()] }])}>
            셋리스트 만들기
          </button>
          {fromTextCount > 0 && (
            <button type="button" className="btn-secondary btn-sm" onClick={() => onChange(toEditSetlist(fromText))}>
              공연정보 글에서 {fromTextCount}곡 가져오기
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {columns.map((role, i) => (
        <datalist key={role} id={`setlist-role-${i}`}>
          {Array.from(new Set(creditRows.filter((row) => row.role === role).flatMap((row) => row.names))).map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      ))}

      {value.map((section, si) => (
        <section key={si}>
          <div className="mb-2 flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">묶음 이름</span>
              <input
                value={section.name}
                onChange={(e) => update((d) => void (d[si].name = e.target.value))}
                placeholder="묶음 이름 (예: 1부)"
                className="h-9 w-full max-w-[220px] rounded border border-line-strong px-2.5 text-ui font-semibold focus:border-brand-600 focus:outline-none"
              />
            </label>
            <button
              type="button"
              className="btn-ghost text-meta text-ink-3"
              onClick={() => {
                const filled = section.songs.some((song) => song.title.trim());
                if (filled && !window.confirm(`'${section.name || "이 묶음"}'의 곡을 모두 지울까요?`)) return;
                update((d) => void d.splice(si, 1));
              }}
            >
              묶음 지우기
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[760px] text-left text-meta">
              <thead className="border-b border-line bg-surface text-ink-3">
                <tr>
                  <th className="w-9 px-2 py-2 text-right font-semibold">#</th>
                  <th className="min-w-[150px] px-2 py-2 font-semibold">곡명</th>
                  <th className="min-w-[110px] px-2 py-2 font-semibold">아티스트</th>
                  {columns.map((role) => (
                    <th key={role} className="min-w-[100px] px-2 py-2 font-semibold">
                      {role}
                    </th>
                  ))}
                  {/* 파트가 많아 표가 가로로 넘쳐도 순서·지우기 버튼은 오른쪽에 붙어 있게 한다 */}
                  <th className="sticky right-0 w-[104px] bg-surface px-2 py-2 shadow-[inset_1px_0_0_rgb(0_0_0/0.08)]">
                    <span className="sr-only">순서 바꾸기·지우기</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {section.songs.map((song, gi) => (
                  <tr key={gi}>
                    <td className="px-2 text-right tabular-nums text-ink-3">{gi + 1}</td>
                    {keys.map((key, ki) => (
                      <td key={key} className="px-0.5 py-0.5">
                        <input
                          value={readCell(song, key)}
                          onChange={(e) => update((d) => writeCell(d[si].songs[gi], key, e.target.value))}
                          onPaste={(e) => paste(si, gi, ki, e)}
                          list={ki >= 2 ? `setlist-role-${ki - 2}` : undefined}
                          placeholder={key === "title" ? "곡명" : key === "artist" ? "아티스트" : ""}
                          aria-label={`${gi + 1}번 곡 ${key === "title" ? "곡명" : key === "artist" ? "아티스트" : key}`}
                          className={`${cell} ${key === "title" ? "font-semibold" : ""}`}
                        />
                      </td>
                    ))}
                    <td className="sticky right-0 bg-white px-1 shadow-[inset_1px_0_0_rgb(0_0_0/0.08)]">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          aria-label={`${gi + 1}번 곡 위로`}
                          disabled={gi === 0}
                          onClick={() => update((d) => d[si].songs.splice(gi - 1, 0, ...d[si].songs.splice(gi, 1)))}
                          className={iconButton}
                        >
                          <ChevronRightIcon className="h-4 w-4 -rotate-90" />
                        </button>
                        <button
                          type="button"
                          aria-label={`${gi + 1}번 곡 아래로`}
                          disabled={gi === section.songs.length - 1}
                          onClick={() => update((d) => d[si].songs.splice(gi + 1, 0, ...d[si].songs.splice(gi, 1)))}
                          className={iconButton}
                        >
                          <ChevronRightIcon className="h-4 w-4 rotate-90" />
                        </button>
                        <button
                          type="button"
                          aria-label={`${gi + 1}번 곡 지우기`}
                          onClick={() => update((d) => void d[si].songs.splice(gi, 1))}
                          className={iconButton}
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn-ghost mt-1 text-meta" onClick={() => update((d) => void d[si].songs.push(emptySong()))}>
            + 곡 추가
          </button>
        </section>
      ))}

      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={() => update((d) => void d.push({ name: `${d.length + 1}부`, songs: [emptySong()] }))}
      >
        묶음 추가 ({value.length + 1}부)
      </button>
    </div>
  );
}
