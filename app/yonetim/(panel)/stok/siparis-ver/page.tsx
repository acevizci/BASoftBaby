import Link from "next/link";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { PENCERE_GUN } from "@/server/satis-hizi";
import { tedarikciAdlari, tedarikGruplari } from "@/server/tedarik";
import { MARKA } from "@/server/urun-beslemesi";
import TedarikKarti from "@/ui/tedarik-karti";
import { HEDEFLER, hedefCoz } from "./hedef";

export const dynamic = "force-dynamic";

/**
 * Sipariş ver (K-179): satış hızına göre öneri (K-106), tedarikçiye göre
 * gruplu; her tedarikçiye hazır WhatsApp mesajı. Hedef, stoğun kaç gün
 * yetmesi istendiği; adreste taşınıyor.
 */
export default async function SiparisVer({ searchParams }: PageProps<"/yonetim/stok/siparis-ver">) {
  await yoneticiGerekli();

  const hedef = hedefCoz((await searchParams).hedef);
  const [gruplar, tedarikciler] = await Promise.all([tedarikGruplari(hedef), tedarikciAdlari()]);
  const toplam = gruplar.reduce((t, g) => t + g.satirlar.reduce((x, s) => x + s.oneri, 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Sipariş ver</h1>
      <p className="text-sm text-metin-2">
        Son {PENCERE_GUN} günün satışına göre stoğun seçtiğin süre yetmesi için ne alman gerektiği,
        tedarikçiye göre. Adetleri düzelt, mesajı WhatsApp&apos;ta aç ya da kopyala. Tedarikçi, mal
        gelirken Depo&apos;da ya da burada ürün başına yazılıyor.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-metin-2">Stok yetsin:</span>
        {HEDEFLER.map((h) => (
          <Link
            key={h}
            href={`/yonetim/stok/siparis-ver?hedef=${h}`}
            aria-current={hedef === h ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              hedef === h
                ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                : "border-cizgi text-metin-2 hover:border-metin-3"
            }`}
          >
            {h} gün
          </Link>
        ))}
        {/* Dosya indirme: Link istemci tarafında gezinmeye çalışır. */}
        <a
          href={`/yonetim/stok/siparis-ver/csv?hedef=${hedef}`}
          download
          className="ml-auto rounded-full border border-cizgi bg-yuzey px-4 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
        >
          CSV indir
        </a>
      </div>

      {gruplar.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-2">
          Stok {hedef} gün yetiyor; şu an sipariş vermen gereken bir şey görünmüyor.
        </p>
      ) : (
        <>
          <p className="rakam text-sm text-metin-2">
            {gruplar.length} tedarikçi · toplam <b>{toplam}</b> adet öneriliyor.
          </p>
          {gruplar.map((g) => (
            <TedarikKarti
              key={g.tedarikci?.id ?? "yok"}
              grup={g}
              magaza={MARKA}
              tedarikciler={tedarikciler}
            />
          ))}
        </>
      )}
    </div>
  );
}
