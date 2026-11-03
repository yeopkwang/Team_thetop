import { prisma } from "@/lib/prisma";

// 올린 이미지를 내려준다. 같은 주소의 내용은 바뀌지 않으므로 오래 캐시한다.
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const asset = await prisma.asset.findUnique({ where: { id: params.id } });
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(asset.data), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
