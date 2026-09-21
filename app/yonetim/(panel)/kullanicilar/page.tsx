import Link from "next/link";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import Katlanir from "@/ui/katlanir";
import { EN_KISA_SIFRE } from "@/server/uyelik";
import {
  ROLLER,
  ROL_ACIKLAMALARI,
  ROL_ADLARI,
  kullanicilariGetir,
  sahipGerekli,
  type KullaniciSatiri,
} from "@/server/yonetim-kimlik";
import {
  kullaniciCevir,
  kullaniciEkle,
  kullaniciSil,
  rolDegistir,
  sifreAta,
} from "@/server/yonetim-kimlik-islem";
import {
  ANA_DUGME,
  ETIKET,
  GIRDI,
  HATA_KUTUSU,
  IYI_KUTU,
  KULLANICI_BILDIRIMLERI,
  KULLANICI_HATALARI,
} from "../../panel-bicim";

export const dynamic = "force-dynamic";

const KUCUK_DUGME =
  "rounded-full border border-cizgi bg-yuzey px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-metin-3";

function tarihYaz(t: Date | null): string {
  return t ? t.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

/**
 * Panel kullanıcıları.
 *
 * Yalnızca sahip açabiliyor. İki rol var: sahip kullanıcı ekleyip
 * çıkarabiliyor, yönetici çıkaramıyor. Kendini kapatmak, silmek ya da son
 * sahibi düşürmek engelli — paneli kimsenin açamayacağı hâle getirirdi
 * (K-45).
 */
export default async function KullanicilarSayfasi({
  searchParams,
}: PageProps<"/yonetim/kullanicilar">) {
  const ben = await sahipGerekli();
  const { kayit, hata } = await searchParams;
  const kullanicilar = await kullanicilariGetir();

  const bildirim = typeof kayit === "string" ? KULLANICI_BILDIRIMLERI[kayit] : undefined;
  const hataMetni = typeof hata === "string" ? KULLANICI_HATALARI[hata] : undefined;

  // Tek açık sahip varsa panele girmenin tek yolu o hesap: kurulum ekranı
  // ancak hiç kullanıcı kalmazsa ve `YONETIM_SIFRE` tanımlıysa geri geliyor.
  // Bu yüzden durum ekranda yazıyor — kod bunu zaten koruyor ama kişinin
  // bilmesi lazım (K-46).
  // Sayfayı yalnızca açık bir sahip açabildiği için "tek sahip" hep
  // buradaki kişi oluyor.
  const acikSahipSayisi = kullanicilar.filter((k) => k.aktif && k.rol === "sahip").length;
  const tekSahibim = acikSahipSayisi === 1;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Kullanıcılar</h1>
      <p className="text-sm text-metin-2">
        Panele kimlerin gireceğini buradan belirliyorsun. Ayrılan biri için hesabı{" "}
        <strong>kapat</strong>: açık oturumları anında düşer, kaydı ise durur.
      </p>

      {bildirim && <p className={IYI_KUTU}>{bildirim}</p>}
      {hataMetni && <p className={HATA_KUTUSU}>{hataMetni}</p>}

      {tekSahibim && (
        <div className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
          <p className="font-bold">Açık tek sahip sensin.</p>
          <p className="mt-1">
            Bu hesap panele girmenin tek yolu; kapatılamıyor, silinemiyor ve rolü
            düşürülemiyor. Şifreni unutursan giriş ekranındaki &quot;Şifremi unuttum&quot;
            ile sıfırlayabilirsin — ama o da e-posta servisine bağlı.{" "}
            <strong>İkinci bir sahip hesabı açmanı öneririm:</strong> iki sahip olunca biri
            ötekinin şifresini yenileyebiliyor, e-posta çalışmasa bile.
          </p>
        </div>
      )}

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
          Panel kullanıcıları
          <span className="rakam text-xs font-semibold text-metin-3">
            {kullanicilar.length} kişi · {kullanicilar.filter((k) => k.aktif).length} açık
          </span>
        </h2>

        <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
          {kullanicilar.map((k) => (
            <Kullanici key={k.id} kullanici={k} benimId={ben.id} tekSahibim={tekSahibim} />
          ))}
        </ul>
      </section>

      <Katlanir id="yeni-kullanici" baslik="Yeni kullanıcı" acik={hata !== undefined}>
        <form action={kullaniciEkle} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Ad soyad</span>
              <input name="adSoyad" required className={GIRDI} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>E-posta</span>
              <input name="eposta" type="email" required className={GIRDI} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Şifre</span>
              <input
                name="sifre"
                type="password"
                required
                minLength={EN_KISA_SIFRE}
                autoComplete="new-password"
                className={GIRDI}
              />
              <span className="text-xs text-metin-3">
                En az {EN_KISA_SIFRE} karakter. Kişiye kendin ilet; kaydettikten sonra
                okunamıyor.
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Rol</span>
              <select name="rol" defaultValue="yonetici" className={GIRDI}>
                {ROLLER.map((r) => (
                  <option key={r} value={r}>
                    {ROL_ADLARI[r]}
                  </option>
                ))}
              </select>
              <span className="text-xs text-metin-3">{ROL_ACIKLAMALARI.yonetici}</span>
            </label>
          </div>

          <GonderDugmesi bekleyen="Ekleniyor…" className={`${ANA_DUGME} self-start`}>
            Kullanıcı ekle
          </GonderDugmesi>
        </form>
      </Katlanir>

      <p className="text-xs text-metin-3">
        Şifresini unutan bir kullanıcı giriş ekranındaki &quot;Şifremi unuttum&quot; ile
        kendisi sıfırlayabiliyor (e-posta servisi bağlıysa). Buradan da yeni bir şifre
        atayabilirsin; ataman o kişinin açık oturumlarını düşürür. Açık sahip kalmayacak
        hiçbir değişikliğe izin verilmiyor — panele girmenin tek yolu bir hesapla giriş
        yapmak.
      </p>
    </div>
  );
}

