"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { setLeadStatus } from "@/features/leads/service";

const schema = z.object({ id: z.string().uuid(), stato: z.enum(["QUALIFICATO", "SCARTATO"]) });

export async function cambiaStatoLead(form: FormData): Promise<void> {
  const user = await requireUser("lead:consegna");
  const { id, stato } = schema.parse(Object.fromEntries(form));
  await setLeadStatus(id, stato, user);
  revalidatePath("/lead");
  revalidatePath("/dashboard");
}
