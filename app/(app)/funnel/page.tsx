import Link from "next/link";
import clsx from "clsx";
import { Workflow, ArrowRight, Library, FolderOpen } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listFunnels } from "@/features/funnels/service";
import { CATEGORIE, FUNNEL_TEMPLATES, getTemplate, type Categoria } from "@/lib/funnels/templates";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/ui/flash";
import { REPARTO_UI, WORK_STATUS_UI, dataBreve, type Tone } from "@/lib/labels";

export const metadata = { title: "Funnel" };
export const dynamic = "force-dynamic";

const CAT_TONE: Record<Categoria, Tone> = { Vendita: "info", Service: "aqua", Noleggio: "gold", Eventi: "warn", Fidelizzazione: "ok" };

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ vista?: string; cat?: string; msg?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const vista = sp.vista === "miei" ? "miei" : "modelli";
  const cat = CATEGORIE.includes(sp.cat as Categoria) ? (sp.cat as Categoria) : undefined;
  const miei = await listFunnels();
  const modelli = FUNNEL_TEMPLATES.filter((t) => !cat || t.categoria === cat);
  const pill = (attivo: boolean) => clsx("rounded-full px-3 py-1.5 text-[13px] font-semibold", attivo ? "bg-navy text-white" : "bg-surface text-ink-soft ring-1 ring-line hover:bg-hover");

  return (
    <>
      <PageHeader title="Funnel" subtitle="Percorsi pronti dalla pubblicità al lead qualificato: pagine, form, email, WhatsApp e criteri di qualificazione" />
      <Flash msg={sp.msg} />

      <nav className="mb-4 flex gap-1 border-b border-line" aria-label="Viste">
        {[
          { k: "modelli", l: `Modelli (${FUNNEL_TEMPLATES.length})`, i: Library },
          { k: "miei", l: `I nostri funnel (${miei.length})`, i: FolderOpen },
        ].map(({ k, l, i: Icon }) => (
          <Link key={k} href={`/funnel?vista=${k}`} aria-current={vista === k ? "page" : undefined} className={clsx("-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-[14px] font-semibold", vista === k ? "border-gold text-ink" : "border-transparent text-ink-soft hover:text-ink")}>
            <Icon size={16} /> {l}
          </Link>
        ))}
      </nav>

      {vista === "modelli" ? (
        <>
          <nav className="mb-3 flex flex-wrap gap-1" aria-label="Categorie">
            <Link href="/funnel" className={pill(!cat)}>
              Tutti
            </Link>
            {CATEGORIE.map((c) => (
              <Link key={c} href={`/funnel?cat=${encodeURIComponent(c)}`} className={pill(cat === c)}>
                {c}
              </Link>
            ))}
          </nav>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-3">
            {modelli.map((t) => (
              <li key={t.key}>
                <Link href={`/funnel/modelli/${t.key}`} className="card group flex h-full flex-col p-4 transition-shadow hover:shadow-pop">
                  <div className="flex items-center gap-2">
                    <Badge tone={CAT_TONE[t.categoria]}>{t.categoria}</Badge>
                    <span className="text-[12px] text-ink-faint">{t.steps.length} passi · {t.form.length} campi</span>
                  </div>
                  <h2 className="mt-2 font-display text-[16px] font-semibold leading-snug">{t.nome}</h2>
                  <p className="mt-1 flex-1 text-[13px] text-ink-soft">{t.promessa}</p>
                  <div className="mt-3 flex items-center justify-between text-[12.5px]">
                    <span className="text-ink-faint">Conversione tipica {t.conversioneAttesa}</span>
                    <span className="flex items-center gap-1 font-semibold text-navy">
                      Apri <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="card overflow-hidden">
          {miei.length === 0 ? (
            <EmptyState icon={Workflow} title="Nessun funnel ancora" text="Scegli un modello e personalizzalo per la tua campagna." action={<Link href="/funnel" className="btn-primary">Vai ai modelli</Link>} />
          ) : (
            <ul className="divide-y divide-line">
              {miei.map((f) => (
                <li key={f.id}>
                  <Link href={`/funnel/${f.id}`} className="grid grid-cols-[minmax(0,1fr)] gap-1 px-4 py-3 hover:bg-hover/60 md:grid-cols-[minmax(0,1fr)_auto] md:gap-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[14px] font-semibold">{f.name}</span>
                        <Badge tone={WORK_STATUS_UI[f.status].tone}>{WORK_STATUS_UI[f.status].label}</Badge>
                        <Badge tone={REPARTO_UI[f.reparto].tone}>{REPARTO_UI[f.reparto].label}</Badge>
                      </div>
                      <p className="truncate text-[12.5px] text-ink-faint">
                        {[f.templateKey ? `Modello: ${getTemplate(f.templateKey)?.nome ?? f.templateKey}` : null, f.campaignName ? `Campagna: ${f.campaignName}` : "Nessuna campagna"].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="num self-center text-[12.5px] text-ink-soft">Aggiornato {dataBreve(f.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
