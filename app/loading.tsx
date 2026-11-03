// 루트 로딩은 사실상 첫 화면(/)으로 갈 때만 보인다. 첫 화면과 같은 진홍 바탕을 미리 깐다.
export default function Loading() {
  return <main aria-busy="true" aria-label="불러오는 중" className="min-h-dvh bg-[#120809]" />;
}
