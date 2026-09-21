"use client";

import { useRef, useState } from "react";

/**
 * Dosya seçme alanı, sürükle bırak eklentisiyle.
 *
 * İçindeki şey düz bir `<input type="file">`: JavaScript kapalıyken kutu
 * olduğu gibi çalışıyor, tıklayıp dosya seçiliyor. Üstüne eklenen tek şey
 * dosyaları alanın üzerine bırakabilmek ve kaç dosya seçildiğini görmek —
 * telefon galerisinden sekiz fotoğraf seçtikten sonra "gerçekten seçildi mi"
 * sorusu kalmasın (K-41).
 */
export default function DosyaBirak({
  ad,
  kabul,
  etiket,
}: {
  ad: string;
  kabul: string;
  etiket: string;
}) {
  const girdi = useRef<HTMLInputElement>(null);
  const [uzerinde, setUzerinde] = useState(false);
  const [secilen, setSecilen] = useState<string[]>([]);

  function birakildi(olay: React.DragEvent) {
    olay.preventDefault();
    setUzerinde(false);
    const dosyalar = olay.dataTransfer?.files;
    if (!dosyalar || dosyalar.length === 0 || !girdi.current) return;
    // Bırakılan dosyalar gerçek `input`'a aktarılıyor; form yine düz form.
    girdi.current.files = dosyalar;
    setSecilen([...dosyalar].map((d) => d.name));
  }

  return (
    <label
      onDragOver={(o) => {
        o.preventDefault();
        setUzerinde(true);
      }}
      onDragLeave={() => setUzerinde(false)}
      onDrop={birakildi}
      className={`flex min-w-[220px] flex-1 cursor-pointer flex-col gap-1.5 rounded-marka border-2 border-dashed p-3 transition ${
        uzerinde ? "border-mercan bg-mercan-soluk" : "border-cizgi bg-zemin-2"
      }`}
    >
      <span className="text-xs font-bold text-metin-2">{etiket}</span>
      <input
        ref={girdi}
        type="file"
        name={ad}
        multiple
        required
        accept={kabul}
        onChange={(o) => setSecilen([...(o.target.files ?? [])].map((d) => d.name))}
        className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-mavi-soluk file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-mavi-koyu"
      />
      <span className="text-xs text-metin-3">
        {secilen.length === 0
          ? "Dosyaları buraya sürükleyip bırakabilirsin."
          : secilen.length === 1
            ? secilen[0]
            : `${secilen.length} dosya seçildi`}
      </span>
    </label>
  );
}
