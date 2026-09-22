"use client";

import { stokBildirimiIste } from "@/server/stok-bildirimi-islem";
import GonderDugmesi from "@/ui/gonder-dugmesi";

/**
 * Tükenmiş bir beden-renk için "gelince haber ver" formu.
 *
 * Yalnızca seçili birleşim tükendiğinde görünüyor. İstemci bileşeni, çünkü
 * hangi beden-renk seçili olduğunu beden seçici biliyor; ama içi düz bir
 * form ve doğrudan bir server action'a gidiyor, yani JavaScript kapalı
 * tarayıcıda sayfanın açılışındaki seçim için çalışmaya devam ediyor.
 */
export default function StokBildirimi({
  variantId,
  slug,
  renk,
  durum,
}: {
  variantId?: string;
  slug: string;
  /**
   * Seçili renk.
   *
   * Dönüş adresinde taşınması şart: eskiden yalnızca `?bildirim=` ile
   * dönülüyordu ve sayfa varsayılan renge sıçrıyordu. Varsayılan renk
   * stoktaysa bu form hiç çizilmiyor, yani müşteri ne onay ne hata
   * mesajını görüyordu (K-64).
   */
  renk?: string;
  durum?: string;
}) {
  if (durum === "alindi") {
    return (
      <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
        Tamam — bu beden ve renk stoğa girdiğinde tek bir e-posta göndereceğiz.
        Adresin başka hiçbir şey için kullanılmıyor.
      </p>
    );
  }

  return (
    <form
      action={stokBildirimiIste}
      className="flex flex-col gap-2 rounded-marka border border-cizgi bg-zemin-2 p-4"
    >
      <input type="hidden" name="variantId" value={variantId ?? ""} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="renk" value={renk ?? ""} />

      <p className="text-sm font-bold">Gelince haber verelim mi?</p>
      <p className="text-xs text-metin-3">
        Bu beden ve renk stoğa girdiğinde tek bir e-posta gönderiyoruz. Tanıtım
        e-postası göndermiyoruz; haber verdikten sonra adresin siliniyor.
      </p>

      {durum === "eposta" && (
        <p className="text-xs font-bold text-mercan-koyu">
          E-posta adresi geçerli görünmüyor.
        </p>
      )}
      {durum === "cok-istek" && (
        <p className="mt-2 text-sm font-semibold text-sari-koyu">
          Kısa sürede çok fazla istek geldi. Biraz bekleyip tekrar dene.
        </p>
      )}
      {durum === "stokta" && (
        <p className="text-xs font-bold text-nane-koyu">
          Bu seçim şu an stokta — beklemeye gerek yok.
        </p>
      )}

      <div className="mt-1 flex flex-wrap gap-2">
        <input
          type="email"
          name="eposta"
          required
          placeholder="eposta@ornek.com"
          aria-label="E-posta adresin"
          className="min-w-[200px] flex-1 rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan"
        />
        <GonderDugmesi
          bekleyen="Kaydediliyor…"
          className="rounded-full bg-metin px-5 py-2 text-sm font-bold text-white transition hover:brightness-110"
        >
          Haber ver
        </GonderDugmesi>
      </div>
    </form>
  );
}
