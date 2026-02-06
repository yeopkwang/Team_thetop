import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import SidebarNav from "@/components/SidebarNav";

export const metadata: Metadata = {
  title: "공연 예약",
  description: "공연 예약 및 관리 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="font-sans bg-slate-50 text-slate-900">
        <Providers>
          <div className="min-h-screen md:flex md:flex-row">
            <aside className="md:w-64 border-b md:border-b-0 md:border-r bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 sticky top-0 z-20">
              <div className="p-4 md:p-6">
                <div className="text-xl font-bold text-slate-900">작전명문</div>
                <p className="text-xs text-slate-500 mt-1">공연 예매/예약 포털</p>
              </div>
              <div className="px-2 pb-3">
                <SidebarNav />
              </div>
            </aside>
            <div className="flex-1 min-h-screen">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
