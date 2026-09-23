"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Telefon kamerasıyla barkod okutma (K-107).
 *
 * Tarayıcının kendi `BarcodeDetector`'ı kullanılıyor: Android Chrome'da
 * var, iPhone Safari'de yok. Yoksa düğme hiç çıkmıyor; arama kutusuna elle
 * yazmak ya da el okuyucu (klavye gibi yazıyor) her yerde çalışıyor.
 *
 * Okunan değer düğmenin içinde durduğu formdaki `alan` kutusuna yazılıp form
 * gönderiliyor.
 */

type Algilayici = { detect: (kaynak: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (secenek?: { formats?: string[] }) => Algilayici;
  }
}

export default function BarkodOkuyucu({ alan }: { alan: string }) {
  // Sunucuda yok sayılıyor, tarayıcıda bir kez bakılıyor; ilk boyamayla
  // uyuşmazlık çıkmıyor.
  const destek = useSyncExternalStore(
    () => () => {},
    () => "BarcodeDetector" in window,
    () => false,
  );
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState("");
  const dugme = useRef<HTMLButtonElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!acik) return;
    let akis: MediaStream | undefined;
    let bitti = false;
    const form = dugme.current?.form;

    (async () => {
      try {
        akis = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = akis;
        await video.current.play();
        const algilayici = new window.BarcodeDetector!();
        while (!bitti) {
          const bulunan = await algilayici.detect(video.current).catch(() => []);
          if (bulunan[0]?.rawValue && form) {
            const kutu = form.elements.namedItem(alan);
            if (kutu instanceof HTMLInputElement) kutu.value = bulunan[0].rawValue;
            bitti = true;
            setAcik(false);
            form.requestSubmit();
            return;
          }
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch {
        setHata("Kamera açılamadı. Tarayıcıya kamera izni vermen gerekiyor.");
        setAcik(false);
      }
    })();

    return () => {
      bitti = true;
      akis?.getTracks().forEach((t) => t.stop());
    };
  }, [acik, alan]);

  if (!destek) return null;

  return (
    <>
      <button
        ref={dugme}
        type="button"
        onClick={() => {
          setHata("");
          setAcik(true);
        }}
        className="rounded-full border border-cizgi bg-yuzey px-4 py-2 text-sm font-bold text-metin-2 transition hover:border-metin-3"
      >
        📷 Kamerayla okut
      </button>
      {hata && <span className="text-xs text-mercan-koyu">{hata}</span>}
      {acik && (
        <div
          role="dialog"
          aria-label="Barkod okut"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-4"
        >
          <video ref={video} playsInline muted className="max-h-[70vh] w-full max-w-md rounded-marka" />
          <p className="text-sm text-white">Barkodu kameraya tut.</p>
          <button
            type="button"
            onClick={() => setAcik(false)}
            className="rounded-full bg-white px-5 py-2 text-sm font-bold text-metin"
          >
            Vazgeç
          </button>
        </div>
      )}
    </>
  );
}
