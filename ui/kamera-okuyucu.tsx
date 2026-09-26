"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sürekli okuyan kamera (K-176): Depo ekranında her barkodu okur ve
 * `onOku`ya verir; kapatılana kadar açık kalır.
 *
 * - Tarayıcının kendi `BarcodeDetector`'ı varsa (Android Chrome) o.
 * - Yoksa (iPhone Safari) ZXing; paket içinde, yalnızca kamera ilk
 *   açıldığında yükleniyor. Dışarıdan betik yok, içerik politikası aynı.
 * - Aynı kod 1,2 saniye içinde yeniden okunursa sayılmıyor: kamera barkodu
 *   saniyede birkaç kez görüyor. Aynı ürünü bilerek bir daha okutmak için
 *   kamerayı çekip geri getirmek yetiyor.
 * - Görüntü telefondan çıkmıyor; yalnızca okunan metin veriliyor.
 */

type Algilayici = { detect: (kaynak: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type Kontrol = { durdur: () => void; fener?: (acik: boolean) => Promise<void> };

const TEKRAR_MS = 1200;

export default function KameraOkuyucu({
  onOku,
  onKapat,
}: {
  onOku: (kod: string) => void;
  onKapat: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const kontrol = useRef<Kontrol | null>(null);
  const son = useRef<{ kod: string; zaman: number }>({ kod: "", zaman: 0 });
  const okuRef = useRef(onOku);
  const [hata, setHata] = useState("");
  const [fenerVar, setFenerVar] = useState(false);
  const [fener, setFener] = useState(false);

  useEffect(() => {
    okuRef.current = onOku;
  }, [onOku]);

  useEffect(() => {
    let bitti = false;
    const ver = (ham: string) => {
      const kod = ham.trim();
      if (!kod) return;
      const simdi = Date.now();
      if (son.current.kod === kod && simdi - son.current.zaman < TEKRAR_MS) {
        son.current.zaman = simdi;
        return;
      }
      son.current = { kod, zaman: simdi };
      okuRef.current(kod);
    };

    (async () => {
      try {
        const Yerli = (window as { BarcodeDetector?: new () => Algilayici }).BarcodeDetector;
        if (Yerli) {
          const akis = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          if (bitti || !video.current) {
            akis.getTracks().forEach((t) => t.stop());
            return;
          }
          video.current.srcObject = akis;
          await video.current.play();
          const iz = akis.getVideoTracks()[0];
          const yetenek = (iz?.getCapabilities?.() ?? {}) as { torch?: boolean };
          kontrol.current = {
            durdur: () => akis.getTracks().forEach((t) => t.stop()),
            fener: yetenek.torch
              ? (acik) =>
                  iz.applyConstraints({ advanced: [{ torch: acik } as MediaTrackConstraintSet] })
              : undefined,
          };
          setFenerVar(!!yetenek.torch);
          const algilayici = new Yerli();
          while (!bitti) {
            const bulunan = await algilayici.detect(video.current).catch(() => []);
            if (bulunan[0]?.rawValue) ver(bulunan[0].rawValue);
            await new Promise((r) => setTimeout(r, 150));
          }
          return;
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (bitti || !video.current) return;
        const okuyucu = new BrowserMultiFormatReader(undefined, {
          delayBetweenScanAttempts: 150,
          delayBetweenScanSuccess: 150,
        });
        const kontroller = await okuyucu.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          video.current,
          (sonuc) => {
            if (sonuc) ver(sonuc.getText());
          },
        );
        if (bitti) {
          kontroller.stop();
          return;
        }
        kontrol.current = { durdur: () => kontroller.stop(), fener: kontroller.switchTorch };
        setFenerVar(!!kontroller.switchTorch);
      } catch (e) {
        const ad = (e as { name?: string })?.name;
        setHata(
          ad === "NotAllowedError"
            ? "Kamera izni verilmedi. Tarayıcının adres çubuğundaki kilit simgesinden kameraya izin ver, sayfayı yenile. O zamana kadar arama kutusunu kullanabilirsin."
            : "Kamera açılamadı. Arama kutusuna yazarak ya da el okuyucuyla devam edebilirsin.",
        );
      }
    })();

    return () => {
      bitti = true;
      kontrol.current?.durdur();
      kontrol.current = null;
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-marka bg-black">
      <video ref={video} playsInline muted className="aspect-[4/3] w-full object-cover" />
      {/* Barkodu ortalamak için kılavuz çizgi. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-mercan/80"
      />
      {hata && (
        <p className="absolute inset-x-0 top-0 bg-mercan-soluk px-3 py-2 text-xs font-semibold text-mercan-koyu">
          {hata}
        </p>
      )}
      <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 p-2">
        {fenerVar ? (
          <button
            type="button"
            onClick={async () => {
              const yeni = !fener;
              await kontrol.current?.fener?.(yeni).catch(() => {});
              setFener(yeni);
            }}
            className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-metin"
          >
            {fener ? "Feneri kapat" : "Fener"}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onKapat}
          className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-metin"
        >
          Kamerayı kapat
        </button>
      </div>
    </div>
  );
}
