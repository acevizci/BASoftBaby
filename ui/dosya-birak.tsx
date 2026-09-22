"use client";

import { useRef, useState } from "react";
import { EN_GENIS, GOVDE_SINIRI, HEDEF_BAYT, boyutYaz } from "@/ui/fotograf-sinirlari";

/** Hedef boyuta inene kadar denenen webp kaliteleri. */
const KALITELER = [0.85, 0.75, 0.65, 0.55];

const KUCULTULEBILIR = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type Sonuc = {
  ad: string;
  once: number;
  sonra: number;
  genislik?: number;
  yukseklik?: number;
};

/**
 * Fotoğrafı tarayıcıda küçültür; yapamazsa olduğu gibi döner.
 *
 * `createImageBitmap` telefonun dönme bilgisini uyguluyor, yoksa fotoğraf yan
 * yatardı. webp yazamayan tarayıcı (eski Safari) png döndürüyor; o zaman beyaz
 * zemine jpeg yazılıyor, png 1600 pikselde bile birkaç MB tutabiliyor.
 */
async function kucult(
  dosya: File,
  enGenis: number = EN_GENIS,
  hedefBayt: number = HEDEF_BAYT,
): Promise<{ dosya: File; sonuc: Sonuc }> {
  const aynen = (g?: number, y?: number) => ({
    dosya,
    sonuc: { ad: dosya.name, once: dosya.size, sonra: dosya.size, genislik: g, yukseklik: y },
  });
  if (!KUCULTULEBILIR.has(dosya.type)) return aynen();
  try {
    const resim = await createImageBitmap(dosya, { imageOrientation: "from-image" });
    const oran = Math.min(1, enGenis / Math.max(resim.width, resim.height));
    const genislik = Math.round(resim.width * oran);
    const yukseklik = Math.round(resim.height * oran);
    if (oran === 1 && dosya.size <= hedefBayt) {
      resim.close();
      return aynen(genislik, yukseklik);
    }
    const tuval = document.createElement("canvas");
    tuval.width = genislik;
    tuval.height = yukseklik;
    const cizim = tuval.getContext("2d");
    if (!cizim) return aynen(genislik, yukseklik);
    cizim.drawImage(resim, 0, 0, genislik, yukseklik);
    resim.close();

    const yaz = (tur: string, kalite: number) =>
      new Promise<Blob | null>((cozum) => tuval.toBlob(cozum, tur, kalite));

    let tur = "image/webp";
    let blob: Blob | null = null;
    for (const kalite of KALITELER) {
      blob = await yaz(tur, kalite);
      if (blob && tur === "image/webp" && blob.type !== "image/webp") {
        // webp yazamayan tarayıcı: şeffaf yerler siyah çıkmasın.
        cizim.globalCompositeOperation = "destination-over";
        cizim.fillStyle = "#ffffff";
        cizim.fillRect(0, 0, genislik, yukseklik);
        tur = "image/jpeg";
        blob = await yaz(tur, kalite);
      }
      if (blob && blob.size <= hedefBayt) break;
    }
    if (!blob || blob.size >= dosya.size) return aynen(genislik, yukseklik);

    const uzanti = blob.type === "image/webp" ? "webp" : "jpg";
    const ad = dosya.name.replace(/\.[^.]*$/, "") || "fotograf";
    return {
      dosya: new File([blob], `${ad}.${uzanti}`, { type: blob.type }),
      sonuc: { ad: dosya.name, once: dosya.size, sonra: blob.size, genislik, yukseklik },
    };
  } catch {
    return aynen();
  }
}

/** Kartlar ve galeri kare; kare olmayanın kenarları kırpılıyor. */
function uyari(s: Sonuc, kare: boolean): string | null {
  if (!s.genislik || !s.yukseklik) return null;
  if (Math.max(s.genislik, s.yukseklik) < 1000) return "küçük, sitede bulanık görünebilir";
  // Banner kırpılmıyor; kare olmaması orada bir sorun değil (K-89).
  if (!kare) return null;
  const oran = s.genislik / s.yukseklik;
  if (oran < 0.9 || oran > 1.1) return "kare değil, kartlarda kenarları kırpılır";
  return null;
}

/**
 * Dosya seçme alanı, sürükle bırak eklentisiyle.
 *
 * İçindeki şey düz bir `<input type="file">`: JavaScript kapalıyken kutu
 * olduğu gibi çalışıyor, tıklayıp dosya seçiliyor. Üstüne eklenen şeyler
 * dosyaları alanın üzerine bırakabilmek, kaç dosya seçildiğini görmek —
 * telefon galerisinden sekiz fotoğraf seçtikten sonra "gerçekten seçildi mi"
 * sorusu kalmasın (K-41) — ve `kucult` açıksa fotoğrafları göndermeden önce
 * küçültüp her birinin ne kadar küçüldüğünü göstermek.
 *
 * Küçültme sürerken ve seçilenler hâlâ sınırın üstündeyse girdiye bir
 * geçerlilik hatası konuyor: tarayıcı formu göndermiyor, nedenini kutunun
 * yanında söylüyor.
 */
