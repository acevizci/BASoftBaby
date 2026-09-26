"use client";

import { useState } from "react";
import Link from "next/link";
import {
  tedarikciTelefonKaydet,
  tedarikSiparisiKaydet,
  urunTedarikcisiAta,
} from "@/server/tedarik-islem";
import type { TedarikGrubu } from "@/server/tedarik";
import { siparisMesaji, telefonYaz, whatsappBaglantisi } from "@/ui/tedarik-bicim";
import { ANA_DUGME, GIRDI, IKINCIL_DUGME } from "@/app/yonetim/panel-bicim";

/**
 * Bir tedarikçinin sipariş kartı (K-179): öneriyle dolu adetler, hazır
 * mesaj, "WhatsApp'ta aç" ve "Metni kopyala". İkisi de gönderimi kaydediyor;
 * aynı ürün iki kez istenmesin diye satırda "son 7 günde istendi" yazıyor.
 */
export default function TedarikKarti({
  grup,
  magaza,
  tedarikciler,
}: {
  grup: TedarikGrubu;
  magaza: string;
  /** Datalist için bilinen tedarikçi adları. */
  tedarikciler: string[];
}) {
  const [adetler, setAdetler] = useState<Record<string, string>>(() =>
    Object.fromEntries(grup.satirlar.map((s) => [s.variantId, String(s.adet)])),
  );
  const [dahil, setDahil] = useState<Set<string>>(
    () => new Set(grup.satirlar.map((s) => s.variantId)),
  );
  const [elleMetin, setElleMetin] = useState<string | null>(null);
  const [durum, setDurum] = useState<string>("");
  const [telefonAcik, setTelefonAcik] = useState(false);
  const [telefonHata, setTelefonHata] = useState("");

  const secilen = grup.satirlar
    .filter((s) => dahil.has(s.variantId))
    .map((s) => ({ ...s, adet: Math.max(0, Number(adetler[s.variantId]) || 0) }))
    .filter((s) => s.adet > 0);
  const otomatik = siparisMesaji(magaza, secilen);
  const metin = elleMetin ?? otomatik;
  const toplam = secilen.reduce((t, s) => t + s.adet, 0);

  const kaydet = async () => {
    await tedarikSiparisiKaydet({
      supplierId: grup.tedarikci?.id ?? null,
      satirlar: secilen.map((s) => ({ variantId: s.variantId, adet: s.adet })),
      metin,
    }).catch(() => undefined);
  };

  // Ürünler: satırlar ürün başlığıyla gruplu gösteriliyor.
  const urunler = [...new Map(grup.satirlar.map((s) => [s.productId, s])).values()];

  return (
    <section className="flex flex-col gap-4 rounded-marka border border-cizgi bg-yuzey p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">{grup.tedarikci?.ad ?? "Tedarikçisi yok"}</h2>
        {grup.tedarikci && (
          <span className="text-xs text-metin-3">
            {grup.tedarikci.telefon ? (
              <span className="rakam">{telefonYaz(grup.tedarikci.telefon)}</span>
            ) : (
              "Telefon yok"
            )}{" "}
            ·{" "}
            <button
              type="button"
              onClick={() => setTelefonAcik(!telefonAcik)}
              className="font-bold text-mavi-koyu hover:underline"
            >
              {grup.tedarikci.telefon ? "değiştir" : "telefon ekle"}
            </button>
            {grup.sonGonderim && (
              <>
                {" "}
                · son mesaj{" "}
                {grup.sonGonderim.toLocaleString("tr-TR", {
                  timeZone: "Europe/Istanbul",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            )}
          </span>
        )}
      </div>

      {grup.tedarikci && telefonAcik && (
        <form
          action={async (f) => {
            const r = await tedarikciTelefonKaydet(f);
            if (r.tamam) setTelefonAcik(false);
            setTelefonHata(r.hata ?? "");
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="id" value={grup.tedarikci.id} />
          <input
            name="telefon"
            defaultValue={grup.tedarikci.telefon ? `+${grup.tedarikci.telefon}` : ""}
            placeholder="0532 123 45 67"
            inputMode="tel"
            aria-label="Tedarikçi telefonu"
            className={`${GIRDI} w-52`}
          />
          <button type="submit" className={IKINCIL_DUGME}>
            Kaydet
          </button>
          {telefonHata && <span className="text-xs text-mercan-koyu">{telefonHata}</span>}
        </form>
      )}

      <div className="flex flex-col gap-3">
        {urunler.map((u) => (
          <div key={u.productId} className="rounded-[10px] border border-cizgi-soluk p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link
                href={`/yonetim/urunler/${u.slug}`}
                className="font-semibold hover:text-mercan-koyu"
              >
                {u.urunAd}
                {u.tedarikciKodu && (
                  <span className="rakam ml-1 text-xs font-normal text-metin-3">
                    (Kod {u.tedarikciKodu})
                  </span>
                )}
              </Link>
              {/* Tedarikçi ve kodu: tedarikçisizde atamak, ötekinde kodu yazmak için. */}
              <form action={urunTedarikcisiAta} className="flex flex-wrap items-center gap-1.5">
                <input type="hidden" name="productId" value={u.productId} />
                {!grup.tedarikci && (
                  <input
                    name="tedarikci"
                    list="tedarikciler"
                    placeholder="Tedarikçi adı"
                    aria-label={`${u.urunAd} tedarikçisi`}
                    className={`${GIRDI} w-40 py-1 text-xs`}
                  />
                )}
                <input
                  name="kod"
                  defaultValue={u.tedarikciKodu ?? ""}
                  placeholder="model kodu"
                  aria-label={`${u.urunAd} tedarikçi kodu`}
                  className={`${GIRDI} w-28 py-1 text-xs`}
                />
                <button type="submit" className="text-xs font-bold text-mavi-koyu hover:underline">
                  kaydet
                </button>
              </form>
            </div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {grup.satirlar
                .filter((s) => s.productId === u.productId)
                .sort(
                  (a, b) => a.renkAdi.localeCompare(b.renkAdi, "tr") || a.bedenSira - b.bedenSira,
                )
                .map((s) => (
                  <li
                    key={s.variantId}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                  >
                    <label className="flex min-w-40 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={dahil.has(s.variantId)}
                        onChange={() => {
                          const y = new Set(dahil);
                          if (y.has(s.variantId)) y.delete(s.variantId);
                          else y.add(s.variantId);
                          setDahil(y);
                          setElleMetin(null);
                        }}
                        className="h-4 w-4 accent-[var(--mercan)]"
                      />
                      {s.renkAdi} · {s.beden}
                    </label>
                    <span
                      className={`rakam text-xs ${s.stok === 0 ? "font-bold text-mercan-koyu" : "text-metin-3"}`}
                    >
                      {s.stok === 0 ? "tükendi" : `stok ${s.stok} · ${s.sure}`}
                      {s.bekleyen > 0 && ` · ${s.bekleyen} kişi bekliyor`}
                    </span>
                    {s.istenen > 0 && (
                      <span className="rakam rounded-full bg-sari-soluk px-2 py-0.5 text-xs font-bold text-sari-koyu">
                        son 7 günde istendi: {s.istenen}
                      </span>
                    )}
                    <input
                      value={adetler[s.variantId] ?? ""}
                      onChange={(e) => {
                        setAdetler({
                          ...adetler,
                          [s.variantId]: e.target.value.replace(/\D/g, ""),
                        });
                        setElleMetin(null);
                      }}
                      inputMode="numeric"
                      aria-label={`${s.urunAd} ${s.renkAdi} ${s.beden} adet`}
                      className={`${GIRDI} rakam ml-auto w-16 py-1 text-center`}
                    />
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-metin-2">
          Mesaj — düzenleyebilirsin{" "}
          {elleMetin !== null && (
            <button
              type="button"
              onClick={() => setElleMetin(null)}
              className="ml-1 font-bold text-mavi-koyu hover:underline"
            >
              yeniden oluştur
            </button>
          )}
        </span>
        <textarea
          value={metin}
          onChange={(e) => setElleMetin(e.target.value)}
          rows={Math.min(14, metin.split("\n").length + 1)}
          className={`${GIRDI} rakam font-mono text-xs`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        {grup.tedarikci?.telefon ? (
          <a
            href={toplam > 0 ? whatsappBaglantisi(grup.tedarikci.telefon, metin) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={toplam === 0}
            onClick={async () => {
              if (toplam === 0) return;
              await kaydet();
              setDurum("WhatsApp açıldı; sipariş kaydedildi.");
            }}
            className={`${ANA_DUGME} ${toplam === 0 ? "pointer-events-none opacity-50" : ""}`}
          >
            WhatsApp&apos;ta aç
          </a>
        ) : grup.tedarikci ? (
          <span className="text-xs text-metin-3">WhatsApp için tedarikçiye telefon ekle.</span>
        ) : null}
        <button
          type="button"
          disabled={toplam === 0}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(metin);
              await kaydet();
              setDurum("Mesaj kopyalandı; sipariş kaydedildi.");
            } catch {
              setDurum("Kopyalanamadı; mesajı elle seçip kopyala.");
            }
          }}
          className={`${IKINCIL_DUGME} disabled:opacity-50`}
        >
          Metni kopyala
        </button>
        <span className="rakam text-sm text-metin-2">{toplam} adet</span>
        {durum && <span className="text-xs font-bold text-nane-koyu">{durum}</span>}
      </div>
      <datalist id="tedarikciler">
        {tedarikciler.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </section>
  );
}
