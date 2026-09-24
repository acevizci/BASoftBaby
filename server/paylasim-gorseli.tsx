import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { YEREL_KLASOR } from "@/server/gorsel-depo";

/**
 * Paylaşım görselleri (K-127): WhatsApp, Instagram, Facebook ve X'te bağlantı
 * paylaşılınca çıkan kart. Ana sayfa ve kategorilerde hiç görsel yoktu, boş
 * bir kutu çıkıyordu.
 *
 * Kart mağazanın renkleriyle: krem zemin, logo, başlık ve (varsa) ürün
 * fotoğrafları. Fotoğraflar JPEG'e çevrilip gömülüyor; görsel çizicisi
 * (satori) WebP okumuyor.
 *
 * **Hiçbir parçası kartı düşürmüyor.** Yazı tipi, logo ya da bir fotoğraf
 * okunamazsa o parça olmadan çiziliyor: yarım kart, hiç kart olmamasından
 * iyi.
 */

export const BOYUT = { width: 1200, height: 630 };

const ZEMIN = "#FFFCF7";
const MERCAN = "#C2433A";
const METIN = "#2C2721";
const SOLUK = "#6B6258";

/**
 * Okunamazsa `undefined`. Yollar sabit yazılıyor: derleyici hangi dosyaların
 * sunucu paketine gireceğini buradan anlıyor; değişkenle yazılınca bütün
 * projeyi pakete katıyordu.
 */
async function oku(okuma: Promise<Buffer>): Promise<Buffer | undefined> {
  try {
    return await okuma;
  } catch {
    return undefined;
  }
}

/** Fotoğrafı kare JPEG'e çevirip veri adresi olarak döndürür. */
async function fotograf(yol: string, kenar: number): Promise<string | undefined> {
  try {
    let ham: Buffer;
    if (/^https?:\/\//.test(yol)) {
      const cevap = await fetch(yol);
      if (!cevap.ok) return undefined;
      ham = Buffer.from(await cevap.arrayBuffer());
    } else {
      // Yerelde yüklenen fotoğraflar `/yuklenen/ad.webp` (K-12).
      ham = await readFile(path.join(YEREL_KLASOR, path.basename(yol)));
    }
    const jpeg = await sharp(ham).resize(kenar, kenar, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function paylasimKarti(k: {
  baslik: string;
  altBaslik?: string;
  /** Sağda gösterilecek en çok üç fotoğraf. */
  fotograflar?: string[];
  /** Fiyat gibi vurgulu kısa satır. */
  vurgu?: string;
}): Promise<ImageResponse> {
  const [baloo, nunito, logo, ...fotolar] = await Promise.all([
    oku(readFile(path.join(process.cwd(), "assets", "fontlar", "baloo2-700.ttf"))),
    oku(readFile(path.join(process.cwd(), "assets", "fontlar", "nunitosans-600.ttf"))),
    oku(readFile(path.join(process.cwd(), "assets", "logo-rozet.png"))),
    ...(k.fotograflar ?? []).slice(0, 3).map((f, i) => fotograf(f, i === 0 ? 520 : 250)),
  ]);
  const gorseller = fotolar.filter((f): f is string => Boolean(f));
  const fontlar = [
    ...(baloo ? [{ name: "Baloo", data: baloo, weight: 700 as const }] : []),
    ...(nunito ? [{ name: "Nunito", data: nunito, weight: 600 as const }] : []),
  ];
  const uzun = k.baslik.length > 38;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: ZEMIN,
          padding: 55,
          gap: 40,
          fontFamily: "Nunito",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- ImageResponse düz img istiyor
            <img
              src={`data:image/png;base64,${logo.toString("base64")}`}
              width={150}
              height={150}
              alt=""
            />
          ) : (
            <div style={{ fontFamily: "Baloo", fontSize: 44, color: MERCAN }}>BASoftBaby</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                fontFamily: "Baloo",
                fontSize: uzun ? 54 : 68,
                lineHeight: 1.05,
                color: METIN,
              }}
            >
              {k.baslik}
            </div>
            {k.altBaslik && (
              <div style={{ fontSize: 30, color: SOLUK, lineHeight: 1.3 }}>
                {k.altBaslik.length > 110 ? `${k.altBaslik.slice(0, 107)}…` : k.altBaslik}
              </div>
            )}
            {k.vurgu && (
              <div style={{ fontFamily: "Baloo", fontSize: 44, color: MERCAN }}>{k.vurgu}</div>
            )}
          </div>
          <div style={{ fontSize: 24, color: SOLUK }}>basoftbaby.com</div>
        </div>
        {gorseller.length > 0 && (
          <div style={{ display: "flex", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse düz img istiyor */}
            <img src={gorseller[0]} width={gorseller.length > 1 ? 330 : 470} height={520} alt="" style={{ borderRadius: 28, objectFit: "cover" }} />
            {gorseller.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {gorseller.slice(1).map((g, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- ImageResponse düz img istiyor
                  <img key={i} src={g} width={200} height={252} alt="" style={{ borderRadius: 24, objectFit: "cover" }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    ),
    { ...BOYUT, fonts: fontlar.length ? fontlar : undefined },
  );
}
