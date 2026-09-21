import { onerilenVercelBolgesi, taniTopla } from "@/server/tani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";

/**
 * Dağıtım tanısı.
 *
 * "Site yavaş" dendiğinde ilk sorulacak soru nerede çalıştığı; bu sayfa onu
 * tahmin ettirmiyor, yazıyor. Bağlantı adresi hiçbir yerde görünmüyor,
 * yalnızca bölge kodu.
 */
export default async function TaniEkrani() {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const t = await taniTopla();
  const onerilen = onerilenVercelBolgesi(t.veritabaniBolgesi);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">Dağıtım tanısı</h1>
        <p className="mt-1 text-sm text-metin-3">
          Sitenin nerede çalıştığı ve veritabanına ulaşmasının ne kadar sürdüğü. Yavaşlık
          şüphesinde ilk bakılacak yer.
        </p>
      </div>

      <section className={KART}>
        <h2 className="text-lg">Bölgeler</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Satir
            baslik="Sunucu işlevi"
            deger={
              t.islevBolgesi
                ? `${t.islevSehri ?? "bilinmeyen şehir"} (${t.islevBolgesi})`
                : "yerelde çalışıyor"
            }
          />
          <Satir
            baslik="Veritabanı"
            deger={
              t.veritabaniBolgesi
                ? `${t.veritabaniSehri} (${t.veritabaniBolgesi})`
                : "adresten okunamadı"
            }
          />
          <Satir
            baslik="Bağlantı biçimi"
            deger={t.havuzluMu ? "havuzlu (pooler)" : "doğrudan"}
          />
          <Satir
            baslik="Veritabanı gidiş-dönüş"
            deger={t.gidisDonusMs !== null ? `${t.gidisDonusMs} ms (ortanca)` : "ölçülemedi"}
          />
          <Satir
            baslik="Bağlantı kurma"
            deger={t.baglantiMs !== null ? `${t.baglantiMs} ms` : "ölçülemedi"}
          />
          <Satir
            baslik="İşlev örneği"
            deger={
              t.ornekYasiSn < 5
                ? "az önce başladı (soğuk)"
                : `${t.ornekYasiSn} saniyedir ayakta`
            }
          />
        </dl>

        {t.olculenler.length > 0 && (
          <p className="mt-3 text-xs text-metin-3">
            Ölçümler: <span className="rakam">{t.olculenler.join(" · ")}</span> ms. Bağlantı
            kurma maliyeti dışarıda; ölçülen saf ağ gecikmesi.
          </p>
        )}

        {t.hata && (
          <p className="mt-3 rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
            {t.hata}
          </p>
        )}
      </section>

      <section className={KART}>
        <h2 className="text-lg">Yorum</h2>
        {t.aynidaMi === true && (
          <div className="mt-2 flex flex-col gap-3 text-sm text-metin-2">
            <p className="font-bold text-nane-koyu">
              İşlev ve veritabanı aynı şehirde. Bölge tarafında yapılacak bir şey yok.
            </p>

            {t.baglantiMs !== null && t.gidisDonusMs !== null && (
              <p>
                Asıl maliyet bağlantı kurmakta: <span className="rakam">{t.baglantiMs} ms</span>{" "}
                bağlanmak, sonra sorgu başına{" "}
                <span className="rakam">{t.gidisDonusMs} ms</span>. Bağlantı, işlev örneği
                başına bir kez kuruluyor — yani örnek uyanıksa ödenmiyor, uyuyorsa her
                ziyaretçi ödüyor.
              </p>
            )}

            <p>
              Az ziyaretçili bir mağazada iki şey sürekli uyuyor: Vercel&apos;in sunucu
              işlevi ve Neon&apos;un veritabanı. İkisini de uyanık tutmak için{" "}
              <span className="rakam font-bold">/api/canli</span> ucu var; dışarıdan bir
              izleme servisiyle (UptimeRobot, cron-job.org) beş dakikada bir çağrıldığında
              soğuk açılış bedeli ortadan kalkıyor.
            </p>
          </div>
        )}

        {t.aynidaMi === false && (
          <div className="mt-2 flex flex-col gap-3 text-sm text-metin-2">
            <p className="font-bold text-mercan-koyu">
              İşlev {t.islevSehri}&apos;da, veritabanı {t.veritabaniSehri}&apos;da.
            </p>
            <p>
              Her sayfa birkaç veritabanı sorgusu yapıyor ve her sorgu bu mesafeyi iki kez
              gidiyor. Ölçülen gidiş-dönüş {t.gidisDonusMs} ms; sayfa başına birkaç sorgu
              demek, tek başına yüz milisaniyeler demek.
            </p>
            {onerilen && (
              <div>
                <p>
                  Çözüm işlevi veritabanının yanına taşımak. Depodaki{" "}
                  <span className="rakam font-bold">vercel.json</span> dosyasına şu satır
                  ekleniyor ve yeniden dağıtılıyor:
                </p>
                <pre className="mt-2 overflow-x-auto rounded-[10px] bg-metin px-4 py-3 text-xs text-white">
                  {`"regions": ["${onerilen}"]`}
                </pre>
                <p className="mt-2 text-xs text-metin-3">
                  Tersi de olur: veritabanını işlevin yanına taşımak. Ama Neon&apos;da bölge
                  değiştirmek yeni bir veritabanı açıp veriyi taşımak demek; işlevi taşımak
                  tek satır.
                </p>
              </div>
            )}
          </div>
        )}

        {t.aynidaMi === null && (
          <p className="mt-2 text-sm text-metin-2">
            Bölgelerden biri okunamadı. Yerelde çalışırken bu normal: sunucu işlevi bölgesi
            yalnızca Vercel&apos;de tanımlı oluyor.
          </p>
        )}

        {t.havuzluMu && (
          <p className="mt-4 text-xs text-metin-3">
            Uygulama havuzlu bağlantıyı kullanıyor — doğrusu bu. Göçler ise doğrudan
            bağlantıyla yapılıyor (K-25).
          </p>
        )}
      </section>
    </div>
  );
}

function Satir({ baslik, deger }: { baslik: string; deger: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-metin-3">{baslik}</dt>
      <dd className="mt-0.5 text-sm font-bold">{deger}</dd>
    </div>
  );
}
