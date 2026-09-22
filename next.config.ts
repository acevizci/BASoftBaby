import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * iyzico'nun paketi kendi dosyalarını çalışma anında `require` ile
   * tarayarak yüklüyor; paketleyici bunu göremediği için dosyaları bulamıyor.
   * Bu liste "bunu paketleme, Node'un kendi require'ıyla yükle" demek.
   */
  serverExternalPackages: ["iyzipay"],

  experimental: {
    serverActions: {
      /**
       * Varsayılan sınır 1 MB; telefonla çekilmiş bir fotoğraf bunu rahat
       * aşıyor ve form sessizce hata veriyordu. Depoya yazılan hâli zaten
       * küçültülüyor, bu sınır yalnızca yüklenen ham dosya için.
       *
       * Yayında asıl sınır Vercel'in 4,5 MB'ı: bunun üstü sunucuya hiç
       * gelmiyor. Fotoğraflar bu yüzden tarayıcıda küçültülüp öyle
       * gönderiliyor (`ui/dosya-birak.tsx`).
       */
      bodySizeLimit: "14mb",
    },
  },
};

export default nextConfig;
