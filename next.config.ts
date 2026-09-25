import type { NextConfig } from "next";
import { guvenlikBasliklari } from "./server/guvenlik-basliklari";

const nextConfig: NextConfig = {
  /**
   * iyzico'nun paketi kendi dosyalarını çalışma anında `require` ile
   * tarayarak yüklüyor; paketleyici bunu göremediği için dosyaları bulamıyor.
   * Bu liste "bunu paketleme, Node'un kendi require'ıyla yükle" demek.
   */
  serverExternalPackages: ["iyzipay"],

  /**
   * Vercel'in fonksiyon deposu sınırı (K-139). sharp kurulurken başka
   * platformların ikili dosyalarını da getiriyor (Alpine için musl, tarayıcı
   * için WebAssembly); Vercel glibc Linux'ta çalışıyor, bunlar hiç
   * yüklenmiyor ama her fonksiyonun paketine giriyordu: yayın başına ~28 MB.
   */
  /**
   * Kullanım rehberi (K-162) `assets/` altından okunuyor; dosya adı istekten
   * geldiği için izleyici göremiyor, klasör açıkça ekleniyor.
   */
  outputFileTracingIncludes: {
    "/yonetim/kullanim-rehberi": ["./assets/kullanim-rehberi/index.html"],
    "/yonetim/kullanim-rehberi/gorsel/[ad]": ["./assets/kullanim-rehberi/gorsel/*.jpg"],
  },

  outputFileTracingExcludes: {
    "*": [
      "node_modules/@img/sharp-libvips-linuxmusl-x64/**",
      "node_modules/@img/sharp-linuxmusl-x64/**",
      "node_modules/@img/sharp-wasm32/**",
    ],
  },

  /** Güvenlik başlıkları her cevapta (K-120). */
  async headers() {
    return [
      {
        source: "/:yol*",
        headers: guvenlikBasliklari(process.env.NODE_ENV !== "production"),
      },
    ];
  },

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
