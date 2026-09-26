"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { kampanyaKaydet } from "@/server/yonetim";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import {
  ADIMLAR,
  adimHatasi,
  adOnerisi,
  durumaCevir,
  indirimCumlesi,
  kampanyaOzeti,
  taslagaCevir,
  tarihGirdisi,
  TUR_BILGILERI,
  type KampanyaTaslagi,
  type KampanyaTuru,
  type SihirbazDurumu,
} from "@/ui/kampanya-bicim";
import {
  ANA_DUGME,
  ETIKET,
  GIRDI,
  HATA_KUTUSU,
  IKINCIL_DUGME,
  KART,
} from "@/app/yonetim/panel-bicim";

type Secenek = { id: string; ad: string };

const SECIM = "h-4 w-4 accent-[var(--mercan)]";

/**
 * Kampanya sihirbazı (K-172): altı adımda bir kampanya. Kutular yalnızca
 * görüntü; gönderilen değerler formun sonundaki gizli alanlardan çıkıyor,
 * böylece gizli adımdaki bir kutu gönderimi engellemiyor. Sunucu
 * (`kampanyaKaydet`) her şeyi yeniden sınıyor.
 */
export default function KampanyaSihirbazi({
  id,
  baslangic,
  kategoriler,
  urunler,
}: {
  /** Düzenlenen kampanya; yoksa yeni. */
  id?: string;
  baslangic: KampanyaTaslagi;
  kategoriler: Secenek[];
  urunler: Secenek[];
}) {
  const [d, setD] = useState<SihirbazDurumu>(() => durumaCevir(baslangic));
  const [adim, setAdim] = useState(id ? 5 : 0);
  const [hata, setHata] = useState<string | null>(null);
  const [ara, setAra] = useState("");

  const degis = <K extends keyof SihirbazDurumu>(alan: K, deger: SihirbazDurumu[K]) => {
    setD((o) => ({ ...o, [alan]: deger }));
    setHata(null);
  };

  const taslak = useMemo(() => taslagaCevir(d), [d]);
  const adlar = useMemo(
    () => ({
      kategori: new Map(kategoriler.map((k) => [k.id, k.ad])),
      urun: new Map(urunler.map((u) => [u.id, u.ad])),
    }),
    [kategoriler, urunler],
  );

  /** İlk hatalı adım; hepsi geçerliyse `null`. */
  const ilkHatali = (son: number) => {
    for (let i = 0; i <= son; i++) {
      const h = adimHatasi(d, i);
      if (h) return { i, h };
    }
    return null;
  };

  const git = (hedef: number) => {
    if (hedef <= adim) {
      setAdim(hedef);
      setHata(null);
      return;
    }
    const sorun = ilkHatali(hedef - 1);
    if (sorun) {
      setAdim(sorun.i);
      setHata(sorun.h);
      return;
    }
    if (hedef === 5 && !d.ad.trim()) setD((o) => ({ ...o, ad: adOnerisi(taslagaCevir(o)) }));
    setAdim(hedef);
    setHata(null);
  };

  const sureVer = (saat: number) => {
    const simdi = new Date();
    setD((o) => ({
      ...o,
      zaman: "aralik",
      baslangic: tarihGirdisi(simdi.toISOString()),
      bitis: tarihGirdisi(new Date(simdi.getTime() + saat * 3_600_000).toISOString()),
    }));
    setHata(null);
  };

  const aranan = ara.trim().toLocaleLowerCase("tr");
  const gorunenUrunler = aranan
    ? urunler.filter((u) => u.ad.toLocaleLowerCase("tr").includes(aranan))
    : urunler;
  const secimCevir = (alan: "kategoriIdleri" | "urunIdleri", deger: string) =>
    degis(alan, d[alan].includes(deger) ? d[alan].filter((x) => x !== deger) : [...d[alan], deger]);

  const yuzdeli = d.tip === "yuzde" || d.tip === "nci-urun";

  return (
    <form
      action={kampanyaKaydet}
      onSubmit={(e) => {
        const sorun = ilkHatali(5);
        if (sorun) {
          e.preventDefault();
          setAdim(sorun.i);
          setHata(sorun.h);
        }
      }}
      onKeyDown={(e) => {
        // Enter bir sonraki adıma geçiyor; yarım kampanya kaydedilmesin.
        const hedef = e.target as HTMLElement;
        if (e.key === "Enter" && adim < 5 && hedef.tagName === "INPUT") {
          e.preventDefault();
          git(adim + 1);
        }
      }}
      className="flex flex-col gap-5"
    >
      <ol className="flex flex-wrap gap-2 text-xs font-bold">
        {ADIMLAR.map((ad, i) => (
          <li key={ad}>
            <button
              type="button"
              onClick={() => git(i)}
              aria-current={i === adim ? "step" : undefined}
              className={`rounded-full px-3 py-1.5 transition ${
                i === adim
                  ? "bg-dugme text-dugme-yazi"
                  : i < adim
                    ? "bg-nane-soluk text-nane-koyu"
                    : "border border-cizgi text-metin-3"
              }`}
            >
              {i + 1}. {ad}
            </button>
          </li>
        ))}
      </ol>

      <section className={KART}>
        {adim === 0 && (
          <Adim baslik="Nasıl bir kampanya?" alt="Türü seç; ayrıntıları sonraki adımda yazacaksın.">
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(TUR_BILGILERI) as KampanyaTuru[]).map((tur) => (
                <label
                  key={tur}
                  className={`flex cursor-pointer gap-3 rounded-marka border-[1.5px] p-4 transition ${
                    d.tip === tur ? "border-mercan bg-mercan-soluk/40" : "border-cizgi"
                  }`}
                >
                  <input
                    type="radio"
                    checked={d.tip === tur}
                    onChange={() => degis("tip", tur)}
                    className={`${SECIM} mt-0.5`}
                  />
                  <span className="flex flex-col gap-1">
                    <span className="font-bold">{TUR_BILGILERI[tur].ad}</span>
                    <span className="text-xs font-semibold text-mercan-koyu">
                      Ör. {TUR_BILGILERI[tur].ornek}
                    </span>
                    <span className="text-xs text-metin-2">{TUR_BILGILERI[tur].aciklama}</span>
                  </span>
                </label>
              ))}
            </div>
          </Adim>
        )}

        {adim === 1 && (
          <Adim
            baslik={`${TUR_BILGILERI[d.tip].ad}: ne kadar?`}
            alt={TUR_BILGILERI[d.tip].aciklama}
          >
            <div className="flex flex-col gap-4">
              {d.tip === "al-ode" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Sayi deger={d.alAdet} degis={(v) => degis("alAdet", v)} etiket="Alınan adet" />
                  <span className="font-bold">al</span>
                  <Sayi deger={d.odeAdet} degis={(v) => degis("odeAdet", v)} etiket="Ödenen adet" />
                  <span className="font-bold">öde</span>
                  <p className="w-full text-xs text-metin-3">
                    Her {d.alAdet || "X"} üründe en ucuz{" "}
                    {Number(d.alAdet) - Number(d.odeAdet) > 0
                      ? Number(d.alAdet) - Number(d.odeAdet)
                      : "?"}{" "}
                    tanesi bedava. 5 ürün alan 3 al 2 öde&apos;de 1, 6 ürün alan 2 ürün bedava alır.
                  </p>
                </div>
              )}

              {d.tip === "nci-urun" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Sayi deger={d.nciN} degis={(v) => degis("nciN", v)} etiket="Kaçıncı ürün" />
                  <span className="font-bold">. ürüne %</span>
                  <Sayi deger={d.yuzde} degis={(v) => degis("yuzde", v)} etiket="Yüzde" />
                  <span className="font-bold">indirim</span>
                </div>
              )}

              {d.tip === "yuzde" && (
                <label className="flex flex-col gap-1.5">
                  <span className={ETIKET}>İndirim yüzdesi</span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold">%</span>
                    <Sayi deger={d.yuzde} degis={(v) => degis("yuzde", v)} etiket="Yüzde" />
                  </span>
                </label>
              )}

              {d.tip === "tutar" && (
                <label className="flex flex-col gap-1.5">
                  <span className={ETIKET}>İndirim tutarı (₺)</span>
                  <input
                    value={d.tutar}
                    onChange={(e) => degis("tutar", e.target.value)}
                    inputMode="decimal"
                    placeholder="100"
                    className={`${GIRDI} rakam w-40`}
                  />
                  <span className="text-xs text-metin-3">
                    Bir sonraki adımlarda bir alt sınır koyman iyi olur (ör. 750 ₺ üzeri).
                  </span>
                </label>
              )}

              {d.tip === "kademeli" && (
                <div className="flex flex-col gap-2">
                  <span className={ETIKET}>
                    Basamaklar — sepet bu tutarı geçince bu kadar indirim
                  </span>
                  {d.kademeler.map((k, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                      <input
                        value={k.esik}
                        onChange={(e) =>
                          degis(
                            "kademeler",
                            d.kademeler.map((x, j) =>
                              j === i ? { ...x, esik: e.target.value } : x,
                            ),
                          )
                        }
                        inputMode="decimal"
                        placeholder={i === 0 ? "500" : "1.000"}
                        aria-label={`${i + 1}. basamak sepet tutarı`}
                        className={`${GIRDI} rakam w-28`}
                      />
                      <span>₺ ve üzerine</span>
                      <input
                        value={k.indirim}
                        onChange={(e) =>
                          degis(
                            "kademeler",
                            d.kademeler.map((x, j) =>
                              j === i ? { ...x, indirim: e.target.value } : x,
                            ),
                          )
                        }
                        inputMode="decimal"
                        placeholder={i === 0 ? "50" : "150"}
                        aria-label={`${i + 1}. basamak indirimi`}
                        className={`${GIRDI} rakam w-28`}
                      />
                      <span>₺ indirim</span>
                      {d.kademeler.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            degis(
                              "kademeler",
                              d.kademeler.filter((_, j) => j !== i),
                            )
                          }
                          className="text-xs font-bold text-mercan-koyu hover:underline"
                        >
                          Kaldır
                        </button>
                      )}
                    </div>
                  ))}
                  {d.kademeler.length < 10 && (
                    <button
                      type="button"
                      onClick={() =>
                        degis("kademeler", [...d.kademeler, { esik: "", indirim: "" }])
                      }
                      className={`${IKINCIL_DUGME} self-start`}
                    >
                      + Basamak ekle
                    </button>
                  )}
                </div>
              )}

              {d.tip === "kargo" && (
                <p className="text-sm text-metin-2">
                  Bu türde tutar yok: kargo ücreti alınmaz. Kupon kodu ve sepet alt sınırını sonraki
                  adımlarda seçeceksin.
                </p>
              )}

              {yuzdeli && (
                <label className="flex flex-col gap-1.5">
                  <span className={ETIKET}>İndirim tavanı (₺) — isteğe bağlı</span>
                  <input
                    value={d.tavan}
                    onChange={(e) => degis("tavan", e.target.value)}
                    inputMode="decimal"
                    placeholder="boş: sınırsız"
                    className={`${GIRDI} rakam w-40`}
                  />
                  <span className="text-xs text-metin-3">
                    Ör. %20 ama en çok 200 ₺: büyük sepetlerde indirim bu tutarı geçmez.
                  </span>
                </label>
              )}
            </div>
          </Adim>
        )}

        {adim === 2 && (
          <Adim baslik="Hangi ürünlerde?" alt="Kampanya yalnızca seçtiğin ürünlere uygulanır.">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["tumu", "Bütün ürünler"],
                    ["kategori", "Seçili kategoriler"],
                    ["urun", "Seçili ürünler"],
                  ] as const
                ).map(([deger, ad]) => (
                  <label
                    key={deger}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold ${
                      d.kapsam === deger ? "border-mercan" : "border-cizgi"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={d.kapsam === deger}
                      onChange={() => degis("kapsam", deger)}
                      className={SECIM}
                    />
                    {ad}
                  </label>
                ))}
              </div>

              {d.kapsam === "kategori" && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-[10px] border-[1.5px] border-cizgi p-3">
                  {kategoriler.map((k) => (
                    <label key={k.id} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={d.kategoriIdleri.includes(k.id)}
                        onChange={() => secimCevir("kategoriIdleri", k.id)}
                        className={SECIM}
                      />
                      {k.ad}
                    </label>
                  ))}
                </div>
              )}

              {d.kapsam === "urun" && (
                <div className="flex flex-col gap-2">
                  <input
                    value={ara}
                    onChange={(e) => setAra(e.target.value)}
                    placeholder="Ürün ara"
                    aria-label="Ürün ara"
                    className={`${GIRDI} sm:w-80`}
                  />
                  <p className="text-xs text-metin-3">
                    {d.urunIdleri.length} ürün seçili
                    {d.urunIdleri.length > 0 && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          onClick={() => degis("urunIdleri", [])}
                          className="font-bold text-mercan-koyu hover:underline"
                        >
                          seçimi temizle
                        </button>
                      </>
                    )}
                  </p>
                  <div className="grid max-h-72 gap-1.5 overflow-y-auto rounded-[10px] border-[1.5px] border-cizgi p-3 sm:grid-cols-2">
                    {gorunenUrunler.length === 0 && (
                      <p className="text-sm text-metin-3">Aramaya uyan ürün yok.</p>
                    )}
                    {gorunenUrunler.map((u) => (
                      <label key={u.id} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={d.urunIdleri.includes(u.id)}
                          onChange={() => secimCevir("urunIdleri", u.id)}
                          className={SECIM}
                        />
                        {u.ad}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Adim>
        )}

        {adim === 3 && (
          <Adim baslik="Kimlere, nasıl?" alt="Kod, alt sınır ve kullanım kuralları.">
            <div className="flex flex-col gap-5">
              <Secim
                baslik="Nasıl uygulansın?"
                deger={d.kuponVar ? "kupon" : "otomatik"}
                degis={(v) => degis("kuponVar", v === "kupon")}
                secenekler={[
                  ["otomatik", "Kendiliğinden (şart tutunca)"],
                  ["kupon", "Kupon koduyla"],
                ]}
              />
              {d.kuponVar && (
                <label className="flex flex-col gap-1.5">
                  <span className={ETIKET}>Kupon kodu — müşteri sepette yazar</span>
                  <input
                    value={d.kuponKodu}
                    onChange={(e) => degis("kuponKodu", e.target.value.toUpperCase())}
                    placeholder="HOSGELDIN10"
                    className={`${GIRDI} rakam w-60 uppercase`}
                  />
                </label>
              )}

              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>En az sepet tutarı (₺) — isteğe bağlı</span>
                <input
                  value={d.enAzSepet}
                  onChange={(e) => degis("enAzSepet", e.target.value)}
                  inputMode="decimal"
                  placeholder="boş: alt sınır yok"
                  className={`${GIRDI} rakam w-40`}
                />
              </label>

              <Secim
                baslik="Kimler kullanabilir?"
                deger={d.uyelik}
                degis={(v) => degis("uyelik", v as SihirbazDurumu["uyelik"])}
                secenekler={[
                  ["herkes", "Herkes"],
                  ["uye", "Yalnızca üyeler"],
                  ["ilk", "Üyenin ilk siparişi"],
                ]}
              />
              {d.uyelik !== "herkes" && (
                <p className="-mt-3 text-xs text-metin-3">
                  Üyelere özel kampanya yalnızca giriş yapmış müşteriye uygulanır ve ürün
                  kartlarında indirimli fiyat olarak görünmez.
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {d.uyelik !== "herkes" && (
                  <label className="flex flex-col gap-1.5">
                    <span className={ETIKET}>Bir üye en çok kaç kez — isteğe bağlı</span>
                    <input
                      value={d.kisiBasiSinir}
                      onChange={(e) => degis("kisiBasiSinir", e.target.value)}
                      inputMode="numeric"
                      placeholder="boş: sınırsız"
                      className={`${GIRDI} rakam w-40`}
                    />
                  </label>
                )}
                <label className="flex flex-col gap-1.5">
                  <span className={ETIKET}>Toplam kaç siparişte — isteğe bağlı</span>
                  <input
                    value={d.enFazlaKullanim}
                    onChange={(e) => degis("enFazlaKullanim", e.target.value)}
                    inputMode="numeric"
                    placeholder="boş: sınırsız"
                    className={`${GIRDI} rakam w-40`}
                  />
                </label>
              </div>
            </div>
          </Adim>
        )}

        {adim === 4 && (
          <Adim baslik="Ne zaman?" alt="Tarih saati İstanbul saatiyle.">
            <div className="flex flex-col gap-4">
              <Secim
                baslik="Süre"
                deger={d.zaman}
                degis={(v) => degis("zaman", v as SihirbazDurumu["zaman"])}
                secenekler={[
                  ["hemen", "Hemen başlasın, ben kapatana kadar"],
                  ["aralik", "Belli tarihler arasında"],
                ]}
              />
              <div className="flex flex-wrap gap-2">
                <span className={`${ETIKET} self-center`}>Şimdiden itibaren:</span>
                {(
                  [
                    [24, "24 saat"],
                    [72, "3 gün"],
                    [168, "1 hafta"],
                    [720, "30 gün"],
                  ] as const
                ).map(([saat, ad]) => (
                  <button
                    key={saat}
                    type="button"
                    onClick={() => sureVer(saat)}
                    className={IKINCIL_DUGME}
                  >
                    {ad}
                  </button>
                ))}
              </div>
              {d.zaman === "aralik" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={ETIKET}>Başlangıç</span>
                    <input
                      type="datetime-local"
                      value={d.baslangic}
                      onChange={(e) => degis("baslangic", e.target.value)}
                      className={GIRDI}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={ETIKET}>Bitiş</span>
                    <input
                      type="datetime-local"
                      value={d.bitis}
                      onChange={(e) => degis("bitis", e.target.value)}
                      className={GIRDI}
                    />
                  </label>
                </div>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={d.aktif}
                  onChange={(e) => degis("aktif", e.target.checked)}
                  className={SECIM}
                />
                <span className="text-sm font-semibold">
                  Kaydedince yayına al (kapalı kaydedip sonra listeden açabilirsin)
                </span>
              </label>
            </div>
          </Adim>
        )}

        {adim === 5 && (
          <Adim baslik="Özet" alt="Kontrol et; bir şeyi değiştirmek için üstteki adıma tıkla.">
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>Kampanya adı — müşteri sepette bunu görür</span>
                <span className="flex flex-wrap items-center gap-2">
                  <input
                    value={d.ad}
                    onChange={(e) => degis("ad", e.target.value)}
                    maxLength={80}
                    className={`${GIRDI} sm:w-96`}
                  />
                  {d.ad.trim() !== adOnerisi(taslak) && (
                    <button
                      type="button"
                      onClick={() => degis("ad", adOnerisi(taslak))}
                      className={IKINCIL_DUGME}
                    >
                      Öneri: {adOnerisi(taslak)}
                    </button>
                  )}
                </span>
              </label>
              <div className="rounded-marka bg-yuzey-sicak p-4">
                <p className="text-lg font-bold">{indirimCumlesi(taslak)}</p>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-metin-2">
                  {kampanyaOzeti(taslak, adlar).map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm font-semibold">
                  {d.aktif ? "Kaydedince yayına girer." : "Kapalı kaydedilir; listeden açarsın."}
                </p>
              </div>
            </div>
          </Adim>
        )}

        {hata && <p className={`${HATA_KUTUSU} mt-4`}>{hata}</p>}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {adim > 0 && (
          <button type="button" onClick={() => git(adim - 1)} className={IKINCIL_DUGME}>
            ← Geri
          </button>
        )}
        {adim < 5 ? (
          <button type="button" onClick={() => git(adim + 1)} className={ANA_DUGME}>
            İleri →
          </button>
        ) : (
          <GonderDugmesi className={ANA_DUGME} bekleyen="Kaydediliyor…">
            {id ? "Değişiklikleri kaydet" : "Kampanyayı oluştur"}
          </GonderDugmesi>
        )}
        <Link
          href="/yonetim/kampanyalar"
          className="text-sm font-semibold text-metin-3 hover:underline"
        >
          Vazgeç
        </Link>
      </div>

      {/* Gönderilen değerler (`kampanyaKaydet`in okuduğu adlar). */}
      {id && <input type="hidden" name="id" value={id} />}
      <input
        type="hidden"
        name="donus"
        value={id ? `/yonetim/kampanyalar/duzenle/${id}` : "/yonetim/kampanyalar/yeni"}
      />
      <input type="hidden" name="ad" value={d.ad.trim()} />
      <input type="hidden" name="tip" value={d.tip} />
      <input
        type="hidden"
        name="deger"
        value={yuzdeli ? d.yuzde : d.tip === "tutar" ? d.tutar : ""}
      />
      {d.tip === "nci-urun" && <input type="hidden" name="nciN" value={d.nciN} />}
      {yuzdeli && <input type="hidden" name="tavan" value={d.tavan} />}
      {d.tip === "al-ode" && (
        <>
          <input type="hidden" name="alAdet" value={d.alAdet} />
          <input type="hidden" name="odeAdet" value={d.odeAdet} />
        </>
      )}
      {d.tip === "kademeli" && (
        <input
          type="hidden"
          name="kademeler"
          value={d.kademeler
            .filter((k) => k.esik.trim() || k.indirim.trim())
            .map((k) => `${k.esik.trim()} = ${k.indirim.trim()}`)
            .join("\n")}
        />
      )}
      <input type="hidden" name="kapsam" value={d.kapsam} />
      {d.kapsam === "kategori" &&
        d.kategoriIdleri.map((k) => (
          <input key={k} type="hidden" name="kategoriIdleri" value={k} />
        ))}
      {d.kapsam === "urun" &&
        d.urunIdleri.map((u) => <input key={u} type="hidden" name="urunIdleri" value={u} />)}
      {d.kuponVar && <input type="hidden" name="kuponKodu" value={d.kuponKodu.trim()} />}
      <input type="hidden" name="enAzSepet" value={d.enAzSepet} />
      {d.uyelik !== "herkes" && <input type="hidden" name="uyelereOzel" value="on" />}
      {d.uyelik === "ilk" && <input type="hidden" name="ilkSiparis" value="on" />}
      {d.uyelik !== "herkes" && (
        <input type="hidden" name="kisiBasiSinir" value={d.kisiBasiSinir} />
      )}
      <input type="hidden" name="enFazlaKullanim" value={d.enFazlaKullanim} />
      {d.zaman === "aralik" && (
        <>
          <input type="hidden" name="baslangic" value={d.baslangic} />
          <input type="hidden" name="bitis" value={d.bitis} />
        </>
      )}
      {d.aktif && <input type="hidden" name="aktif" value="on" />}
    </form>
  );
}

function Adim({
  baslik,
  alt,
  children,
}: {
  baslik: string;
  alt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg">{baslik}</h2>
        <p className="mt-1 text-sm text-metin-2">{alt}</p>
      </div>
      {children}
    </div>
  );
}

function Sayi({
  deger,
  degis,
  etiket,
}: {
  deger: string;
  degis: (v: string) => void;
  etiket: string;
}) {
  return (
    <input
      value={deger}
      onChange={(e) => degis(e.target.value)}
      inputMode="numeric"
      aria-label={etiket}
      className={`${GIRDI} rakam w-20`}
    />
  );
}

function Secim({
  baslik,
  deger,
  degis,
  secenekler,
}: {
  baslik: string;
  deger: string;
  degis: (v: string) => void;
  secenekler: readonly (readonly [string, string])[];
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={ETIKET}>{baslik}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {secenekler.map(([d, ad]) => (
          <label
            key={d}
            className={`flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold ${
              deger === d ? "border-mercan" : "border-cizgi"
            }`}
          >
            <input type="radio" checked={deger === d} onChange={() => degis(d)} className={SECIM} />
            {ad}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
