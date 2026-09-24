"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IZIN_CEREZI, cerezOku, izinCoz } from "@/ui/olcum-bicim";
import {
  IZIN_OLAYI,
  TERCIH_OLAYI,
  araclariBaslat,
  izinKaydet,
  izleyiciCerezleriniSil,
  olcumOlayi,
  sayfaGoruntuleme,
} from "@/ui/olcum";

function abone(bildir: () => void): () => void {
  window.addEventListener(IZIN_OLAYI, bildir);
  return () => window.removeEventListener(IZIN_OLAYI, bildir);
}

/**
 * Çerez onay bandı ve reklam ölçümü (K-124).
 *
 * Yalnızca panelde bir ölçüm kimliği girilmişse çiziliyor; yoksa site çerez
 * kullanmıyor ve bant da yok (K-16).
 *
 * **"Reddet" "Kabul et" kadar kolay.** İki düğme aynı boyutta, aynı yerde;
 * bandı kapatmak onay sayılmıyor. KVKK Kurulu'nun çerez rehberi ve AB
 * uygulaması böyle istiyor: reddetmesi zor bir bant geçerli onay değil.
 *
 * Karar bir yıl hatırlanıyor; alt bilgideki "Çerez tercihleri" bandı yeniden
 * açıyor. Onay geri alınırsa araçların çerezleri siliniyor ve sayfa
 * yenileniyor (yüklenmiş bir betik sayfadan çıkarılamıyor).
 */
export default function CerezOnayi({ metaId, googleId }: { metaId: string; googleId: string }) {
  const yol = usePathname();
  const izin = useSyncExternalStore(
    abone,
    () => izinCoz(cerezOku(document.cookie, IZIN_CEREZI)) ?? "sorulmadi",
    () => "bilinmiyor",
  );
  const [tercihAcik, setTercihAcik] = useState(false);

  // Onay varsa araçlar kuruluyor ve her sayfa geçişi bir görüntüleme.
  useEffect(() => {
    if (izin !== "evet") return;
    araclariBaslat(metaId, googleId);
    sayfaGoruntuleme();
  }, [izin, yol, metaId, googleId]);

  // "Sepete ekle" formları `data-olcum` ile işaretli; düz HTML formu
  // oldukları için (JavaScript'siz çalışsınlar) olayı buradan yakalıyoruz.
  useEffect(() => {
    const gonderim = (e: SubmitEvent) => {
      const form = e.target instanceof HTMLFormElement ? e.target : null;
      if (form?.dataset.olcum !== "sepete-ekleme") return;
      const id = new FormData(form).get("variantId");
      olcumOlayi("sepete-ekleme", { urunIdleri: id ? [String(id)] : [] });
    };
    const tercih = () => setTercihAcik(true);
    document.addEventListener("submit", gonderim, true);
    window.addEventListener(TERCIH_OLAYI, tercih);
    return () => {
      document.removeEventListener("submit", gonderim, true);
      window.removeEventListener(TERCIH_OLAYI, tercih);
    };
  }, []);

  const karar = (k: "evet" | "hayir") => {
    const geriAlindi = izin === "evet" && k === "hayir";
    izinKaydet(k);
    setTercihAcik(false);
    if (geriAlindi) {
      izleyiciCerezleriniSil();
      window.location.reload();
    }
  };

  if (izin === "bilinmiyor" || (izin !== "sorulmadi" && !tercihAcik)) return null;

  const araclar = [metaId && "Meta (Facebook, Instagram)", googleId && "Google"].filter(Boolean).join(" ve ");

  return (
    <section
      aria-label="Çerez tercihi"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-marka border border-cizgi bg-yuzey p-4 text-sm shadow-2xl sm:inset-x-4 sm:bottom-4"
    >
      <p className="font-bold text-metin">Çerez tercihin</p>
      <p className="mt-1 text-metin-2">
        Reklamlarımızın işe yarayıp yaramadığını ölçmek için {araclar} çerezlerini kullanmak
        istiyoruz. Reddedersen site aynen çalışır; sepetin ve oturumun için gereken çerezler
        bundan etkilenmez.{" "}
        <Link href="/yasal/cerez-politikasi" className="font-bold text-mavi-koyu hover:underline">
          Çerez politikası
        </Link>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => karar("hayir")}
          className="min-h-11 rounded-full border-[1.5px] border-metin-2 px-4 font-bold text-metin transition hover:bg-yuzey-sicak"
        >
          Reddet
        </button>
        <button
          type="button"
          onClick={() => karar("evet")}
          className="min-h-11 rounded-full border-[1.5px] border-metin-2 px-4 font-bold text-metin transition hover:bg-yuzey-sicak"
        >
          Kabul et
        </button>
      </div>
    </section>
  );
}
