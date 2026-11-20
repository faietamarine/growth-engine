import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleSlash } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { mezziPubblici } from "@/features/vetrina/service";
import { motivoEsclusione } from "@/lib/vetrina/feed-meta";
import { getMarchio } from "@/lib/brands/catalog";
import { siteUrl } from "@/lib/seo/site";
import { PageHeader } from "@/components/layout/page-header";
import { CopyButton } from "@/components/ui/copy-button";

export const metadata = { title: "Catalogo WhatsApp e Meta" };
export const dynamic = "force-dynamic";

export default async function CatalogoMeta() {
  await requireUser("contenuti:scrivi");
  const mezzi = (await mezziPubblici()).filter((m) => m.condizione !== "DA_ORDINARE");
  const inclusi = mezzi.filter((m) => !motivoEsclusione(m));
  const esclusi = mezzi.filter((m) => motivoEsclusione(m) && m.stato !== "VENDUTO");
  const url = `${siteUrl()}/vetrina/feed/meta.csv`;
  const nome = (m: (typeof mezzi)[number]) => `${getMarchio(m.marca)?.nome ?? m.marca} ${m.modello}`;
  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <PageHeader title="Catalogo WhatsApp e Meta" subtitle="I mezzi della vetrina nel catalogo di WhatsApp Business (e pronti per Facebook e Instagram), aggiornati da soli ogni giorno" />
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="card space-y-2 p-5">
          <p className="font-display text-[16px] font-semibold">Indirizzo del catalogo</p>
          <p className="text-[13px] text-ink-soft">Da incollare una sola volta in Meta Commerce Manager (passo 3 qui sotto).</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 break-all rounded-lg bg-navy/5 px-3 py-2 text-[13px]">{url}</code>
            <CopyButton text={url} />
          </div>
        </div>

        <div className="card p-5 text-[13px]">
          <p className="mb-2 font-display text-[16px] font-semibold">Nel catalogo oggi: {inclusi.length} mezzi</p>
          <ul className="space-y-1">
            {inclusi.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-success" /> {nome(m)}
              </li>
            ))}
            {!inclusi.length && <li className="text-ink-soft">Nessun mezzo: servono mezzi online di pronta consegna o usato con foto e prezzo.</li>}
          </ul>
          {esclusi.length > 0 && (
            <>
              <p className="mb-1 mt-4 font-semibold">Non entrano ({esclusi.length})</p>
              <ul className="space-y-1 text-ink-soft">
                {esclusi.map((m) => (
                  <li key={m.id} className="flex items-center gap-2">
                    <CircleSlash size={15} /> {nome(m)}: {motivoEsclusione(m)} ·{" "}
                    <Link href={`/mezzi/${m.id}`} className="font-semibold text-navy hover:underline">
                      sistema
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-3 text-ink-faint">I modelli &quot;da ordinare&quot; restano fuori: Meta vuole foto e prezzo per ogni articolo. I venduti escono da soli.</p>
        </div>

        <div className="card p-5 text-[13px] leading-relaxed">
          <p className="mb-2 font-display text-[16px] font-semibold">Come collegarlo (una volta sola, circa 10 minuti, da computer)</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Apri <b>business.facebook.com</b> → <b>Commerce Manager</b> (Gestore delle vendite) → <b>Aggiungi catalogo</b> → tipo <b>E-commerce</b> → &quot;Carica le informazioni sul prodotto&quot;. Chiamalo &quot;Faieta Marine vetrina&quot; e scegli come proprietario il vostro account Business.
            </li>
            <li>
              Nel catalogo: <b>Catalogo → Origini dati → Aggiungi articoli → Feed di dati</b> (lista dati) → <b>Feed programmato</b>.
            </li>
            <li>
              Incolla l&apos;indirizzo qui sopra, frequenza <b>ogni giorno</b>, valuta <b>EUR</b>, e conferma. Dopo qualche minuto in <b>Articoli</b> vedi i mezzi; se Meta ne rifiuta qualcuno, il motivo è in <b>Problemi</b>.
            </li>
            <li>
              Sul telefono, in <b>WhatsApp Business</b>: <b>Strumenti per l&apos;azienda → Catalogo</b> → <b>Gestisci catalogo / Collega catalogo di Meta</b> e scegli &quot;Faieta Marine vetrina&quot;. Il catalogo fatto a mano nell&apos;app viene sostituito da questo.
            </li>
            <li>
              Fatto: da ora quando metti online o vendi un mezzo nell&apos;app, entro 24 ore cambia anche su WhatsApp. Per aggiornare subito: Commerce Manager → Origini dati → <b>Carica ora</b>.
            </li>
          </ol>
          <p className="mt-3 text-ink-soft">
            <b>Consiglio:</b> le regole commerciali di Meta sui veicoli non sono chiarissime per le imbarcazioni: controlla dopo il primo caricamento che nessun articolo sia stato rifiutato. Le richieste che arrivano dal catalogo le trovi nei Lead con la fonte &quot;(da whatsapp catalogo)&quot;.
          </p>
        </div>
      </div>
    </>
  );
}
