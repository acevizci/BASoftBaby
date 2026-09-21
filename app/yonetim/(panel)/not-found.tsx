import Link from "next/link";

/**
 * Panelde bulunamayan sayfa.
 *
 * Panelin kendi çerçevesinin içinde çıkıyor: menü yerinde kalıyor, yani
 * silinmiş bir ürünün adresine tıklayan mağaza sahibi kaybolmuyor (K-48).
 */
export default function PanelBulunamadi() {
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <p className="rakam font-baslik text-4xl font-bold text-mercan-koyu">404</p>
      <h1 className="text-2xl">Bu sayfa yok</h1>
      <p className="max-w-md text-sm text-metin-2">
        Aradığın kayıt silinmiş ya da adres yanlış olabilir. Soldaki menüden devam
        edebilirsin.
      </p>
      <Link
        href="/yonetim"
        className="rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
      >
        Özet ekranına dön
      </Link>
    </div>
  );
}
