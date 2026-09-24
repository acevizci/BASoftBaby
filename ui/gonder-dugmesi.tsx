"use client";

import { useFormStatus } from "react-dom";

/**
 * Gönderim sırasında beklediğini gösteren düğme.
 *
 * Form gönderilirken düğme kapanıyor ve yazısı değişiyor: müşteri "oldu mu
 * olmadı mı" diye ikinci kez basmıyor. Çift basma özellikle sepete eklemede
 * ve sipariş vermede sorun çıkarıyordu.
 *
 * JavaScript kapalıyken bu bileşen hiç çalışmıyor, düğme düz bir gönder
 * düğmesi olarak kalıyor — yani davranış bozulmuyor, yalnızca bekleme
 * göstergesi olmuyor.
 */
export default function GonderDugmesi({
  children,
  bekleyen,
  className = "",
  devreDisi = false,
  name,
  value,
}: {
  children: React.ReactNode;
  /** Gönderim sürerken yazılacak metin; verilmezse aynı metin kalıyor. */
  bekleyen?: React.ReactNode;
  className?: string;
  devreDisi?: boolean;
  /** Bir formda birden çok düğme varsa hangisine basıldığı. */
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={devreDisi || pending}
      aria-busy={pending}
      className={`${className} ${pending ? "opacity-70" : ""}`}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]"
        />
      )}
      {pending ? (bekleyen ?? children) : children}
    </button>
  );
}
