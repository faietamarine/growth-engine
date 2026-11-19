import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Save, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getPost } from "@/features/vetrina/contenuti";
import { PostFields } from "@/features/vetrina/contenuti-fields";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { eliminaPostAction, salvaPostAction } from "../../contenuti/actions";

export const metadata = { title: "Articolo del blog" };
export const dynamic = "force-dynamic";

export default async function PostEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("contenuti:scrivi");
  const { id } = await params;
  const nuovo = id === "nuovo";
  if (!nuovo && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = nuovo ? null : await getPost(id);
  if (!nuovo && !p) notFound();
  return (
    <>
      <Link href="/mezzi/blog" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Blog
      </Link>
      <PageHeader
        title={p ? p.titolo : "Nuovo articolo"}
        subtitle={p?.stato === "PUBBLICATO" ? `Online su /vetrina/blog/${p.slug}` : "In bozza finché non scegli «Pubblicato sul sito»"}
        action={
          p?.stato === "PUBBLICATO" ? (
            <Link href={`/vetrina/blog/${p.slug}`} target="_blank" className="btn-ghost">
              <ExternalLink size={16} /> Vedi sul sito
            </Link>
          ) : undefined
        }
      />
      <div className="mx-auto max-w-3xl space-y-4">
        <ActionForm action={salvaPostAction.bind(null, p?.id ?? null)} submit="Salva" icon={<Save size={16} />}>
          <PostFields p={p} />
        </ActionForm>
        {p && (
          <form action={eliminaPostAction} className="flex justify-end">
            <input type="hidden" name="id" value={p.id} />
            <SubmitButton className="btn-ghost text-danger" confirm="Elimino l'articolo? Non si può annullare.">
              <Trash2 size={16} /> Elimina articolo
            </SubmitButton>
          </form>
        )}
      </div>
    </>
  );
}
