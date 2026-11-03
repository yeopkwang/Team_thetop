// 서버에서 화면을 받아 오는 동안 보여 주는 회색 뼈대. 실제 화면과 같은 자리에 놓아 바뀔 때 덜컹이지 않게 한다.

function Bone({ className, width }: { className: string; width?: string }) {
  return <div className={`bone ${className}`} style={width ? { width } : undefined} />;
}

export function ShowSkeleton({ withPanel = true }: { withPanel?: boolean }) {
  return (
    <main aria-busy="true" aria-label="불러오는 중" className="pb-16">
      <div className="h-[340px] bg-surface lg:hidden" />
      <div className="page lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:pt-10">
        <div>
          <div className="pt-6 lg:pt-0">
            <Bone className="h-5 w-12" />
            <Bone className="mt-3 h-8 w-56 lg:h-9" />
          </div>
          <div className="mt-5 border-t border-line pt-5 lg:mt-6 lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 lg:pt-6">
            <Bone className="hidden aspect-[3/4] lg:block" />
            <div className="space-y-4 pt-1">
              {[60, 40, 72, 50, 36].map((w) => (
                <div key={w} className="flex gap-4">
                  <Bone className="h-4 w-[72px]" />
                  <Bone className="h-4" width={`${w}%`} />
                </div>
              ))}
            </div>
          </div>
          <Bone className="mt-12 h-[52px] w-full" />
        </div>
        {withPanel && <Bone className="hidden h-[560px] lg:block" />}
      </div>
    </main>
  );
}

export function BookSkeleton() {
  return (
    <main aria-busy="true" aria-label="불러오는 중" className="pb-16">
      <div className="page pt-6 lg:pt-10">
        <Bone className="h-8 w-32" />
        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
          <div className="space-y-8">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <Bone className="h-6 w-36" />
                <Bone className="mt-4 h-[72px] w-full" />
              </div>
            ))}
          </div>
          <Bone className="mt-10 h-[380px] lg:mt-0" />
        </div>
      </div>
    </main>
  );
}

export function PastSkeleton() {
  return (
    <main aria-busy="true" aria-label="불러오는 중" className="page pb-16 pt-6 lg:pt-10">
      <Bone className="h-8 w-32" />
      <Bone className="mt-2 h-4 w-52" />
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 border-t border-line pt-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <Bone className="aspect-[3/4] w-full" />
            <Bone className="mt-3 h-5 w-2/3" />
            <Bone className="mt-1.5 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </main>
  );
}
