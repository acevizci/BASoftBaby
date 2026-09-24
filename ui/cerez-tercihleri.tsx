"use client";

import { TERCIH_OLAYI } from "@/ui/olcum";

/** Alt bilgideki "Çerez tercihleri": onay bandını yeniden açıyor (K-124). */
export default function CerezTercihleri() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(TERCIH_OLAYI))}
      className="underline-offset-2 hover:text-metin hover:underline"
    >
      Çerez tercihleri
    </button>
  );
}
