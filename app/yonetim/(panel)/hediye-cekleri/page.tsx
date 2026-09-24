import Link from "next/link";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { cekKapat, cekOlustur } from "@/server/hediye-ceki-islem";
import { fiyatYaz } from "@/ui/katalog-bicim";
import GonderDugmesi from "@/ui/gonder-dugmesi";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

const HATALAR: Record<string, string> = {
  tutar: "Tutar 1 ₺ ile 100.000 ₺ arasında olmalı.",
  eposta: "E-posta geçerli değil. Kodu e-postayla göndermek için alıcının e-postası gerekli.",
  tarih: "Son kullanma tarihi bugünden sonra olmalı.",
  kod: "Kod üretilemedi, tekrar dene.",
};

const SEBEPLER: Record<string, string> = {
  siparis: "Siparişte kullanıldı",
  iptal: "Sipariş iptal, bakiyeye döndü",
  iade: "İade, bakiyeye döndü",
};

function gun(t: Date): string {
  return t.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium" });
}

/** Bugünden iki yıl sonrası, "YYYY-MM-DD". */
function ikiYilSonra(): string {
  const t = new Date();
  t.setFullYear(t.getFullYear() + 2);
  return t.toISOString().slice(0, 10);
}

/**
 * Hediye çekleri (K-137). Çek burada oluşturuluyor (mağazada elden satılan,
 * çekilişte verilen, gönül almak için tanımlanan); müşteri kodu ödeme
 * sayfasında yazıyor. Bakiye parça parça kullanılabiliyor.
 */
