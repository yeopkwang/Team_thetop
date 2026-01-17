import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container-base space-y-10 text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold">
          LOGO
        </div>
        <p className="text-lg text-slate-600">공연 예약과 운영을 한 곳에서.</p>
        <div className="flex gap-4">
          <Link
            href="/book"
            className="px-4 py-2 rounded bg-primary text-white font-semibold hover:bg-slate-800"
          >
            TICKET
          </Link>
          <Link
            href="/mypage"
            className="px-4 py-2 rounded border border-primary text-primary font-semibold hover:bg-primary hover:text-white"
          >
            MYPAGE
          </Link>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4 text-left">
        {[
          { title: "INTRO", href: "/intro" },
          { title: "RECORD", href: "/record" },
          { title: "PHOTO", href: "/photo" },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="block rounded-lg border border-slate-200 p-4 hover:shadow"
          >
            <div className="font-semibold">{item.title}</div>
            <div className="text-sm text-slate-500">자세히 보기</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
