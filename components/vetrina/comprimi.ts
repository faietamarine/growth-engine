/* Riduce una foto nel browser prima del caricamento: lato lungo max 1800px, JPEG ~82%.
   Le foto da telefono (4–8 MB) diventano ~300–500 KB senza perdita visibile. */
export async function comprimiFoto(file: File, lato = 1800, qualita = 0.82): Promise<File> {
  if (!/^image\//.test(file.type)) throw new Error("Il file non è un'immagine.");
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scala = Math.min(1, lato / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scala);
  const h = Math.round(bmp.height * scala);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Impossibile elaborare la foto.");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob: Blob | null = await new Promise((ok) => c.toBlob(ok, "image/jpeg", qualita));
  if (!blob) throw new Error("Impossibile elaborare la foto.");
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}

export async function caricaFoto(file: File): Promise<string> {
  const piccola = await comprimiFoto(file);
  const fd = new FormData();
  fd.set("file", piccola);
  const r = await fetch("/api/media", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.errore ?? "Caricamento non riuscito");
  return j.id as string;
}

/** Icona di categoria: resta PNG con sfondo trasparente, lato lungo max 640px. */
export async function caricaIcona(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Usa un file PNG (meglio), JPG o WebP.");
  const bmp = await createImageBitmap(file);
  const scala = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scala);
  c.height = Math.round(bmp.height * scala);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Impossibile elaborare l'immagine.");
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const blob: Blob | null = await new Promise((ok) => c.toBlob(ok, "image/png"));
  if (!blob) throw new Error("Impossibile elaborare l'immagine.");
  const fd = new FormData();
  fd.set("file", new File([blob], "icona.png", { type: "image/png" }));
  const r = await fetch("/api/media", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.errore ?? "Caricamento non riuscito");
  return j.id as string;
}
