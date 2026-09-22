import Link from "next/link";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import Katlanir from "@/ui/katlanir";
import { EN_KISA_SIFRE } from "@/server/uyelik";
import {
  kullanicilariGetir,
  yoneticiGerekli,
  type KullaniciSatiri,
} from "@/server/yonetim-kimlik";
import {
  kullaniciCevir,
  kullaniciEkle,
  kullaniciSil,
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
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";
import Sayfalama from "@/ui/sayfalama";
import { dilimle, sayfaAdresi, sayfaCoz } from "@/ui/sayfalama-bicim";
import PanelArama from "@/ui/panel-arama";
import { aramaCoz, aramayaGoreSuz } from "@/ui/panel-arama-bicim";

export const dynamic = "force-dynamic";

const KUCUK_DUGME =
  "rounded-full border border-cizgi bg-yuzey px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-metin-3";

/** Kullanıcı satırı açılır formlar taşıyor; sayfa başına bu kadarı yeterli. */
const LISTE_BOYU = 15;

function tarihYaz(t: Date | null): string {
  return t ? t.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

/**
 * Panel kullanıcıları.
 *
 * Her panel kullanıcısı açabiliyor; rol yok (K-79). Kendini kapatmak,
 * silmek ya da son açık hesabı kapatmak engelli — paneli kimsenin
 * açamayacağı hâle getirirdi (K-45).
 */
export default async function KullanicilarSayfasi({
  searchParams,
}: PageProps<"/yonetim/kullanicilar">) {
  const ben = await yoneticiGerekli();
  const { kayit, hata, sayfa, ara } = await searchParams;
  const tumListe = await kullanicilariGetir();

  const arama = aramaCoz(ara);
  const kullanicilar = aramayaGoreSuz(tumListe, arama, (k) => [k.eposta, k.adSoyad]);

  const durum = sayfaCoz(sayfa, kullanicilar.length, LISTE_BOYU);
  const sayfadakiler = dilimle(kullanicilar, durum);
  const temel = arama
    ? `/yonetim/kullanicilar?ara=${encodeURIComponent(arama)}`
    : "/yonetim/kullanicilar";
  const adres = (n: number) => sayfaAdresi(temel, n);

  const bildirim = typeof kayit === "string" ? KULLANICI_BILDIRIMLERI[kayit] : undefined;
  const hataMetni = typeof hata === "string" ? KULLANICI_HATALARI[hata] : undefined;

  // Tek açık hesap varsa panele girmenin tek yolu o hesap: kurulum ekranı
  // ancak hiç kullanıcı kalmazsa ve `YONETIM_SIFRE` tanımlıysa geri geliyor.
  // Bu yüzden durum ekranda yazıyor — kod bunu zaten koruyor ama kişinin
  // bilmesi lazım (K-46). Sayfayı yalnızca açık bir hesap açabildiği için
  // "tek hesap" hep buradaki kişi oluyor.
  const tekHesapBenim = tumListe.filter((k) => k.aktif).length === 1;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Kullanıcılar</h1>
      <p className="text-sm text-metin-2">
        Panele kimlerin gireceğini buradan belirliyorsun. Ayrılan biri için hesabı{" "}
        <strong>kapat</strong>: açık oturumları anında düşer, kaydı ise durur.
      </p>

      {bildirim && <p className={IYI_KUTU}>{bildirim}</p>}
      {hataMetni && <p className={HATA_KUTUSU}>{hataMetni}</p>}

      {tekHesapBenim && (
        <div className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
          <p className="font-bold">Panelde açık tek hesap seninki.</p>
          <p className="mt-1">
            Bu hesap panele girmenin tek yolu; kapatılamıyor ve silinemiyor. Şifreni unutursan giriş ekranındaki &quot;Şifremi unuttum&quot;
            ile sıfırlayabilirsin — ama o da e-posta servisine bağlı.{" "}
            <strong>İkinci bir hesap açmanı öneririm:</strong> iki hesap olunca biri
            ötekinin şifresini yenileyebiliyor, e-posta çalışmasa bile.
          </p>
        </div>
      )}

      <PanelArama
        yol="/yonetim/kullanicilar"
        ara={arama}
        yerTutucu="Kişi ara: e-posta ya da ad"
      />

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
          Panel kullanıcıları
          <span className="rakam text-xs font-semibold text-metin-3">
            {tumListe.length} kişi · {tumListe.filter((k) => k.aktif).length} açık
          </span>
        </h2>

        <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
          {sayfadakiler.map((k) => (
            <Kullanici key={k.id} kullanici={k} benimId={ben.id} />
          ))}
        </ul>

        <div className="mt-4">
          <Sayfalama durum={durum} birim="kişi" adres={adres} />
        </div>
      </section>

      <Katlanir
        id="yeni-kullanici"
        baslik="Yeni kullanıcı ekle"
        eylem
        acik={hata !== undefined}
      >
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
          </div>

          <GonderDugmesi bekleyen="Ekleniyor…" className={`${ANA_DUGME} self-start`}>
            Kullanıcı ekle
          </GonderDugmesi>
        </form>
      </Katlanir>

      <p className="text-xs text-metin-3">
        Şifresini unutan bir kullanıcı giriş ekranındaki &quot;Şifremi unuttum&quot; ile
        kendisi sıfırlayabiliyor (e-posta servisi bağlıysa). Buradan da yeni bir şifre
        atayabilirsin; ataman o kişinin açık oturumlarını düşürür. Açık hesap kalmayacak
        hiçbir değişikliğe izin verilmiyor — panele girmenin tek yolu bir hesapla giriş
        yapmak.
      </p>
    </div>
  );
}

function Kullanici({
  kullanici: k,
  benimId,
}: {
  kullanici: KullaniciSatiri;
  benimId: string;
}) {
  const benMiyim = k.id === benimId;

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
            k.aktif ? "bg-nane-soluk text-nane-koyu" : "bg-cizgi-soluk text-metin-2"
          }`}
        >
          {k.aktif ? "Açık" : "Kapalı"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Kendi hesabını kapatmak/silmek paneli
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

            {/* Kullanıcı silmek panele giriş hakkını kaldırıyor ve geri
                alınamıyor; çoğu zaman istenen şey "Kapat" (K-61). */}
            <SilmeOnayi
              uyari={
                <>
                  <strong>{k.adSoyad}</strong> kalıcı olarak siliniyor; açık oturumları
                  düşüyor ve kaydı gidiyor. Ayrılan biri için <strong>Kapat</strong>{" "}
                  daha iyi: oturumları yine düşer ama kim ne yapmış kaydı durur.
                </>
              }
            >
              <form action={kullaniciSil}>
                <input type="hidden" name="id" value={k.id} />
                <button type="submit" className={SIL_DUGMESI}>
                  Evet, sil
                </button>
              </form>
            </SilmeOnayi>

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
