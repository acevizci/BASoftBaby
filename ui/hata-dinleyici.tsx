"use client";

import { useEffect } from "react";
import { hataBildir } from "@/ui/hata-bildir";

/**
 * Sayfa çizildikten sonra olan hatalar (K-121): bir düğmeye basınca patlayan
 * kod, yakalanmamış bir `Promise`. Bunlar hata ekranını açmıyor, yalnızca
 * düğme "çalışmıyor" — müşteri söylemezse kimse bilmiyor.
 *
 * Yalnızca kendi dosyalarımızdan çıkan hatalar gönderiliyor; tarayıcı
 * eklentilerinin hataları kayda girmiyor.
 */
export default function HataDinleyici() {
  useEffect(() => {
    const hata = (e: ErrorEvent) => {
      if (e.filename && !e.filename.startsWith(window.location.origin)) return;
      const h = e.error instanceof Error ? e.error : null;
      hataBildir({ mesaj: h ? `${h.name}: ${h.message}` : e.message, yigin: h?.stack });
    };
    const reddedildi = (e: PromiseRejectionEvent) => {
      const h = e.reason instanceof Error ? e.reason : null;
      hataBildir({
        mesaj: h
          ? `${h.name}: ${h.message}`
          : `Unhandled rejection: ${String(e.reason).slice(0, 200)}`,
        yigin: h?.stack,
      });
    };
    window.addEventListener("error", hata);
    window.addEventListener("unhandledrejection", reddedildi);
    return () => {
      window.removeEventListener("error", hata);
      window.removeEventListener("unhandledrejection", reddedildi);
    };
  }, []);
  return null;
}
