import { prisma } from "./prisma";
import { TicketTemplateScope } from "@prisma/client";

export async function getTemplateImage(sessionId?: string | null, showId?: string | null) {
  const sessionTemplate = sessionId
    ? await prisma.ticketTemplate.findFirst({
        where: { scope: TicketTemplateScope.SESSION, sessionId: sessionId || undefined },
      })
    : null;
  if (sessionTemplate) return sessionTemplate.imageUrl;

  const showTemplate = showId
    ? await prisma.ticketTemplate.findFirst({
        where: { scope: TicketTemplateScope.SHOW, showId: showId || undefined },
      })
    : null;
  if (showTemplate) return showTemplate.imageUrl;

  const globalTemplate = await prisma.ticketTemplate.findFirst({ where: { scope: TicketTemplateScope.GLOBAL } });
  return globalTemplate?.imageUrl || "/ticket-template.png";
}