export default async function HediyeCekleri({
  searchParams,
}: PageProps<"/yonetim/hediye-cekleri">) {
  await yoneticiGerekli();
  const p = await searchParams;
  const ara = typeof p.ara === "string" ? p.ara.trim() : "";
  const acik = typeof p.ac === "string" ? p.ac : "";

  const cekler = await db.giftCard.findMany({
    where: ara
      ? {
          OR: [
            { kod: { contains: ara.toUpperCase() } },
            { aliciAd: { contains: ara, mode: "insensitive" } },
            { aliciEposta: { contains: ara.toLowerCase() } },
          ],
        }
      : undefined,
    orderBy: { olusturuldu: "desc" },
    take: 100,
    include: { kullanimlar: { orderBy: { olusturuldu: "desc" } } },
  });
  const simdi = new Date();
  const acikBakiye = cekler
    .filter((c) => c.aktif && (!c.sonKullanma || c.sonKullanma > simdi))
    .reduce((t, c) => t + c.bakiyeKurus, 0);

  const kayit = typeof p.kayit === "string" ? p.kayit : "";
  const hata = typeof p.hata === "string" ? HATALAR[p.hata] : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">Hediye çekleri</h1>
        <p className="mt-1 text-sm text-metin-3">
          Müşteri kodu ödeme sayfasında yazıyor; tutar siparişten düşüyor, kalanı kartla ya da
          havaleyle ödüyor. Bakiye bitene kadar birden çok siparişte kullanılabiliyor. İptal ve
          iadede çekle ödenen kısım bakiyeye geri dönüyor.
        </p>
      </div>

      {kayit.startsWith("HC-") && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Çek oluşturuldu: <span className="rakam select-all">{kayit}</span>
          {p.eposta === "gitti" && " · Kod alıcıya e-postayla gönderildi."}
          {p.eposta === "gitmedi" && " · E-posta gönderilemedi; kodu alıcıya kendin ilet."}
        </p>
      )}
      {(kayit === "kapatildi" || kayit === "acildi") && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          {kayit === "kapatildi" ? "Çek kullanıma kapatıldı." : "Çek yeniden kullanıma açıldı."}
        </p>
      )}
      {hata && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          {hata}
        </p>
      )}

      <form
        action={cekOlustur}
        className="grid gap-3 rounded-marka border border-cizgi bg-yuzey p-5 sm:grid-cols-2"
      >
        <h2 className="text-lg sm:col-span-2">Yeni çek</h2>
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Tutar (₺)</span>
          <input name="tutar" required inputMode="decimal" placeholder="500" className={GIRDI} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Son kullanma</span>
          <input name="sonKullanma" type="date" defaultValue={ikiYilSonra()} className={GIRDI} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Alıcının adı</span>
          <input name="aliciAd" maxLength={80} className={GIRDI} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Alıcının e-postası</span>
          <input name="aliciEposta" type="email" maxLength={120} className={GIRDI} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={ETIKET}>Not (yalnızca panelde)</span>
          <input
            name="not"
            maxLength={300}
            placeholder="Örn. mağazada nakit satıldı, çekiliş"
            className={GIRDI}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-metin-2 sm:col-span-2">
          <input
            type="checkbox"
            name="gonder"
            defaultChecked
            className="h-4 w-4 accent-[var(--mercan)]"
          />
          Kodu alıcıya e-postayla gönder
        </label>
        <p className="text-xs text-metin-3 sm:col-span-2">
          Son kullanmayı boş bırakırsan çek süresiz olur. Tüketici mevzuatında hediye çekleri için
          en az bir yıl geçerlilik bekleniyor; varsayılan iki yıl.
        </p>
        <GonderDugmesi
          bekleyen="Oluşturuluyor…"
          className="justify-self-start rounded-full bg-dugme px-6 py-2.5 text-sm font-bold text-dugme-yazi"
        >
          Çeki oluştur
        </GonderDugmesi>
      </form>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-metin-2">
          Kullanılabilir toplam bakiye:{" "}
          <span className="rakam font-bold text-metin">{fiyatYaz(acikBakiye)}</span>
          <span className="block text-xs text-metin-3">
            Müşterilere olan borç; henüz ürüne dönüşmedi.
          </span>
        </p>
        <form className="flex gap-2">
          <input
            name="ara"
            defaultValue={ara}
            placeholder="Kod, ad ya da e-posta"
            className={GIRDI}
          />
          <button className="rounded-full border-[1.5px] border-cizgi px-4 text-sm font-bold">
            Ara
          </button>
        </form>
      </div>

      {cekler.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-3">
          {ara ? "Aramaya uyan çek yok." : "Henüz hediye çeki yok."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-cizgi-soluk rounded-marka border border-cizgi bg-yuzey">
          {cekler.map((c) => {
            const suresi = c.sonKullanma !== null && c.sonKullanma < simdi;
            const durum = !c.aktif
              ? "Kapalı"
              : suresi
                ? "Süresi doldu"
                : c.bakiyeKurus === 0
                  ? "Bitti"
                  : "Geçerli";
            return (
              <li key={c.id} className="flex flex-col gap-2 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="rakam font-bold select-all">{c.kod}</p>
                    <p className="text-xs text-metin-3">
                      {[c.aliciAd, c.aliciEposta].filter(Boolean).join(" · ") || "Alıcı yazılmamış"}{" "}
                      · {gun(c.olusturuldu)}
                      {c.sonKullanma && ` · son ${gun(c.sonKullanma)}`}
                      {c.not && ` · ${c.not}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        durum === "Geçerli"
                          ? "bg-nane-soluk text-nane-koyu"
                          : "bg-yuzey-sicak text-metin-3"
                      }`}
                    >
                      {durum}
                    </span>
                    <span className="rakam text-right">
                      <span className="font-bold">{fiyatYaz(c.bakiyeKurus)}</span>
                      <span className="block text-xs text-metin-3">/ {fiyatYaz(c.tutarKurus)}</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {c.kullanimlar.length > 0 && (
                    <Link
                      href={
                        acik === c.id
                          ? "?"
                          : `?ac=${c.id}${ara ? `&ara=${encodeURIComponent(ara)}` : ""}`
                      }
                      className="font-bold text-mavi-koyu hover:underline"
                    >
                      {acik === c.id ? "Hareketleri gizle" : `Hareketler (${c.kullanimlar.length})`}
                    </Link>
                  )}
                  <form action={cekKapat}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="aktif" value={c.aktif ? "0" : "1"} />
                    <button className="font-bold text-metin-2 hover:underline">
                      {c.aktif ? "Kullanıma kapat" : "Yeniden aç"}
                    </button>
                  </form>
                </div>
                {acik === c.id && (
                  <ul className="flex flex-col gap-1 rounded-[10px] bg-yuzey-sicak p-3 text-xs">
                    {c.kullanimlar.map((k) => (
                      <li key={k.id} className="flex justify-between gap-3">
                        <span>
                          {gun(k.olusturuldu)} · {SEBEPLER[k.sebep] ?? k.sebep}
                          {k.siparisNo && (
                            <>
                              {" · "}
                              <Link
                                href={`/yonetim/siparisler/${k.siparisNo}`}
                                className="rakam font-bold text-mavi-koyu hover:underline"
                              >
                                {k.siparisNo}
                              </Link>
                            </>
                          )}
                        </span>
                        <span
                          className={`rakam font-bold ${k.tutarKurus < 0 ? "text-nane-koyu" : ""}`}
                        >
                          {k.tutarKurus < 0 ? "+" : "-"}
                          {fiyatYaz(Math.abs(k.tutarKurus))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
