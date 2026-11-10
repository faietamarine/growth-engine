import { BookOpen, ListChecks, CircleHelp, Calculator, Clapperboard, MonitorPlay, PartyPopper, Anchor, MessagesSquare, Scale, Sun, Ticket } from "lucide-react";
import type { LmTipo } from "@/lib/leadmagnets/catalog";

const ICONE = { book: BookOpen, check: ListChecks, quiz: CircleHelp, calc: Calculator, video: Clapperboard, webinar: MonitorPlay, party: PartyPopper, anchor: Anchor, chat: MessagesSquare, scale: Scale, sun: Sun, ticket: Ticket } as const;

export function LmIcon({ icona, size = 18 }: { icona: LmTipo["icona"]; size?: number }) {
  const I = ICONE[icona];
  return <I size={size} strokeWidth={1.8} />;
}
