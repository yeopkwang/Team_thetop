import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: { default: "작전명;문 공연 예매", template: "%s | 작전명;문" },
  description: "밴드 반송 연례 공연의 예매, 입금 안내, 모바일 QR 티켓",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
