"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  depoBarkodCoz,
  depoBarkodOgret,
  depoBedenGetir,
  depoListeKaydet,
  depoSayimBaslat,
  depoSayimFarklari,
  depoSayimGetir,
  depoSayimiBitir,
  depoSayimiIptalEt,
  depoSayimKaydet,
  depoUrunAra,
  type AramaUrunu,
} from "@/server/depo-islem";
import type { AcikSayim, SayimFarklari } from "@/server/depo-sayim";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { tutarGirdisi, tutarOku } from "@/ui/kampanya-bicim";
import {
  CIKIS_SEBEPLERI,
  EN_COK_ADET,
  EN_COK_SATIR,
  kodTemizle,
  listeyeEkle,
  MOD_ADLARI,
  type CikisSebebi,
  type DepoBedeni,
  type DepoSatiri,
  type DepoSonucu,
} from "@/ui/depo-bicim";
import {
  ANA_DUGME,
  ETIKET,
  GIRDI,
  HATA_KUTUSU,
  IKINCIL_DUGME,
  IYI_KUTU,
} from "@/app/yonetim/panel-bicim";

// Kamera ve ZXing yalnızca açılınca yükleniyor.
const KameraOkuyucu = dynamic(() => import("@/ui/kamera-okuyucu"), { ssr: false });

type Mod = "gelen" | "cikar" | "say";
type Taslak = { anahtar: string; satirlar: DepoSatiri[] };

const SAKLAMA = (mod: Mod) => `depo-taslak-${mod}`;

function yeniAnahtar(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function taslakOku(mod: Mod): Taslak {
  // Sayımın listesi sunucuda (K-177); telefonda saklanmıyor.
  if (mod === "say") return { anahtar: "", satirlar: [] };
  try {
    const ham = localStorage.getItem(SAKLAMA(mod));
    if (ham) {
      const t = JSON.parse(ham) as Taslak;
      if (typeof t.anahtar === "string" && Array.isArray(t.satirlar)) return t;
    }
  } catch {
    // Saklama kapalı (gizli sekme): liste yalnızca bellekte.
  }
  return { anahtar: yeniAnahtar(), satirlar: [] };
}

function taslakYaz(mod: Mod, t: Taslak) {
  if (mod === "say") return;
  try {
    if (t.satirlar.length === 0) localStorage.removeItem(SAKLAMA(mod));
    else localStorage.setItem(SAKLAMA(mod), JSON.stringify(t));
  } catch {
    // yok say
  }
}

/** Kısa bip (tanındı) ya da iki bip (tanınmadı); titreşim destekleniyorsa. */
function sesVer(iyi: boolean, acik: boolean) {
  try {
    navigator.vibrate?.(iyi ? 40 : [60, 60, 60]);
  } catch {
    // yok say
  }
  if (!acik) return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const cal = (bas: number, frekans: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = frekans;
      g.gain.value = 0.08;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + bas);
      o.stop(ctx.currentTime + bas + 0.08);
    };
    if (iyi) cal(0, 1400);
    else {
      cal(0, 500);
      cal(0.14, 500);
    }
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {
    // yok say
  }
}

/**
 * Depo ekranı (K-176). Telefon için; bilgisayarda el okuyucu ya da arama
 * kutusuyla da çalışıyor. Okutulanlar listede birikiyor, stok "Kaydet"te
 * tek seferde yazılıyor. Liste telefonda saklanıyor; kaydetmeden çıkılsa da
 * kaybolmuyor.
 */
