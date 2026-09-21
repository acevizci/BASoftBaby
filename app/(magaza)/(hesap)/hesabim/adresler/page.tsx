import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { adresKaydet, adresSil, varsayilanYap } from "@/server/uyelik-islem";
import { adresleriGetir, girisYapan, type Adres } from "@/server/uyelik";
import {
  ANA_DUGME,
  BILDIRIMLER,
  ETIKET,
  GIRDI,
  HATALAR,
  HATA_KUTUSU,
  IKINCIL_DUGME,
  IYI_KUTU,
  KART,
} from "../../hesap-bicim";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Adreslerim", robots: { index: false } };

/**
 * Adres defteri.
 *
 * Düzenleme ayrı bir sayfa değil, `?duzenle=<id>` ile aynı sayfadaki formun
 * dolu açılması: JavaScript kapalı tarayıcıda da çalışsın diye.
 */
export default async function AdreslerSayfasi({
  searchParams,
}: PageProps<"/hesabim/adresler">) {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?hata=giris&nereye=%2Fhesabim%2Fadresler");

  const { hata, kayit, duzenle } = await searchParams;
  const adresler = await adresleriGetir(musteri.id);

  const duzenlenen =
    typeof duzenle === "string" ? adresler.find((a) => a.id === duzenle) : undefined;
  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;
  const bildirim = typeof kayit === "string" ? BILDIRIMLER[kayit] : undefined;

  return (
    <section className="mt-6">
      <h2 className="text-lg">Adreslerim</h2>
      <p className="mt-1 text-sm text-metin-2">
        Sipariş verirken varsayılan adresin forma kendiliğinden yazılır.
      </p>

      {hataMetni && <p className={HATA_KUTUSU}>{hataMetni}</p>}
      {bildirim && <p className={IYI_KUTU}>{bildirim}</p>}

      {adresler.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {adresler.map((a) => (
            <li key={a.id} className={KART}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-baslik font-bold">{a.baslik}</h3>
                {a.varsayilan && (
                  <span className="rounded-full bg-nane-soluk px-3 py-1 text-xs font-bold text-nane-koyu">
                    Varsayılan
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-metin-2">
                {a.adSoyad}
                <span className="rakam block text-metin-3">{a.telefon}</span>
              </p>
              <p className="mt-2 text-sm text-metin-2">
                {a.adres}
                <span className="block">
                  {a.ilce} / {a.il} {a.postaKodu && <span className="rakam">{a.postaKodu}</span>}
                </span>
              </p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-cizgi-soluk pt-3">
                <Link href={`/hesabim/adresler?duzenle=${a.id}`} className={IKINCIL_DUGME}>
                  Düzenle
                </Link>
                {!a.varsayilan && (
                  <form action={varsayilanYap}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className={IKINCIL_DUGME}>
                      Varsayılan yap
                    </button>
                  </form>
                )}
                {/* Adres silme geri alınamıyor; müşteri yeniden yazmak
                    zorunda kalır (K-61). */}
                <SilmeOnayi
                  uyari={<>Bu adres kaydın siliniyor; geri alınamıyor.</>}
                >
                  <form action={adresSil}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className={SIL_DUGMESI}>
                      Evet, sil
                    </button>
                  </form>
                </SilmeOnayi>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdresFormu adres={duzenlenen} musteriAdi={musteri.adSoyad} telefon={musteri.telefon} />
    </section>
  );
}

function AdresFormu({
  adres,
  musteriAdi,
  telefon,
}: {
  adres?: Adres;
  musteriAdi: string;
  telefon: string;
}) {
  return (
    <form action={adresKaydet} className={`mt-6 ${KART}`} id="adres-formu">
      <h3 className="font-baslik text-lg font-bold">
        {adres ? "Adresi düzenle" : "Yeni adres ekle"}
      </h3>

      {adres && <input type="hidden" name="id" value={adres.id} />}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={ETIKET}>Adres başlığı</span>
          <input
            name="baslik"
            defaultValue={adres?.baslik ?? ""}
            placeholder="Ev, İş, Anneannem"
            maxLength={40}
            className={GIRDI}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Ad soyad</span>
          <input
            name="adSoyad"
            required
            defaultValue={adres?.adSoyad ?? musteriAdi}
            autoComplete="name"
            className={GIRDI}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Telefon</span>
          <input
            name="telefon"
            type="tel"
            required
            defaultValue={adres?.telefon ?? telefon}
            autoComplete="tel"
            placeholder="0555 000 00 00"
            className={`${GIRDI} rakam`}
          />
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={ETIKET}>Adres</span>
          <textarea
            name="adres"
            required
            rows={3}
            defaultValue={adres?.adres ?? ""}
            autoComplete="street-address"
            placeholder="Mahalle, sokak, bina ve daire no"
            className={GIRDI}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>İlçe</span>
          <input
            name="ilce"
            required
            defaultValue={adres?.ilce ?? ""}
            autoComplete="address-level2"
            className={GIRDI}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>İl</span>
          <input
            name="il"
            required
            defaultValue={adres?.il ?? ""}
            autoComplete="address-level1"
            className={GIRDI}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Posta kodu</span>
          <input
            name="postaKodu"
            defaultValue={adres?.postaKodu ?? ""}
            autoComplete="postal-code"
            placeholder="isteğe bağlı"
            className={`${GIRDI} rakam`}
          />
        </label>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            name="varsayilan"
            defaultChecked={adres?.varsayilan ?? false}
            className="h-4 w-4 accent-[var(--mercan)]"
          />
          <span className="text-sm text-metin-2">Varsayılan adresim olsun</span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" className={ANA_DUGME}>
          {adres ? "Değişikliği kaydet" : "Adresi kaydet"}
        </button>
        {adres && (
          <Link href="/hesabim/adresler" className={`${IKINCIL_DUGME} self-center`}>
            Vazgeç
          </Link>
        )}
      </div>
    </form>
  );
}
