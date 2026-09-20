import type { MetadataRoute } from "next";
import { siteAdresi } from "@/server/site";

/**
 * Arama motorlarına kapalı yerler: yönetim paneli, hesap sayfaları, sepet,
 * ödeme ve sipariş sayfaları. Bunların dizine girmesinin kimseye faydası yok;
 * üstelik sipariş ve hesap adresleri kişiye özel.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/yonetim",
        "/hesabim",
        "/giris",
        "/kayit",
        "/sepet",
        "/odeme",
        "/siparis/",
        "/siparis-takip",
        "/yuklenen/",
      ],
    },
    sitemap: `${siteAdresi()}/sitemap.xml`,
  };
}
