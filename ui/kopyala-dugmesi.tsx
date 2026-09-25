"use client";

import { useState } from "react";

/** Metni panoya kopyalar; kısa bir süre "Kopyalandı" der. */
export default function KopyalaDugmesi({
  metin,
  className = "",
}: {
  metin: string;
  className?: string;
}) {
  const [oldu, setOldu] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(metin);
          setOldu(true);
          setTimeout(() => setOldu(false), 2000);
        } catch {
          // Pano izni yoksa (eski tarayıcı) kullanıcı bağlantıyı elle seçebiliyor.
        }
      }}
    >
      {oldu ? "Kopyalandı" : "Bağlantıyı kopyala"}
    </button>
  );
}
