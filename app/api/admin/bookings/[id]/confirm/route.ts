import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { errorResponse } from "@/lib/http";
import { confirmBooking } from "@/lib/admin-bookings";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRoleAtLeast(RoleType.STAFF);
    const result = await confirmBooking(params.id, actor.user.id);

    return NextResponse.json({
      booking: {
        id: result.booking.id,
        status: result.booking.status,
        createdAt: result.booking.createdAt,
      },
      tickets: [{ id: result.ticket.id, ticketCode: result.ticket.qrToken }],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
