import Link from "next/link";
import { hazirlikRaporu, type Agirlik, type Kontrol } from "@/server/hazirlik";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { anahtarOzeti, epostaAcikMi, gonderenAdresi } from "@/server/eposta";
import { denemeEpostasiGonder } from "@/server/eposta-deneme";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import { db } from "@/server/veritabani";
import { denemeSiparisleriniSil } from "@/server/siparis-silme-islem";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { durumAdi, odemeAdi, yontemAdi } from "@/ui/siparis-bicim";

export const dynamic = "force-dynamic";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";

/** Eksik bir kontrolün ağırlığına göre rengi; tamamlananlar hep nane. */
const ROZET: Record<Agirlik, string> = {
  engel: "bg-mercan-soluk text-mercan-koyu",
  uyari: "bg-sari-soluk text-sari-koyu",
  bilgi: "bg-mavi-soluk text-mavi-koyu",
};

const ROZET_YAZI: Record<Agirlik, string> = {
  engel: "Engel",
  uyari: "Eksik",
  bilgi: "Bakılabilir",
};

/**
 * Satışa hazırlık.
 *
 * "Mağaza açılmaya hazır mı" sorusunun cevabı sekiz ayrı ekrana dağılmıştı;
 * bir eksiği fark etmenin tek yolu müşterinin şikâyet etmesiydi (K-75).
 *
 * Ekran **iyimser değil**: her şey tamamsa bunu bir cümleyle söylüyor, değilse
 * önce engeller geliyor. Yeşil bir onay kutusu göstermek için eksikleri
 * yumuşatmıyor — açılıştan önce bakılan bir listede en kötü haber en üstte
 * olmalı.
 */
export default async function HazirlikEkrani({ searchParams }: PageProps<"/yonetim/hazirlik">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor (K-51).
  const ben = await yoneticiGerekli();
  const { eposta, sebep, mesaj, silme, silindi, hepsi } = await searchParams;

  const rapor = await hazirlikRaporu();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Satışa hazırlık</h1>
      <p className="text-sm text-metin-2">
        Mağazanın gerçek bir siparişi baştan sona karşılayabilmesi için gerekenler.{" "}
        <strong>Engel</strong> işaretli satırlar varken satış yapılmamalı;{" "}
        <strong>eksik</strong> olanlar satışı durdurmuyor ama bir şeyi yarım bırakıyor.
      </p>

      {rapor.engel > 0 ? (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          <span className="rakam">{rapor.engel}</span> engel var — mağaza bu hâliyle
          satışa hazır değil.
          {rapor.uyari > 0 && (
            <span className="font-normal"> Ayrıca {rapor.uyari} eksik bulundu.</span>
          )}
        </p>
      ) : rapor.uyari > 0 ? (
        <p className="rounded-marka bg-sari-soluk px-4 py-3 text-sm font-semibold text-sari-koyu">
          Satışı durduran bir engel yok, ama <span className="rakam">{rapor.uyari}</span>{" "}
          eksik var.
        </p>
      ) : (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Bütün kontroller tamam. Mağaza gerçek bir siparişi baştan sona karşılayabilir.
        </p>
      )}

      {rapor.bolumler.map((b) => (
        <section key={b.baslik} className={KART}>
          <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
            {b.baslik}
            <span className="rakam text-xs font-semibold text-metin-3">
              {b.kontroller.filter((k) => k.tamam).length}/{b.kontroller.length} tamam
            </span>
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {b.kontroller.map((k) => (
              <Satir key={k.ad} kontrol={k} />
            ))}
          </ul>
        </section>
      ))}

      <EpostaDenemesi
        kime={ben.eposta}
        sonuc={typeof eposta === "string" ? eposta : undefined}
        sebep={typeof sebep === "string" ? sebep : undefined}
        mesaj={typeof mesaj === "string" ? mesaj : undefined}
      />

      <DenemeSiparisleri
        silme={typeof silme === "string" ? silme : undefined}
        silindi={typeof silindi === "string" ? Number(silindi) : undefined}
        hepsi={hepsi === "1"}
      />

      <p className="text-xs text-metin-3">
        Bu ekran kontrolleri yalnızca gösteriyor; gönderdiği tek şey deneme e-postası, sildiği tek şey seçip onayladığın deneme siparişleri. Her satır düzeltmenin
        yapıldığı ekrana bağlanıyor; anahtar ve hesap isteyenler (kart ödemesi, e-posta
        servisi, alan adı) Vercel ortam değişkenlerinden geliyor ve yeniden dağıtım
        gerektiriyor.
      </p>
    </div>
  );
}

