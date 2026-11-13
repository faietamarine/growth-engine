import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Save, Trash2, TriangleAlert } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { getMezzo } from "@/features/vetrina/service";
import { MezzoFields } from "@/features/vetrina/mezzo-fields";
import { getMarchio } from "@/lib/brands/catalog";
import { ActionForm } from "@/components/ui/action-form";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { eliminaMezzoAction, salvaMezzoAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function MezzoDettaglio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; errore?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const m = await getMezzo(id);
  if (!m) notFound();
  const sp = await searchParams;
  const scrivi = can(user.role, "contenuti:scrivi");
  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <Flash msg={sp.msg} />
      {sp.errore && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-md bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
          <TriangleAlert size={16} /> {sp.errore.slice(0, 200)}
        </p>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[22px] font-semibold lg:text-[26px]">
          {getMarchio(m.marca)?.nome ?? m.marca} {m.modello}
        </h1>
        {m.stato !== "BOZZA" && (
          <Link href={`/vetrina/mezzo/${m.id}`} target="_blank" className="btn-ghost btn-sm">
            <ExternalLink size={14} /> Vedi sul sito
          </Link>
        )}
      </div>
      <div className="mx-auto max-w-3xl space-y-4">
        {scrivi ? (
          <ActionForm action={salvaMezzoAction.bind(null, m.id)} submit="Salva modifiche" icon={<Save size={16} />}>
            <MezzoFields m={m} />
          </ActionForm>
        ) : (
          <p className="card p-5 text-sm text-ink-soft">Non hai il permesso di modificare gli annunci.</p>
        )}
        {scrivi && (
          <form action={eliminaMezzoAction} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-ink-soft">Eliminare il mezzo lo toglie dal sito e cancella le sue foto.</p>
            <input type="hidden" name="id" value={m.id} />
            <SubmitButton className="btn bg-danger text-white hover:opacity-90 disabled:opacity-60" confirm="Eliminare definitivamente questo mezzo?">
              <Trash2 size={15} /> Elimina
            </SubmitButton>
          </form>
        )}
      </div>
    </>
  );
}
