// 화면을 옮길 때마다 새로 그려지는 껍데기. 새 화면을 부드럽게 드러낸다.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
