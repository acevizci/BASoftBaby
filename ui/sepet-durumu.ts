"use client";

import { useSyncExternalStore } from "react";

/**
 * Geçici sepet. Şu an yalnızca tarayıcıda (localStorage) duruyor: ürün seçimi
 * ve "sepete ekle" akışı çalışsın diye. 03. adımda sepet sunucuya taşınacak,
 * sipariş ve ödeme ona bağlanacak; o zaman bu dosyanın içi değişecek ama
 * kullanan bileşenler aynı kalacak.
 *
 * Basit bir dış depo: React'e useSyncExternalStore ile bağlanıyor. Sunucuda
 * sepet hep boş görünür, tarayıcıya geçince gerçek içerik gelir; React bu
 * ayrımı kendisi yönettiği için hidrasyon uyuşmazlığı çıkmaz.
 */

export type SepetSatiri = {
  slug: string;
  ad: string;
  beden: string;
  renk: string;
  adet: number;
  fiyatKurus: number;
};

const ANAHTAR = "basoftbaby-sepet";
const BOS: SepetSatiri[] = [];

let satirlar: SepetSatiri[] = BOS;
const dinleyiciler = new Set<() => void>();

function yukle(): void {
  try {
    const kayit = window.localStorage.getItem(ANAHTAR);
    if (kayit) satirlar = JSON.parse(kayit) as SepetSatiri[];
  } catch {
    // gizli sekmede ya da depolama kapalıysa sepet boş başlar
  }
}

function yaz(): void {
  try {
    window.localStorage.setItem(ANAHTAR, JSON.stringify(satirlar));
  } catch {
    // yazılamıyorsa sepet yalnızca sayfa açıkken yaşar
  }
}

if (typeof window !== "undefined") {
  yukle();
}

function abone(dinleyici: () => void): () => void {
  dinleyiciler.add(dinleyici);
  return () => {
    dinleyiciler.delete(dinleyici);
  };
}

function anlikDurum(): SepetSatiri[] {
  return satirlar;
}

function sunucuDurumu(): SepetSatiri[] {
  return BOS;
}

export function sepeteEkle(yeni: Omit<SepetSatiri, "adet">): void {
  const ayni = (s: SepetSatiri) =>
    s.slug === yeni.slug && s.beden === yeni.beden && s.renk === yeni.renk;

  satirlar = satirlar.some(ayni)
    ? satirlar.map((s) => (ayni(s) ? { ...s, adet: s.adet + 1 } : s))
    : [...satirlar, { ...yeni, adet: 1 }];

  yaz();
  dinleyiciler.forEach((d) => d());
}

export function useSepet(): { satirlar: SepetSatiri[]; toplamAdet: number } {
  const guncel = useSyncExternalStore(abone, anlikDurum, sunucuDurumu);
  return { satirlar: guncel, toplamAdet: guncel.reduce((t, s) => t + s.adet, 0) };
}
