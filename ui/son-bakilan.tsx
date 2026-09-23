"use client";

import { useEffect, useState } from "react";
import UrunKarti from "@/ui/urun-karti";
import type { Urun } from "@/ui/katalog-bicim";

/**
 * Son baktığın ürünler (K-95).
 *
 * Liste tarayıcıda tutuluyor: hesap gerektirmiyor, sunucuya kimin neye
 * baktığı yazılmıyor. Tarayıcı depolamaya izin vermiyorsa (gizli pencere,
 * engelli site verisi) şerit sessizce çıkmıyor; sayfa bozulmuyor.
 */

const ANAHTAR = "son-bakilanlar";
const EN_COK = 12;

function oku(): string[] {
  try {
    const ham = JSON.parse(localStorage.getItem(ANAHTAR) ?? "[]");
    return Array.isArray(ham) ? ham.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** Ürün sayfası açılınca ürünü listenin başına yazar. Ekrana bir şey çizmez. */
export function SonBakilanKaydet({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const liste = [slug, ...oku().filter((s) => s !== slug)].slice(0, EN_COK);
      localStorage.setItem(ANAHTAR, JSON.stringify(liste));
    } catch {
      // Depolama kapalı: şerit yalnızca görünmez.
    }
  }, [slug]);
  return null;
}

/**
 * Şerit. `haric`: açık olan ürün kendi sayfasında listelenmesin.
 * Hiç ürün yoksa başlığıyla birlikte hiç çizilmiyor.
 */
export function SonBakilanlar({
  haric,
  adet = 4,
  className = "",
}: {
  haric?: string;
  adet?: number;
  className?: string;
}) {
  const [urunler, setUrunler] = useState<Urun[]>([]);

  useEffect(() => {
    const sluglar = oku().filter((s) => s !== haric).slice(0, adet);
    if (sluglar.length === 0) return;
    let iptal = false;
    fetch(`/api/son-bakilanlar?sluglar=${encodeURIComponent(sluglar.join(","))}`)
      .then((c) => (c.ok ? c.json() : { urunler: [] }))
      .then((v: { urunler: Urun[] }) => {
        if (!iptal) setUrunler(v.urunler);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [haric, adet]);

  if (urunler.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="text-xl">Son baktığın ürünler</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {urunler.map((u) => (
          <UrunKarti key={u.slug} urun={u} />
        ))}
      </div>
    </section>
  );
}
