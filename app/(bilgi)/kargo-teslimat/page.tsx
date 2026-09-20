import type { Metadata } from "next";
import Link from "next/link";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { ayarlariGetir } from "@/server/sepet";
import { BOLUM, KUTU, YAZI } from "../bilgi-bicim";

export const metadata: Metadata = {
  title: "Kargo ve teslimat",
  description: "Kargo ücreti, bedava kargo sınırı, hazırlık ve teslimat süreleri.",
};

/** Ücretler panelden değişebildiği için sayfa her açılışta ayardan okunuyor. */
export const dynamic = "force-dynamic";

export default async function KargoTeslimat() {
  const ayar = await ayarlariGetir();
  const bedavaVar = ayar.bedavaKargoEsigi > 0;

  return (
    <>
      <h1 className="mt-6 text-2xl sm:text-3xl">Kargo ve teslimat</h1>
      <p className={YAZI}>
        Siparişler hafta içi her gün hazırlanıp kargoya veriliyor. Aşağıdaki ücretler
        sepette gördüğün tutarlarla birebir aynı; burada yazan rakam mağazanın güncel
        ayarından geliyor.
      </p>

      <div className={KUTU}>
        Kargo ücreti <strong className="rakam">{fiyatYaz(ayar.kargoKurus)}</strong>.{" "}
        {bedavaVar ? (
          <>
            <strong className="rakam">{fiyatYaz(ayar.bedavaKargoEsigi)}</strong> ve üzeri
            siparişlerde kargo ücretsiz.
          </>
        ) : (
          <>Şu an bedava kargo sınırı uygulanmıyor.</>
        )}
      </div>

      <h2 className={BOLUM}>Ne zaman kargoya verilir</h2>
      <p className={YAZI}>
        Ödemesi görünen siparişler hafta içi aynı gün, saat 15:00&apos;ten sonra gelenler
        ertesi iş günü kargoya veriliyor. Hafta sonu ve resmi tatillerde kargo firması
        çalışmadığı için hazırlanan siparişler ilk iş gününde çıkıyor.
      </p>
      <p className={YAZI}>
        Ödeme şu an yalnızca havale/EFT ile alınıyor. Havalede para hesaba geçtikten sonra
        sipariş hazırlanmaya başlıyor, bu yüzden hafta sonu yapılan havalelerde bir iş günü
        gecikme olabiliyor.
      </p>

      <h2 className={BOLUM}>Teslimat süresi</h2>
      <p className={YAZI}>
        Kargoya verildikten sonra büyük şehirlerde 1-2 iş günü, diğer illerde 2-4 iş günü
        içinde teslim ediliyor. Yoğun dönemlerde (bayram öncesi, indirim haftaları) kargo
        firmasının süresi uzayabiliyor.
      </p>

      <h2 className={BOLUM}>Siparişim nerede</h2>
      <p className={YAZI}>
        Kargo takip numarası, sipariş kargoya verildiğinde{" "}
        <Link href="/siparis-takip" className="font-bold text-mavi-koyu hover:underline">
          sipariş takibi
        </Link>{" "}
        sayfasında görünüyor. Sipariş numaran ve sipariş verirken yazdığın e-posta yeterli,
        üyelik gerekmiyor.
      </p>

      <h2 className={BOLUM}>Teslim alırken</h2>
      <p className={YAZI}>
        Paketi kuryenin yanındayken kontrol et. Kutu ezikse, bandı yırtılmışsa ya da içerik
        eksikse teslim alma ve kuryeye tutanak tutturt. Tutanaksız hasar bildiriminde kargo
        firması sorumluluk kabul etmiyor; tutanakla birlikte biz ürünü ücretsiz
        yeniliyoruz.
      </p>

      <h2 className={BOLUM}>Adres değişikliği</h2>
      <p className={YAZI}>
        Sipariş kargoya verilmeden önce adres değiştirilebiliyor. Bunun için sipariş
        numaranla bize yazman yeterli. Kargoya verildikten sonra adres yalnızca kargo
        firması üzerinden değiştirilebiliyor.
      </p>

      <p className="mt-6 text-xs text-metin-3">
        Anlaşmalı kargo firması ve şube bilgileri, şirket kaydı tamamlandığında bu sayfaya
        eklenecek.
      </p>
    </>
  );
}