export default function DepoEkrani({
  baslangicModu = "gelen",
  kategoriler = [],
  tedarikciler = [],
}: {
  baslangicModu?: Mod;
  kategoriler?: { slug: string; ad: string }[];
  /** Mal geldi'de tedarikçi önerisi (K-179). */
  tedarikciler?: string[];
}) {
  const [mod, setMod] = useState<Mod>(baslangicModu);
  const [taslak, setTaslak] = useState<Taslak>({ anahtar: "", satirlar: [] });
  const [yuklendi, setYuklendi] = useState(false);
  const [kamera, setKamera] = useState(false);
  const [ses, setSes] = useState(true);
  const [girdi, setGirdi] = useState("");
  const [son, setSon] = useState<DepoBedeni | null>(null);
  const [secim, setSecim] = useState<{ kod: string; bedenler: DepoBedeni[] } | null>(null);
  // Öğretme kartı: tanınmayan barkod ya da düzeltme (K-180). `tekBag`: bu
  // barkodun öteki bağları kalkıyor; yanlışsa "ek" (başka renkte de var).
  const [ogret, setOgret] = useState<{
    kod: string;
    tur: "yeni" | "duzelt" | "ek";
  } | null>(null);
  /** Son okutulan barkod: yanlış eşleşme düzeltilebilsin. */
  const [sonKod, setSonKod] = useState("");
  const [arama, setArama] = useState<AramaUrunu[] | null>(null);
  const [mesaj, setMesaj] = useState<{ iyi: boolean; metin: string } | null>(null);
  const [kayitAcik, setKayitAcik] = useState(false);
  const [sonuc, setSonuc] = useState<DepoSonucu | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const kutu = useRef<HTMLInputElement>(null);
  const onbellek = useRef(new Map<string, DepoBedeni>());
  // Sayım (K-177): açık sayım, sunucuya yazılma durumu, silinen satırlar.
  const [sayim, setSayim] = useState<AcikSayim | null | undefined>(undefined);
  const [senkron, setSenkron] = useState<"tamam" | "bekliyor" | "hata">("tamam");
  const [surum, setSurum] = useState(0);
  const [bitirAcik, setBitirAcik] = useState(false);
  const kaldirilan = useRef(new Set<string>());

  // Taslak tarayıcıda; ilk boyamadan sonra okunuyor (sunucuyla uyuşsun).
  // Mod değişimi `modDegis`te: mod ve liste aynı anda değişiyor, bir modun
  // listesi ötekinin saklama yerine yazılmıyor.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tarayıcı saklamasından tek seferlik okuma
    setTaslak(taslakOku(baslangicModu));
    setYuklendi(true);
    if (baslangicModu === "say") void sayimYukle();
  }, [baslangicModu]);

  /** Açık sayımı sunucudan alır; sayılmışlar listeye gelir. */
  async function sayimYukle() {
    setSayim(undefined);
    try {
      const s = await depoSayimGetir();
      kaldirilan.current.clear();
      setSayim(s);
      setTaslak({ anahtar: "", satirlar: s?.satirlar ?? [] });
      setSenkron("tamam");
    } catch {
      setSayim(null);
      setMesaj({ iyi: false, metin: "Sayım bilgisi alınamadı; bağlantıyı kontrol et." });
    }
  }

  // Aynı anda tek kayıt (K-180): bitmeden gelen istek sırada bekliyor, sonra
  // en güncel listeyle bir kez daha yazılıyor.
  const yaziliyor = useRef<Promise<boolean> | null>(null);
  const sonListe = useRef<DepoSatiri[]>([]);
  useEffect(() => {
    sonListe.current = taslak.satirlar;
  }, [taslak.satirlar]);

  /** Sayılanları sunucuya yazar (mutlak; iki kez gitse de sonuç aynı). */
  const sayimiYaz = useCallback(
    async (liste: DepoSatiri[]): Promise<boolean> => {
      if (!sayim) return false;
      if (yaziliyor.current) {
        await yaziliyor.current;
        liste = sonListe.current;
      }
      const is = sayimiGonder(liste);
      yaziliyor.current = is;
      try {
        return await is;
      } finally {
        if (yaziliyor.current === is) yaziliyor.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sayim],
  );

  async function sayimiGonder(liste: DepoSatiri[]): Promise<boolean> {
    if (!sayim) return false;
    const silinen = [...kaldirilan.current];
    try {
      const r = await depoSayimKaydet(
        sayim.id,
        liste.map((x) => ({ variantId: x.variantId, adet: x.adet })),
        silinen,
      );
      if (!r.tamam) {
        setSenkron("hata");
        setMesaj({
          iyi: false,
          metin:
            "Bu sayım kapanmış (başka yerden bitirilmiş ya da iptal edilmiş). Sayfayı yenile.",
        });
        return false;
      }
      for (const id of silinen) kaldirilan.current.delete(id);
      // Yazılırken yeni okutma geldiyse "kaydediliyor" kalıyor; sıradaki
      // kayıt onu da yazacak.
      setSenkron(sonListe.current === liste ? "tamam" : "bekliyor");
      return true;
    } catch {
      setSenkron("hata");
      return false;
    }
  }

  // Sayım listesi değişince 1,5 saniye sonra sunucuya yazılıyor.
  useEffect(() => {
    if (mod !== "say" || !sayim || surum === 0) return;
    const t = setTimeout(() => void sayimiYaz(taslak.satirlar), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surum]);

  // Sekme gizlenirken (telefon kilitlendi, başka uygulamaya geçildi) bekleyen
  // sayılanlar hemen yazılıyor; 1,5 saniyelik bekleme kaybolmasın.
  useEffect(() => {
    const gizlenince = () => {
      if (document.visibilityState === "hidden" && mod === "say" && senkron === "bekliyor") {
        void sayimiYaz(taslak.satirlar);
      }
    };
    document.addEventListener("visibilitychange", gizlenince);
    return () => document.removeEventListener("visibilitychange", gizlenince);
  }, [mod, senkron, sayimiYaz, taslak.satirlar]);

  const sayimDegisti = () => {
    if (mod !== "say") return;
    setSenkron("bekliyor");
    setSurum((n) => n + 1);
  };

  useEffect(() => {
    if (yuklendi) taslakYaz(mod, taslak);
    // `mod` bilerek dışarıda: yalnızca liste değişince yazılıyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taslak, yuklendi]);

  const modDegis = (m: Mod) => {
    if (m === mod) return;
    // Sayımdan çıkarken bekleyen sayılanlar yazılıyor.
    if (mod === "say" && senkron === "bekliyor") void sayimiYaz(taslak.satirlar);
    taslakYaz(mod, taslak);
    setMod(m);
    setTaslak(taslakOku(m));
    if (m === "say") void sayimYukle();
    setBitirAcik(false);
    setSon(null);
    setSecim(null);
    setOgret(null);
    setSonuc(null);
    setMesaj(null);
  };

  const ekle = useCallback(
    (b: DepoBedeni, adet = b.carpan) => {
      setTaslak((t) => ({ ...t, satirlar: listeyeEkle(t.satirlar, b, adet) }));
      kaldirilan.current.delete(b.variantId);
      sayimDegisti();
      setSon(b);
      setSecim(null);
      setOgret(null);
      setArama(null);
      setMesaj(null);
      sesVer(true, ses);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ses, mod],
  );

  const okut = useCallback(
    async (ham: string) => {
      const kod = kodTemizle(ham);
      if (!kod) return;
      setSonuc(null);
      const bilinen = onbellek.current.get(kod);
      if (bilinen) {
        ekle(bilinen);
        setSonKod(kod);
        return;
      }
      try {
        const c = await depoBarkodCoz(kod);
        if (c.tur === "tek") {
          onbellek.current.set(kod, c.beden);
          ekle(c.beden);
          setSonKod(kod);
        } else if (c.tur === "coklu") {
          setSecim({ kod, bedenler: c.bedenler });
          setSonKod(kod);
          sesVer(true, ses);
        } else {
          sesVer(false, ses);
          setOgret({ kod, tur: "yeni" });
          setArama(null);
        }
      } catch {
        setMesaj({
          iyi: false,
          metin: "Sunucuya ulaşılamadı; bağlantıyı kontrol edip yeniden okut.",
        });
      }
    },
    [ekle, ses],
  );

  const adAra = async (metin: string) => {
    if (metin.trim().length < 2) return;
    try {
      setArama(await depoUrunAra(metin));
    } catch {
      setMesaj({ iyi: false, metin: "Arama yapılamadı; bağlantıyı kontrol et." });
    }
  };

  /** Arama kutusu: barkoda benziyorsa okut, yazıya benziyorsa ada göre ara. */
  const kutuGonder = async () => {
    const metin = girdi.trim();
    setGirdi("");
    if (!metin) return;
    if (/\s/.test(metin) || /^[\p{L}]+$/u.test(metin)) {
      setOgret(null);
      await adAra(metin);
    } else {
      await okut(metin);
    }
  };

  const bedenSec = async (variantId: string, kod?: string, carpan = 1, tekBag = false) => {
    try {
      if (kod) {
        const r = await depoBarkodOgret({ kod, variantId, carpan, tekBag });
        if (!r.tamam) {
          setMesaj({
            iyi: false,
            metin: "Barkod öğretilemedi; paket adedi 1 ile 1000 arasında olmalı.",
          });
          return;
        }
        onbellek.current.delete(kod);
        if (tekBag) onbellek.current.set(kod, r.beden);
        ekle(r.beden);
        setMesaj({ iyi: true, metin: "Barkod öğretildi; bir daha sorulmayacak." });
      } else {
        const c = await depoBedenGetir(variantId);
        if (c.tur === "tek") ekle(c.beden, 1);
      }
    } catch {
      setMesaj({ iyi: false, metin: "Sunucuya ulaşılamadı; bağlantıyı kontrol et." });
    }
  };

  const adetDegis = (variantId: string, adet: number) => {
    if (adet <= 0) kaldirilan.current.add(variantId);
    sayimDegisti();
    setTaslak((t) => ({
      ...t,
      satirlar: t.satirlar.flatMap((s) =>
        s.variantId !== variantId
          ? [s]
          : adet <= 0
            ? []
            : [{ ...s, adet: Math.min(EN_COK_ADET, adet) }],
      ),
    }));
  };

  const kaydet = async (ek: {
    sebep?: CikisSebebi;
    tedarikci?: string;
    irsaliye?: string;
    not?: string;
    alislar?: { productId: string; alisKurus: number }[];
  }) => {
    setBekliyor(true);
    try {
      const r = await depoListeKaydet({
        anahtar: taslak.anahtar,
        tur: mod === "cikar" ? "cikar" : "gelen",
        satirlar: taslak.satirlar.map((s) => ({ variantId: s.variantId, adet: s.adet })),
        ...ek,
      });
      if (!r.tamam) {
        setMesaj({
          iyi: false,
          metin:
            r.hata === "fazla"
              ? `Bir kayıtta en çok ${EN_COK_SATIR} kalem olabilir; listeyi ikiye böl.`
              : r.hata === "sebep"
                ? "Çıkarma sebebini seç."
                : "Liste boş; kaydedilecek bir şey yok.",
        });
        return;
      }
      // Yetmeyen satırlar listede kalıyor, öteki satırlar yazıldı.
      const kalan = taslak.satirlar.filter((s) =>
        r.sonuc.yetmeyen.some((y) => y.variantId === s.variantId),
      );
      setTaslak({ anahtar: yeniAnahtar(), satirlar: kalan });
      onbellek.current.clear();
      setSonuc(r.sonuc);
      setSon(null);
      setKayitAcik(false);
    } catch {
      // Anahtar değişmiyor: yeniden basınca aynı kayıt, çift yazılmaz.
      setMesaj({
        iyi: false,
        metin: "Kaydedilemedi, bağlantı koptu. Liste duruyor; yeniden bas, iki kez yazılmaz.",
      });
    } finally {
      setBekliyor(false);
    }
  };

  const toplamAdet = taslak.satirlar.reduce((t, s) => t + s.adet, 0);

  return (
    <div className="flex flex-col gap-4 pb-28">
      {/* Mod seçici */}
      <div className="grid grid-cols-3 gap-2">
        {(["gelen", "cikar", "say"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => modDegis(m)}
            aria-pressed={mod === m}
            className={`whitespace-nowrap rounded-marka border-[1.5px] px-1 py-3 text-sm font-bold transition sm:text-base ${
              mod === m
                ? m === "gelen"
                  ? "border-nane bg-nane-soluk text-nane-koyu"
                  : m === "cikar"
                    ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                    : "border-mavi bg-mavi-soluk text-mavi-koyu"
                : "border-cizgi bg-yuzey text-metin-2"
            }`}
          >
            {m === "gelen" ? "＋ " : m === "cikar" ? "− " : "# "}
            {MOD_ADLARI[m]}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-metin-3">
        {mod === "gelen"
          ? "Okuttuğun her ürün stoğa eklenecek. Bitince aşağıdan kaydet."
          : mod === "cikar"
            ? "Okuttuğun her ürün stoktan düşülecek (hasarlı, kayıp, numune). Bitince aşağıdan kaydet."
            : "Raftaki her ürünü okut; sayılanlar kendiliğinden kaydedilir. Bitince farkları görüp onaylarsın."}
      </p>

      {/* Sayım: açık sayım yoksa kapsam seçip başlat. */}
      {mod === "say" && sayim === undefined && (
        <p className="text-sm text-metin-3">Sayım bilgisi alınıyor…</p>
      )}
      {mod === "say" && sayim === null && (
        <SayimBaslat
          kategoriler={kategoriler}
          baslat={async (kapsam) => {
            try {
              const s = await depoSayimBaslat(kapsam);
              kaldirilan.current.clear();
              setSayim(s);
              setTaslak({ anahtar: "", satirlar: s?.satirlar ?? [] });
            } catch {
              setMesaj({ iyi: false, metin: "Sayım başlatılamadı; bağlantıyı kontrol et." });
            }
          }}
        />
      )}
      {mod === "say" && sayim && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-marka border border-mavi bg-mavi-soluk/50 px-4 py-3 text-sm">
          <span>
            <b>{sayim.ad}</b>
            <span className="block text-xs text-metin-2">Kapsam: {sayim.kapsamAdi}</span>
          </span>
          <span
            className={`text-xs font-bold ${senkron === "hata" ? "text-mercan-koyu" : "text-metin-3"}`}
          >
            {senkron === "tamam"
              ? "✓ kaydedildi"
              : senkron === "bekliyor"
                ? "kaydediliyor…"
                : "kaydedilemedi, yeniden denenecek"}
          </span>
        </div>
      )}

      {/* Kamera */}
      {mod === "say" && !sayim ? null : kamera ? (
        <KameraOkuyucu onOku={okut} onKapat={() => setKamera(false)} />
      ) : (
        <button type="button" onClick={() => setKamera(true)} className={`${ANA_DUGME} py-3`}>
          📷 Kamerayla okut
        </button>
      )}

      {/* Arama / el okuyucu */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void kutuGonder();
        }}
        className={mod === "say" && !sayim ? "hidden" : "flex gap-2"}
      >
        <input
          ref={kutu}
          value={girdi}
          onChange={(e) => setGirdi(e.target.value)}
          placeholder="Barkod okut ya da ürün adı yaz"
          aria-label="Barkod ya da ürün adı"
          autoComplete="off"
          enterKeyHint="search"
          className={`${GIRDI} min-w-0 flex-1`}
        />
        <button type="submit" className={IKINCIL_DUGME}>
          Bul
        </button>
      </form>
      <label className="-mt-2 flex items-center gap-2 text-xs text-metin-3">
        <input
          type="checkbox"
          checked={ses}
          onChange={(e) => setSes(e.target.checked)}
          className="h-4 w-4 accent-[var(--mercan)]"
        />
        Okutunca ses çıksın
      </label>

      {mesaj && <p className={mesaj.iyi ? IYI_KUTU : HATA_KUTUSU}>{mesaj.metin}</p>}

      {/* Kayıt sonucu */}
      {sonuc && <SonucKutusu sonuc={sonuc} />}

      {/* Aynı barkod birden çok bedende */}
      {secim && (
        <div className="rounded-marka border-[1.5px] border-sari bg-sari-soluk p-4">
          <p className="text-sm font-bold">Bu barkod birden çok bedende. Hangisi?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {secim.bedenler.map((b) => (
              <button
                key={b.variantId}
                type="button"
                onClick={() => ekle(b)}
                className="rounded-full border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm font-semibold"
              >
                {b.urunAd} · {b.beden} · {b.renkAdi}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-metin-2">
            Yanlış bağlandıysa ürünün sayfasındaki &quot;Barkodlar&quot;dan kaldırabilirsin.
          </p>
        </div>
      )}

      {/* Tanınmayan barkod: bir kez öğret */}
      {ogret && (
        <OgretmeKarti
          kod={ogret.kod}
          tur={ogret.tur}
          sonuclar={arama}
          ara={adAra}
          sec={(variantId, carpan) => bedenSec(variantId, ogret.kod, carpan, ogret.tur !== "ek")}
          vazgec={() => {
            setOgret(null);
            setArama(null);
          }}
        />
      )}

      {/* Barkodsuz ürün: ada göre arama sonucu */}
      {!ogret && arama && (
        <AramaSonuclari
          sonuclar={arama}
          sec={(variantId) => bedenSec(variantId)}
          kapat={() => setArama(null)}
        />
      )}

      {/* Son okutulan */}
      {son && (
        <div
          className={`rounded-marka border-[1.5px] p-4 ${
            mod === "gelen"
              ? "border-nane bg-nane-soluk/50"
              : mod === "cikar"
                ? "border-mercan bg-mercan-soluk/50"
                : "border-mavi bg-mavi-soluk/50"
          }`}
        >
          <p className="text-lg font-bold leading-tight">{son.urunAd}</p>
          <p className="mt-0.5 text-base font-semibold">
            {son.beden} · {son.renkAdi}
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-metin-2">
            <span className="rakam">
              {mod === "say" ? "Sayılan" : "Bu listede"}:{" "}
              <b>{taslak.satirlar.find((s) => s.variantId === son.variantId)?.adet ?? 0}</b>
            </span>
            {/* Sayımda sistemdeki stok gösterilmiyor: sayanı etkilemesin. */}
            {mod !== "say" && <span className="rakam">Stok: {son.stok}</span>}
            {mod !== "say" && son.sure && <span>{son.sure}</span>}
            {mod !== "say" && son.ayrilan > 0 && (
              <span className="rakam">{son.ayrilan} tanesi siparişte ayrılı</span>
            )}
            {son.carpan > 1 && <span className="rakam">paket: ×{son.carpan}</span>}
          </p>
          {/* Yanlış eşleşme (K-180): son okutma listeden geri alınıp barkod
              doğru bedene bağlanıyor. */}
          {sonKod && !ogret && (
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold">
              {(
                [
                  ["duzelt", "Yanlış ürün geldi"],
                  ["ek", "Bu barkod başka renkte/bedende de var"],
                ] as const
              ).map(([tur, ad]) => (
                <button
                  key={tur}
                  type="button"
                  onClick={() => {
                    const x = taslak.satirlar.find((s) => s.variantId === son.variantId);
                    if (x) adetDegis(son.variantId, x.adet - son.carpan);
                    onbellek.current.delete(sonKod);
                    setOgret({ kod: sonKod, tur });
                    setArama(null);
                    setSon(null);
                  }}
                  className="text-mavi-koyu underline"
                >
                  {ad}
                </button>
              ))}
            </p>
          )}
        </div>
      )}

      {/* Liste */}
      {taslak.satirlar.length > 0 && (
        <section className="rounded-marka border border-cizgi bg-yuzey">
          <h2 className="border-b border-cizgi px-4 py-3 text-base">
            {mod === "say" ? "Sayılanlar" : `${MOD_ADLARI[mod]} listesi`}{" "}
            <span className="rakam text-sm font-normal text-metin-3">
              {taslak.satirlar.length} kalem · {toplamAdet} adet
            </span>
          </h2>
          <ul className="divide-y divide-cizgi-soluk">
            {taslak.satirlar.map((s) => (
              <li key={s.variantId} className="flex items-center gap-2 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{s.urunAd}</span>
                  <span className="block text-xs text-metin-3">
                    {s.beden} · {s.renkAdi}
                    {mod !== "say" && <span className="rakam"> · stok {s.stok}</span>}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => adetDegis(s.variantId, s.adet - 1)}
                  aria-label="Bir azalt"
                  className="h-9 w-9 rounded-full border border-cizgi text-lg font-bold"
                >
                  −
                </button>
                <input
                  value={s.adet}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/\D/g, ""));
                    if (Number.isFinite(n)) adetDegis(s.variantId, Math.max(1, n));
                  }}
                  inputMode="numeric"
                  aria-label="Adet"
                  className={`${GIRDI} rakam w-14 px-1 text-center`}
                />
                <button
                  type="button"
                  onClick={() => adetDegis(s.variantId, s.adet + 1)}
                  aria-label="Bir artır"
                  className="h-9 w-9 rounded-full border border-cizgi text-lg font-bold"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => adetDegis(s.variantId, 0)}
                  aria-label="Satırı sil"
                  className="h-9 w-9 rounded-full text-sm font-bold text-mercan-koyu"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className={mod === "say" ? "hidden" : "border-t border-cizgi px-4 py-2 text-right"}>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Liste silinsin mi? Stoğa hiçbir şey yazılmadı.")) {
                  setTaslak({ anahtar: yeniAnahtar(), satirlar: [] });
                  setSon(null);
                }
              }}
              className="text-xs font-bold text-metin-3 hover:text-mercan-koyu"
            >
              Listeyi temizle
            </button>
          </div>
        </section>
      )}

      {/* Sayımı bitirme */}
      {mod === "say" && sayim && bitirAcik && (
        <SayimBitirPenceresi
          sayimId={sayim.id}
          raf={sayim.kapsam === "okutulan"}
          hazirla={() => sayimiYaz(taslak.satirlar)}
          kapat={() => setBitirAcik(false)}
          bitti={(duzeltilen) => {
            setBitirAcik(false);
            setSayim(null);
            setTaslak({ anahtar: "", satirlar: [] });
            setSon(null);
            setMesaj({
              iyi: true,
              metin: `Sayım bitti; ${duzeltilen} bedenin stoğu düzeltildi. Farklar stok geçmişinde "Sayım farkı" olarak duruyor.`,
            });
          }}
          iptal={async () => {
            await depoSayimiIptalEt(sayim.id);
            setBitirAcik(false);
            setSayim(null);
            setTaslak({ anahtar: "", satirlar: [] });
            setSon(null);
            setMesaj({ iyi: true, metin: "Sayım iptal edildi; stoğa hiçbir şey yazılmadı." });
          }}
        />
      )}

      {/* Kayıt penceresi */}
      {kayitAcik && mod !== "say" && (
        <KayitPenceresi
          mod={mod === "cikar" ? "cikar" : "gelen"}
          kalem={taslak.satirlar.length}
          adet={toplamAdet}
          bekliyor={bekliyor}
          kaydet={kaydet}
          kapat={() => setKayitAcik(false)}
          satirlar={taslak.satirlar}
          tedarikciler={tedarikciler}
        />
      )}

      {/* Alt çubuk */}
      {mod !== "say" && taslak.satirlar.length > 0 && !kayitAcik && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cizgi bg-yuzey/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <span className="rakam text-sm">
              <b>{taslak.satirlar.length}</b> kalem · <b>{toplamAdet}</b> adet
            </span>
            <button type="button" onClick={() => setKayitAcik(true)} className={ANA_DUGME}>
              {mod === "gelen" ? "Stoğa ekle" : "Stoktan düş"}
            </button>
          </div>
        </div>
      )}
      {mod === "say" && sayim && !bitirAcik && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-cizgi bg-yuzey/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <span className="rakam text-sm">
              <b>{taslak.satirlar.length}</b> kalem · <b>{toplamAdet}</b> adet sayıldı
            </span>
            <button type="button" onClick={() => setBitirAcik(true)} className={ANA_DUGME}>
              Sayımı bitir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SayimBaslat({
  kategoriler,
  baslat,
}: {
  kategoriler: { slug: string; ad: string }[];
  baslat: (kapsam: string) => Promise<void>;
}) {
  const [tur, setTur] = useState<"okutulan" | "kategori" | "tumu">("okutulan");
  const [kategori, setKategori] = useState(kategoriler[0]?.slug ?? "");
  const [bekliyor, setBekliyor] = useState(false);
  const secenekler = [
    [
      "okutulan",
      "Yalnızca okuttuklarım",
      "Raf raf sayım: yalnızca okuttuğun bedenler karşılaştırılır.",
    ],
    [
      "kategori",
      "Bir kategori",
      "O kategorideki bütün bedenler; okutmadıklarını sonunda görürsün.",
    ],
    ["tumu", "Bütün mağaza", "Ayda bir önerilir; okutmadıklarını sonunda görürsün."],
  ] as const;
  return (
    <div className="flex flex-col gap-3 rounded-marka border border-cizgi bg-yuzey p-4">
      <p className="font-bold">Yeni sayım: neyi sayacaksın?</p>
      {secenekler.map(([d, ad, aciklama]) => (
        <label
          key={d}
          className={`flex gap-3 rounded-[10px] border-[1.5px] px-3 py-2.5 ${
            tur === d ? "border-mavi" : "border-cizgi"
          }`}
        >
          <input
            type="radio"
            checked={tur === d}
            onChange={() => setTur(d)}
            className="mt-1 h-4 w-4 accent-[var(--mercan)]"
          />
          <span>
            <span className="block text-sm font-semibold">{ad}</span>
            <span className="block text-xs text-metin-3">{aciklama}</span>
          </span>
        </label>
      ))}
      {tur === "kategori" && (
        <select
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          aria-label="Kategori"
          className={GIRDI}
        >
          {kategoriler.map((k) => (
            <option key={k.slug} value={k.slug}>
              {k.ad}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        disabled={bekliyor || (tur === "kategori" && !kategori)}
        onClick={async () => {
          setBekliyor(true);
          await baslat(tur === "okutulan" ? "okutulan" : tur === "kategori" ? kategori : "");
          setBekliyor(false);
        }}
        className={`${ANA_DUGME} self-start disabled:opacity-50`}
      >
        Sayımı başlat
      </button>
    </div>
  );
}

function SayimBitirPenceresi({
  sayimId,
  raf,
  hazirla,
  kapat,
  bitti,
  iptal,
}: {
  sayimId: string;
  raf: boolean;
  hazirla: () => Promise<boolean>;
  kapat: () => void;
  bitti: (duzeltilen: number) => void;
  iptal: () => Promise<void>;
}) {
  const [f, setF] = useState<SayimFarklari | null | undefined>(undefined);
  const [sifir, setSifir] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState("");

  useEffect(() => {
    let iptalEdildi = false;
    (async () => {
      // Önce bekleyen sayılanlar yazılıyor; farklar güncel olsun.
      await hazirla();
      try {
        const r = await depoSayimFarklari(sayimId);
        if (!iptalEdildi) setF(r);
      } catch {
        if (!iptalEdildi) setHata("Farklar alınamadı; bağlantıyı kontrol et.");
      }
    })();
    return () => {
      iptalEdildi = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sayimId]);

  return (
    <div
      role="dialog"
      aria-label="Sayımı bitir"
      className="fixed inset-x-0 bottom-0 z-40 max-h-[88vh] overflow-y-auto rounded-t-marka border-t border-cizgi bg-yuzey p-5 shadow-2xl"
    >
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <p className="text-lg font-bold">Sayımı bitir</p>
        {hata && <p className={HATA_KUTUSU}>{hata}</p>}
        {f === undefined && !hata && <p className="text-sm text-metin-3">Farklar hesaplanıyor…</p>}
        {f === null && <p className={HATA_KUTUSU}>Bu sayım artık açık değil. Sayfayı yenile.</p>}
        {f && (
          <>
            <p className="rakam text-sm text-metin-2">
              {f.ozet.sayilan} beden sayıldı · {f.ozet.farkli} bedende fark
              {f.ozet.farkli > 0 && (
                <>
                  {" "}
                  (eksik {f.ozet.eksikAdet}, fazla {f.ozet.fazlaAdet} adet
                  {f.ozet.farkMaliyetKurus !== 0 &&
                    `; maliyetle ${fiyatYaz(f.ozet.farkMaliyetKurus)}`}
                  )
                </>
              )}
            </p>
            {f.farklar.length === 0 ? (
              <p className={IYI_KUTU}>Sayılanlar sistemle tutuyor; düzeltilecek bir şey yok.</p>
            ) : (
              <ul className="divide-y divide-cizgi-soluk rounded-marka border border-cizgi">
                {f.farklar.slice(0, 200).map((x, i) => (
                  <li
                    key={(x.variantId ?? "") + i}
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{x.urunAd}</span>
                      <span className="block text-xs text-metin-3">
                        {x.beden} · {x.renkAdi}
                      </span>
                    </span>
                    <span className="rakam text-xs text-metin-2">
                      beklenen {x.beklenen} · sayılan {x.sayilan}
                    </span>
                    <span
                      className={`rakam w-12 text-right font-bold ${
                        x.fark < 0 ? "text-mercan-koyu" : "text-nane-koyu"
                      }`}
                    >
                      {x.fark > 0 ? `+${x.fark}` : x.fark}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!raf && f.okutulmayan > 0 && (
              <div className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm">
                <p>
                  <b className="rakam">{f.okutulmayan}</b> bedeni okutmadın. Varsayılan olarak
                  onlara dokunulmaz.
                </p>
                <label className="mt-2 flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={sifir}
                    onChange={(e) => setSifir(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--mercan)]"
                  />
                  <span>
                    Okutmadıklarım rafta yok: <b>stoklarını sıfırla</b>. Yalnızca kapsamdaki bütün
                    rafları gerçekten saydıysan işaretle.
                  </span>
                </label>
              </div>
            )}
            <p className="text-xs text-metin-3">
              Fark, rafta olması gerekenle (stok + kargolanmamış siparişte ayrılan) karşılaştırılır
              ve stoğa eklenerek uygulanır; sayım sürerken gelen satışlar korunur.
            </p>
          </>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!f || bekliyor}
            onClick={async () => {
              setBekliyor(true);
              setHata("");
              try {
                const r = await depoSayimiBitir(sayimId, sifir);
                if (r.tamam) bitti(r.duzeltilen);
                else
                  setHata(
                    "Sayım bitirilemedi; başka yerden bitirilmiş ya da iptal edilmiş olabilir.",
                  );
              } catch {
                setHata("Bağlantı koptu. Yeniden bas; sayım iki kez uygulanmaz.");
              } finally {
                setBekliyor(false);
              }
            }}
            className={`${ANA_DUGME} disabled:opacity-50`}
          >
            {bekliyor ? "Uygulanıyor…" : "Onayla, stoğa uygula"}
          </button>
          <button type="button" onClick={kapat} className="text-sm font-semibold text-metin-3">
            Saymaya devam et
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Sayım iptal edilsin mi? Sayılanlar silinir, stoğa hiçbir şey yazılmaz.",
                )
              ) {
                void iptal();
              }
            }}
            className="ml-auto text-xs font-bold text-metin-3 hover:text-mercan-koyu"
          >
            Sayımı iptal et
          </button>
        </div>
      </div>
    </div>
  );
}

function OgretmeKarti({
  kod,
  tur,
  sonuclar,
  ara,
  sec,
  vazgec,
}: {
  kod: string;
  tur: "yeni" | "duzelt" | "ek";
  sonuclar: AramaUrunu[] | null;
  ara: (metin: string) => void;
  sec: (variantId: string, carpan: number) => void;
  vazgec: () => void;
}) {
  const [metin, setMetin] = useState("");
  const [urun, setUrun] = useState<AramaUrunu | null>(null);
  const [paket, setPaket] = useState("1");
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div className="rounded-marka border-[1.5px] border-sari bg-sari-soluk p-4">
      <p className="text-sm font-bold">
        {tur === "yeni"
          ? "Bu barkodu tanımıyorum"
          : tur === "duzelt"
            ? "Doğru ürünü seç"
            : "Bu barkodun öteki bedenini seç"}
        : <span className="rakam">{kod}</span>
      </p>
      <p className="mt-1 text-xs text-metin-2">
        {tur === "ek"
          ? "Barkod iki bedene bağlanır; okutunca hangisi olduğu sorulur."
          : tur === "duzelt"
            ? "Yanlış bağ kalkar, barkod seçtiğin bedene bağlanır; son okutma listeden geri alındı."
            : "Hangi ürün olduğunu bir kez seç; bir daha okuttuğunda doğrudan tanınır."}
      </p>
      {!urun ? (
        <>
          <input
            value={metin}
            autoFocus
            onChange={(e) => {
              const v = e.target.value;
              setMetin(v);
              if (zamanlayici.current) clearTimeout(zamanlayici.current);
              zamanlayici.current = setTimeout(() => ara(v), 300);
            }}
            placeholder="Ürün adı yaz"
            aria-label="Ürün adı"
            className={`${GIRDI} mt-3 w-full`}
          />
          {sonuclar && (
            <ul className="mt-2 flex flex-col gap-1">
              {sonuclar.length === 0 && (
                <li className="text-sm text-metin-2">
                  Bulunamadı.{" "}
                  <Link
                    href={`/yonetim/urunler/yeni?barkod=${encodeURIComponent(kod)}`}
                    className="font-bold text-mavi-koyu underline"
                  >
                    Yeni ürün olarak ekle
                  </Link>
                </li>
              )}
              {sonuclar.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setUrun(u)}
                    className="w-full rounded-[10px] bg-yuzey px-3 py-2 text-left text-sm font-semibold"
                  >
                    {u.ad}
                    {!u.aktif && <span className="ml-2 text-xs text-metin-3">(yayında değil)</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="mt-3 text-sm font-semibold">
            {urun.ad}{" "}
            <button
              type="button"
              onClick={() => setUrun(null)}
              className="ml-1 text-xs font-bold text-mavi-koyu underline"
            >
              değiştir
            </button>
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <span className={ETIKET}>Bir okutma kaç adet</span>
            <input
              value={paket}
              onChange={(e) => setPaket(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className={`${GIRDI} rakam w-16 text-center`}
            />
            <span className="text-xs text-metin-3">tek ürünse 1, 3&apos;lü paketse 3</span>
          </label>
          <p className="mt-3 text-xs font-bold text-metin-2">Beden ve renk:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {urun.bedenler.length === 0 && (
              <p className="text-sm text-metin-2">
                Bu üründe beden yok; önce ürün sayfasından beden ekle.
              </p>
            )}
            {urun.bedenler.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => sec(b.id, Math.max(1, Number(paket) || 1))}
                className="rounded-full border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm font-semibold"
              >
                {b.beden} · {b.renkAdi}
              </button>
            ))}
          </div>
        </>
      )}
      <button type="button" onClick={vazgec} className="mt-3 text-xs font-bold text-metin-3">
        Vazgeç
      </button>
    </div>
  );
}

function AramaSonuclari({
  sonuclar,
  sec,
  kapat,
}: {
  sonuclar: AramaUrunu[];
  sec: (variantId: string) => void;
  kapat: () => void;
}) {
  return (
    <div className="rounded-marka border border-cizgi bg-yuzey p-4">
      <p className="text-sm font-bold">
        {sonuclar.length === 0
          ? "Aramaya uyan ürün yok."
          : "Beden ve renge dokun, listeye eklensin:"}
      </p>
      <ul className="mt-2 flex flex-col gap-3">
        {sonuclar.map((u) => (
          <li key={u.id}>
            <p className="text-sm font-semibold">{u.ad}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {u.bedenler.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => sec(b.id)}
                  className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-semibold"
                >
                  {b.beden} · {b.renkAdi} <span className="rakam text-metin-3">({b.stok})</span>
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={kapat} className="mt-3 text-xs font-bold text-metin-3">
        Kapat
      </button>
    </div>
  );
}

function KayitPenceresi({
  mod,
  kalem,
  adet,
  bekliyor,
  kaydet,
  kapat,
  satirlar,
  tedarikciler,
}: {
  mod: Mod;
  kalem: number;
  adet: number;
  bekliyor: boolean;
  kaydet: (ek: {
    sebep?: CikisSebebi;
    tedarikci?: string;
    irsaliye?: string;
    not?: string;
    alislar?: { productId: string; alisKurus: number }[];
  }) => void;
  kapat: () => void;
  satirlar: DepoSatiri[];
  tedarikciler: string[];
}) {
  const [sebep, setSebep] = useState<CikisSebebi | "">("");
  const [tedarikci, setTedarikci] = useState("");
  // Mal gelirken alış fiyatı (K-179): ürün başına, şimdiki fiyat dolu gelir.
  const urunler = [
    ...new Map(satirlar.filter((x) => x.productId).map((x) => [x.productId!, x])).values(),
  ];
  const [alislar, setAlislar] = useState<Record<string, string>>(() =>
    Object.fromEntries(urunler.map((u) => [u.productId!, tutarGirdisi(u.alisKurus ?? null)])),
  );
  const alisHatali = urunler.some((u) => {
    const h = alislar[u.productId!] ?? "";
    return h.trim() !== "" && !tutarOku(h);
  });
  const degisenAlislar = urunler.flatMap((u) => {
    const kurus = tutarOku(alislar[u.productId!] ?? "");
    return kurus && kurus !== (u.alisKurus ?? null)
      ? [{ productId: u.productId!, alisKurus: kurus }]
      : [];
  });
  const [irsaliye, setIrsaliye] = useState("");
  const [not, setNot] = useState("");

  return (
    <div
      role="dialog"
      aria-label="Kaydet"
      className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-marka border-t border-cizgi bg-yuzey p-5 shadow-2xl"
    >
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <p className="text-lg font-bold">
          {mod === "gelen" ? "Stoğa ekle" : "Stoktan düş"}:{" "}
          <span className="rakam">
            {kalem} kalem, {adet} adet
          </span>
        </p>

        {mod === "cikar" ? (
          <fieldset className="flex flex-col gap-2">
            <legend className={ETIKET}>Neden çıkıyor?</legend>
            {(Object.keys(CIKIS_SEBEPLERI) as CikisSebebi[]).map((s) => (
              <label
                key={s}
                className={`flex items-center gap-2 rounded-[10px] border-[1.5px] px-3 py-2.5 text-sm font-semibold ${
                  sebep === s ? "border-mercan" : "border-cizgi"
                }`}
              >
                <input
                  type="radio"
                  name="sebep"
                  checked={sebep === s}
                  onChange={() => setSebep(s)}
                  className="h-4 w-4 accent-[var(--mercan)]"
                />
                {CIKIS_SEBEPLERI[s]}
              </label>
            ))}
          </fieldset>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Tedarikçi — isteğe bağlı</span>
              <input
                value={tedarikci}
                onChange={(e) => setTedarikci(e.target.value)}
                list="depo-tedarikciler"
                className={GIRDI}
              />
              <datalist id="depo-tedarikciler">
                {tedarikciler.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>İrsaliye no — isteğe bağlı</span>
              <input
                value={irsaliye}
                onChange={(e) => setIrsaliye(e.target.value)}
                className={GIRDI}
              />
            </label>
          </div>
        )}
        {mod === "gelen" && urunler.length > 0 && (
          <details className="rounded-[10px] border border-cizgi px-3 py-2">
            <summary className="cursor-pointer text-xs font-bold text-metin-2">
              Alış fiyatı değişti mi? (isteğe bağlı, KDV hariç ₺)
            </summary>
            <p className="mt-2 text-xs text-metin-3">
              Yeni fiyat raftaki eski stokla ortalanır; boş ya da aynı bırakılana dokunulmaz.
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {urunler.map((u) => (
                <li key={u.productId} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{u.urunAd}</span>
                  <input
                    value={alislar[u.productId!] ?? ""}
                    onChange={(e) => setAlislar({ ...alislar, [u.productId!]: e.target.value })}
                    inputMode="decimal"
                    placeholder="—"
                    aria-label={`${u.urunAd} alış fiyatı`}
                    className={`${GIRDI} rakam w-28 py-1.5`}
                  />
                </li>
              ))}
            </ul>
            {alisHatali && (
              <p className="mt-2 text-xs text-mercan-koyu">Fiyatı 120 ya da 49,90 gibi yaz.</p>
            )}
          </details>
        )}
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Not — isteğe bağlı</span>
          <input
            value={not}
            onChange={(e) => setNot(e.target.value)}
            maxLength={150}
            className={GIRDI}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={bekliyor || (mod === "cikar" && !sebep) || alisHatali}
            onClick={() =>
              kaydet(
                mod === "cikar"
                  ? { sebep: sebep as CikisSebebi, not }
                  : { tedarikci, irsaliye, not, alislar: degisenAlislar },
              )
            }
            className={`${ANA_DUGME} disabled:opacity-50`}
          >
            {bekliyor ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button type="button" onClick={kapat} className="text-sm font-semibold text-metin-3">
            Listeye dön
          </button>
        </div>
      </div>
    </div>
  );
}

function SonucKutusu({ sonuc }: { sonuc: DepoSonucu }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={IYI_KUTU}>
        {sonuc.tekrar && "Bu liste zaten kaydedilmişti; ikinci kez yazılmadı. "}
        <span className="rakam">
          {sonuc.kalem} kalem, {sonuc.adet} adet
        </span>{" "}
        {sonuc.tur === "gelen" ? "stoğa eklendi." : "stoktan düşüldü."}
        {!!sonuc.bildirim && (
          <span className="rakam">
            {" "}
            {sonuc.bildirim} müşteriye &quot;geldi&quot; e-postası gitti.
          </span>
        )}
      </p>
      {sonuc.yetmeyen.length > 0 && (
        <div className={HATA_KUTUSU}>
          Stok yetmediği için düşülmedi (listede duruyor):
          <ul className="mt-1 list-disc pl-5 font-normal">
            {sonuc.yetmeyen.map((y) => (
              <li key={y.variantId} className="rakam">
                {y.urunAd}: stokta {y.stok}, istenen {y.istenen}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!!sonuc.etiketsiz?.length && (
        <div className="rounded-marka border border-cizgi bg-yuzey px-4 py-3 text-sm">
          Üretici barkodu öğretilmemiş ürünler; istersen etiket bas:
          <ul className="mt-1 flex flex-wrap gap-2">
            {sonuc.etiketsiz.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/yonetim/stok/etiketler?urun=${e.slug}`}
                  className="font-bold text-mavi-koyu underline"
                >
                  {e.urunAd}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
