import { Hammer } from "lucide-react";
import { PageHeader } from "./page-header";

/** Sezione prevista ma non ancora costruita: dice cosa arriverà e in quale blocco. */
export function ComingSoon({ title, blocco, items }: { title: string; blocco: number; items: string[] }) {
  return (
    <>
      <PageHeader title={title} subtitle={`In costruzione · Blocco ${blocco} della roadmap`} />
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <Hammer size={16} className="text-gold" /> Cosa farà questa sezione
        </div>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