function Kullanici({
  kullanici: k,
  benimId,
  tekSahibim,
}: {
  kullanici: KullaniciSatiri;
  benimId: string;
  /** Açık tek sahip bu sayfayı açan kişi mi? Öyleyse satırında "tek" yazıyor. */
  tekSahibim: boolean;
}) {
  const benMiyim = k.id === benimId;
  const tekSahipMi = benMiyim && tekSahibim;

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 flex-1">
          <span className="font-semibold">
            {k.adSoyad}
            {benMiyim && <span className="ml-2 text-xs font-bold text-metin-3">(sen)</span>}
          </span>
          <span className="block truncate text-xs text-metin-3">{k.eposta}</span>
        </span>

        <span className="text-xs text-metin-3">
          son giriş <span className="rakam">{tarihYaz(k.sonGiris)}</span>
          {k.acikOturum > 0 && (
            <span className="rakam"> · {k.acikOturum} açık oturum</span>
          )}
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            k.rol === "sahip" ? "bg-mavi-soluk text-mavi-koyu" : "bg-yuzey-sicak text-metin-2"
          }`}
        >
          {ROL_ADLARI[k.rol]}
          {tekSahipMi && <span className="font-normal"> · tek</span>}
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            k.aktif ? "bg-nane-soluk text-nane-koyu" : "bg-cizgi-soluk text-metin-3"
          }`}
        >
          {k.aktif ? "Açık" : "Kapalı"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Kendi hesabını ve açık tek sahibi kapatmak/silmek paneli
            kilitleyebilir; düğme hiç çıkmıyor. Kural sunucuda da var —
            görünmeyen düğme koruma değildir (K-45, K-46). */}
        {!benMiyim && (
          <>
            <form action={kullaniciCevir}>
              <input type="hidden" name="id" value={k.id} />
              <button type="submit" className={KUCUK_DUGME}>
                {k.aktif ? "Kapat" : "Aç"}
              </button>
            </form>

            <form action={rolDegistir}>
              <input type="hidden" name="id" value={k.id} />
              <input
                type="hidden"
                name="rol"
                value={k.rol === "sahip" ? "yonetici" : "sahip"}
              />
              <button type="submit" className={KUCUK_DUGME}>
                {k.rol === "sahip" ? "Yönetici yap" : "Sahip yap"}
              </button>
            </form>

            <form action={kullaniciSil}>
              <input type="hidden" name="id" value={k.id} />
              <button
                type="submit"
                className={`${KUCUK_DUGME} hover:border-mercan hover:text-mercan-koyu`}
              >
                Sil
              </button>
            </form>

            <details className="group">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-metin-2 hover:text-metin [&::-webkit-details-marker]:hidden">
                Şifre ata
                <span aria-hidden="true" className="transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <form action={sifreAta} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={k.id} />
                <input
                  name="sifre"
                  type="password"
                  required
                  minLength={EN_KISA_SIFRE}
                  autoComplete="new-password"
                  placeholder="Yeni şifre"
                  className={`${GIRDI} w-48`}
                />
                <button type="submit" className={KUCUK_DUGME}>
                  Şifreyi ata
                </button>
              </form>
            </details>
          </>
        )}

        {/* Kendi şifren buradan değil Hesabım'dan: burada değiştirmek bu
            oturumu da düşürürdü, üstelik mevcut şifre sorulmadan. */}
        {benMiyim && (
          <Link href="/yonetim/hesabim" className={KUCUK_DUGME}>
            Kendi şifreni değiştir
          </Link>
        )}
      </div>
    </li>
  );
}
