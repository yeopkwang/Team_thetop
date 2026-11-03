// 관리자 탭끼리 옮길 때도 새 화면을 부드럽게 드러낸다(루트 template은 /admin 안에서는 다시 그려지지 않는다).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
