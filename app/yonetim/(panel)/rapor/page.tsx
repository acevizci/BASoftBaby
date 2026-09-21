import Link from "next/link";
import SutunGrafik from "@/ui/sutun-grafik";
import KirilimListesi from "@/ui/kirilim-listesi";
import {
  DONEM_ADLARI,
  HAZIR_DONEMLER,
  donemCoz,
  gunYaz,
  raporGetir,
} from "@/server/rapor";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";
const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ROZET = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

function yuzdeYaz(simdi: number, onceki: number): { metin: string; iyi: boolean | null } {
  if (onceki === 0) return { metin: simdi > 0 ? "önceki dönemde yoktu" : "değişmedi", iyi: null };
  const fark = Math.round(((simdi - onceki) / onceki) * 100);
  if (fark === 0) return { metin: "önceki dönemle aynı", iyi: null };
  return { metin: `${fark > 0 ? "+" : ""}%${fark} önceki döneme göre`, iyi: fark > 0 };
}

/** Bir sayı ve altında ne anlama geldiği. */
function Kutu({
  baslik,
  deger,
  alt,
  iyi,
}: {
  baslik: string;
  deger: string;
  alt?: string;
  iyi?: boolean | null;
}) {
  return (
    <div className={KART}>
      <p className="text-xs font-bold text-metin-3">{baslik}</p>
      {/* Büyük tek başına sayıda eşit genişlikli rakam kullanılmıyor: 121
          gibi bir sayı gereksiz gevşek görünüyor. Eşit genişlik tabloda ve
          eksende işe yarıyor, orada kullanılıyor. */}
      <p className="mt-1 font-baslik text-3xl font-bold">{deger}</p>
      {alt && (
        <p
          className={`mt-0.5 text-xs ${
            iyi === true ? "text-nane-koyu" : iyi === false ? "text-mercan-koyu" : "text-metin-3"
          }`}
        >
          {alt}
        </p>
      )}
    </div>
  );
}

export default async function RaporEkrani({ searchParams }: PageProps<"/yonetim/rapor">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const aranan = await searchParams;
  const donem = donemCoz(aranan);
  const r = await raporGetir(donem);

  const secili = typeof aranan.donem === "string" ? aranan.donem : "bu-ay";
  const elleSecim = Boolean(aranan.baslangic || aranan.bitis);

  const siparisFark = yuzdeYaz(r.siparis, r.oncekiSiparis);
  const ciroFark = yuzdeYaz(r.kurus, r.oncekiKurus);

  // Bitiş tarihi kullanıcıya gösterilirken dahil olduğu günü göstermeli;
  // içeride ertesi günün başlangıcı tutuluyor.
  const bitisGunu = new Date(donem.bitis.getTime() - 86_400_000);
  const csvAdresi = `/yonetim/rapor/csv?baslangic=${gunYaz(donem.baslangic)}&bitis=${gunYaz(bitisGunu)}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl">Satış raporu</h1>
        <a href={csvAdresi} download className={`${ROZET} border-cizgi text-metin-2 hover:border-mercan hover:text-metin`}>
          CSV indir
        </a>
      </div>

      <form method="get" action="/yonetim/rapor" className={`${KART} flex flex-col gap-4`}>
        <div className="flex flex-wrap gap-2">
          {HAZIR_DONEMLER.map((d) => (
            <Link
              key={d}
              href={`/yonetim/rapor?donem=${d}`}
              className={`${ROZET} ${
                !elleSecim && secili === d
                  ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                  : "border-cizgi text-metin-2 hover:border-metin-3"
              }`}
            >
              {DONEM_ADLARI[d]}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-metin-2">Başlangıç</span>
            <input
              type="date"
              name="baslangic"
              defaultValue={gunYaz(donem.baslangic)}
              className={`${GIRDI} rakam`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-metin-2">Bitiş</span>
            <input
              type="date"
              name="bitis"
              defaultValue={gunYaz(bitisGunu)}
              className={`${GIRDI} rakam`}
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-dugme px-5 py-2 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
          >
            Göster
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kutu
          baslik="Ciro"
          deger={fiyatYaz(r.kurus)}
          alt={
            r.iadeKurus > 0 ? `net ${fiyatYaz(r.netKurus)} (iade düşülmüş)` : ciroFark.metin
          }
          iyi={r.iadeKurus > 0 ? null : ciroFark.iyi}
        />
        <Kutu
          baslik="Sipariş"
          deger={String(r.siparis)}
          alt={siparisFark.metin}
          iyi={siparisFark.iyi}
        />
        <Kutu
          baslik="Ortalama sepet"
          deger={fiyatYaz(r.ortalamaSepetKurus)}
          alt={`${r.urunAdedi} ürün satıldı`}
        />
        {/* İade ciroyu düşürmüyor, yanına yazılıyor: iade genelde satıştan
            sonraki bir dönemde oluyor ve o dönemin cirosunu eksiye
            çekebilirdi (K-61). */}
        <Kutu
          baslik="İade edilen"
          deger={fiyatYaz(r.iadeKurus)}
          alt={r.iadeAdedi === 0 ? "iade yok" : `${r.iadeAdedi} iade tamamlandı`}
          iyi={r.iadeKurus === 0 ? null : false}
        />
        <Kutu
          baslik="İptal"
          deger={String(r.iptal)}
          alt={
            r.iptal + r.siparis === 0
              ? "sipariş yok"
              : `bütün siparişlerin %${Math.round(r.iptalOrani * 100)}'i`
          }
          iyi={r.iptal === 0 ? null : false}
        />
      </div>

      {r.siparis === 0 ? (
        <p className={`${KART} text-center text-sm text-metin-2`}>
          Bu dönemde iptal edilmemiş sipariş yok. Başka bir dönem seçebilirsin.
        </p>
      ) : (
        <>
          <section className={KART}>
            <SutunGrafik
              sutunlar={r.gunluk}
              baslik={`${donem.ad} · ciro (iptaller hariç)`}
            />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <KirilimListesi baslik="Kategoriler" satirlar={r.kategoriler} />
            <KirilimListesi baslik="En çok satanlar" satirlar={r.urunler} />
            <KirilimListesi baslik="Bedenler" satirlar={r.bedenler} />
            <KirilimListesi baslik="Ödeme yöntemi" satirlar={r.odeme} />
          </div>
        </>
      )}
    </div>
  );
}
