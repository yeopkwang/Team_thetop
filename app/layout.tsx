import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";
import SidebarNav from "@/components/SidebarNav";

export const metadata: Metadata = {
  title: "작전명;문",
  description: "공연 예매 및 관리자 페이지",
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
            <aside className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur md:w-64 md:border-b-0 md:border-r supports-[backdrop-filter]:bg-white/70">
              <div className="p-4 md:p-6">
                <div className="text-xl font-bold text-slate-900">작전명;문</div>
                <p className="mt-1 text-xs text-slate-500">공연 예매 서비스</p>
              </div>
              <div className="px-2 pb-3">
                <SidebarNav />
              </div>
            </aside>
            <div className="min-h-screen flex-1">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
