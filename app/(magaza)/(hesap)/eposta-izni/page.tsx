import Link from "next/link";
import { jetonHarca } from "@/server/uyelik";
import { pazarlamaIzniniKapat } from "@/server/sepet-hatirlatma";

export const dynamic = "force-dynamic";

/**
 * Listeden çıkma sayfası.
 *
 * E-postadaki bağlantı doğrudan buraya geliyor ve tıklandığı an izin
 * kapanıyor: "çıkmak için giriş yap, ayarlara git, kutuyu kaldır" demek
 * çıkmayı zorlaştırmak olurdu, oysa kanun kolay olmasını istiyor.
 *
 * Bağlantı jetonlu; jeton olmadan kimsenin izni kapatılamıyor.
 */
export default async function EpostaIzni({ searchParams }: PageProps<"/eposta-izni">) {
  const { jeton } = await searchParams;
  const kayit = typeof jeton === "string" ? await jetonHarca(jeton, "pazarlama-iptal") : undefined;

  if (kayit) await pazarlamaIzniniKapat(kayit.customerId);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 rounded-marka border border-cizgi bg-yuzey p-6">
      <h1 className="text-2xl">{kayit ? "Çıkarıldın" : "Bağlantı geçersiz"}</h1>
      {kayit ? (
        <>
          <p className="text-sm text-metin-2">
            <span className="font-bold">{kayit.eposta}</span> adresine artık kampanya ve
            sepet hatırlatma e-postası gönderilmeyecek.
          </p>
          <p className="text-sm text-metin-3">
            Sipariş onayı, kargo bildirimi ve şifre sıfırlama gibi alışverişinle ilgili
            e-postalar gelmeye devam eder; onlar tanıtım değil, işlemin parçası.
          </p>
          <p className="text-sm text-metin-3">
            Fikrin değişirse hesap ayarlarından yeniden açabilirsin.
          </p>
        </>
      ) : (
        <p className="text-sm text-metin-2">
          Bu bağlantı kullanılmış ya da süresi dolmuş olabilir. İzni hesap
          ayarlarından da kapatabilirsin.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/hesabim/bilgiler"
          className="rounded-full border border-cizgi px-5 py-2.5 text-sm font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
        >
          Hesap ayarları
        </Link>
        <Link href="/" className="rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi">
          Alışverişe dön
        </Link>
      </div>
    </div>
  );
}
