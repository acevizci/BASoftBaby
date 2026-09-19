"use client";

import { useSepet } from "@/ui/sepet-durumu";

export default function SepetSayaci() {
  const { toplamAdet } = useSepet();

  return (
    <span className="rounded-full bg-mercan-soluk px-3 py-1.5 text-xs font-bold text-mercan-koyu">
      Sepet{toplamAdet > 0 ? ` · ${toplamAdet}` : ""}
    </span>
  );
}
