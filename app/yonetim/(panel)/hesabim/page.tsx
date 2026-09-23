import GonderDugmesi from "@/ui/gonder-dugmesi";
import { EN_KISA_SIFRE } from "@/server/uyelik";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import {
  kendiSifremiDegistir,
  sabahOzetiniAyarla,
  tumOturumlariKapat,
} from "@/server/yonetim-kimlik-islem";
import { db } from "@/server/veritabani";
import {
  ANA_DUGME,
  ETIKET,
  GIRDI,
  HATA_KUTUSU,
  IYI_KUTU,
  KART,
  KULLANICI_HATALARI,
} from "../../panel-bicim";

export const dynamic = "force-dynamic";

/**
 * Panel kullanıcısının kendi hesabı.
 *
 * Şifre değiştirmek ve bütün oturumları kapatmak her kullanıcıda (K-45).
 */
export default async function PanelHesabim({ searchParams }: PageProps<"/yonetim/hesabim">) {
  const ben = await yoneticiGerekli();
  const { kayit, hata } = await searchParams;
  const hataMetni = typeof hata === "string" ? KULLANICI_HATALARI[hata] : undefined;
  const { sabahOzeti } = await db.adminUser.findUniqueOrThrow({
    where: { id: ben.id },
    select: { sabahOzeti: true },
  });

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <h1 className="text-2xl">Hesabım</h1>

      {kayit === "sifre" && (
        <p className={IYI_KUTU}>
          Şifren değiştirildi. Öteki cihazlardaki oturumların kapatıldı.
        </p>
      )}
      {kayit === "sabah-acik" && <p className={IYI_KUTU}>Sabah özeti her gün 06:00&apos;da gelecek.</p>}
      {kayit === "sabah-kapali" && <p className={IYI_KUTU}>Sabah özeti kapatıldı.</p>}
      {hataMetni && <p className={HATA_KUTUSU}>{hataMetni}</p>}

      <section className={KART}>
        <h2 className="text-lg">{ben.adSoyad}</h2>
        <p className="mt-1 text-sm text-metin-2">{ben.eposta}</p>
      </section>

      <form action={sabahOzetiniAyarla} className={`flex flex-col gap-3 ${KART}`}>
        <h2 className="text-lg">Sabah özeti</h2>
        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            name="sabahOzeti"
            defaultChecked={sabahOzeti}
            className="mt-0.5 h-4 w-4 flex-none accent-[var(--mercan)]"
          />
          <span className="text-sm text-metin-2">
            Her sabah 06:00&apos;da e-posta gönder
            <span className="block text-xs text-metin-3">
              Dünün siparişleri ve cirosu, bekleyen işler, azalan stok. Söylenecek bir şey
              yoksa gönderilmez.
            </span>
          </span>
        </label>
        <GonderDugmesi bekleyen="Kaydediliyor…" className={`${ANA_DUGME} self-start`}>
          Kaydet
        </GonderDugmesi>
      </form>

      <form action={kendiSifremiDegistir} className={`flex flex-col gap-4 ${KART}`}>
        <h2 className="text-lg">Şifre değiştir</h2>

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Mevcut şifren</span>
          <input
            name="eskiSifre"
            type="password"
            required
            autoComplete="current-password"
            className={GIRDI}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Yeni şifre</span>
          <input
            name="yeniSifre"
            type="password"
            required
            minLength={EN_KISA_SIFRE}
            autoComplete="new-password"
            className={GIRDI}
          />
          <span className="text-xs text-metin-3">En az {EN_KISA_SIFRE} karakter.</span>
        </label>

        <GonderDugmesi bekleyen="Değiştiriliyor…" className={`${ANA_DUGME} self-start`}>
          Şifreyi değiştir
        </GonderDugmesi>
      </form>

      <form action={tumOturumlariKapat} className={`flex flex-col gap-3 ${KART}`}>
        <h2 className="text-lg">Bütün oturumları kapat</h2>
        <p className="text-sm text-metin-2">
          Başka bir bilgisayarda ya da telefonda açık kalmış olabileceğini düşünüyorsan hepsini
          kapatabilirsin. Buradaki oturum da kapanır, yeniden giriş yapman gerekir.
        </p>
        <button
          type="submit"
          className="self-start rounded-full border border-cizgi bg-yuzey px-5 py-2 text-sm font-bold text-metin-2 transition hover:border-mercan hover:text-mercan-koyu"
        >
          Hepsini kapat
        </button>
      </form>
    </div>
  );
}
