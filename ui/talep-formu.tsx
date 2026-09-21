import { CAYMA_GUN, type TalepDurumBilgisi } from "@/server/talep";
import { talepGonder } from "@/server/talep-islem";
import {
  SEBEPLER,
  TUR_ACIKLAMALARI,
  sebepAdi,
  talepDurumAdi,
  talepDurumRengi,
  turAdi,
  type TalepTuru,
} from "@/ui/talep-bicim";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

function gunYaz(t: Date): string {
  return t.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * İptal / iade / değişim talebi formu ve açılmış taleplerin durumu.
 *
 * Sunucu bileşeni ve düz HTML formu: JavaScript kapalı tarayıcıda da
 * çalışıyor. Hangi türün açılabildiğine sunucu karar veriyor (server/talep.ts);
 * burası yalnızca gösteriyor.
 */
export default function TalepFormu({
  numara,
  eposta,
  bilgi,
  sonuc,
  mesaj,
}: {
  numara: string;
  eposta: string;
  bilgi: TalepDurumBilgisi;
  sonuc?: string;
  mesaj?: string;
}) {
  const secilebilir = bilgi.satirlar.filter((s) => s.kalanAdet > 0);

  return (
    <section className="mt-6 rounded-marka border border-cizgi bg-yuzey p-5">
      <h2 className="text-lg">İptal, iade ve değişim</h2>

      {sonuc === "alindi" && (
        <p className="mt-3 rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Talebin alındı. Bakıp sonucu e-postayla bildireceğiz; durumunu bu sayfadan da
          izleyebilirsin.
        </p>
      )}
      {sonuc === "hata" && (
        <p className="mt-3 rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          {mesaj || "Talep açılamadı."}
        </p>
      )}
      {sonuc === "yetki" && (
        <p className="mt-3 rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Sipariş numarası ve e-posta eşleşmedi.
        </p>
      )}

      {bilgi.talepler.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {bilgi.talepler.map((t) => (
            <li key={t.id} className="rounded-marka border border-cizgi-soluk p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">{turAdi(t.tur)}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${talepDurumRengi(t.durum)}`}
                >
                  {talepDurumAdi(t.durum)}
                </span>
              </div>
              <p className="mt-1 text-xs text-metin-3">
                {gunYaz(t.olusturuldu)} · {sebepAdi(t.sebep)}
              </p>
              <ul className="mt-2 text-sm text-metin-2">
                {t.satirlar.map((s, i) => (
                  <li key={i}>
                    · {s.urunAd} — {s.beden}, {s.renk} ({s.adet} adet)
                  </li>
                ))}
              </ul>
              {t.cevap && (
                <p className="mt-2 rounded-marka bg-zemin-2 px-3 py-2 text-sm text-metin-2">
                  {t.cevap}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {bilgi.turler.length === 0 ? (
        <p className="mt-4 text-sm text-metin-2">
          {bilgi.engel ?? "Bu sipariş için şu an talep açılamıyor."}
        </p>
      ) : (
        <form action={talepGonder} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="numara" value={numara} />
          <input type="hidden" name="eposta" value={eposta} />

          {bilgi.sonGun && (
            <p className="text-xs text-metin-3">
              Cayma hakkın teslim tarihinden itibaren {CAYMA_GUN} gün: son gün{" "}
              <span className="font-bold">{gunYaz(bilgi.sonGun)}</span>. Gerekçe göstermek
              zorunda değilsin.
            </p>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className={ETIKET}>Ne yapmak istiyorsun?</legend>
            {bilgi.turler.map((t: TalepTuru, i) => (
              <label key={t} className="flex items-start gap-2.5">
                <input
                  type="radio"
                  name="tur"
                  value={t}
                  required
                  defaultChecked={i === 0}
                  className="mt-1 h-4 w-4 flex-none accent-[var(--mercan)]"
                />
                <span className="text-sm">
                  <span className="font-bold">{turAdi(t)}</span>
                  <span className="block text-xs text-metin-3">{TUR_ACIKLAMALARI[t]}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {/* Ürün seçimi yalnızca iade ve değişimde anlamlı: iptal bütün
              siparişi kapsıyor, parça parça iptal diye bir şey yok. */}
          {bilgi.turler.some((t) => t !== "iptal") && (
            <fieldset className="flex flex-col gap-2">
              <legend className={ETIKET}>Hangi ürünler?</legend>
              <p className="text-xs text-metin-3">
                Siparişin tamamını değil, tek bir ürünü de iade edebilirsin.
              </p>
              {secilebilir.map((s) => (
                <label key={s.orderItemId} className="flex flex-wrap items-center gap-2 text-sm">
                  <input
                    type="number"
                    name={`satir-${s.orderItemId}`}
                    min={0}
                    max={s.kalanAdet}
                    defaultValue={s.kalanAdet}
                    className={`${GIRDI} rakam w-20`}
                    aria-label={`${s.urunAd} ${s.beden} ${s.renk} adedi`}
                  />
                  <span>
                    {s.urunAd}
                    <span className="block text-xs text-metin-3">
                      {s.beden} · {s.renk} · en çok {s.kalanAdet} adet
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Sebep</span>
            <select name="sebep" defaultValue="belirtmiyorum" className={GIRDI}>
              {SEBEPLER.filter((s) =>
                bilgi.turler.some((t) => (s.turler as readonly string[]).includes(t)),
              ).map((s) => (
                <option key={s.kod} value={s.kod}>
                  {s.ad}
                </option>
              ))}
            </select>
            <span className="text-xs text-metin-3">
              Zorunlu değil — kalıpları düzeltmemize yardımcı oluyor.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Eklemek istediğin bir şey var mı?</span>
            <textarea
              name="aciklama"
              rows={3}
              maxLength={1000}
              placeholder="İstersen yaz; boş bırakabilirsin."
              className={GIRDI}
            />
          </label>

          <button
            type="submit"
            className="self-start rounded-full bg-mercan px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
          >
            Talebi gönder
          </button>
        </form>
      )}
    </section>
  );
}
