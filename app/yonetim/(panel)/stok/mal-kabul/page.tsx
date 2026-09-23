import Link from "next/link";
import { kabulIcinAra } from "@/server/mal-kabul";
import { malKabulKaydet } from "@/server/mal-kabul-islem";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import StokSekmeleri from "@/ui/stok-sekmeleri";
import GonderDugmesi from "@/ui/gonder-dugmesi";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";

/**
 * Mal kabulü (K-104): gelen adet girilir, stok **artırılır**.
 *
 * Akış: ürünü ara (ad ya da SKU), gelen adetleri yaz, kaydet. Tedarikçi ve
 * irsaliye alanları kayıttan sonra dolu kalıyor; aynı irsaliyedeki sonraki
 * ürün aranıp aynı yolla eklenebiliyor.
 */
export default async function MalKabul({ searchParams }: PageProps<"/yonetim/stok/mal-kabul">) {
  await yoneticiGerekli();

  const p = await searchParams;
  const tek = (ad: string) => (typeof p[ad] === "string" ? (p[ad] as string) : "");
  const ara = tek("ara").slice(0, 120);
  const tedarikci = tek("tedarikci");
  const irsaliye = tek("irsaliye");
  const { urunler, skuVaryant } = await kabulIcinAra(ara);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Mal kabulü</h1>
      <StokSekmeleri secili="/yonetim/stok/mal-kabul" />
      <p className="text-sm text-metin-2">
        Gelen malın <b>adedini</b> yaz; mevcut stoğun üzerine eklenir. Toplama yapmana gerek
        yok, arada gelen siparişler de korunur. Tedarikçi ve irsaliye bilgisi stok
        hareketlerine not olarak düşer.
      </p>

      {tek("eklendi") && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          <span className="rakam">{tek("beden")}</span> bedene toplam{" "}
          <span className="rakam">{tek("eklendi")}</span> adet eklendi. Aynı irsaliyeden sıradaki
          ürünü arayabilirsin.
        </p>
      )}
      {tek("hata") === "bos" && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Hiçbir bedene adet yazılmamış; bir şey eklenmedi.
        </p>
      )}

      {/* Arama düz GET: tedarikçi ve irsaliye adreste taşınıyor. */}
      <form
        method="get"
        action="/yonetim/stok/mal-kabul"
        className="flex flex-wrap items-end gap-3 rounded-marka border border-cizgi bg-yuzey p-4"
      >
        <input type="hidden" name="tedarikci" value={tedarikci} />
        <input type="hidden" name="irsaliye" value={irsaliye} />
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-bold text-metin-2">Ürün adı ya da SKU / barkod</span>
          <input
            name="ara"
            defaultValue={ara}
            autoFocus={!ara}
            placeholder="Örn. zıbın ya da barkodu okut"
            className={GIRDI}
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-dugme px-5 py-2 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Ara
        </button>
      </form>

      {ara && urunler.length === 0 && (
        <p className="rounded-marka border border-cizgi bg-yuzey p-6 text-center text-sm text-metin-2">
          &quot;{ara}&quot; ile eşleşen ürün yok. Yeni bir ürünse önce{" "}
          <Link href="/yonetim/urunler/yeni" className="font-bold text-mavi-koyu hover:underline">
            ürünü ekle
          </Link>
          .
        </p>
      )}

      {urunler.length > 0 && (
        <form action={malKabulKaydet} className="flex flex-col gap-4">
          <input type="hidden" name="ara" value={ara} />
          <div className="grid gap-3 rounded-marka border border-cizgi bg-yuzey p-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-metin-2">Tedarikçi</span>
              <input name="tedarikci" defaultValue={tedarikci} maxLength={80} className={GIRDI} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-metin-2">İrsaliye no</span>
              <input name="irsaliye" defaultValue={irsaliye} maxLength={40} className={`${GIRDI} rakam`} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-metin-2">Not</span>
              <input name="not" maxLength={150} placeholder="İsteğe bağlı" className={GIRDI} />
            </label>
          </div>

          {urunler.map((u) => (
            <section key={u.id} className="rounded-marka border border-cizgi bg-yuzey p-5">
              <h2 className="text-base">
                <Link href={`/yonetim/urunler/${u.slug}`} className="hover:text-mercan-koyu">
                  {u.ad}
                </Link>
                {!u.aktif && (
                  <span className="ml-2 rounded-full bg-yuzey-sicak px-2 py-0.5 text-xs font-bold text-metin-3">
                    pasif
                  </span>
                )}
              </h2>
              {u.bedenler.length === 0 ? (
                <p className="mt-2 text-sm text-metin-3">
                  Bu üründe beden yok.{" "}
                  <Link href={`/yonetim/urunler/${u.slug}`} className="font-bold text-mavi-koyu hover:underline">
                    Önce beden ekle
                  </Link>
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {u.bedenler.map((v) => (
                    <label
                      key={v.id}
                      className={`flex items-center gap-3 rounded-[10px] px-2 py-1 ${v.id === skuVaryant ? "bg-sari-soluk" : ""}`}
                    >
                      <span className="flex-1 text-sm">
                        {v.beden}
                        <span className="text-metin-3"> · {v.renkAdi}</span>
                        <span className="rakam block text-xs text-metin-3">şu an {v.stok}</span>
                      </span>
                      <span className="text-sm text-metin-3">+</span>
                      <input
                        name={`gelen-${v.id}`}
                        type="number"
                        min={1}
                        max={100000}
                        inputMode="numeric"
                        autoFocus={v.id === skuVaryant}
                        placeholder="0"
                        className="rakam w-20 rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm outline-none focus:border-mercan"
                      />
                    </label>
                  ))}
                </div>
              )}
            </section>
          ))}

          <GonderDugmesi
            bekleyen="Ekleniyor…"
            className="sticky bottom-4 self-start rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi shadow-md transition hover:brightness-95"
          >
            Stoğa ekle
          </GonderDugmesi>
        </form>
      )}

      <p className="text-xs text-metin-3">
        Geçmiş kabuller:{" "}
        <Link
          href="/yonetim/stok/hareketler?sebep=mal-kabul"
          className="font-bold text-mavi-koyu hover:underline"
        >
          stok hareketlerinde mal kabulleri
        </Link>
      </p>
    </div>
  );
}
