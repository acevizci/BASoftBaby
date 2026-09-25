import DuyuruSeridi from "@/ui/duyuru-seridi";
import UstCubuk from "@/ui/ust-cubuk";
import AltBilgi from "@/ui/alt-bilgi";
import { FavoriSaglayici } from "@/ui/favori";
import { ZiyaretciSaglayici } from "@/ui/ziyaretci";
import { kunyeGetir } from "@/server/yasal";
import { whatsappDugmeNumarasi } from "@/server/whatsapp";
import WhatsappDugmesi from "@/ui/whatsapp-dugmesi";
import CerezOnayi from "@/ui/cerez-onayi";
import { olcumAyari } from "@/server/olcum";

/**
 * Mağaza çerçevesi: duyuru şeridi, üst çubuk ve alt bilgi.
 *
 * Bunlar eskiden kök düzendeydi ve **yönetim panelinin üstünde de**
 * görünüyordu: kategoriler, ürün arama kutusu, sepet sayacı. Sipariş
 * yönetirken hiçbirinin işi yok; telefonda ise panelin içeriği ekranın
 * yarısından sonra başlıyordu. Mağaza sayfaları bu gruba alındı, panel
 * dışarıda kaldı (K-43).
 *
 * Grup adı adrese girmiyor: bütün sayfaların adresi aynı kaldı.
 */
export default async function MagazaDuzeni({ children }: LayoutProps<"/">) {
  // Burada ziyaretçiye özel hiçbir şey okunmuyor: düzen herkes için aynı,
  // sayfalar önbellekten verilebiliyor. Giriş, sepet ve favoriler tarayıcıda
  // (K-131).
  const [kunye, olcum] = await Promise.all([kunyeGetir(), olcumAyari()]);
  // WhatsApp düğmesi: paneldeki WhatsApp numarası, yoksa cep numarasıysa
  // destek telefonu (K-99, K-158).
  const whatsapp = whatsappDugmeNumarasi(kunye);
  // Reklam ölçümü panelde açıksa çerez onay bandı (K-124); değilse site
  // çerez kullanmıyor ve bant da yok (K-16).
  const olcumVar = Boolean(olcum.metaPikselId || olcum.googleEtiketId);
  return (
    <ZiyaretciSaglayici>
    <FavoriSaglayici>
      <DuyuruSeridi />
      <UstCubuk />
      <main className="flex-1">{children}</main>
      <AltBilgi cerezTercihi={olcumVar} />
      {whatsapp && <WhatsappDugmesi numara={whatsapp} />}
      {olcumVar && <CerezOnayi metaId={olcum.metaPikselId} googleId={olcum.googleEtiketId} />}
    </FavoriSaglayici>
    </ZiyaretciSaglayici>
  );
}
