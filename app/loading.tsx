export default function Loading() {
  return (
    <main className="container-base flex min-h-[40vh] items-center justify-center">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-700">페이지를 준비하고 있습니다.</p>
        <p className="mt-1 text-xs text-slate-500">잠시만 기다려주세요.</p>
      </div>
    </main>
  );
}
