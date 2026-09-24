import { randomBytes } from "node:crypto";
import Link from "next/link";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { bulteniGonder, iysBildirildi } from "@/server/bulten-islem";
import { epostaAcikMi } from "@/server/eposta";
import GonderDugmesi from "@/ui/gonder-dugmesi";

export const dynamic = "force-dynamic";
/** Binlerce alıcıda gönderim bir dakikayı aşabiliyor. */
export const maxDuration = 300;

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";
const KART = "rounded-marka border border-cizgi bg-yuzey p-5";

const HATALAR: Record<string, string> = {
  eksik: "Konu ve metin boş olamaz.",
  iys: "Göndermeden önce İYS kutusunu işaretlemen gerekiyor.",
  tekrar: "Bu bülten zaten gönderildi; aynı form ikinci kez gönderilmedi.",
  eposta: "Deneme e-postası gönderilemedi. Satışa hazırlık ekranındaki e-posta satırına bak.",
};

function zaman(t: Date): string {
  return t.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * E-bülten ve İYS (K-125).
 *
 * Bülten yalnızca ticari ileti izni vermiş **ve** e-postasını doğrulamış
 * müşterilere gidiyor: doğrulanmamış adres başkasının olabilir (K-14).
 * İzinler İYS'ye bildirilmeden ticari ileti gönderilemiyor; ekran hem
 * dosyayı veriyor hem de gönderimden önce bunu onaylatıyor.
 */
export default async function Bulten({ searchParams }: PageProps<"/yonetim/bulten">) {
  await yoneticiGerekli();
  const p = await searchParams;
  const [izinli, dogrulanmamis, bildirilmemis, sonKayit, gecmis] = await Promise.all([
    db.customer.count({ where: { pazarlamaIzni: true, epostaDogrulandi: { not: null } } }),
    db.customer.count({ where: { pazarlamaIzni: true, epostaDogrulandi: null } }),
    db.consentEvent.count({ where: { iysBildirildi: null } }),
    db.consentEvent.findFirst({
      where: { iysBildirildi: null },
      orderBy: { tarih: "desc" },
      select: { tarih: true },
    }),
    db.newsletter.findMany({ orderBy: { olusturuldu: "desc" }, take: 10 }),
  ]);
  const hata = typeof p.hata === "string" ? HATALAR[p.hata] : undefined;
  // Formun kimliği: aynı bülten iki kez gönderilmesin.
  const anahtar = randomBytes(12).toString("hex");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">E-bülten</h1>
        <p className="mt-1 text-sm text-metin-3">
          Kampanya ve yenilik duyurusu, izin veren müşterilere e-postayla.
        </p>
      </div>

      {hata && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          {hata}
        </p>
      )}
      {p.deneme === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Deneme e-postası kendi adresine gönderildi. Gelen kutuna bak.
        </p>
      )}
      {typeof p.gonderildi === "string" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Bülten {p.alici} kişiden {p.gonderildi} kişiye gönderildi.
          {p.gonderildi !== p.alici && " Gönderilemeyenler için Hata kaydı'na ve e-posta ayarına bak."}
        </p>
      )}
      {typeof p.iys === "string" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          {p.iys} izin kaydı İYS&apos;ye bildirildi olarak işaretlendi.
        </p>
      )}

      <section className={KART}>
        <h2 className="text-lg">İYS (İleti Yönetim Sistemi)</h2>
        <p className="mt-2 text-sm text-metin-2">
          Ticari e-posta göndermeden önce izinlerin İYS&apos;de kayıtlı olması gerekiyor; yeni
          izinler ve geri çekmeler <strong>3 iş günü içinde</strong> bildirilmeli. İYS&apos;ye
          marka olarak kaydolduktan sonra bu dosyayı iys.org.tr&apos;deki toplu izin yükleme
          ekranına yükle.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm">
            Bildirilmemiş kayıt: <strong className="rakam">{bildirilmemis}</strong>
          </span>
          {bildirilmemis > 0 && sonKayit && (
            <>
              {/* Dosya indirme: sayfa değil, `Link` değil düz bağlantı. */}
              <a
                href="/yonetim/bulten/iys"
                download
                className="rounded-full border border-cizgi px-4 py-2 text-sm font-bold text-metin-2 hover:border-mercan"
              >
                İYS dosyasını indir
              </a>
              <form action={iysBildirildi}>
                <input type="hidden" name="kadar" value={sonKayit.tarih.toISOString()} />
                <button
                  type="submit"
                  className="rounded-full border border-cizgi px-4 py-2 text-sm font-bold text-metin-2 hover:border-nane-koyu hover:text-nane-koyu"
                >
                  Yükledim, bildirildi say
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      <form action={bulteniGonder} className={`flex flex-col gap-4 ${KART}`}>
        <input type="hidden" name="anahtar" value={anahtar} />
        <h2 className="text-lg">Yeni bülten</h2>
        <p className="text-sm text-metin-2">
          Alıcı: <strong className="rakam">{izinli}</strong> kişi (izin vermiş ve e-postasını
          doğrulamış).
          {dogrulanmamis > 0 &&
            ` İzin verip e-postasını doğrulamamış ${dogrulanmamis} kişiye gitmiyor: doğrulanmamış adres başkasının olabilir.`}
        </p>
        {!epostaAcikMi() && (
          <p className="text-sm font-semibold text-mercan-koyu">
            E-posta servisi kapalı (RESEND_ANAHTARI yok); gönderim çalışmaz.
          </p>
        )}
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Konu</span>
          <input name="konu" required maxLength={150} className={GIRDI} placeholder="Yeni sezon geldi" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Metin</span>
          <textarea
            name="metin"
            required
            rows={10}
            className={GIRDI}
            placeholder={"Paragrafları boş satırla ayır. Bağlantıları tam adresiyle yaz:\nhttps://www.basoftbaby.com/yenidogan"}
          />
          <span className="text-xs text-metin-3">
            Başına &quot;Merhaba Ad,&quot;, sonuna listeden çıkma bağlantısı ve künye kendiliğinden
            ekleniyor.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="iys" className="mt-1" />
          <span>
            Markam İYS&apos;ye kayıtlı ve yukarıdaki izinleri İYS&apos;ye yükledim. (İYS&apos;de
            izni olmayan kişiye ticari ileti göndermek idari para cezası sebebi.)
          </span>
        </label>
        <div className="flex flex-wrap gap-3">
          <GonderDugmesi
            name="tur"
            value="deneme"
            bekleyen="Gönderiliyor…"
            className="rounded-full border-[1.5px] border-cizgi px-5 py-2.5 text-sm font-bold text-metin-2 hover:border-mercan"
          >
            Önce kendime deneme gönder
          </GonderDugmesi>
          <GonderDugmesi
            name="tur"
            value="gercek"
            devreDisi={izinli === 0}
            bekleyen="Gönderiliyor…"
            className="rounded-full bg-dugme px-6 py-2.5 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
          >
            {izinli} kişiye gönder
          </GonderDugmesi>
        </div>
      </form>

      {gecmis.length > 0 && (
        <section className={KART}>
          <h2 className="text-lg">Gönderilenler</h2>
          <ul className="mt-3 divide-y divide-cizgi-soluk text-sm">
            {gecmis.map((b) => (
              <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-semibold">{b.konu}</span>
                <span className="text-metin-3">
                  {zaman(b.olusturuldu)} · {b.yapan} ·{" "}
                  <span className="rakam">
                    {b.gonderilen}/{b.alici}
                  </span>
                  {b.durum === "yarim" && " · bir kısmı gitmedi"}
                  {b.durum === "gonderiliyor" && " · gönderim yarıda kaldı"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-metin-3">
        Sipariş, kargo ve şifre e-postaları bülten değil; izinden bağımsız gidiyor. Müşterinin izin
        durumu{" "}
        <Link href="/yonetim/musteriler" className="font-bold text-mavi-koyu hover:underline">
          Müşteriler
        </Link>{" "}
        ekranında.
      </p>
    </div>
  );
}
