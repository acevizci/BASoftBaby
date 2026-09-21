import { fiyatYaz } from "@/ui/katalog-bicim";
import type { Sutun } from "@/server/rapor";

/**
 * Günlük/aylık ciro sütun grafiği.
 *
 * **Tek renk.** Tek bir ölçü var (ciro) ve büyüklüğü sütunun boyu taşıyor;
 * renk hiçbir şey kodlamıyor, o yüzden çeşitlenmesine gerek yok. Renkli bir
 * dizi olmadığı için gösterge de yok — başlık neyin çizildiğini söylüyor.
 *
 * **Sunucuda üretilen SVG.** İstemci tarafında grafik kütüphanesi yok:
 * sayfa JavaScript kapalıyken de grafiği gösteriyor. İpucu için her sütunun
 * içinde `<title>` var — tarayıcının kendi ipucu balonu, JavaScript
 * gerektirmiyor (K-42).
 *
 * Biçim kuralları: sütun en fazla 24 piksel, veri ucu 4 piksel yuvarlatılmış,
 * taban köşeli, komşular arasında 2 piksellik boşluk, ızgara saç teli
 * inceliğinde. Sayı yalnızca en yüksek sütunun üstünde — her sütuna sayı
 * yazmak okunmayan bir kalabalık.
 */

const YUKSEKLIK = 180;
const UST_BOSLUK = 24;
const ALT_BOSLUK = 22;
const SOL_BOSLUK = 56;
const EN_KALIN = 24;
const ARA = 2;

/** Eksen için yukarı yuvarlanmış temiz bir üst sınır. */
function ustSinir(enFazla: number): number {
  if (enFazla <= 0) return 1;
  const basamak = 10 ** Math.floor(Math.log10(enFazla));
  for (const kat of [1, 2, 2.5, 5, 10]) {
    const aday = basamak * kat;
    if (aday >= enFazla) return aday;
  }
  return basamak * 10;
}

/** Eksen için kısa: 5b ₺. Yer dar, sayının kendisi eksende zaten var. */
function kisaTutar(kurus: number): string {
  const lira = kurus / 100;
  if (lira >= 1000) return `${Math.round(lira / 1000)}b ₺`;
  return `${Math.round(lira)} ₺`;
}

/**
 * En yüksek sütunun üstündeki etiket için kesin değer: kuruşsuz lira.
 *
 * Eksendeki kısaltmayı tekrarlamak yerine bilgi ekliyor — "5b ₺" yazan bir
 * eksenin yanında yine "5b ₺" yazmak boşa mürekkep.
 */
function tamTutar(kurus: number): string {
  return `${Math.round(kurus / 100).toLocaleString("tr-TR")} ₺`;
}

export default function SutunGrafik({
  sutunlar,
  baslik,
}: {
  sutunlar: Sutun[];
  baslik: string;
}) {
  if (sutunlar.length === 0) return null;

  const enFazla = Math.max(...sutunlar.map((s) => s.deger));
  const tavan = ustSinir(enFazla);
  const genislik = Math.max(320, SOL_BOSLUK + sutunlar.length * 28 + 12);
  const alan = genislik - SOL_BOSLUK - 8;
  const adim = alan / sutunlar.length;
  const kalinlik = Math.min(EN_KALIN, Math.max(3, adim - ARA));
  const taban = YUKSEKLIK - ALT_BOSLUK;
  const enFazlaIndeks = sutunlar.findIndex((s) => s.deger === enFazla);

  // Etiketler kalabalıklaşınca seyreltiliyor: üst üste binen yazı okunmuyor.
  const etiketAdimi = Math.ceil(sutunlar.length / 16);

  const cizgiler = [0, 0.5, 1];

  return (
    <figure className="m-0">
      <figcaption className="text-sm font-bold">{baslik}</figcaption>
      <div className="mt-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${genislik} ${YUKSEKLIK}`}
          width={genislik}
          height={YUKSEKLIK}
          role="img"
          aria-label={`${baslik}. En yüksek ${fiyatYaz(enFazla)}.`}
          className="max-w-full"
        >
          {cizgiler.map((o) => {
            const y = UST_BOSLUK + (taban - UST_BOSLUK) * (1 - o);
            return (
              <g key={o}>
                <line
                  x1={SOL_BOSLUK}
                  x2={genislik - 8}
                  y1={y}
                  y2={y}
                  stroke="var(--cizgi)"
                  strokeWidth={1}
                />
                <text
                  x={SOL_BOSLUK - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="rakam"
                  fill="var(--metin-3)"
                  fontSize={11}
                >
                  {kisaTutar(tavan * o)}
                </text>
              </g>
            );
          })}

          {sutunlar.map((s, i) => {
            const boy = tavan === 0 ? 0 : ((taban - UST_BOSLUK) * s.deger) / tavan;
            const x = SOL_BOSLUK + i * adim + (adim - kalinlik) / 2;
            const y = taban - boy;
            return (
              <g key={i}>
                {boy > 0 && (
                  <path
                    d={sutunYolu(x, y, kalinlik, boy)}
                    fill="var(--grafik)"
                  >
                    <title>{`${s.etiket}: ${fiyatYaz(s.deger)}`}</title>
                  </path>
                )}
                {i % etiketAdimi === 0 && (
                  <text
                    x={x + kalinlik / 2}
                    y={YUKSEKLIK - 6}
                    textAnchor="middle"
                    className="rakam"
                    fill="var(--metin-3)"
                    fontSize={11}
                  >
                    {s.etiket}
                  </text>
                )}
                {i === enFazlaIndeks && s.deger > 0 && (
                  // Kenardaki sütunun etiketi çizim alanının dışına taşmasın
                  // diye hizalama uca göre değişiyor; kırpılmış etiket
                  // etiketsizden kötü.
                  <text
                    x={x + kalinlik / 2}
                    y={y - 6}
                    textAnchor={
                      i < 2 ? "start" : i > sutunlar.length - 3 ? "end" : "middle"
                    }
                    className="rakam"
                    fill="var(--metin-2)"
                    fontSize={11}
                    fontWeight={700}
                  >
                    {tamTutar(s.deger)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}

/** Üstü 4 piksel yuvarlak, tabanı köşeli sütun. */
function sutunYolu(x: number, y: number, en: number, boy: number): string {
  const r = Math.min(4, en / 2, boy);
  return [
    `M ${x} ${y + boy}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + en - r} ${y}`,
    `Q ${x + en} ${y} ${x + en} ${y + r}`,
    `L ${x + en} ${y + boy}`,
    "Z",
  ].join(" ");
}
