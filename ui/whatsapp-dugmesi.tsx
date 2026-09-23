"use client";

import { usePathname } from "next/navigation";

/**
 * Sağ altta duran WhatsApp destek düğmesi (K-99).
 *
 * Ürün sayfasında hazır mesaj ürünün adını ve adresini taşıyor: müşteri
 * "bu ürün" diye yazdığında hangi ürün olduğunu sormak gerekmiyor. Ad,
 * tıklandığı anda sayfanın başlığından okunuyor — düzen hangi ürünün açık
 * olduğunu bilmiyor.
 *
 * Ödeme sayfasında çizilmiyor: form alanlarının ve "Siparişi ver"
 * düğmesinin üstüne binmesin, müşteri işlemi yarıda bırakmasın (K-84).
 */
export default function WhatsappDugmesi({ numara }: { numara: string }) {
  const yol = usePathname() ?? "";
  if (yol === "/odeme" || yol.startsWith("/odeme/")) return null;

  const genel = "Merhaba, bir sorum var.";
  const adres = (mesaj: string) => `https://wa.me/${numara}?text=${encodeURIComponent(mesaj)}`;

  return (
    <a
      href={adres(genel)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp'tan yazın"
      title="WhatsApp'tan yazın"
      onClick={(e) => {
        if (!yol.startsWith("/urun/")) return;
        const ad = document.querySelector("main h1")?.textContent?.trim();
        if (!ad) return;
        e.currentTarget.href = adres(
          `Merhaba, "${ad}" hakkında bir sorum var.\n${window.location.origin}${yol}`,
        );
      }}
      className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 print:hidden sm:bottom-6 sm:right-6"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7 fill-current">
        <path d="M16.004 3C8.826 3 3 8.826 3 16.004c0 2.294.6 4.535 1.74 6.51L3 29l6.65-1.71a12.96 12.96 0 0 0 6.354 1.62h.005C23.18 28.91 29 23.084 29 15.907 29 8.73 23.18 3 16.004 3Zm0 23.72h-.004a10.77 10.77 0 0 1-5.49-1.503l-.394-.234-3.946 1.015 1.053-3.845-.257-.395a10.73 10.73 0 0 1-1.648-5.754c0-5.94 4.834-10.774 10.79-10.774 5.94 0 10.77 4.72 10.77 10.66 0 5.94-4.834 10.83-10.874 10.83Zm5.91-8.066c-.324-.162-1.917-.946-2.214-1.054-.297-.108-.513-.162-.729.162-.216.324-.837 1.054-1.026 1.27-.189.216-.378.243-.702.081-.324-.162-1.368-.504-2.605-1.608-.963-.859-1.613-1.92-1.802-2.244-.189-.324-.02-.499.142-.66.146-.145.324-.378.486-.567.162-.189.216-.324.324-.54.108-.216.054-.405-.027-.567-.081-.162-.729-1.757-.999-2.405-.263-.632-.53-.546-.729-.556l-.621-.011a1.19 1.19 0 0 0-.864.405c-.297.324-1.134 1.108-1.134 2.702 0 1.594 1.161 3.134 1.323 3.35.162.216 2.285 3.49 5.536 4.894.774.334 1.378.534 1.849.683.777.247 1.484.212 2.043.129.623-.093 1.917-.784 2.187-1.54.27-.757.27-1.405.189-1.54-.081-.135-.297-.216-.621-.378Z" />
      </svg>
    </a>
  );
}
