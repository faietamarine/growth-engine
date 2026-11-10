import { DoorOpen, Sailboat, Tent, Video, Users, Sparkles, Wrench, Anchor, Briefcase } from "lucide-react";
import type { TipoEvento } from "@/lib/events/catalog";

const ICONE = { door: DoorOpen, sailboat: Sailboat, tent: Tent, video: Video, users: Users, sparkles: Sparkles, wrench: Wrench, anchor: Anchor, briefcase: Briefcase };

export function EventIcon({ icona, size = 18 }: { icona: TipoEvento["icona"]; size?: number }) {
  const I = ICONE[icona];
  return <I size={size} strokeWidth={1.8} aria-hidden />;
}
