import Link from "next/link";
import DuyuruSeridi from "@/ui/duyuru-seridi";
import Katlanir from "@/ui/katlanir";
import { seritAyariGetir, tumDuyurular } from "@/server/duyuru";
import { duyuruCevir, duyuruEkle, duyuruSil, seritAyariKaydet } from "@/server/yonetim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import PanelBildirim, { ORTAK_HATALAR } from "@/ui/panel-bildirim";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";
import Sayfalama, { SayfaAlani } from "@/ui/sayfalama";
import { dilimle, sayfaAdresi, sayfaCoz } from "@/ui/sayfalama-bicim";

export const dynamic = "force-dynamic";

/** Satırlar tek satırlık; sayfaya çok sayıda sığıyor. */
const LISTE_BOYU = 15;

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

function tarihYaz(t?: Date): string {
  return t ? t.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) : "—";
}

const UYARI = <>Duyuru kalıcı olarak siliniyor; geri alınamıyor. Yalnızca şeritten kaldırmak istiyorsan &quot;Kapat&quot; yeter.</>;

/** Bildirim metinleri koddan; adres yalnızca kodu taşıyor (K-57). */
const BILDIRIMLER: Record<string, string> = {
  "1": "Kaydedildi.",
  silindi: "Duyuru silindi. Şeritten kalktı.",
  acildi: "Duyuru yayına alındı.",
  kapatildi: "Duyuru kapatıldı. Şeritte görünmüyor.",
};

export default async function DuyuruEkrani({ searchParams }: PageProps<"/yonetim/duyuru"> ) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { kayit, hata, ac, sayfa } = await searchParams;
  const [duyurular, ayar] = await Promise.all([tumDuyurular(), seritAyariGetir()]);

  const durum = sayfaCoz(sayfa, duyurular.length, LISTE_BOYU);
  const sayfadakiler = dilimle(duyurular, durum);
  const adres = (n: number) => sayfaAdresi("/yonetim/duyuru", n);

  const yayinda = duyurular.filter((d) => d.aktif).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Duyuru şeridi</h1>
      <p className="text-sm text-metin-2">
        Sitenin en üstündeki kayan şerit. Tarih verdiğin mesaj kendiliğinden başlar ve biter, sen
        bir şey yapmazsın.
      </p>

      <PanelBildirim kayit={kayit} hata={hata} bildirimler={BILDIRIMLER} hatalar={ORTAK_HATALAR} />

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Şu an mağazada görünen</h2>
        <div className="mt-3 overflow-hidden rounded-[11px] border border-cizgi">
          <DuyuruSeridi />
        </div>
      </section>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        {/* Liste katlanmıyor: aradığın mesajı tarayıcının kendi sayfa içi
            araması bulabilsin. */}
        <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
          Mesajlar
          <span className="rakam text-xs font-semibold text-metin-3">
            {duyurular.length} mesaj · {yayinda} yayında
          </span>
          <Link
            href="/yonetim/duyuru?ac=yeni-mesaj#yeni-mesaj"
            className="ml-auto text-sm font-bold text-mavi-koyu hover:underline"
          >
            + Yeni mesaj
          </Link>
        </h2>
        {duyurular.length === 0 ? (
          <p className="mt-2 text-sm text-metin-3">Henüz mesaj yok.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {sayfadakiler.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <span className="min-w-0 flex-1 text-sm">{d.metin}</span>
                <span className="rakam text-xs text-metin-3">
                  {tarihYaz(d.baslangic)} → {tarihYaz(d.bitis)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    d.aktif
                      ? "bg-nane-soluk text-nane-koyu"
                      : "bg-cizgi-soluk text-metin-2"
                  }`}
                >
                  {d.aktif ? "Yayında" : "Kapalı"}
                </span>
                <form action={duyuruCevir}>
                  <input type="hidden" name="id" value={d.id} />
                  <SayfaAlani sayfa={durum.sayfa} />
                  <button
                    type="submit"
                    className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
                  >
                    {d.aktif ? "Kapat" : "Aç"}
                  </button>
                </form>
                <SilmeOnayi uyari={UYARI}>
                  <form action={duyuruSil}>
                    <input type="hidden" name="id" value={d.id} />
                    <SayfaAlani sayfa={durum.sayfa} />
                    <button type="submit" className={SIL_DUGMESI}>
                      Evet, sil
                    </button>
                  </form>
                </SilmeOnayi>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <Sayfalama durum={durum} birim="mesaj" adres={adres} />
        </div>
      </section>

      <Katlanir
        id="yeni-mesaj"
        baslik="Yeni mesaj ekle"
        eylem
        acik={ac === "yeni-mesaj" || duyurular.length === 0}
      >
        <form action={duyuruEkle} className="flex flex-col gap-3">
          {/* Arka arkaya birkaç mesaj eklenebilsin: kaydettikten sonra bölüm
              açık dönüyor. */}
          <input type="hidden" name="ac" value="yeni-mesaj" />
          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Mesaj</span>
            <input
              name="metin"
              required
              placeholder="Sonbahar koleksiyonu yayında"
              className={GIRDI}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Tıklayınca gideceği sayfa</span>
              <input name="link" placeholder="/uyku" className={GIRDI} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Başlangıç</span>
              <input name="baslangic" type="date" className={GIRDI} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Bitiş</span>
              <input name="bitis" type="date" className={GIRDI} />
            </label>
          </div>
          <button
            type="submit"
            className="self-start rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
          >
            Şeride ekle
          </button>
        </form>
      </Katlanir>

      <Katlanir
        id="serit-ayarlari"
        baslik="Şerit ayarları"
        acik={ac === "serit-ayarlari"}
        ozet={`${ayar.acik ? "açık" : "kapalı"} · ${ayar.hiz} · ${ayar.renk}`}
      >
        <form action={seritAyariKaydet} className="flex flex-col gap-4">
          <input type="hidden" name="ac" value="serit-ayarlari" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Kayma hızı</span>
              <select name="hiz" defaultValue={ayar.hiz} className={GIRDI}>
                <option value="yavas">Yavaş</option>
                <option value="orta">Orta</option>
                <option value="hizli">Hızlı</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Şerit rengi</span>
              <select name="renk" defaultValue={ayar.renk} className={GIRDI}>
                <option value="nane">Nane</option>
                <option value="mercan">Mercan</option>
                <option value="sari">Sarı</option>
                <option value="mavi">Mavi</option>
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="acik"
              defaultChecked={ayar.acik}
              className="h-4 w-4 accent-[var(--mercan)]"
            />
            <span className="text-sm font-semibold">Şerit açık</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="durdurHover"
              defaultChecked={ayar.durdurHover}
              className="h-4 w-4 accent-[var(--mercan)]"
            />
            <span className="text-sm font-semibold">Fare üzerine gelince dursun</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="mobilde"
              defaultChecked={ayar.mobildeGoster}
              className="h-4 w-4 accent-[var(--mercan)]"
            />
            <span className="text-sm font-semibold">Telefonda da görünsün</span>
          </label>

          <p className="text-xs text-metin-3">
            Cihazında &quot;hareketi azalt&quot; ayarı açık olan müşteride şerit kaymaz, mesajlar
            sabit durur. Bu erişilebilirlik için zorunlu, ayarı yok.
          </p>

          <button
            type="submit"
            className="self-start rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
          >
            Ayarları kaydet
          </button>
        </form>
      </Katlanir>
    </div>
  );
}
