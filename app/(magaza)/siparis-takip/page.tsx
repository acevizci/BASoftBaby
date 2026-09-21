import type { Metadata } from "next";
import SiparisKarti from "@/ui/siparis-karti";
import TalepFormu from "@/ui/talep-formu";
import DegerlendirmeFormu from "@/ui/degerlendirme-formu";
import { siparisGetir } from "@/server/siparis";
import { talepDurumu } from "@/server/talep";
import { degerlendirilebilirler } from "@/server/yorum";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sipariş takibi", robots: { index: false } };

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2.5 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

/**
 * Sipariş sorgulama. Numara tek başına yetmiyor, e-posta da tutmak zorunda:
 * yoksa numara deneyerek başkasının adresi görülebilirdi.
 */
export default async function SiparisTakip({ searchParams }: PageProps<"/siparis-takip">) {
  const aranan = await searchParams;
  const numara = typeof aranan.numara === "string" ? aranan.numara : "";
  const eposta = typeof aranan.eposta === "string" ? aranan.eposta : "";
  const arandi = Boolean(numara && eposta);

  const siparis = arandi ? await siparisGetir(numara, eposta) : undefined;
  // Talep kuralları siparişin durumuna bağlı; hesabı sunucu yapıyor.
  const talepBilgisi = siparis ? await talepDurumu(siparis.numara) : undefined;

  const degerlendirilebilir = siparis ? await degerlendirilebilirler(siparis.numara) : [];

  const talepSonucu = typeof aranan.talep === "string" ? aranan.talep : undefined;
  const talepMesaji = typeof aranan.mesaj === "string" ? aranan.mesaj : undefined;
  const yorumSonucu = typeof aranan.yorum === "string" ? aranan.yorum : undefined;
  const yorumMesaji = typeof aranan.ymesaj === "string" ? aranan.ymesaj : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl sm:text-3xl">Sipariş takibi</h1>
      <p className="mt-2 text-sm text-metin-2">
        Sipariş numaranı ve sipariş verirken yazdığın e-postayı gir.
      </p>

      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-marka border border-cizgi bg-yuzey p-5">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
          <span className={ETIKET}>Sipariş numarası</span>
          <input
            name="numara"
            required
            defaultValue={numara}
            placeholder="BA-2026-0001"
            className={`${GIRDI} rakam`}
          />
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
          <span className={ETIKET}>E-posta</span>
          <input
            name="eposta"
            type="email"
            required
            defaultValue={eposta}
            className={GIRDI}
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-dugme px-6 py-2.5 font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Sorgula
        </button>
      </form>

      {arandi && !siparis && (
        <p className="mt-5 rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Bu numara ve e-postayla eşleşen sipariş bulunamadı. İkisini de bir kontrol et.
        </p>
      )}

      {siparis && <SiparisKarti siparis={siparis} className="mt-6" />}

      {siparis && (
        <DegerlendirmeFormu
          numara={siparis.numara}
          eposta={eposta}
          satirlar={degerlendirilebilir}
          sonuc={yorumSonucu}
          mesaj={yorumMesaji}
        />
      )}

      {siparis && talepBilgisi && (
        <TalepFormu
          numara={siparis.numara}
          eposta={eposta}
          bilgi={talepBilgisi}
          sonuc={talepSonucu}
          mesaj={talepMesaji}
        />
      )}
    </div>
  );
}
