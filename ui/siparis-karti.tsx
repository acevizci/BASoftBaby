import { fiyatYaz } from "@/ui/katalog-bicim";
import { durumAdi, durumRengi, odemeAdi } from "@/ui/siparis-bicim";
import type { Siparis } from "@/server/siparis";

function tarihYaz(t: Date): string {
  return t.toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" });
}

/** Sipariş özeti — onay, takip ve yönetim ekranlarının üçü de bunu gösterir. */
export default function SiparisKarti({
  siparis,
  className = "",
}: {
  siparis: Siparis;
  className?: string;
}) {
  return (
    <div className={`rounded-marka border border-cizgi bg-yuzey p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg">
            <span className="rakam">{siparis.numara}</span>
          </h2>
          <p className="text-xs text-metin-3">{tarihYaz(siparis.olusturuldu)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${durumRengi(siparis.durum)}`}
          >
            {durumAdi(siparis.durum)}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${durumRengi(siparis.odemeDurumu)}`}
          >
            {odemeAdi(siparis.odemeDurumu)}
          </span>
        </div>
      </div>

      <ul className="mt-4 flex flex-col divide-y divide-cizgi-soluk text-sm">
        {siparis.satirlar.map((s, i) => (
          <li key={`${s.slug}-${s.beden}-${s.renk}-${i}`} className="flex justify-between gap-3 py-2">
            <span className="min-w-0">
              {s.urunAd}
              <span className="block text-xs text-metin-3">
                {s.beden} · {s.renkAdi} · {s.adet} adet
              </span>
            </span>
            <span className="rakam flex-none font-semibold">{fiyatYaz(s.araToplamKurus)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-3 flex flex-col gap-2 border-t border-cizgi pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-metin-2">Ara toplam</dt>
          <dd className="rakam font-semibold">{fiyatYaz(siparis.araToplamKurus)}</dd>
        </div>
        {siparis.indirimKurus > 0 && (
          <div className="flex justify-between">
            <dt className="text-nane-koyu">
              İndirim
              {siparis.kampanyaAdi ? (
                <span className="block text-xs text-metin-3">{siparis.kampanyaAdi}</span>
              ) : null}
            </dt>
            <dd className="rakam font-semibold text-nane-koyu">
              -{fiyatYaz(siparis.indirimKurus)}
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-metin-2">Kargo</dt>
          <dd className="rakam font-semibold">
            {siparis.kargoKurus === 0 ? (
              <span className="text-nane-koyu">Bedava</span>
            ) : (
              fiyatYaz(siparis.kargoKurus)
            )}
          </dd>
        </div>
        <div className="flex justify-between border-t border-cizgi pt-2">
          <dt className="font-baslik font-bold">Toplam</dt>
          <dd className="rakam font-baslik font-bold text-mercan-koyu">
            {fiyatYaz(siparis.toplamKurus)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-4 border-t border-cizgi pt-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold text-metin-2">Teslimat</p>
          <p className="mt-1 font-semibold">{siparis.adSoyad}</p>
          <p className="text-metin-2">{siparis.adres}</p>
          <p className="text-metin-2">
            {siparis.ilce} / {siparis.il}
            {siparis.postaKodu ? <span className="rakam"> · {siparis.postaKodu}</span> : null}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-metin-2">İletişim</p>
          <p className="mt-1 text-metin-2">{siparis.eposta}</p>
          <p className="rakam text-metin-2">{siparis.telefon}</p>
          {siparis.kargoTakipNo && (
            <p className="mt-2">
              <span className="text-xs font-bold text-metin-2">Kargo takip no</span>
              <span className="rakam block">{siparis.kargoTakipNo}</span>
            </p>
          )}
        </div>
        {siparis.not && (
          <div className="sm:col-span-2">
            <p className="text-xs font-bold text-metin-2">Sipariş notu</p>
            <p className="mt-1 text-metin-2">{siparis.not}</p>
          </div>
        )}
        {siparis.sozlesmeOnayi && (
          <div className="sm:col-span-2">
            <p className="text-xs font-bold text-metin-2">Sözleşmeler</p>
            <p className="mt-1 text-metin-3">
              Ön bilgilendirme formu ve mesafeli satış sözleşmesi{" "}
              <span className="rakam">{tarihYaz(siparis.sozlesmeOnayi)}</span> tarihinde
              onaylandı.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
