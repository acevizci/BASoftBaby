"use client";

import Link from "next/link";

/**
 * Beklenmedik hata ekranı.
 *
 * Next.js'in varsayılanı çıplak bir İngilizce ekran; müşteri siparişini
 * kaybettiğini sanıyor. Burada ne olduğu Türkçe yazıyor ve iki çıkış yolu
 * var: tekrar dene, ya da sipariş takibine git (K-48).
 *
 * Hata sayfası istemci bileşeni olmak zorunda (Next.js kuralı) ve kendi
 * `<html>`'ini çizmiyor — kök düzenin içinde çalışıyor. Mağaza çerçevesi
 * burada kasten yok: çerçeveyi çizen veri sorgusu da patlamış olabilir.
 */
export default function Hata({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-4 py-16 text-center">
      <h1 className="text-2xl sm:text-3xl">Bir şeyler ters gitti</h1>
      <p className="mt-3 text-sm text-metin-2">
        Beklenmedik bir hata oldu. Sipariş verdiysen siparişin kaybolmadı — sipariş
        numaranla takip edebilirsin.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-dugme px-6 py-2.5 font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Tekrar dene
        </button>
        <Link
          href="/"
          className="rounded-full border border-cizgi bg-yuzey px-6 py-2.5 font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
        >
          Ana sayfa
        </Link>
        <Link
          href="/siparis-takip"
          className="rounded-full border border-cizgi bg-yuzey px-6 py-2.5 font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
        >
          Sipariş takibi
        </Link>
      </div>

      {/* Hata kimliği: müşteri destekle konuşurken bunu söyleyince kaydı
          günlüklerde bulunabiliyor. Hatanın kendi metni yazılmıyor — içinde
          teknik ayrıntı olabilir. */}
      {error.digest && (
        <p className="mt-8 text-xs text-metin-3">
          Hata kodu: <span className="rakam">{error.digest}</span>
        </p>
      )}
    </main>
  );
}
