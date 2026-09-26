import Link from "next/link";
import StokSekmeleri from "@/ui/stok-sekmeleri";
import {
  HAREKET_SAYFA_BOYU,
  SEBEPLER,
  hareketAdresi,
  hareketleriAra,
  hareketSuzgeciniCoz,
} from "@/server/stok-hareket";
import { renkAdlari } from "@/server/renkler";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import HareketTablosu from "@/ui/hareket-tablosu";
import Sayfalama from "@/ui/sayfalama";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";

/**
 * Stok hareketleri (K-103): stoğun her değişimi, en yenisi üstte.
 *
 * "Bu 5 adet nereye gitti" sorusunun ekranı. Süzgeçler adres satırında;
 * CSV aynı süzgeçle iniyor.
 */
export default async function StokHareketleri({
  searchParams,
}: PageProps<"/yonetim/stok/hareketler">) {
  await yoneticiGerekli();

  const suzgec = hareketSuzgeciniCoz(await searchParams);
  const [sonuc, adlar] = await Promise.all([hareketleriAra(suzgec), renkAdlari()]);
  const suzgecli = Boolean(suzgec.urun || suzgec.sebep || suzgec.baslangic || suzgec.bitis);

  return (
    <div className="flex flex-col gap-5">
      <StokSekmeleri secili="/yonetim/stok/hareketler" />
      <h1 className="text-2xl">Stok hareketleri</h1>
      <p className="text-sm text-metin-2">
        Stoğun her değişimi burada: sipariş, iptal, iade, elle düzeltme, mal kabulü, sayım ve
        toplu yükleme. Kim yaptı, sipariş hangisi, sonrasında kaç kaldı.
      </p>

      <form
        method="get"
        action="/yonetim/stok/hareketler"
        className="flex flex-wrap items-end gap-3 rounded-marka border border-cizgi bg-yuzey p-4"
      >
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-bold text-metin-2">Ürün</span>
          <input name="urun" defaultValue={suzgec.urun} placeholder="Ürün adı" className={GIRDI} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-metin-2">Sebep</span>
          <select name="sebep" defaultValue={suzgec.sebep ?? ""} className={GIRDI}>
            <option value="">Hepsi</option>
            {Object.entries(SEBEPLER).map(([k, ad]) => (
              <option key={k} value={k}>
                {ad}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-metin-2">Başlangıç</span>
          <input type="date" name="baslangic" defaultValue={suzgec.baslangic} className={GIRDI} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-metin-2">Bitiş</span>
          <input type="date" name="bitis" defaultValue={suzgec.bitis} className={GIRDI} />
        </label>
        <button
          type="submit"
          className="rounded-full bg-dugme px-5 py-2 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Süz
        </button>
        {suzgecli && (
          <Link href="/yonetim/stok/hareketler" className="text-sm font-bold text-metin-2 hover:underline">
            Temizle
          </Link>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-metin-2">
          <span className="rakam font-bold">{sonuc.toplam}</span> hareket ·{" "}
          <span className="rakam font-bold text-nane-koyu">+{sonuc.giris}</span> giriş ·{" "}
          <span className="rakam font-bold text-mercan-koyu">−{sonuc.cikis}</span> çıkış
        </p>
        {sonuc.toplam > 0 && (
          // Dosya indirme: Link istemci tarafında gezinmeye çalışır.
          <a
            href={hareketAdresi({ ...suzgec, sayfa: 1 }, "/yonetim/stok/hareketler/csv")}
            download
            className="rounded-full border border-cizgi bg-yuzey px-4 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
          >
            CSV indir
          </a>
        )}
      </div>

      {sonuc.satirlar.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-2">
          {suzgecli ? "Bu süzgece uyan hareket yok." : "Henüz stok hareketi yok."}
        </p>
      ) : (
        <div className="rounded-marka border border-cizgi bg-yuzey p-4">
          <HareketTablosu satirlar={sonuc.satirlar} renkAdlari={adlar} />
        </div>
      )}

      <Sayfalama
        durum={{
          sayfa: sonuc.sayfa,
          sonSayfa: sonuc.sonSayfa,
          atla: (sonuc.sayfa - 1) * HAREKET_SAYFA_BOYU,
          boy: HAREKET_SAYFA_BOYU,
          toplam: sonuc.toplam,
        }}
        birim="hareket"
        adres={(n) => hareketAdresi({ ...suzgec, sayfa: n })}
      />
    </div>
  );
}
