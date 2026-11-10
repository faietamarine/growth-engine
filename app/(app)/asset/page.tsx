import Link from "next/link";
import clsx from "clsx";
import { Plus, Images, List, Columns3, Paperclip, TriangleAlert } from "lucide-react";
import { ASSET_STATUS, type AssetStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { listAssets, type AssetItem } from "@/features/assets/service";
import { campaignOptions } from "@/features/funnels/service";
import { TIPI_ASSET, transizioniAsset } from "@/lib/assets/catalog";
import { dataItalia } from "@/lib/crm/nautilus";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/ui/flash";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { ASSET_STATUS_UI, dataBreve } from "@/lib/labels";
import { statoAsset } from "./actions";

export const metadata = { title: "Asset" };
export const dynamic = "force-dynamic";

export default async function AssetPage({ searchParams }: { searchParams: Promise<{ vista?: string; tipo?: string; stato?: string; campagna?: string; msg?: string; errore?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const vista = sp.vista === "bacheca" ? "bacheca" : "elenco";
  const f = {
    tipo: (TIPI_ASSET as readonly string[]).includes(sp.tipo ?? "") ? sp.tipo : undefined,
    stato: ASSET_STATUS.includes(sp.stato as AssetStatus) ? sp.stato : undefined,
    campagna: /^[0-9a-f-]{36}$/i.test(sp.campagna ?? "") ? sp.campagna : undefined,
  };
  const [rows, campagne] = await Promise.all([listAssets(f), campaignOptions()]);
  const oggi = dataItalia(new Date());
  const scrivi = can(user.role, "contenuti:scrivi");
  const nuovo = scrivi ? (
    <Link href={`/asset/nuovo${f.campagna ? `?campagna=${f.campagna}` : ""}`} className="btn-primary">
      <Plus size={16} /> Nuovo asset
    </Link>
  ) : undefined;
  const href = (v: string) => `/asset?${new URLSearchParams(Object.entries({ vista: v, ...f }).filter(([, x]) => x) as [string, string][])}`;
  const scaduto = (a: AssetItem) => !!a.dueDate && a.dueDate < oggi && a.status !== "PUBBLICATO";

  const Riga = ({ a }: { a: AssetItem }) => (
    <Link href={`/asset/${a.id}`} className="block min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="truncate text-[13.5px] font-semibold">{a.title}</span>
        {a.version > 1 && <Badge tone="neutral">v{a.version}</Badge>}
        {a.fileUrl && <Paperclip size={13} className="text-ink-faint" aria-label="Con file" />}
      </div>
      <p className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-ink-faint">
        <span className="font-semibold text-gold">{a.type}</span>
        {a.campaignName && <span className="truncate">· {a.campaignName}</span>}
        {a.authorName && <span>· {a.authorName}</span>}
        {a.dueDate && <span className={clsx("num", scaduto(a) && "font-semibold text-danger")}>· {scaduto(a) ? "scaduto " : "entro "}{dataBreve(a.dueDate)}</span>}
      </p>
    </Link>
  );

  return (
    <>
      <PageHeader title="Asset creativi" subtitle="Testi, immagini, video e materiali: da idea a pubblicato, con versioni, autore e scadenza" action={nuovo} />
      <Flash msg={sp.msg} />
      {sp.errore && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-md bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
          <TriangleAlert size={16} /> {sp.errore.slice(0, 200)}
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <nav className="flex gap-1" aria-label="Vista">
          {[
            { k: "elenco", n: "Elenco", I: List },
            { k: "bacheca", n: "Bacheca", I: Columns3 },
          ].map(({ k, n, I }) => (
            <Link key={k} href={href(k)} aria-current={vista === k ? "page" : undefined} className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold", vista === k ? "bg-navy text-white" : "bg-surface text-ink-soft ring-1 ring-line hover:bg-hover")}>
              <I size={14} /> {n}
            </Link>
          ))}
        </nav>
        <form className="ml-auto grid w-full grid-cols-[minmax(0,1fr)] gap-2 sm:w-auto sm:grid-cols-[repeat(3,minmax(0,170px))_auto]">
          <input type="hidden" name="vista" value={vista} />
          <select name="tipo" defaultValue={f.tipo ?? ""} className="input" aria-label="Tipo">
            <option value="">Tutti i tipi</option>
            {TIPI_ASSET.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          {vista === "elenco" && (
            <select name="stato" defaultValue={f.stato ?? ""} className="input" aria-label="Stato">
              <option value="">Tutti gli stati</option>
              {ASSET_STATUS.map((s) => (
                <option key={s} value={s}>
                  {ASSET_STATUS_UI[s].label}
                </option>
              ))}
            </select>
          )}
          <select name="campagna" defaultValue={f.campagna ?? ""} className="input" aria-label="Campagna">
            <option value="">Tutte le campagne</option>
            {campagne.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn-ghost btn-sm">Filtra</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={Images} title="Nessun asset" text={f.tipo || f.stato || f.campagna ? "Prova a cambiare i filtri." : "Annota qui ogni creatività da produrre: chi la fa, per quando, a che punto è."} action={nuovo} />
        </div>
      ) : vista === "elenco" ? (
        <section className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {rows.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <Riga a={a} />
                </div>
                <Badge tone={ASSET_STATUS_UI[a.status].tone}>{ASSET_STATUS_UI[a.status].label}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ASSET_STATUS.map((s) => {
            const col = rows.filter((a) => a.status === s);
            return (
              <section key={s} className="card min-w-0 overflow-hidden" aria-label={ASSET_STATUS_UI[s].label}>
                <div className="card-head">
                  <h2 className="card-title">{ASSET_STATUS_UI[s].label}</h2>
                  <span className="num text-[12.5px] text-ink-faint">{col.length}</span>
                </div>
                <ul className="space-y-2 p-2">
                  {col.map((a) => {
                    const t = transizioniAsset(a.status, user.role).find((x) => x.primaria);
                    return (
                      <li key={a.id} className={clsx("rounded-md bg-surface p-2.5 ring-1", scaduto(a) ? "ring-danger/40" : "ring-line")}>
                        <Riga a={a} />
                        {t && (
                          <form action={statoAsset} className="mt-2">
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="to" value={t.to} />
                            <input type="hidden" name="ritorno" value="bacheca" />
                            <SubmitButton className="btn-ghost btn-sm w-full justify-center">{t.label} →</SubmitButton>
                          </form>
                        )}
                      </li>
                    );
                  })}
                  {col.length === 0 && <li className="px-2 py-3 text-[12.5px] text-ink-faint">Vuoto</li>}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
