"use client";

import { useRef, useState } from "react";
import { kucult } from "@/ui/dosya-birak";

const EN_COK = 3;

/**
 * Değerlendirme formunda fotoğraf seçimi (K-134). Seçilen fotoğraflar
 * göndermeden önce tarayıcıda küçültülüyor: telefon fotoğrafı 5-8 MB,
 * sunucunun istek sınırı 4,5 MB. JavaScript kapalıysa düz dosya kutusu.
 */
export default function YorumFotografSecici() {
  const girdi = useRef<HTMLInputElement>(null);
  const [onizleme, setOnizleme] = useState<string[]>([]);
  const [not, setNot] = useState("");

  async function secildi(e: React.ChangeEvent<HTMLInputElement>) {
    const secilen = [...(e.target.files ?? [])].slice(0, EN_COK);
    setNot(
      (e.target.files?.length ?? 0) > EN_COK ? `En çok ${EN_COK} fotoğraf; ilk ${EN_COK} tanesi alındı.` : "",
    );
    const kucuk = await Promise.all(secilen.map((d) => kucult(d, 1600, 1_200_000).then((s) => s.dosya)));
    const aktarim = new DataTransfer();
    kucuk.forEach((d) => aktarim.items.add(d));
    if (girdi.current) girdi.current.files = aktarim.files;
    setOnizleme((eski) => {
      eski.forEach((u) => URL.revokeObjectURL(u));
      return kucuk.map((d) => URL.createObjectURL(d));
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-metin-2">Fotoğraf (isteğe bağlı, en çok {EN_COK})</span>
      <input
        ref={girdi}
        type="file"
        name="fotograflar"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        onChange={secildi}
        className="text-sm file:mr-3 file:rounded-full file:border file:border-cizgi file:bg-yuzey file:px-3 file:py-1.5 file:text-xs file:font-bold"
      />
      {onizleme.length > 0 && (
        <div className="flex gap-2">
          {onizleme.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element -- yerel önizleme (blob:)
            <img key={u} src={u} alt="" className="h-16 w-16 rounded-[10px] object-cover" />
          ))}
        </div>
      )}
      {not && <span className="text-xs text-sari-koyu">{not}</span>}
      <span className="text-xs text-metin-3">
        Ürün üstünde ya da bebeğin üzerinde. Yayımlanmadan önce bakıyoruz; konum bilgisi siliniyor.
      </span>
    </div>
  );
}
