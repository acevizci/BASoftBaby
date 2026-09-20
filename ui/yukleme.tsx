"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Gezinti çizgisi: bir bağlantıya tıklanıp yeni sayfa hazırlanırken sayfanın
 * en üstünde marka renklerinde ince bir şerit akıyor.
 *
 * **Neden `loading.tsx` kullanılmadı.** Next'in kendi bekleme ekranı sayfayı
 * bir Suspense sınırına alıyor; sunucu önce iskeleti, içeriği ise gizli bir
 * kutuda gönderip küçük bir betikle açıyor. JavaScript kapalı tarayıcıda o
 * betik çalışmadığı için içerik hiç görünmüyordu — yani bekleme göstergesi
 * uğruna sayfanın kendisi kayboluyordu. Denemede bu bire bir görüldü.
 *
 * Bu bileşen ise yalnızca tarayıcıda çalışıyor: sunucudan giden HTML'e hiç
 * karışmıyor. JavaScript kapalıyken gezinme zaten tam sayfa yüklemesiyle
 * olduğu ve tarayıcının kendi göstergesi çıktığı için bir eksik kalmıyor.
 */

/** Bir tıklamanın sayfa değiştirip değiştirmeyeceğini anlar. */
function gezinmeMi(olay: MouseEvent): boolean {
  if (olay.defaultPrevented || olay.button !== 0) return false;
  if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey) return false;

  const bag = (olay.target as HTMLElement | null)?.closest("a");
  if (!bag) return false;
  if (bag.target && bag.target !== "_self") return false;
  if (bag.hasAttribute("download")) return false;

  const adres = bag.getAttribute("href") ?? "";
  if (!adres || adres.startsWith("#")) return false;

  const hedef = new URL(bag.href, window.location.href);
  if (hedef.origin !== window.location.origin) return false;
  // Aynı sayfaya tıklanmışsa bekleme yok.
  return hedef.pathname + hedef.search !== window.location.pathname + window.location.search;
}

export default function YuklemeCizgisi() {
  const yol = usePathname();
  const sorgu = useSearchParams();
  const simdikiAdres = `${yol}?${sorgu}`;

  /**
   * Tıklama anındaki adres saklanıyor. Yeni sayfa gelene kadar adres aynı
   * kalıyor, yani çizgi görünüyor; adres değiştiği anda kendiliğinden
   * kayboluyor. Böylece "bitti" bilgisini ayrıca yakalamak gerekmiyor.
   */
  const [baslangic, setBaslangic] = useState<string | null>(null);
  const bekliyor = baslangic !== null && baslangic === simdikiAdres;

  useEffect(() => {
    const tiklama = (olay: MouseEvent) => {
      if (gezinmeMi(olay)) {
        setBaslangic(`${window.location.pathname}?${window.location.search.slice(1)}`);
      }
    };
    // Form gönderimleri de sayfa değiştiriyor (sepete ekle, sipariş ver).
    const gonderim = () =>
      setBaslangic(`${window.location.pathname}?${window.location.search.slice(1)}`);

    document.addEventListener("click", tiklama, true);
    document.addEventListener("submit", gonderim, true);
    return () => {
      document.removeEventListener("click", tiklama, true);
      document.removeEventListener("submit", gonderim, true);
    };
  }, []);

  if (!bekliyor) return null;

  return (
    <div
      className="yukleme-cizgisi fixed inset-x-0 top-0 z-50"
      role="status"
      aria-label="Sayfa yükleniyor"
    />
  );
}
