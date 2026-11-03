"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import Wordmark from "./Wordmark";

export default function SiteFooter() {
  // 첫 화면은 한 화면으로 끝나게 푸터를 두지 않는다.
  if (usePathname() === "/") return null;

  return (
    <footer className="border-t border-line bg-surface print:hidden">
      <div className="page space-y-2 py-8 text-meta text-ink-3">
        <Wordmark className="text-[16px] text-ink-2" />
        <p>{SITE.about}</p>
        <p>
          공연 소식은 인스타그램{" "}
          <a href={SITE.instagram.url} target="_blank" rel="noreferrer" className="font-semibold text-ink-2 underline-offset-2 hover:underline">
            {SITE.instagram.handle}
          </a>
          에서 볼 수 있어요. 궁금한 점은{" "}
          <Link href="/help" className="font-semibold text-ink-2 underline-offset-2 hover:underline">
            자주 묻는 질문
          </Link>
          에 모아 뒀어요.
        </p>
      </div>
    </footer>
  );
}
