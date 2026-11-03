"use client";

import { usePathname } from "next/navigation";
import Wordmark from "./Wordmark";

export default function SiteFooter() {
  // 첫 화면은 한 화면으로 끝나게 푸터를 두지 않는다.
  if (usePathname() === "/") return null;

  return (
    <footer className="border-t border-line bg-surface">
      <div className="page space-y-2 py-8 text-meta text-ink-3">
        <Wordmark className="text-[16px] text-ink-2" />
        <p>동탄 반송고등학교 재학생과 졸업생이 함께 만드는 밴드 반송의 연례 공연입니다.</p>
        <p>
          공연 소식은 인스타그램{" "}
          <a
            href="https://www.instagram.com/band.bansong/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-ink-2 underline-offset-2 hover:underline"
          >
            @band.bansong
          </a>
          에서 볼 수 있어요.
        </p>
      </div>
    </footer>
  );
}