function Satir({ kontrol }: { kontrol: Kontrol }) {
  return (
    <li className="flex flex-col gap-1.5 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          aria-hidden="true"
          className={`grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold ${
            kontrol.tamam ? "bg-nane-soluk text-nane-koyu" : ROZET[kontrol.agirlik]
          }`}
        >
          {kontrol.tamam ? "✓" : "!"}
        </span>
        <span className="min-w-0 flex-1 font-semibold">{kontrol.ad}</span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            kontrol.tamam ? "bg-nane-soluk text-nane-koyu" : ROZET[kontrol.agirlik]
          }`}
        >
          {kontrol.tamam ? "Tamam" : ROZET_YAZI[kontrol.agirlik]}
        </span>
      </div>

      <p className="pl-9 text-sm text-metin-2">{kontrol.durum}</p>

      {/* Sonuç yalnızca eksikken yazıyor: tamamlanmış bir satırda "olmazsa şu
          olur" demek gereksiz gürültü. */}
      {!kontrol.tamam && kontrol.sonuc && (
        <p className="pl-9 text-sm text-metin-3">{kontrol.sonuc}</p>
      )}

      {!kontrol.tamam && kontrol.yol && (
        <p className="pl-9">
          <Link href={kontrol.yol} className="text-sm font-bold text-mavi-koyu hover:underline">
            {kontrol.yolAdi} →
          </Link>
        </p>
      )}
    </li>
  );
}

/**
 * Resend'in cevabından "ne yapmalıyım" cümlesi.
 *
 * Mesajlar Resend'in kendi İngilizce metinleri; en sık üç durum Türkçe
 * karşılığıyla yazılıyor, gerisinde mesajın kendisi gösteriliyor (K-85).
 */
function epostaHataIpucu(sebep: string | undefined, mesaj: string | undefined): string {
  const m = (mesaj ?? "").toLowerCase();
  if (sebep === "anahtar-yok") {
    return "RESEND_ANAHTARI bu dağıtımda tanımlı değil. Vercel'de ekledikten sonra yeniden dağıtım (Redeploy) gerekiyor; ortam değişkenleri ancak yeni dağıtımda koda geçiyor.";
  }
  if (m.includes("domain") && (m.includes("not verified") || m.includes("verify"))) {
    return "Gönderen adresin alan adı Resend'de doğrulanmamış. Resend → Domains'te alan adını ekle, verdiği DNS kayıtlarını (TXT ve MX) alan adının DNS'ine gir ve durumun \"Verified\" olmasını bekle. Gönderen adresin alan adı doğrulanan alan adıyla aynı olmalı.";
  }
  if (m.includes("testing emails") || m.includes("own email")) {
    return "Resend şu an yalnızca kendi hesap adresine deneme gönderimine izin veriyor: alan adı doğrulanmamış. Resend → Domains'te alan adını doğrula.";
  }
  if (m.includes("api key") || sebep === "http-401") {
    return "Resend bu anahtarı tanımıyor. Çoğunlukla anahtar eksik kopyalanmış, silinmiş ya da başka bir Resend hesabına ait. Resend → API Keys'te yeni bir anahtar oluştur (oluşturulduğu an bir kez gösteriliyor, tamamını kopyala), Vercel'de RESEND_ANAHTARI değerini tırnaksız olarak onunla değiştir ve yeniden dağıt (Redeploy). Aşağıdaki \"Anahtar\" satırında baş harfleri ve uzunluğu Resend'dekiyle karşılaştırabilirsin.";
  }
  if (sebep === "http-422") {
    return "Resend isteği reddetti; çoğunlukla gönderen adresin biçimi hatalı. EPOSTA_GONDEREN şu biçimde olmalı: BASoftBaby <siparis@alanadin.com>.";
  }
  if (sebep === "ag-hatasi") {
    return "Resend'e ulaşılamadı. Birkaç dakika sonra yeniden dene.";
  }
  return "Resend gönderimi kabul etmedi; sebebi yukarıda Resend'in kendi cümlesiyle yazıyor.";
}

function EpostaDenemesi({
  kime,
  sonuc,
  sebep,
  mesaj,
}: {
  kime: string;
  sonuc?: string;
  sebep?: string;
  mesaj?: string;
}) {
  return (
    <section id="eposta-denemesi" className={KART}>
      <h2 className="text-lg">E-posta denemesi</h2>
      <p className="mt-1 text-sm text-metin-2">
        Anahtarın tanımlı olması e-postaların gittiği anlamına gelmiyor: gönderen adresin
        alan adı Resend&apos;de doğrulanmadıysa her gönderim reddediliyor ve bunu ancak
        müşteri &quot;e-posta gelmedi&quot; deyince fark ediyorsun. Bu düğme{" "}
        <strong>{kime}</strong> adresine bir deneme gönderiyor ve Resend&apos;in cevabını
        buraya getiriyor.
      </p>
      <p className="mt-2 text-sm text-metin-3">
        Gönderen: <span className="font-semibold text-metin-2">{gonderenAdresi()}</span>
        {!epostaAcikMi() && " · anahtar tanımlı değil"}
      </p>
      <AnahtarSatiri />

      {sonuc === "gitti" && (
        <p className="mt-3 rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Resend e-postayı kabul etti. Birkaç dakika içinde {kime} gelen kutusuna düşmeli;
          gelmezse istenmeyen (spam) klasörüne bak.
        </p>
      )}
      {sonuc === "hata" && (
        <div className="mt-3 rounded-marka bg-mercan-soluk px-4 py-3 text-sm text-mercan-koyu">
          <p className="font-bold">
            Gönderilemedi{sebep?.startsWith("http-") ? ` (Resend: ${sebep.slice(5)})` : ""}.
          </p>
          {mesaj && <p className="mt-1 font-mono text-xs">{mesaj}</p>}
          <p className="mt-2">{epostaHataIpucu(sebep, mesaj)}</p>
        </div>
      )}

      <form action={denemeEpostasiGonder} className="mt-4">
        <GonderDugmesi
          bekleyen="Gönderiliyor…"
          className="rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
        >
          Deneme e-postası gönder
        </GonderDugmesi>
      </form>
    </section>
  );
}

/**
 * Bu dağıtımın gördüğü anahtarın özeti — anahtarın kendisi değil.
 *
 * "API key is invalid" cevabında ilk soru "Vercel'deki anahtar Resend'deki
 * mi". Baştaki beş karakter ve uzunluk bunu anahtarı açık etmeden
 * cevaplıyor (K-86).
 */
function AnahtarSatiri() {
  if (!epostaAcikMi()) return null;
  const a = anahtarOzeti();
  return (
    <p className="mt-1 text-sm text-metin-3">
      Anahtar: <span className="rakam font-semibold text-metin-2">{a.onEk}…</span> ·{" "}
      <span className="rakam">{a.uzunluk}</span> karakter
      {!a.bicimDogru && (
        <span className="text-mercan-koyu">
          {" "}· Resend anahtarı &quot;re_&quot; ile başlar ve harf, rakam ve alt çizgiden
          oluşur; bu değer öyle görünmüyor
        </span>
      )}
      {a.temizlendi && (
        <span> · Vercel&apos;deki değerde boşluk ya da tırnak vardı, temizlenerek kullanılıyor</span>
      )}
    </p>
  );
}

/**
 * Deneme siparişlerini temizleme (K-163). Seçilenler kalıcı olarak siliniyor;
 * stok, doğum listesi ve hediye çeki etkileri geri alınıyor, sayaçlar
 * kalan en büyük numaraya çekiliyor. Onay kutusuna "SİL" yazılmadan
 * hiçbir şey silinmiyor.
 */
async function DenemeSiparisleri({
  silme,
  silindi,
  hepsi,
}: {
  silme?: string;
  silindi?: number;
  hepsi: boolean;
}) {
  const siparisler = await db.order.findMany({
    orderBy: { olusturuldu: "desc" },
    take: 200,
    select: {
      numara: true,
      olusturuldu: true,
      adSoyad: true,
      eposta: true,
      toplamKurus: true,
      durum: true,
      odemeDurumu: true,
      odemeYontemi: true,
      fatura: { select: { numara: true } },
    },
  });

  return (
    <section id="deneme-siparisleri" className={KART}>
      <h2 className="text-lg">Deneme siparişlerini temizle</h2>
      <p className="mt-1 text-sm text-metin-2">
        Satışa başlamadan önce denemek için verdiğin siparişleri seç ve kalıcı olarak sil. Stoğa
        geri eklenirler, doğum listesi ve hediye çeki etkileri geri alınır, raporlardan ve kâr
        hesabından çıkarlar. Bütün deneme siparişleri silinince ilk gerçek sipariş{" "}
        <span className="rakam">0001</span> numarasıyla başlar.
      </p>

      {typeof silindi === "number" && Number.isFinite(silindi) && (
        <p className="mt-3 rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          <span className="rakam">{silindi}</span> sipariş silindi.
        </p>
      )}
      {silme === "onay" && (
        <p className="mt-3 rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Silinmedi: onay kutusuna büyük harflerle SİL yazman gerekiyor.
        </p>
      )}
      {silme === "secim" && (
        <p className="mt-3 rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Silinmedi: hiç sipariş seçilmedi.
        </p>
      )}

      {siparisler.length === 0 ? (
        <p className="mt-3 text-sm text-metin-3">Hiç sipariş yok.</p>
      ) : (
        <form action={denemeSiparisleriniSil} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={hepsi ? "/yonetim/hazirlik#deneme-siparisleri" : "/yonetim/hazirlik?hepsi=1#deneme-siparisleri"}
              className="font-bold text-mavi-koyu hover:underline"
            >
              {hepsi ? "Seçimleri kaldır" : "Hepsini seç"}
            </Link>
            <span className="text-metin-3">
              <span className="rakam">{siparisler.length}</span> sipariş
            </span>
          </div>
          <div className="overflow-x-auto rounded-[12px] border border-cizgi">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-yuzey-sicak text-left text-xs uppercase tracking-wide text-metin-3">
                <tr>
                  <th className="p-2.5">Sil</th>
                  <th className="p-2.5">Sipariş</th>
                  <th className="p-2.5">Müşteri</th>
                  <th className="p-2.5 text-right">Tutar</th>
                  <th className="p-2.5">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi-soluk">
                {siparisler.map((s) => {
                  const kartlaOdendi = s.odemeYontemi === "kart" && s.odemeDurumu === "odendi";
                  return (
                    <tr key={s.numara} className={kartlaOdendi ? "bg-mercan-soluk/40" : undefined}>
                      <td className="p-2.5">
                        <input
                          type="checkbox"
                          name="numara"
                          value={s.numara}
                          defaultChecked={hepsi}
                          aria-label={`${s.numara} siparişini sil`}
                          className="h-4 w-4 accent-[var(--mercan)]"
                        />
                      </td>
                      <td className="p-2.5">
                        <Link
                          href={`/yonetim/siparisler/${s.numara}`}
                          className="rakam font-bold hover:underline"
                        >
                          {s.numara}
                        </Link>
                        <span className="rakam block text-xs text-metin-3">
                          {s.olusturuldu.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {s.adSoyad}
                        <span className="block text-xs text-metin-3">{s.eposta}</span>
                      </td>
                      <td className="rakam p-2.5 text-right">{fiyatYaz(s.toplamKurus)}</td>
                      <td className="p-2.5 text-xs">
                        {durumAdi(s.durum)} · {odemeAdi(s.odemeDurumu)}
                        <span className="block text-metin-3">{yontemAdi(s.odemeYontemi)}</span>
                        {kartlaOdendi && (
                          <span className="block font-bold text-mercan-koyu">
                            Kartla ödenmiş: gerçek ödemeyse önce iade et
                          </span>
                        )}
                        {s.fatura && (
                          <span className="rakam block text-metin-3">Fatura {s.fatura.numara}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end gap-3 rounded-[12px] border border-mercan bg-mercan-soluk p-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-bold text-mercan-koyu">
                Geri alınamaz. Onaylamak için SİL yaz
              </span>
              <input
                name="onay"
                autoComplete="off"
                placeholder="SİL"
                className="w-32 rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm outline-none focus:border-mercan"
              />
            </label>
            <GonderDugmesi
              bekleyen="Siliniyor…"
              className="rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
            >
              Seçilen siparişleri sil
            </GonderDugmesi>
          </div>
        </form>
      )}
    </section>
  );
}
