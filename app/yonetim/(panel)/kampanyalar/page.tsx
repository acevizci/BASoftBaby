import { db } from "@/server/veritabani";
import { kampanyaCevir, kampanyaSil, sablonCevir } from "@/server/yonetim";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { alOdeEtiketi, kademeCoz, nciUrunEtiketi } from "@/server/kampanya";
import { kampanyaZarari, type ZararliUrun } from "@/server/kar";
import { ayarlariGetir } from "@/server/sepet";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import PanelBildirim, { ORTAK_HATALAR } from "@/ui/panel-bildirim";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";
import Sayfalama, { SayfaAlani } from "@/ui/sayfalama";
import { sayfaAdresi, sayfaCoz } from "@/ui/sayfalama-bicim";
import PanelArama from "@/ui/panel-arama";
import { alanAramasi, aramaCoz } from "@/ui/panel-arama-bicim";
import {
  calismaDurumu,
  KAMPANYA_HATALARI,
  kampanyaOzeti,
  SABLONLAR,
  type CalismaDurumu,
} from "@/ui/kampanya-bicim";
import { kaydiTaslaga } from "@/server/kampanya-sablon";
import { ANA_DUGME, IKINCIL_DUGME } from "@/app/yonetim/panel-bicim";
import Link from "next/link";
import {
  INDIRIM_ONCESI_GUN,
  kampanyaFiyatUyarilari,
  type KampanyaFiyatUyarisi,
} from "@/server/fiyat-gecmisi";

export const dynamic = "force-dynamic";


/** Kampanya satırı tablo satırı; sayfaya çok sayıda sığıyor. */
const LISTE_BOYU = 20;

/** Kapsamdaki kategori ya da ürün adları: "Zıbın, Tulum ve 3 tane daha" (K-171). */
function kapsamAdlari(idler: (string | null)[], adlar: Map<string, string>, tur: string): string {
  const liste = idler.filter((x): x is string => !!x).map((id) => adlar.get(id) ?? `silinmiş ${tur}`);
  if (liste.length === 0) return `${tur} seçili değil`;
  return liste.length > 3 ? `${liste.slice(0, 3).join(", ")} ve ${liste.length - 3} tane daha` : liste.join(", ");
}

