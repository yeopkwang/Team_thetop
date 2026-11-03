export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { attendeeList, attendeeTable } from "@/lib/admin-reports";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { toCsv } from "@/lib/csv";
import { route } from "@/lib/http";

// 예매자 명단. ?show=공연id(없으면 판매 중인 공연), ?format=csv면 엑셀 파일로 내려준다.
export const GET = route(async (req) => {
  await requireRoleAtLeast(RoleType.STAFF);
  const { searchParams } = new URL(req.url);
  const list = await attendeeList(searchParams.get("show") || undefined);
  if (searchParams.get("format") !== "csv") return NextResponse.json(list);

  const filename = encodeURIComponent(`${list.show.title} 예매자 명단.csv`);
  return new Response(toCsv(attendeeTable(list.people)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendees.csv"; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store",
    },
  });
});
