// 지도 앱 바로가기. 주소(없으면 장소 이름)로 찾는다.
export function mapLinks(place: string) {
  const q = encodeURIComponent(place);
  return [
    { name: "카카오맵", href: `https://map.kakao.com/?q=${q}` },
    { name: "네이버 지도", href: `https://map.naver.com/p/search/${q}` },
  ];
}