export default function DosyaBirak({
  ad,
  kabul,
  etiket,
  kucult: kucultAcik = false,
  tekli = false,
  zorunlu = true,
  enGenis,
  hedefBayt,
  kare = true,
}: {
  ad: string;
  kabul: string;
  etiket: string;
  /** Fotoğrafları göndermeden önce tarayıcıda küçült. */
  kucult?: boolean;
  /** Tek dosya: banner resmi gibi (K-89). */
  tekli?: boolean;
  zorunlu?: boolean;
  /** Küçültmenin en uzun kenarı; banner ürün fotoğrafından geniş. */
  enGenis?: number;
  hedefBayt?: number;
  /** Kare olmayan görsel için uyarı; kartlar kare, banner değil. */
  kare?: boolean;
}) {
  const girdi = useRef<HTMLInputElement>(null);
  /** Arka arkaya iki seçim yapılırsa yalnızca sonuncusu yazılsın. */
  const sira = useRef(0);
  const [uzerinde, setUzerinde] = useState(false);
  const [secilen, setSecilen] = useState<string[]>([]);
  const [sonuclar, setSonuclar] = useState<Sonuc[]>([]);
  const [durum, setDurum] = useState<{ tur: "hazirlaniyor" | "buyuk"; metin: string } | null>(
    null,
  );

  async function isle(dosyalar: FileList) {
    const kutu = girdi.current;
    if (!kutu) return;
    const benimSiram = ++sira.current;
    const liste = [...dosyalar];
    setSecilen(liste.map((d) => d.name));
    setSonuclar([]);

    if (!kucultAcik || liste.length === 0) {
      kutu.setCustomValidity("");
      setDurum(null);
      return;
    }

    const hazirlaniyor = "Fotoğraflar küçültülüyor, birkaç saniye bekle.";
    kutu.setCustomValidity(hazirlaniyor);
    setDurum({ tur: "hazirlaniyor", metin: hazirlaniyor });

    const islenen: Awaited<ReturnType<typeof kucult>>[] = [];
    for (const dosya of liste) islenen.push(await kucult(dosya, enGenis, hedefBayt));
    if (benimSiram !== sira.current) return;

    let gonderilen = liste;
    try {
      const aktarim = new DataTransfer();
      for (const i of islenen) aktarim.items.add(i.dosya);
      kutu.files = aktarim.files;
      gonderilen = islenen.map((i) => i.dosya);
      setSonuclar(islenen.map((i) => i.sonuc));
    } catch {
      // Dosya listesini değiştiremeyen tarayıcı: özgün dosyalar gidiyor,
      // aşağıdaki boyut kontrolü onlarla yapılıyor.
    }

    const toplam = gonderilen.reduce((t, d) => t + d.size, 0);
    if (toplam > GOVDE_SINIRI) {
      const metin = `Seçilenler birlikte ${boyutYaz(toplam)}, tek seferde en fazla ${boyutYaz(GOVDE_SINIRI)} gönderilebiliyor. Daha az fotoğraf seçip birkaç seferde yükle.`;
      kutu.setCustomValidity(metin);
      setDurum({ tur: "buyuk", metin });
      return;
    }
    kutu.setCustomValidity("");
    setDurum(null);
  }

  function birakildi(olay: React.DragEvent) {
    olay.preventDefault();
    setUzerinde(false);
    const dosyalar = olay.dataTransfer?.files;
    if (!dosyalar || dosyalar.length === 0 || !girdi.current) return;
    // Bırakılan dosyalar gerçek `input`'a aktarılıyor; form yine düz form.
    girdi.current.files = dosyalar;
    void isle(dosyalar);
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
        multiple={!tekli}
        required={zorunlu}
        accept={kabul}
        onChange={(o) => {
          if (o.target.files) void isle(o.target.files);
        }}
        className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-mavi-soluk file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-mavi-koyu"
      />
      {sonuclar.length === 0 && (
        <span className="text-xs text-metin-3">
          {secilen.length === 0
            ? "Dosyaları buraya sürükleyip bırakabilirsin."
            : secilen.length === 1
              ? secilen[0]
              : `${secilen.length} dosya seçildi`}
        </span>
      )}
      {sonuclar.length > 0 && (
        <ul className="rakam flex flex-col gap-0.5 text-xs text-metin-3">
          {sonuclar.map((s, i) => {
            const not = uyari(s, kare);
            return (
              <li key={`${s.ad}-${i}`}>
                <span className="text-metin-2">{s.ad}</span>
                {" · "}
                {s.sonra < s.once
                  ? `${boyutYaz(s.once)} → ${boyutYaz(s.sonra)}`
                  : boyutYaz(s.sonra)}
                {s.genislik && s.yukseklik ? ` · ${s.genislik}×${s.yukseklik}` : ""}
                {not && <span className="font-semibold text-sari-koyu"> · {not}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {durum && (
        <span
          role={durum.tur === "buyuk" ? "alert" : "status"}
          className={`text-xs font-semibold ${durum.tur === "buyuk" ? "text-mercan-koyu" : "text-metin-2"}`}
        >
          {durum.metin}
        </span>
      )}
    </label>
  );
}
