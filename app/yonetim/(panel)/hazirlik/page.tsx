import Link from "next/link";
import { hazirlikRaporu, type Agirlik, type Kontrol } from "@/server/hazirlik";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { epostaAcikMi, gonderenAdresi } from "@/server/eposta";
import { denemeEpostasiGonder } from "@/server/eposta-deneme";
import GonderDugmesi from "@/ui/gonder-dugmesi";

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
  const { eposta, sebep, mesaj } = await searchParams;

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

      <p className="text-xs text-metin-3">
        Bu ekran yalnızca bakıyor; değiştirdiği tek şey yok, gönderdiği tek şey deneme e-postası. Her satır düzeltmenin
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
    return "Resend anahtarı geçersiz ya da yetkisi yetmiyor. Resend → API Keys'te \"Sending access\" ya da \"Full access\" yetkili yeni bir anahtar oluşturup Vercel'de RESEND_ANAHTARI'na yaz ve yeniden dağıt.";
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
