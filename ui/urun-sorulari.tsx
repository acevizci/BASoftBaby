import { soruSor } from "@/server/soru-islem";
import type { UrunSorusu } from "@/server/soru";
import GonderDugmesi from "@/ui/gonder-dugmesi";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";

const MESAJLAR: Record<string, { metin: string; iyi: boolean }> = {
  alindi: { metin: "Sorun bize ulaştı. Cevaplayınca burada görünecek; e-posta bıraktıysan haber veriyoruz.", iyi: true },
  kisa: { metin: "Soru en az 10 karakter olmalı.", iyi: false },
  eposta: { metin: "E-posta adresi geçerli görünmüyor.", iyi: false },
  cok: { metin: "Kısa sürede çok fazla soru gönderildi. Biraz sonra tekrar dener misin?", iyi: false },
};

function tarih(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Ürün sayfasında soru-cevap (K-135). Cevaplanmış sorular ve soru formu.
 * Düz HTML formu: JavaScript kapalıyken de çalışıyor.
 */
export default function UrunSorulari({
  slug,
  sorular,
  sonuc,
}: {
  slug: string;
  sorular: UrunSorusu[];
  sonuc?: string;
}) {
  const mesaj = sonuc ? MESAJLAR[sonuc] : undefined;
  return (
    <section id="sorular" className="mt-12 scroll-mt-6">
      <h2 className="text-xl">Sorular ve cevaplar</h2>

      {sorular.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3">
          {sorular.map((s) => (
            <li key={s.id} className="rounded-marka border border-cizgi bg-yuzey p-4 text-sm">
              <p className="font-bold text-metin">S: {s.soru}</p>
              <p className="mt-2 text-metin-2">
                <span className="font-bold text-nane-koyu">C:</span> {s.cevap}
              </p>
              <p className="mt-2 text-xs text-metin-3">
                {s.adSoyad} sordu · {tarih(s.tarih)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-metin-3">Bu ürün için henüz soru yok. İlk soran sen ol.</p>
      )}

      {mesaj && (
        <p
          className={`mt-4 rounded-marka px-4 py-3 text-sm font-semibold ${
            mesaj.iyi ? "bg-nane-soluk text-nane-koyu" : "bg-mercan-soluk text-mercan-koyu"
          }`}
        >
          {mesaj.metin}
        </p>
      )}

      <details className="mt-4 rounded-marka border border-cizgi bg-yuzey p-4" open={Boolean(mesaj && !mesaj.iyi)}>
        <summary className="cursor-pointer text-sm font-bold">Bu ürün hakkında soru sor</summary>
        <form action={soruSor} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="slug" value={slug} />
          {/* Bal küpü: ekranda yok, betikler dolduruyor. */}
          <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-metin-2">Sorun</span>
            <textarea
              name="metin"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              placeholder="Kalıbı dar mı, yıkayınca çeker mi, hangi yaşa uygun?"
              className={GIRDI}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-metin-2">Adın (isteğe bağlı)</span>
              <input name="ad" maxLength={60} className={GIRDI} placeholder="Ayşe Y. olarak görünür" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-metin-2">E-posta (isteğe bağlı)</span>
              <input name="eposta" type="email" maxLength={120} className={GIRDI} placeholder="Cevaplayınca haber verelim" />
            </label>
          </div>
          <p className="text-xs text-metin-3">
            E-postan yalnızca cevabı haber vermek için; sayfada görünmez, pazarlama için kullanılmaz.
          </p>
          <GonderDugmesi
            bekleyen="Gönderiliyor…"
            className="self-start rounded-full bg-dugme px-5 py-2 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
          >
            Soruyu gönder
          </GonderDugmesi>
        </form>
      </details>
    </section>
  );
}
