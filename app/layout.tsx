import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Black_Han_Sans } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { SITE } from "@/lib/site";

// 로고와 첫 화면 제목에만 쓰는 굵은 제목체. 한글 조각 파일이 많아서 미리 불러오지는 않는다.
const display = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: { default: "작전명문 공연 예매", template: "%s | 작전명문" },
  description: `${SITE.band} 연례 공연의 예매, 입금 안내, 모바일 QR 티켓`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={display.variable}>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
