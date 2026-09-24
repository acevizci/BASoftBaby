"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { ETIKETLER } from "@/server/onbellek";
import { slugYap } from "@/server/slug";
import { indexNowBildir } from "@/server/arama-motoru";

/** Rehber yazısı eylemleri (K-132). */

const SAYFA = "/yonetim/rehber";

function yenile(slug: string) {
  updateTag(ETIKETLER.rehber);
  revalidatePath("/rehber");
  revalidatePath(`/rehber/${slug}`);
  revalidatePath("/sitemap.xml");
}

/** Ürün adresleri: satır ya da virgülle ayrılmış; tam adres de olur ("/urun/x" → "x"). */
function sluglar(ham: string): string[] {
  return [
    ...new Set(
      ham
        .split(/[\n,]/)
        .map((s) => s.trim().replace(/^.*\/urun\//, "").replace(/[?#].*$/, ""))
        .filter((s) => /^[a-z0-9-]{1,80}$/.test(s)),
    ),
  ].slice(0, 12);
}

export async function rehberKaydet(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const id = String(form.get("id") ?? "");
  const baslik = String(form.get("baslik") ?? "").trim().slice(0, 120);
  const ozet = String(form.get("ozet") ?? "").trim().slice(0, 200);
  const metin = String(form.get("metin") ?? "").trim().slice(0, 30_000);
  const urunSluglari = sluglar(String(form.get("urunler") ?? ""));
  const yayinda = form.get("yayinda") === "on";
  if (!baslik) redirect(`${SAYFA}?hata=baslik${id ? `&duzenle=${id}` : ""}`);

  if (id) {
    const onceki = await db.article.findUnique({ where: { id }, select: { yayinTarihi: true, slug: true } });
    if (!onceki) redirect(SAYFA);
    await db.article.update({
      where: { id },
      data: {
        baslik,
        ozet,
        metin,
        urunSluglari,
        yayinda,
        // İlk yayın anı bir kez yazılıyor; geri çekip tekrar yayınlamak tarihi değiştirmiyor.
        yayinTarihi: onceki.yayinTarihi ?? (yayinda ? new Date() : null),
      },
    });
    yenile(onceki.slug);
    if (yayinda) after(() => indexNowBildir([`/rehber/${onceki.slug}`, "/rehber"]));
    redirect(`${SAYFA}?kayit=1&duzenle=${id}`);
  }

  // Adres başlıktan bir kez; çakışırsa sonuna sayı.
  const taban = slugYap(baslik) || "yazi";
  let slug = taban;
  for (let n = 2; await db.article.findUnique({ where: { slug } }); n++) slug = `${taban}-${n}`;
  const yeni = await db.article.create({
    data: { slug, baslik, ozet, metin, urunSluglari, yayinda, yayinTarihi: yayinda ? new Date() : null },
  });
  yenile(slug);
  if (yayinda) after(() => indexNowBildir([`/rehber/${slug}`, "/rehber"]));
  redirect(`${SAYFA}?kayit=1&duzenle=${yeni.id}`);
}

export async function rehberSil(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const id = String(form.get("id") ?? "");
  const yazi = await db.article.findUnique({ where: { id }, select: { slug: true } });
  if (yazi) {
    await db.article.delete({ where: { id } });
    yenile(yazi.slug);
  }
  redirect(`${SAYFA}?kayit=silindi`);
}
