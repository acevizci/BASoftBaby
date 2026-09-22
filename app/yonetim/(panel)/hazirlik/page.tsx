import Link from "next/link";
import { hazirlikRaporu, type Agirlik, type Kontrol } from "@/server/hazirlik";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";

/** Eksik bir kontrolün ağırlığına göre rengi; tamamlananlar hep nane. */
const ROZET: Record<Agirlik, string> = {
  engel: "bg-mercan-soluk text-mercan-koyu",
  uyari: "bg-sari-soluk text-sari-koyu",
  bilgi: "bg-mavi-soluk text-mavi-koyu",
};

const ROZET_YAZI: Record<Agirlik, string> = {
  engel: "Engel",
  uyari: "Eksik",
  bilgi: "Bakılabilir",
};

/**
 * Satışa hazırlık.
 *
 * "Mağaza açılmaya hazır mı" sorusunun cevabı sekiz ayrı ekrana dağılmıştı;
 * bir eksiği fark etmenin tek yolu müşterinin şikâyet etmesiydi (K-75).
 *
 * Ekran **iyimser değil**: her şey tamamsa bunu bir cümleyle söylüyor, değilse
 * önce engeller geliyor. Yeşil bir onay kutusu göstermek için eksikleri
 * yumuşatmıyor — açılıştan önce bakılan bir listede en kötü haber en üstte
 * olmalı.
 */
export default async function HazirlikEkrani() {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor (K-51).
  await yoneticiGerekli();

  const rapor = await hazirlikRaporu();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Satışa hazırlık</h1>
      <p className="text-sm text-metin-2">
        Mağazanın gerçek bir siparişi baştan sona karşılayabilmesi için gerekenler.{" "}
        <strong>Engel</strong> işaretli satırlar varken satış yapılmamalı;{" "}
        <strong>eksik</strong> olanlar satışı durdurmuyor ama bir şeyi yarım bırakıyor.
      </p>

      {rapor.engel > 0 ? (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          <span className="rakam">{rapor.engel}</span> engel var — mağaza bu hâliyle
          satışa hazır değil.
          {rapor.uyari > 0 && (
            <span className="font-normal"> Ayrıca {rapor.uyari} eksik bulundu.</span>
          )}
        </p>
      ) : rapor.uyari > 0 ? (
        <p className="rounded-marka bg-sari-soluk px-4 py-3 text-sm font-semibold text-sari-koyu">
          Satışı durduran bir engel yok, ama <span className="rakam">{rapor.uyari}</span>{" "}
          eksik var.
        </p>
      ) : (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Bütün kontroller tamam. Mağaza gerçek bir siparişi baştan sona karşılayabilir.
        </p>
      )}

      {rapor.bolumler.map((b) => (
        <section key={b.baslik} className={KART}>
          <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
            {b.baslik}
            <span className="rakam text-xs font-semibold text-metin-3">
              {b.kontroller.filter((k) => k.tamam).length}/{b.kontroller.length} tamam
            </span>
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {b.kontroller.map((k) => (
              <Satir key={k.ad} kontrol={k} />
            ))}
          </ul>
        </section>
      ))}

      <p className="text-xs text-metin-3">
        Bu ekran yalnızca bakıyor, hiçbir şeyi değiştirmiyor. Her satır düzeltmenin
        yapıldığı ekrana bağlanıyor; anahtar ve hesap isteyenler (kart ödemesi, e-posta
        servisi, alan adı) Vercel ortam değişkenlerinden geliyor ve yeniden dağıtım
        gerektiriyor.
      </p>
    </div>
  );
}

function Satir({ kontrol }: { kontrol: Kontrol }) {
  return (
    <li className="flex flex-col gap-1.5 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          aria-hidden="true"
          className={`grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold ${
            kontrol.tamam ? "bg-nane-soluk text-nane-koyu" : ROZET[kontrol.agirlik]
          }`}
        >
          {kontrol.tamam ? "✓" : "!"}
        </span>
        <span className="min-w-0 flex-1 font-semibold">{kontrol.ad}</span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            kontrol.tamam ? "bg-nane-soluk text-nane-koyu" : ROZET[kontrol.agirlik]
          }`}
        >
          {kontrol.tamam ? "Tamam" : ROZET_YAZI[kontrol.agirlik]}
        </span>
      </div>

      <p className="pl-9 text-sm text-metin-2">{kontrol.durum}</p>

      {/* Sonuç yalnızca eksikken yazıyor: tamamlanmış bir satırda "olmazsa şu
          olur" demek gereksiz gürültü. */}
      {!kontrol.tamam && kontrol.sonuc && (
        <p className="pl-9 text-sm text-metin-3">{kontrol.sonuc}</p>
      )}

      {!kontrol.tamam && kontrol.yol && (
        <p className="pl-9">
          <Link href={kontrol.yol} className="text-sm font-bold text-mavi-koyu hover:underline">
            {kontrol.yolAdi} →
          </Link>
        </p>
      )}
    </li>
  );
}
