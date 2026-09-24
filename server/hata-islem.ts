"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

/** Hata kaydı eylemleri (K-121). Çözülen hata yeniden olursa kendiliğinden açılıyor. */

export async function hataCozuldu(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const id = String(form.get("id") ?? "");
  if (id) await db.errorLog.updateMany({ where: { id }, data: { cozuldu: true } });
  redirect("/yonetim/hatalar?kayit=cozuldu");
}

export async function hepsiCozuldu(): Promise<void> {
  await yoneticiGerekli();
  await db.errorLog.updateMany({ where: { cozuldu: false }, data: { cozuldu: true } });
  redirect("/yonetim/hatalar?kayit=hepsi");
}
