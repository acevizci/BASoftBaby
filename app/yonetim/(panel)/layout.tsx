import { menuSayaclari, menuyuKur } from "@/server/panel-menu";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { yonetimCikisi } from "@/server/yonetim-kimlik-islem";
import PanelMenu from "@/ui/panel-menu";

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
  const sayaclar = await menuSayaclari();
  const { ozet, gruplar } = menuyuKur(sayaclar, yonetici.rol);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[200px_1fr]">
      <PanelMenu
        ozet={ozet}
        gruplar={gruplar}
        yonetici={{ adSoyad: yonetici.adSoyad, eposta: yonetici.eposta }}
        cikis={yonetimCikisi}
      />

      <main className="min-w-0">{children}</main>
    </div>
  );
}
