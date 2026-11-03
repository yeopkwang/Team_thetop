export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShowText from "@/components/ShowText";
import { ChevronRightIcon } from "@/components/icons";
import { MobilePosterHero } from "@/components/show/Poster";
import ShowSummary from "@/components/show/ShowSummary";
import ShowTabs from "@/components/show/ShowTabs";
import VenueInfo from "@/components/show/VenueInfo";
import { formatDate } from "@/lib/format";
import { getPastShow } from "@/lib/show";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const show = await getPastShow(params.id);
  return { title: show ? show.title : "지난 공연" };
}

export default async function PastShowPage({ params }: { params: { id: string } }) {
  const show = await getPastShow(params.id);
  if (!show) notFound();

  const period = show.dateLabel || (show.sessions[0] ? formatDate(show.sessions[0].date) : "");
  const tabs = [
    {
      id: "info",
      label: "공연정보",
      content: show.introText ? (
        <ShowText text={show.introText} />
      ) : (
        <p className="text-ui text-ink-3">이 공연의 소개와 셋리스트를 정리하고 있어요.</p>
      ),
    },
    ...(show.venue
      ? [{ id: "venue", label: "장소정보", content: <VenueInfo venue={show.venue} address={show.venueAddress} /> }]
      : []),
  ];

  return (
    <main className="page-enter pb-16">
      <MobilePosterHero src={show.posterUrl} title={show.title} />

      <div className="page lg:pt-6">
        <Link href="/past" className="mt-4 inline-flex items-center gap-1 text-meta text-ink-3 hover:text-ink lg:mt-0">
          <ChevronRightIcon className="h-3.5 w-3.5 rotate-180" />
          지난 공연
        </Link>
        <div className="lg:mt-4 lg:max-w-[820px]">
          <ShowSummary show={show} period={period} badge="지난 공연" />
          <ShowTabs tabs={tabs} />
        </div>
      </div>
    </main>
  );
}
