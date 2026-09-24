import Barkod from "@/ui/barkod";
import { yontemAdi } from "@/ui/siparis-bicim";

export type EtiketSiparisi = {
  numara: string;
  adSoyad: string;
  adres: string;
  ilce: string;
  il: string;
  postaKodu: string;
  telefon: string;
  odemeDurumu: string;
  odemeYontemi: string;
  parca: number;
};

export type EtiketKunyesi = {
  unvan: string;
  sirketAdresi: string;
  destekTelefon: string;
};

/**
 * Tek bir kargo etiketi.
 *
 * Sipariş ayrıntısındaki tek etiket sayfası da, toplu yazdırma sayfası da
 * bunu kullanıyor: iki yerde iki ayrı etiket düzeni bakımı imkânsız hale
 * getirirdi (K-48).
 */
export default function KargoEtiketi({
  siparis,
  kunye,
  tasiyiciAdi,
  takipNo,
}: {
  siparis: EtiketSiparisi;
  kunye: EtiketKunyesi;
  tasiyiciAdi?: string;
  takipNo?: string;
}) {
  const barkod = takipNo || siparis.numara;

  return (
    <div className="etiket mx-auto w-full max-w-[420px] border-2 border-black bg-white p-4 text-black">
      <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-2">
        <div>
          <p className="font-baslik text-lg font-bold">BASoftBaby</p>
          {kunye.unvan && <p className="text-[11px]">{kunye.unvan}</p>}
          {kunye.sirketAdresi && <p className="text-[11px]">{kunye.sirketAdresi}</p>}
          {kunye.destekTelefon && <p className="rakam text-[11px]">{kunye.destekTelefon}</p>}
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold">{tasiyiciAdi ?? "Kargo firması"}</p>
          <p className="rakam text-[11px]">{siparis.numara}</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-bold uppercase">Alıcı</p>
        <p className="text-base font-bold">{siparis.adSoyad}</p>
        <p className="text-sm leading-snug">{siparis.adres}</p>
        <p className="text-sm">
          {siparis.ilce} / {siparis.il}{" "}
          {siparis.postaKodu && <span className="rakam">{siparis.postaKodu}</span>}
        </p>
        <p className="rakam text-sm">{siparis.telefon}</p>
      </div>

      <div className="mt-3 border-t-2 border-black pt-3 text-center">
        <Barkod deger={barkod} yukseklik={80} />
        <p className="rakam mt-1 text-sm font-bold tracking-widest">{barkod}</p>
        <p className="text-[11px]">
          {takipNo ? "Takip numarası" : "Takip numarası girilmedi — sipariş numarası"}
        </p>
      </div>

      <div className="mt-3 flex justify-between border-t border-black pt-2 text-[11px]">
        <span>{siparis.parca} parça</span>
        <span>
          {siparis.odemeDurumu === "odendi" ? "Ödendi" : "Ödeme bekliyor"} ·{" "}
          {yontemAdi(siparis.odemeYontemi)}
        </span>
      </div>
    </div>
  );
}
