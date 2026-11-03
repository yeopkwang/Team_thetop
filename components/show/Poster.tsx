import Wordmark from "../Wordmark";

export default function Poster({ src, title, className = "" }: { src: string | null; title: string; className?: string }) {
  if (!src) {
    return (
      <div className={`flex aspect-[3/4] items-center justify-center rounded-md border border-line bg-surface ${className}`}>
        <Wordmark className="text-h2 text-ink-3" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${title} 포스터`}
      className={`aspect-[3/4] w-full rounded-md border border-line object-cover ${className}`}
    />
  );
}

// 모바일 상단: 포스터를 흐리게 깐 배경 위에 포스터를 띄운다.
export function MobilePosterHero({ src, title }: { src: string | null; title: string }) {
  return (
    <div className="relative overflow-hidden bg-brand-900 lg:hidden">
      {src && (
        <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl" />
      )}
      <div className="relative mx-auto w-[56%] max-w-[240px] py-7">
        <Poster src={src} title={title} className="border-0 shadow-[0_14px_36px_rgba(0,0,0,0.45)]" />
      </div>
    </div>
  );
}
