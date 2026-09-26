"use client";

import { useMemo, useRef, useState } from "react";
import { bedenTablosuKaydet } from "@/server/yonetim";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import { ANA_DUGME, IKINCIL_DUGME } from "@/app/yonetim/panel-bicim";

type Mevcut = { id: string; beden: string; renk: string; stok: number };
type Hucre = { stok: string; barkod: string };

/**
 * Beden × renk tablosu (K-178). Bedenler ve renkler işaretleniyor, tablo
 * doluyor; stok ve barkod aynı yerde, tek "Kaydet".
 *
 * - Var olan birleşimin bedeni ya da rengi buradan kaldırılamıyor: silmek
 *   stoğu da siliyor, altındaki listede onaylı yapılıyor.
 * - Enter bir sonraki hücreye geçiyor (el okuyucu barkodun sonunda Enter
 *   gönderiyor; form yarıda kaydedilmesin).
 * - Depo'dan "yeni ürün" diye gelindiyse okutulan barkod, boş bir barkod
 *   kutusuna ilk tıklanınca oraya yazılıyor.
 */
export default function BedenRenkTablosu({
  slug,
  bedenler,
  renkler,
  mevcut,
  sonUrun,
  bekleyenBarkod,
}: {
  slug: string;
  /** Etkin bedenler, beden sırasıyla. */
  bedenler: string[];
  renkler: { kod: string; ad: string }[];
  mevcut: Mevcut[];
  sonUrun: { ad: string; bedenler: string[]; renkler: string[] } | null;
  bekleyenBarkod?: string;
}) {
  const varOlan = useMemo(() => new Map(mevcut.map((v) => [`${v.beden}|${v.renk}`, v])), [mevcut]);
  const kilitliBeden = useMemo(() => new Set(mevcut.map((v) => v.beden)), [mevcut]);
  const kilitliRenk = useMemo(() => new Set(mevcut.map((v) => v.renk)), [mevcut]);
  // Listede olmayan (kapatılmış) ama üründe kullanılan beden ve renkler de görünsün.
  const tumBedenler = useMemo(
    () => [...bedenler, ...[...kilitliBeden].filter((b) => !bedenler.includes(b))],
    [bedenler, kilitliBeden],
  );
  const tumRenkler = useMemo(
    () => [
      ...renkler,
      ...[...kilitliRenk]
        .filter((k) => !renkler.some((r) => r.kod === k))
        .map((k) => ({ kod: k, ad: k })),
    ],
    [renkler, kilitliRenk],
  );

  const [secBeden, setSecBeden] = useState<Set<string>>(() => new Set(kilitliBeden));
  const [secRenk, setSecRenk] = useState<Set<string>>(() => new Set(kilitliRenk));
  const [degerler, setDegerler] = useState<Record<string, Hucre>>(() =>
    Object.fromEntries(
      mevcut.map((v) => [`${v.beden}|${v.renk}`, { stok: String(v.stok), barkod: "" }]),
    ),
  );
  // Elle değiştirilen var olan hücreler: yalnızca onların stoğu gönderiliyor.
  // Dokunulmayan hücre eski bir sayıyı "düzeltme" diye yazmasın.
  const [dokunulan, setDokunulan] = useState<Set<string>>(() => new Set());
  const [bekleyen, setBekleyen] = useState(bekleyenBarkod ?? "");
  const tablo = useRef<HTMLDivElement>(null);

  const cevir = (kume: Set<string>, setKume: (s: Set<string>) => void, deger: string) => {
    const yeni = new Set(kume);
    if (yeni.has(deger)) yeni.delete(deger);
    else yeni.add(deger);
    setKume(yeni);
  };

  const satirlar = tumBedenler.filter((b) => secBeden.has(b));
  const sutunlar = tumRenkler.filter((r) => secRenk.has(r.kod));
  const deger = (anahtar: string): Hucre => degerler[anahtar] ?? { stok: "", barkod: "" };
  const yaz = (anahtar: string, alan: keyof Hucre, v: string) => {
    if (alan === "stok") setDokunulan((k) => new Set(k).add(anahtar));
    setDegerler((d) => ({
      ...d,
      [anahtar]: { ...(d[anahtar] ?? { stok: "", barkod: "" }), [alan]: v },
    }));
  };

  const hucreler = satirlar.flatMap((b) =>
    sutunlar.map((r) => {
      const anahtar = `${b}|${r.kod}`;
      const v = varOlan.get(anahtar);
      const d = deger(anahtar);
      const stok = d.stok.trim() === "" ? null : Number(d.stok);
      return {
        beden: b,
        renk: r.kod,
        ...(v ? { id: v.id, onceki: v.stok } : {}),
        stok: (!v || dokunulan.has(anahtar)) && Number.isInteger(stok) && stok! >= 0 ? stok : null,
        barkod: d.barkod.trim() || undefined,
      };
    }),
  );
  const yeniSayisi = hucreler.filter((h) => !("id" in h)).length;

  /** Enter: bir sonraki kutuya geç. */
  const sonraki = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const kutular = [
      ...(tablo.current?.querySelectorAll<HTMLInputElement>("input[data-hucre]") ?? []),
    ];
    const i = kutular.indexOf(e.currentTarget);
    kutular[i + 1]?.focus();
  };

  const secimDugmesi = (secili: boolean, kilitli: boolean) =>
    `rounded-full border-[1.5px] px-3 py-1.5 text-xs font-bold transition ${
      secili ? "border-mercan bg-mercan-soluk text-mercan-koyu" : "border-cizgi text-metin-2"
    } ${kilitli ? "cursor-not-allowed opacity-80" : ""}`;

  return (
    <form action={bedenTablosuKaydet} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="tablo" value={JSON.stringify(hucreler)} />

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-metin-2">Bedenler</span>
        <div className="flex flex-wrap gap-1.5">
          {tumBedenler.map((b) => {
            const kilitli = kilitliBeden.has(b);
            return (
              <button
                key={b}
                type="button"
                aria-pressed={secBeden.has(b)}
                title={
                  kilitli ? "Bu bedende stok var; silmek için aşağıdaki listeyi kullan" : undefined
                }
                onClick={() => !kilitli && cevir(secBeden, setSecBeden, b)}
                className={secimDugmesi(secBeden.has(b), kilitli)}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-metin-2">Renkler</span>
        <div className="flex flex-wrap gap-1.5">
          {tumRenkler.map((r) => {
            const kilitli = kilitliRenk.has(r.kod);
            return (
              <button
                key={r.kod}
                type="button"
                aria-pressed={secRenk.has(r.kod)}
                title={
                  kilitli ? "Bu renkte stok var; silmek için aşağıdaki listeyi kullan" : undefined
                }
                onClick={() => !kilitli && cevir(secRenk, setSecRenk, r.kod)}
                className={secimDugmesi(secRenk.has(r.kod), kilitli)}
              >
                {r.ad}
              </button>
            );
          })}
        </div>
      </div>
      {sonUrun && (
        <button
          type="button"
          onClick={() => {
            setSecBeden(new Set([...secBeden, ...sonUrun.bedenler]));
            setSecRenk(new Set([...secRenk, ...sonUrun.renkler]));
          }}
          className={`${IKINCIL_DUGME} self-start`}
        >
          &quot;{sonUrun.ad}&quot; gibi seç
        </button>
      )}

      {bekleyen && (
        <p className="rounded-marka bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
          Depo&apos;da okuttuğun barkod: <b className="rakam">{bekleyen}</b>. Hangi hücreninse onun
          barkod kutusuna tıkla, oraya yazılır.
        </p>
      )}

      {satirlar.length > 0 && sutunlar.length > 0 ? (
        <div ref={tablo} className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="py-1 pr-3 text-left text-xs font-bold text-metin-3">Beden</th>
                {sutunlar.map((r) => (
                  <th key={r.kod} className="px-1.5 py-1 text-left text-xs font-bold text-metin-2">
                    {r.ad}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {satirlar.map((b) => (
                <tr key={b}>
                  <th className="whitespace-nowrap py-1 pr-3 text-left font-semibold">{b}</th>
                  {sutunlar.map((r) => {
                    const anahtar = `${b}|${r.kod}`;
                    const yeni = !varOlan.has(anahtar);
                    const d = deger(anahtar);
                    return (
                      <td key={r.kod} className="px-1.5 py-1 align-top">
                        <span
                          className={`flex w-28 flex-col gap-1 rounded-[10px] p-1 ${
                            yeni ? "border border-dashed border-nane bg-nane-soluk/40" : ""
                          }`}
                        >
                          <input
                            data-hucre
                            value={d.stok}
                            onChange={(e) =>
                              yaz(anahtar, "stok", e.target.value.replace(/\D/g, ""))
                            }
                            onKeyDown={sonraki}
                            inputMode="numeric"
                            placeholder={yeni ? "stok" : ""}
                            aria-label={`${b} ${r.ad} stok`}
                            className="rakam w-full rounded-[8px] border-[1.5px] border-cizgi bg-yuzey px-2 py-1 text-sm outline-none focus:border-mercan"
                          />
                          <input
                            data-hucre
                            value={d.barkod}
                            onChange={(e) => yaz(anahtar, "barkod", e.target.value)}
                            onFocus={() => {
                              if (bekleyen && !d.barkod) {
                                yaz(anahtar, "barkod", bekleyen);
                                setBekleyen("");
                              }
                            }}
                            onKeyDown={sonraki}
                            placeholder="barkod"
                            aria-label={`${b} ${r.ad} barkod`}
                            className="rakam w-full rounded-[8px] border border-cizgi-soluk bg-yuzey px-2 py-0.5 text-xs outline-none focus:border-mercan"
                          />
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-metin-3">Tabloyu görmek için en az bir beden ve bir renk seç.</p>
      )}

      {satirlar.length > 0 && sutunlar.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <GonderDugmesi className={ANA_DUGME} bekleyen="Kaydediliyor…">
            Kaydet
          </GonderDugmesi>
          <span className="text-xs text-metin-3">
            {yeniSayisi > 0 ? `${yeniSayisi} yeni birleşim eklenecek. ` : ""}
            Barkod kutusuna el okuyucuyla okutabilirsin; Enter sonraki kutuya geçer.
          </span>
        </div>
      )}
    </form>
  );
}
