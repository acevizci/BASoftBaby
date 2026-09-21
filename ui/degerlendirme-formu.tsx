import { YildizSecici } from "@/ui/yildiz";
import { degerlendirmeGonder } from "@/server/yorum-islem";
import type { DegerlendirilebilirSatir } from "@/server/yorum";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";

/**
 * Teslim edilmiş siparişteki ürünleri değerlendirme formu.
 *
 * Her ürün için ayrı bir form: tek büyük form olsaydı bir üründeki hata
 * ötekileri de düşürürdü. Sunucu bileşeni ve düz HTML: JavaScript kapalı
 * tarayıcıda da çalışıyor.
 */
export default function DegerlendirmeFormu({
  numara,
  eposta,
  donus,
  satirlar,
  sonuc,
  mesaj,
}: {
  numara: string;
  eposta: string;
  /** Form gönderilince dönülecek sayfa; boşsa sipariş takibi. */
  donus?: string;
  satirlar: DegerlendirilebilirSatir[];
  sonuc?: string;
  mesaj?: string;
}) {
  if (satirlar.length === 0 && sonuc !== "alindi") return null;

  return (
    <section className="mt-6 rounded-marka border border-cizgi bg-yuzey p-5">
      <h2 className="text-lg">Ürünleri değerlendir</h2>
      <p className="mt-1 text-xs text-metin-3">
        Değerlendirmeler ürün sayfasında adının baş harfiyle yayımlanıyor (&quot;Ayşe
        Y.&quot;). Olumsuz yorumlar da yayımlanıyor — yalnızca hakaret ya da kişisel bilgi
        içeren metinler gizleniyor.
      </p>

      {sonuc === "alindi" && (
        <p className="mt-3 rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Değerlendirmen yayımlandı. Teşekkürler — beden tutup tutmadığını yazman başka
          annelerin işini çok kolaylaştırıyor.
        </p>
      )}
      {sonuc === "hata" && (
        <p className="mt-3 rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          {mesaj || "Değerlendirme kaydedilemedi."}
        </p>
      )}
      {sonuc === "yetki" && (
        <p className="mt-3 rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Sipariş numarası ve e-posta eşleşmedi.
        </p>
      )}

      {satirlar.length === 0 ? (
        <p className="mt-3 text-sm text-metin-2">
          Bu siparişteki bütün ürünleri değerlendirdin.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {satirlar.map((s) => (
            <li key={s.orderItemId} className="rounded-marka border border-cizgi-soluk p-4">
              <form action={degerlendirmeGonder} className="flex flex-col gap-3">
                <input type="hidden" name="numara" value={numara} />
                <input type="hidden" name="eposta" value={eposta} />
                {donus && <input type="hidden" name="nereye" value={donus} />}
                <input type="hidden" name="orderItemId" value={s.orderItemId} />

                <div>
                  <p className="text-sm font-bold">{s.urunAd}</p>
                  <p className="text-xs text-metin-3">
                    {s.beden} · {s.renk}
                  </p>
                </div>

                <YildizSecici ad="puan" />

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-metin-2">Yorumun</span>
                  <textarea
                    name="yorum"
                    rows={3}
                    required
                    minLength={10}
                    maxLength={2000}
                    placeholder="Beden tuttu mu, kumaşı nasıl, yıkamada ne oldu?"
                    className={GIRDI}
                  />
                </label>

                <button
                  type="submit"
                  className="self-start rounded-full bg-mercan px-5 py-2 text-sm font-bold text-white transition hover:brightness-95"
                >
                  Değerlendirmeyi gönder
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