function tarihSaatYaz(t: Date): string {
  return t.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ROZETLER: Record<CalismaDurumu | "yok", [string, string]> = {
  acik: ["Açık", "bg-nane-soluk text-nane-koyu"],
  bekliyor: ["Başlamayı bekliyor", "bg-mavi-soluk text-mavi-koyu"],
  bitti: ["Süresi doldu", "bg-sari-soluk text-sari-koyu"],
  doldu: ["Kullanım doldu", "bg-sari-soluk text-sari-koyu"],
  kapali: ["Kapalı", "bg-cizgi-soluk text-metin-2"],
  yok: ["Kurulmadı", "bg-cizgi-soluk text-metin-3"],
};

function DurumRozeti({ durum }: { durum: CalismaDurumu | "yok" }) {
  const [ad, renk] = ROZETLER[durum];
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${renk}`}>
      {ad}
    </span>
  );
}

function tarihYaz(t: Date | null): string {
  return t ? t.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) : "—";
}

function degerYaz(k: {
  tip: string;
  deger: number;
  alAdet: number | null;
  odeAdet: number | null;
  kademeler: unknown;
  enFazlaIndirimKurus: number | null;
}): string {
  const tavan = k.enFazlaIndirimKurus ? ` (en çok ${fiyatYaz(k.enFazlaIndirimKurus)})` : "";
  switch (k.tip) {
    case "al-ode":
      return alOdeEtiketi(k);
    case "nci-urun":
      return nciUrunEtiketi(k) + tavan;
    case "kademeli":
      return (
        (kademeCoz(k.kademeler) ?? [])
          .map((x) => `${fiyatYaz(x.esikKurus)} → ${fiyatYaz(x.indirimKurus)}`)
          .join(", ") + tavan
      );
    case "kargo":
      return "Ücretsiz kargo";
    case "yuzde":
      return `%${k.deger}${tavan}`;
    default:
      return fiyatYaz(k.deger);
  }
}

const UYARI = <>Kampanya kalıcı olarak siliniyor; geri alınamıyor. Sepetlerde artık uygulanmayacak. Yalnızca durdurmak istiyorsan &quot;Kapat&quot; yeter.</>;

/** Bildirim metinleri koddan; adres yalnızca kodu taşıyor (K-57). */
const BILDIRIMLER: Record<string, string> = {
  "1": "Kaydedildi.",
  silindi: "Kampanya silindi. Sepetlerde artık uygulanmıyor.",
  acildi: "Kampanya yayına alındı.",
  kapatildi: "Kampanya kapatıldı.",
};

const HATALAR: Record<string, string> = { ...ORTAK_HATALAR, ...KAMPANYA_HATALARI };

export default async function KampanyaEkrani({
  searchParams,
}: PageProps<"/yonetim/kampanyalar">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { kayit, hata, sayfa, ara } = await searchParams;
  const arama = aramaCoz(ara);
  // Kişiye özel kuponlar (K-151) listeyi doldurmasın; e-postayla gidiyorlar.
  const kosul = { ...alanAramasi(arama, ["ad", "kuponKodu"]), customerId: null };

  // Kategori ve ürün adları kapsam ve özet için; onlar
  // sayfalanmıyor, yalnızca kampanya tablosu (K-67).
  const toplamAdet = await db.campaign.count({ where: kosul });
  const durum = sayfaCoz(sayfa, toplamAdet, LISTE_BOYU);
  const temel = arama
    ? `/yonetim/kampanyalar?ara=${encodeURIComponent(arama)}`
    : "/yonetim/kampanyalar";
  const adres = (n: number) => sayfaAdresi(temel, n);

  const [kampanyalar, kategoriler, urunler, maliyetliler, satisAyari, hazirlar] = await Promise.all([
    db.campaign.findMany({
      where: kosul,
      orderBy: { olusturuldu: "desc" },
      include: { category: { select: { ad: true } }, product: { select: { ad: true } } },
      // Kapsam adları aşağıda kategori ve ürün listesinden (K-171).
      skip: durum.atla,
      take: durum.boy,
    }),
    db.category.findMany({
      orderBy: { sira: "asc" },
      select: { id: true, ad: true },
    }),
    db.product.findMany({ orderBy: { ad: "asc" }, select: { id: true, ad: true } }),
    // Zarar uyarısı için: satıştaki, alış fiyatı girilmiş ürünler (K-113).
    db.product.findMany({
      where: { aktif: true, alisFiyatKurus: { not: null } },
      select: { id: true, ad: true, categoryId: true, fiyatKurus: true, alisFiyatKurus: true },
    }),
    ayarlariGetir(),
    db.campaign.findMany({ where: { sablon: { not: null } } }),
  ]);
  const hazir = new Map(hazirlar.map((k) => [k.sablon, k]));
  const fiyatUyarilari = await kampanyaFiyatUyarilari(kampanyalar.map((k) => k.id));
  const kategoriAdi = new Map(kategoriler.map((k) => [k.id, k.ad]));
  const urunAdi = new Map(urunler.map((u) => [u.id, u.ad]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Kampanyalar</h1>
      <p className="text-sm text-metin-2">
        İndirimler üst üste binmez. Bir sepete birden çok kampanya uyarsa yalnızca en çok
        indiren uygulanır, müşteri de hangisinin uygulandığını sepette görür.
      </p>

      <PanelBildirim kayit={kayit} hata={hata} bildirimler={BILDIRIMLER} hatalar={HATALAR} />

      <div>
        <Link href="/yonetim/kampanyalar/yeni" className={`${ANA_DUGME} inline-block`}>
          + Yeni kampanya
        </Link>
        <p className="mt-2 text-xs text-metin-3">
          Adım adım: tür, indirim, ürünler, kimlere, ne zaman; sonunda düz cümleyle özet.
        </p>
      </div>

      {/* Hazır kampanyalar (K-172): tek tıkla aç/kapat. */}
      <section id="hazir" className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Hazır kampanyalar</h2>
        <p className="mt-1 text-sm text-metin-2">
          Sık kullanılan kampanyalar. &quot;Aç&quot; ilk seferde kampanyayı buradaki değerlerle
          kurar; sonra aynı kampanyayı açıp kapatır. Değerleri &quot;Düzenle&quot;den değiştir.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SABLONLAR.map((s) => {
            const k = hazir.get(s.anahtar);
            const durum: CalismaDurumu | "yok" = k ? calismaDurumu(k) : "yok";
            const calisiyor = durum === "acik" || durum === "bekliyor";
            // Kullanımı dolan açık kampanya çalışmıyor ama "Aç" düğmesi onu
            // açamaz; kapatılabilir ya da sınırı "Düzenle"den artırılır.
            const kapatilir = calisiyor || durum === "doldu";
            return (
              <div
                key={s.anahtar}
                className={`flex flex-col gap-2 rounded-marka border-[1.5px] p-4 ${
                  calisiyor ? "border-nane" : "border-cizgi"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold">{k?.ad ?? s.baslik}</h3>
                  <DurumRozeti durum={durum} />
                </div>
                {/* Kurulmuşsa kaydın kendisi: "Düzenle"den değişmiş olabilir. */}
                <p className="text-xs text-metin-2">
                  {k
                    ? kampanyaOzeti(kaydiTaslaga(k), { kategori: kategoriAdi, urun: urunAdi })
                        .slice(0, 2)
                        .join(" ")
                    : s.aciklama}
                </p>
                {k?.bitis && calisiyor && (
                  <p className="rakam text-xs text-metin-3">Bitiş: {tarihSaatYaz(k.bitis)}</p>
                )}
                <div className="mt-auto flex items-center gap-3 pt-1">
                  <form action={sablonCevir}>
                    <input type="hidden" name="anahtar" value={s.anahtar} />
                    <button
                      type="submit"
                      className={kapatilir ? IKINCIL_DUGME : `${ANA_DUGME} !px-4 !py-2 text-xs`}
                    >
                      {kapatilir ? "Kapat" : durum === "bitti" ? "Yeniden aç" : "Aç"}
                    </button>
                  </form>
                  {k && (
                    <Link
                      href={`/yonetim/kampanyalar/duzenle/${k.id}`}
                      className="text-xs font-bold text-metin-2 hover:underline"
                    >
                      Düzenle
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <PanelArama
        yol="/yonetim/kampanyalar"
        ara={arama}
        yerTutucu="Kampanya ara: ad ya da kupon kodu"
      />

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Tanımlı kampanyalar</h2>
        {toplamAdet === 0 ? (
          <p className="mt-2 text-sm text-metin-3">
            {arama ? `"${arama}" aramasına uyan kampanya yok.` : "Henüz kampanya yok."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
                <tr>
                  <th className="py-2">Kampanya</th>
                  <th className="py-2">İndirim</th>
                  <th className="py-2">Kapsam</th>
                  <th className="py-2">Kupon</th>
                  <th className="py-2">Tarih</th>
                  <th className="py-2">Kullanım</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi-soluk">
                {kampanyalar.map((k) => (
                  <tr key={k.id}>
                    <td className="py-2">
                      <span className="font-semibold">{k.ad}</span>
                      <span className="ml-2">
                        <DurumRozeti durum={calismaDurumu(k)} />
                      </span>
                      {k.enAzSepetKurus > 0 && (
                        <span className="rakam block text-xs text-metin-3">
                          en az {fiyatYaz(k.enAzSepetKurus)} sepet
                        </span>
                      )}
                      {/* Kullanım kuralları (K-170). */}
                      {(k.uyelereOzel || k.ilkSiparis || k.kisiBasiSinir || k.enFazlaKullanim) && (
                        <span className="block text-xs text-metin-3">
                          {[
                            k.ilkSiparis ? "ilk siparişe özel" : k.uyelereOzel ? "üyelere özel" : "",
                            k.kisiBasiSinir ? `kişi başı ${k.kisiBasiSinir}` : "",
                            k.enFazlaKullanim ? `toplam ${k.kullanim}/${k.enFazlaKullanim}` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                      <details className="mt-1 text-xs">
                        <summary className="cursor-pointer text-metin-3">Özet</summary>
                        <ul className="mt-1 flex max-w-md flex-col gap-0.5 text-metin-2">
                          {kampanyaOzeti(kaydiTaslaga(k), {
                            kategori: kategoriAdi,
                            urun: urunAdi,
                          }).map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </details>
                      <ZararUyarisi zararlilar={kampanyaZarari(k, maliyetliler, satisAyari.kdvOrani)} tutarMi={k.tip === "tutar"} />
                      <FiyatUyarisi urunler={fiyatUyarilari.get(k.id) ?? []} />
                    </td>
                    <td className="rakam py-2 font-semibold">{degerYaz(k)}</td>
                    <td className="py-2 text-metin-2">
                      {k.kapsam === "tumu"
                        ? "Tüm ürünler"
                        : k.kapsam === "kategori"
                          ? kapsamAdlari(
                              k.kategoriIdleri.length ? k.kategoriIdleri : [k.categoryId],
                              kategoriAdi,
                              "kategori",
                            )
                          : kapsamAdlari(
                              k.urunIdleri.length ? k.urunIdleri : [k.productId],
                              urunAdi,
                              "ürün",
                            )}
                    </td>
                    <td className="rakam py-2">{k.kuponKodu ?? "—"}</td>
                    <td className="rakam py-2 text-xs text-metin-3">
                      {tarihYaz(k.baslangic)} → {tarihYaz(k.bitis)}
                    </td>
                    <td className="rakam py-2">{k.kullanim}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/yonetim/kampanyalar/duzenle/${k.id}`}
                          className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
                        >
                          Düzenle
                        </Link>
                        <form action={kampanyaCevir}>
                          <SayfaAlani sayfa={durum.sayfa} />
                          <input type="hidden" name="id" value={k.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
                          >
                            {k.aktif ? "Kapat" : "Aç"}
                          </button>
                        </form>
                        <SilmeOnayi uyari={UYARI}>
                          <form action={kampanyaSil}>
                            <SayfaAlani sayfa={durum.sayfa} />
                            <input type="hidden" name="id" value={k.id} />
                            <button type="submit" className={SIL_DUGMESI}>
                              Evet, sil
                            </button>
                          </form>
                        </SilmeOnayi>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <Sayfalama durum={durum} birim="kampanya" adres={adres} />
        </div>
      </section>

    </div>
  );
}

/**
 * Kampanya bazı ürünleri maliyetin altına indiriyorsa (K-113). Katlı: tablo
 * satırını büyütmesin, ama sayısı her zaman görünsün.
 */
function ZararUyarisi({ zararlilar, tutarMi }: { zararlilar: ZararliUrun[]; tutarMi: boolean }) {
  if (zararlilar.length === 0) return null;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer font-bold text-mercan-koyu">
        ⚠ {zararlilar.length} üründe maliyetin altında
      </summary>
      <ul className="mt-1 flex flex-col gap-0.5 text-metin-2">
        {zararlilar.slice(0, 10).map((z) => (
          <li key={z.ad} className="rakam">
            {z.ad}: indirimli {fiyatYaz(z.indirimliKurus)} (KDV hariç {fiyatYaz(z.netKurus)}), alış{" "}
            {fiyatYaz(z.alisKurus)}
          </li>
        ))}
        {zararlilar.length > 10 && <li>…ve {zararlilar.length - 10} ürün daha</li>}
      </ul>
      {tutarMi && <p className="mt-1 text-metin-3">Tutar indiriminde sepette yalnızca o ürün varsa.</p>}
    </details>
  );
}

/**
 * Fiyat Etiketi Yönetmeliği (K-164): kampanyada üstü çizili görünen liste
 * fiyatı, kampanya başlangıcından önceki on günün en düşük fiyatını aşıyor
 * ya da o döneme ait fiyat kaydı yok.
 */
function FiyatUyarisi({ urunler }: { urunler: KampanyaFiyatUyarisi[] }) {
  if (urunler.length === 0) return null;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer font-bold text-sari-koyu">
        İndirim öncesi fiyat: {urunler.length} üründe uyarı
      </summary>
      <p className="mt-1 max-w-md text-metin-2">
        Üstü çizili liste fiyatı, kampanya başlangıcından önceki {INDIRIM_ONCESI_GUN} günde uygulanan
        en düşük fiyattan yüksek olamaz. Kaydı olmayan üründe fiyatın uygulandığı gösterilemiyor.
      </p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {urunler.slice(0, 10).map((u) => (
          <li key={u.slug}>
            <Link href={`/yonetim/urunler/${u.slug}`} className="font-semibold hover:underline">
              {u.ad}
            </Link>{" "}
            <span className="rakam text-metin-3">
              {fiyatYaz(u.ustuCiziliKurus)}
              {u.enDusukKurus !== undefined
                ? ` · en düşük ${fiyatYaz(u.enDusukKurus)}`
                : " · kayıt yok"}
            </span>
          </li>
        ))}
        {urunler.length > 10 && <li className="text-metin-3">ve {urunler.length - 10} ürün daha</li>}
      </ul>
    </details>
  );
}
