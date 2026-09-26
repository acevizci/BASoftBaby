"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  depoBarkodCoz,
  depoBarkodOgret,
  depoBedenGetir,
  depoListeKaydet,
  depoUrunAra,
  type AramaUrunu,
} from "@/server/depo-islem";
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

type Mod = "gelen" | "cikar";
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
export default function DepoEkrani({ baslangicModu = "gelen" }: { baslangicModu?: Mod }) {
  const [mod, setMod] = useState<Mod>(baslangicModu);
  const [taslak, setTaslak] = useState<Taslak>({ anahtar: "", satirlar: [] });
  const [yuklendi, setYuklendi] = useState(false);
  const [kamera, setKamera] = useState(false);
  const [ses, setSes] = useState(true);
  const [girdi, setGirdi] = useState("");
  const [son, setSon] = useState<DepoBedeni | null>(null);
  const [secim, setSecim] = useState<{ kod: string; bedenler: DepoBedeni[] } | null>(null);
  const [ogret, setOgret] = useState<{ kod: string } | null>(null);
  const [arama, setArama] = useState<AramaUrunu[] | null>(null);
  const [mesaj, setMesaj] = useState<{ iyi: boolean; metin: string } | null>(null);
  const [kayitAcik, setKayitAcik] = useState(false);
  const [sonuc, setSonuc] = useState<DepoSonucu | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const kutu = useRef<HTMLInputElement>(null);
  const onbellek = useRef(new Map<string, DepoBedeni>());

  // Taslak tarayıcıda; ilk boyamadan sonra okunuyor (sunucuyla uyuşsun).
  // Mod değişimi `modDegis`te: mod ve liste aynı anda değişiyor, bir modun
  // listesi ötekinin saklama yerine yazılmıyor.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tarayıcı saklamasından tek seferlik okuma
    setTaslak(taslakOku(baslangicModu));
    setYuklendi(true);
  }, [baslangicModu]);

  useEffect(() => {
    if (yuklendi) taslakYaz(mod, taslak);
    // `mod` bilerek dışarıda: yalnızca liste değişince yazılıyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taslak, yuklendi]);

  const modDegis = (m: Mod) => {
    if (m === mod) return;
    taslakYaz(mod, taslak);
    setMod(m);
    setTaslak(taslakOku(m));
    setSon(null);
    setSecim(null);
    setOgret(null);
    setSonuc(null);
    setMesaj(null);
  };

  const ekle = useCallback(
    (b: DepoBedeni, adet = b.carpan) => {
      setTaslak((t) => ({ ...t, satirlar: listeyeEkle(t.satirlar, b, adet) }));
      setSon(b);
      setSecim(null);
      setOgret(null);
      setArama(null);
      setMesaj(null);
      sesVer(true, ses);
    },
    [ses],
  );

  const okut = useCallback(
    async (ham: string) => {
      const kod = kodTemizle(ham);
      if (!kod) return;
      setSonuc(null);
      const bilinen = onbellek.current.get(kod);
      if (bilinen) return ekle(bilinen);
      try {
        const c = await depoBarkodCoz(kod);
        if (c.tur === "tek") {
          onbellek.current.set(kod, c.beden);
          ekle(c.beden);
        } else if (c.tur === "coklu") {
          setSecim({ kod, bedenler: c.bedenler });
          sesVer(true, ses);
        } else {
          sesVer(false, ses);
          setOgret({ kod });
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

  const adetDegis = (variantId: string, adet: number) =>
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

  const kaydet = async (ek: {
    sebep?: CikisSebebi;
    tedarikci?: string;
    irsaliye?: string;
    not?: string;
  }) => {
    setBekliyor(true);
    try {
      const r = await depoListeKaydet({
        anahtar: taslak.anahtar,
        tur: mod,
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
      <div className="grid grid-cols-2 gap-2">
        {(["gelen", "cikar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => modDegis(m)}
            aria-pressed={mod === m}
            className={`rounded-marka border-[1.5px] px-3 py-3 text-base font-bold transition ${
              mod === m
                ? m === "gelen"
                  ? "border-nane bg-nane-soluk text-nane-koyu"
                  : "border-mercan bg-mercan-soluk text-mercan-koyu"
                : "border-cizgi bg-yuzey text-metin-2"
            }`}
          >
            {m === "gelen" ? "＋ " : "− "}
            {MOD_ADLARI[m]}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-metin-3">
        {mod === "gelen"
          ? "Okuttuğun her ürün stoğa eklenecek. Bitince aşağıdan kaydet."
          : "Okuttuğun her ürün stoktan düşülecek (hasarlı, kayıp, numune). Bitince aşağıdan kaydet."}
      </p>

      {/* Kamera */}
      {kamera ? (
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
        className="flex gap-2"
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
          sonuclar={arama}
          ara={adAra}
          sec={(variantId, carpan) => bedenSec(variantId, ogret.kod, carpan, true)}
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
            mod === "gelen" ? "border-nane bg-nane-soluk/50" : "border-mercan bg-mercan-soluk/50"
          }`}
        >
          <p className="text-lg font-bold leading-tight">{son.urunAd}</p>
          <p className="mt-0.5 text-base font-semibold">
            {son.beden} · {son.renkAdi}
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-metin-2">
            <span className="rakam">
              Bu listede:{" "}
              <b>{taslak.satirlar.find((s) => s.variantId === son.variantId)?.adet ?? 0}</b>
            </span>
            <span className="rakam">Stok: {son.stok}</span>
            {son.sure && <span>{son.sure}</span>}
            {son.ayrilan > 0 && (
              <span className="rakam">{son.ayrilan} tanesi siparişte ayrılı</span>
            )}
            {son.carpan > 1 && <span className="rakam">paket: ×{son.carpan}</span>}
          </p>
        </div>
      )}

      {/* Liste */}
      {taslak.satirlar.length > 0 && (
        <section className="rounded-marka border border-cizgi bg-yuzey">
          <h2 className="border-b border-cizgi px-4 py-3 text-base">
            {MOD_ADLARI[mod]} listesi{" "}
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
                    {s.beden} · {s.renkAdi} · <span className="rakam">stok {s.stok}</span>
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
          <div className="border-t border-cizgi px-4 py-2 text-right">
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

      {/* Kayıt penceresi */}
      {kayitAcik && (
        <KayitPenceresi
          mod={mod}
          kalem={taslak.satirlar.length}
          adet={toplamAdet}
          bekliyor={bekliyor}
          kaydet={kaydet}
          kapat={() => setKayitAcik(false)}
        />
      )}

      {/* Alt çubuk */}
      {taslak.satirlar.length > 0 && !kayitAcik && (
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
    </div>
  );
}

function OgretmeKarti({
  kod,
  sonuclar,
  ara,
  sec,
  vazgec,
}: {
  kod: string;
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
        Bu barkodu tanımıyorum: <span className="rakam">{kod}</span>
      </p>
      <p className="mt-1 text-xs text-metin-2">
        Hangi ürün olduğunu bir kez seç; bir daha okuttuğunda doğrudan tanınır.
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
  }) => void;
  kapat: () => void;
}) {
  const [sebep, setSebep] = useState<CikisSebebi | "">("");
  const [tedarikci, setTedarikci] = useState("");
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
                className={GIRDI}
              />
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
            disabled={bekliyor || (mod === "cikar" && !sebep)}
            onClick={() =>
              kaydet(
                mod === "cikar"
                  ? { sebep: sebep as CikisSebebi, not }
                  : { tedarikci, irsaliye, not },
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
