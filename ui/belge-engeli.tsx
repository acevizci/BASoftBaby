import Link from "next/link";

/**
 * "Bu belge basılamaz" ekranı.
 *
 * Ödemesi tamamlanmamış ya da iptal edilmiş siparişin etiketi/faturası
 * hiç çizilmiyor; yerine sebebi ve gideceği yer yazıyor (K-54).
 *
 * Sipariş ayrıntısında bağlantı zaten çıkmıyor — ama adres çubuğuna elle
 * yazılabiliyor, yer imine alınabiliyor, eski sekmede açık kalabiliyor.
 * Görünmeyen bağlantı koruma değil; asıl kural burada.
 */
export default function BelgeEngeli({
  baslik,
  sebep,
  numara,
}: {
  baslik: string;
  sebep: string;
  /** Siparişe dönüş bağlantısı; ödeme durumu orada değiştiriliyor. */
  numara: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">{baslik}</h1>
      <div className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
        <p className="font-bold">Bu belge henüz basılamaz.</p>
        <p className="mt-1">{sebep}</p>
      </div>
      <Link
        href={`/yonetim/siparisler/${numara}`}
        className="self-start rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
      >
        Siparişe dön
      </Link>
    </div>
  );
}
