import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

/**
 * Testlerin ortak hazırlığı. Her test dosyası bunu ilk satırda içeri alıyor.
 *
 * İki şey yapıyor, ikisi de "Next.js olmadan da çalışsın" için (K-68):
 *
 * 1. **`server-only` boşa çıkarılıyor.** Sunucu modülleri bu işareti taşıyor;
 *    Next derlerken kendi çözüyor, düz Node'da ise böyle bir modül yok.
 *    İşaretin amacı sunucu kodunun tarayıcıya sızmasını engellemek — testte
 *    tarayıcı olmadığı için boş bir modül doğru karşılığı.
 * 2. **Sahte bir `DATABASE_URL`.** `server/veritabani.ts` yüklenirken Prisma
 *    istemcisini kuruyor ve adres yoksa hata atıyor. İstemciyi kurmak
 *    bağlanmak demek değil: ilk sorguya kadar hiçbir yere gidilmiyor. Yani
 *    veritabanına dokunmayan saf işlevler veritabanı olmadan sınanabiliyor.
 */

const BOS = new Set(["server-only", "client-only"]);
const BOS_MODUL = new URL("./bos-modul.ts", import.meta.url).href;

registerHooks({
  resolve(belirtec, baglam, sonraki) {
    if (BOS.has(belirtec)) return { url: BOS_MODUL, shortCircuit: true };
    return sonraki(belirtec, baglam);
  },
});

// `fileURLToPath` yalnızca yolun gerçekten çözülebildiğini doğrulamak için;
// dosya taşınırsa test sessizce değil, açık bir hatayla düşsün.
void fileURLToPath(BOS_MODUL);

process.env.DATABASE_URL ??= "postgresql://test@localhost:5432/yok";
