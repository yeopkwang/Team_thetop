import { NextResponse } from "next/server";
import { RoleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoleAtLeast } from "@/lib/auth-helpers";
import { HttpError, errorResponse } from "@/lib/http";
import { logAudit } from "@/lib/audit";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
// Vercel은 요청 본문을 4.5MB까지만 받는다.
const MAX_BYTES = 4 * 1024 * 1024;

// 관리자가 포스터 이미지를 올린다. 돌려준 url을 공연의 포스터 주소로 쓴다.
export async function POST(req: Request) {
  try {
    const actor = await requireRoleAtLeast(RoleType.ADMIN);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "이미지 파일을 골라 주세요.");
    if (!ALLOWED.includes(file.type)) throw new HttpError(400, "PNG, JPG, WEBP, GIF 이미지만 올릴 수 있어요.");
    if (file.size > MAX_BYTES) throw new HttpError(400, "4MB 이하 이미지만 올릴 수 있어요.");

    const asset = await prisma.asset.create({
      data: { mimeType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()) },
      select: { id: true },
    });
    await logAudit({ action: "ASSET_UPLOADED", entityType: "Asset", entityId: asset.id, actorUserId: actor.user.id });
    return NextResponse.json({ url: `/api/assets/${asset.id}` });
  } catch (error) {
    return errorResponse(error);
  }
}
