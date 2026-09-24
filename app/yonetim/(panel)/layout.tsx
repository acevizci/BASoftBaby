import { menuSayaclari } from "@/server/panel-menu";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { yonetimCikisi } from "@/server/yonetim-kimlik-islem";
import PanelMenu from "@/ui/panel-menu";
import BolumSekmeleri from "@/ui/bolum-sekmeleri";
import { acikBolumler, menuDarMi, menuyuCevir } from "@/server/panel-gorunum";

/**
 * Panelin çerçevesi.
 *
 * **Oturum kontrolü burada yetmiyor.** Next.js istemci tarafı gezinmede
 * yalnızca değişen parçayı çiziyor; düzen yeniden çalışmıyor. Bu yüzden
 * `/yonetim` altındaki her sayfa ve her route handler `yoneticiGerekli()`yi
 * kendisi çağırıyor (K-51). Buradaki çağrı yine de duruyor: menü sayaçları
 * sorgulanmadan önce yetkisiz isteği çeviriyor.
 *
 * Menünün kendisi istemci bileşeninde — açık sayfanın yolu aynı sebeple
 * burada okunamıyor. Sayaçlar ve menü yapısı burada hesaplanıp aşağı
 * veriliyor; veritabanına bakan hiçbir şey tarayıcıya inmiyor.
 */
export default async function YonetimDuzeni({ children }: LayoutProps<"/yonetim">) {
  const yonetici = await yoneticiGerekli();
  const [sayaclar, elleAcik] = await Promise.all([menuSayaclari(), acikBolumler()]);
  // Dar/geniş tercihi çerezde: sunucuda okunuyor, yani ilk boyamada doğru
  // genişlik çiziliyor ve sıçrama olmuyor (K-60).
  const dar = await menuDarMi();

  return (
    <div
      className={`mx-auto grid max-w-6xl gap-6 px-4 py-6 ${
        dar ? "lg:grid-cols-[56px_1fr]" : "lg:grid-cols-[228px_1fr]"
      }`}
    >
      <PanelMenu
        sayaclar={sayaclar}
        elleAcik={elleAcik}
        yonetici={{ adSoyad: yonetici.adSoyad, eposta: yonetici.eposta }}
        dar={dar}
        cikis={yonetimCikisi}
        gorunumuCevir={menuyuCevir}
      />

      <main className="min-w-0">
        {/* Bölümün sayfaları sekme olarak; telefonda ve dar menüde (K-116). */}
        <BolumSekmeleri dar={dar} />
        {children}
      </main>
    </div>
  );
}
