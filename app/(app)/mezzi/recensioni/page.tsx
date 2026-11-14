import Link from "next/link";
import { ArrowLeft, Plus, Star } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { elencoTestimonials } from "@/features/vetrina/service";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { FotoUploader } from "@/components/vetrina/foto-uploader";
import { creaTestimonialAction, testimonialAction } from "../strumenti/actions";

export const metadata = { title: "Recensioni e consegne" };
export const dynamic = "force-dynamic";

export default async function RecensioniPage() {
  await requireUser("contenuti:scrivi");
  const lista = await elencoTestimonials();
  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <PageHeader title="Recensioni e consegne" subtitle="Cosa dicono i clienti e le foto delle consegne: compaiono nella home del sito" />
      <div className="mx-auto max-w-3xl space-y-6">
        <section>
          <h2 className="mb-2 font-display text-[16px] font-semibold">Aggiungi</h2>
          <p className="mb-2 text-[12px] text-ink-faint">Pubblica una recensione solo con il consenso del cliente e scrivi soltanto nome e iniziale del cognome (es. &quot;Marco R.&quot;). Per le consegne chiedi il permesso prima di mostrare persone in foto.</p>
          <ActionForm action={creaTestimonialAction} submit="Salva" icon={<Plus size={16} />} resetOnOk>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-medium">Tipo
                <select name="tipo" className="input mt-1" defaultValue="RECENSIONE">
                  <option value="RECENSIONE">Recensione di un cliente</option>
                  <option value="CONSEGNA">Consegna (foto)</option>
                </select>
              </label>
              <label className="text-[13px] font-medium">Nome del cliente
                <input name="nome" className="input mt-1" placeholder="Marco R." maxLength={60} required />
              </label>
              <label className="text-[13px] font-medium">Mezzo <span className="font-normal text-ink-faint">(facoltativo)</span>
                <input name="mezzo" className="input mt-1" placeholder="Capelli Tempest 600" maxLength={120} />
              </label>
              <label className="text-[13px] font-medium">Stelle (solo recensioni)
                <select name="stelle" className="input mt-1" defaultValue="5">
                  {[5, 4, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-[13px] font-medium sm:col-span-2">Testo <span className="font-normal text-ink-faint">(per la consegna, una breve didascalia)</span>
                <textarea name="testo" className="input mt-1" rows={3} maxLength={600} />
              </label>
              <div className="sm:col-span-2">
                <span className="label">Foto (obbligatoria per le consegne)</span>
                <FotoUploader name="foto" iniziali={[]} max={1} singola />
              </div>
            </div>
          </ActionForm>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-[16px] font-semibold">Inserite</h2>
          {lista.length === 0 && <p className="card p-5 text-sm text-ink-soft">Ancora nessuna. Aggiungine una qui sopra.</p>}
          {lista.map((t) => (
            <article key={t.id} className="card flex flex-wrap items-start justify-between gap-3 p-4 text-[13px]">
              <div className="flex min-w-0 gap-3">
                {t.foto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/media/${t.foto}`} alt="" className="h-16 w-20 rounded object-cover" />
                )}
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {t.nome} <Badge tone={t.tipo === "CONSEGNA" ? "info" : "neutral"}>{t.tipo === "CONSEGNA" ? "Consegna" : "Recensione"}</Badge>
                    {!t.attivo && <Badge tone="warn">Nascosta</Badge>}
                    {t.tipo === "RECENSIONE" && <span className="inline-flex text-gold">{Array.from({ length: t.stelle }, (_, i) => <Star key={i} size={13} fill="currentColor" />)}</span>}
                  </p>
                  {t.mezzo && <p className="text-ink-soft">{t.mezzo}</p>}
                  {t.testo && <p className="mt-1">{t.testo}</p>}
                </div>
              </div>
              <form action={testimonialAction} className="flex gap-2">
                <input type="hidden" name="id" value={t.id} />
                <button name="azione" value={t.attivo ? "nascondi" : "mostra"} className="btn-ghost btn-sm">{t.attivo ? "Nascondi" : "Mostra"}</button>
                <button name="azione" value="elimina" className="btn-ghost btn-sm text-danger">Elimina</button>
              </form>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
