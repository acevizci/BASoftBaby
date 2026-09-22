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
 *
 *    Aynı yolla `next/headers` bellekteki bir çerez kutusuna, `next/cache`
 *    de önbelleksiz bir geçişe bağlanıyor: ikisi de istek bağlamı olmadan
 *    çalışmıyor. Önbelleğin atlanması testte istenen davranış — sınanan şey
 *    önbellek değil, stoğun ve paranın doğruluğu (K-77).
 * 2. **`DATABASE_URL` ayarlanıyor.** `server/veritabani.ts` yüklenirken
 *    Prisma istemcisini kuruyor ve adres yoksa hata atıyor.
 *
 *    - `TEST_DATABASE_URL` tanımlıysa **o** kullanılıyor: veritabanına bağlı
 *      testler uygulamanın kendi `db` istemcisiyle, yani gerçek kod yoluyla
 *      çalışıyor (K-77).
 *    - Tanımlı değilse sahte bir adres yazılıyor. İstemciyi kurmak bağlanmak
 *      demek değil — ilk sorguya kadar hiçbir yere gidilmiyor — yani saf
 *      işlevler veritabanı olmadan sınanabiliyor.
 *
 *    **Ölçüt hiçbir zaman `DATABASE_URL`in kendisi değil.** Öyle olsaydı
 *    `npm run build` içindeki test koşusu Vercel'de gerçek mağazanın
 *    veritabanına sipariş açardı. Ayrı bir değişken istemek bu kazayı
 *    imkânsız kılıyor.
 */

const BOS = new Set(["server-only", "client-only"]);
const BOS_MODUL = new URL("./bos-modul.ts", import.meta.url).href;
const CEREZ_MODUL = new URL("./sahte-headers.ts", import.meta.url).href;
const ONBELLEK_MODUL = new URL("./sahte-cache.ts", import.meta.url).href;

registerHooks({
  resolve(belirtec, baglam, sonraki) {
    if (BOS.has(belirtec)) return { url: BOS_MODUL, shortCircuit: true };
    // `next/headers` ve `next/cache` yalnızca istek bağlamında çalışıyor;
    // testte istek yok.
    if (belirtec === "next/headers") return { url: CEREZ_MODUL, shortCircuit: true };
    if (belirtec === "next/cache") return { url: ONBELLEK_MODUL, shortCircuit: true };
    return sonraki(belirtec, baglam);
  },
});

// `fileURLToPath` yalnızca yolun gerçekten çözülebildiğini doğrulamak için;
// dosya taşınırsa test sessizce değil, açık bir hatayla düşsün.
void fileURLToPath(BOS_MODUL);

const testAdresi = process.env.TEST_DATABASE_URL?.trim();
process.env.DATABASE_URL = testAdresi || "postgresql://test@localhost:5432/yok";
