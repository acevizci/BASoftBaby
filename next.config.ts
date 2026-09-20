import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * Varsayılan sınır 1 MB; telefonla çekilmiş bir fotoğraf bunu rahat
       * aşıyor ve form sessizce hata veriyordu. Depoya yazılan hâli zaten
       * küçültülüyor, bu sınır yalnızca yüklenen ham dosya için.
       */
      bodySizeLimit: "14mb",
    },
  },
};

export default nextConfig;
