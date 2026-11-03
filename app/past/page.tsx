export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import Poster from "@/components/show/Poster";
import { formatDate } from "@/lib/format";
import { getPastShows } from "@/lib/show";

export const metadata: Metadata = { title: "지난 공연" };

export default async function PastShowsPage() {
  const shows = await getPastShows();

  return (
    <main className="page-enter page pb-16 pt-6 lg:pt-10">
      <h1 className="text-h1 font-bold">지난 공연</h1>
      <p className="mt-1 text-ui text-ink-3">작전명문이 지금까지 올린 무대예요.</p>

      {shows.length === 0 ? (
        <EmptyState title="아직 등록된 지난 공연이 없어요" />
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 border-t border-ink pt-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {shows.map((show) => {
            const when = show.dateLabel || (show.sessions[0] ? formatDate(show.sessions[0].date) : "");
            return (
              <li key={show.id}>
                <Link href={`/past/${show.id}`} className="group block">
                  <Poster src={show.posterUrl} title={show.title} />
                  <p className="mt-3 text-[15px] font-bold leading-6 text-ink group-hover:underline group-hover:underline-offset-4">
                    {show.title}
                  </p>
                  {when && <p className="mt-0.5 text-meta text-ink-3">{when}</p>}
                  {show.venue && <p className="text-meta text-ink-3">{show.venue}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
