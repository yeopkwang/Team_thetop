// 셋리스트와 곡별 크레딧. 브라우저에서도 쓰므로 서버 전용 모듈을 import하지 않는다.
// DB에는 [{ name: "1부", songs: [{ title, artist, lineup: [{ role: "보컬", names: ["홍길동"] }] }] }] 꼴로 둔다.
export type LineupRow = { role: string; names: string[] };
export type SetlistSong = { title: string; artist: string; lineup: LineupRow[] };
export type SetlistSection = { name: string; songs: SetlistSong[] };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

// 칸 하나에 적은 이름들("홍길동, 김철수")을 나눈다. 크레딧 글과 같은 구분자를 받는다.
export function splitNames(text: string) {
  return text
    .split(/[,，、·/]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

// 저장된 값이나 관리자 입력을 정리한다. 곡명이 빈 곡, 이름이 빈 파트, 곡이 없는 묶음은 버린다.
export function normalizeSetlist(value: unknown): SetlistSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 10)
    .map((section): SetlistSection => {
      const s = (section ?? {}) as { name?: unknown; songs?: unknown };
      const songs = (Array.isArray(s.songs) ? s.songs : []).slice(0, 60).map((song): SetlistSong => {
        const g = (song ?? {}) as { title?: unknown; artist?: unknown; lineup?: unknown };
        const lineup = (Array.isArray(g.lineup) ? g.lineup : []).slice(0, 20).map((row): LineupRow => {
          const r = (row ?? {}) as { role?: unknown; names?: unknown };
          const names = Array.isArray(r.names) ? r.names.map((n) => str(n, 30)).filter(Boolean).slice(0, 20) : [];
          return { role: str(r.role, 30), names };
        });
        return { title: str(g.title, 100), artist: str(g.artist, 100), lineup: lineup.filter((row) => row.names.length > 0) };
      });
      return { name: str(s.name, 30), songs: songs.filter((song) => song.title) };
    })
    .filter((section) => section.songs.length > 0);
}

export function songCount(sections: SetlistSection[]) {
  return sections.reduce((sum, s) => sum + s.songs.length, 0);
}

// 셋리스트에 나오는 공연자를 처음 나온 순서대로 한 번씩.
export function setlistPerformers(sections: SetlistSection[]) {
  return Array.from(new Set(sections.flatMap((s) => s.songs.flatMap((song) => song.lineup.flatMap((row) => row.names)))));
}

// 공연정보 글에 "# SETLIST 1부" 아래 "1. 곡명 - 아티스트"로 적어 둔 셋리스트를 옮겨 온다.
export function setlistFromText(text: string): SetlistSection[] {
  const sections: SetlistSection[] = [];
  let current: SetlistSection | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^#\s*(?:set\s*list|셋\s*리스트)\s*(.*)$/i);
    if (heading) {
      current = { name: heading[1].trim(), songs: [] };
      sections.push(current);
      continue;
    }
    if (line.startsWith("#")) {
      current = null;
      continue;
    }
    const item = current && line.match(/^\d+[.)]\s*(.+)$/);
    if (current && item) {
      const [title, ...artist] = item[1].split(/\s+-\s+/);
      current.songs.push({ title: title.trim(), artist: artist.join(" - ").trim(), lineup: [] });
    }
  }
  return normalizeSetlist(sections);
}
