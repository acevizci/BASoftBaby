/**
 * Alt bilgi. Yasal metinler ve ETBİS numarası 07. adımda gerçekleriyle
 * doldurulacak; buradaki yerler onların nerede duracağını gösteriyor.
 */
const SUTUNLAR: { baslik: string; satirlar: string[] }[] = [
  { baslik: "Alışveriş", satirlar: ["Yenidoğan", "Zıbın & Body", "Tulum", "Uyku", "Aksesuar"] },
  { baslik: "Yardım", satirlar: ["Beden rehberi", "Kargo ve teslimat", "İade ve değişim", "Sıkça sorulanlar"] },
  {
    baslik: "Kurumsal",
    satirlar: [
      "Mesafeli satış sözleşmesi",
      "Ön bilgilendirme formu",
      "Gizlilik ve KVKK",
      "Çerez politikası",
    ],
  },
];

export default function AltBilgi() {
  return (
    <footer className="mt-auto border-t border-cizgi-soluk bg-yuzey-sicak">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <p className="font-baslik text-lg font-bold">BASoftbaby</p>
          <p className="text-sm text-metin-2">Minik bedenlere, yumuşacık kumaşlar.</p>
        </div>

        {SUTUNLAR.map((s) => (
          <div key={s.baslik} className="flex flex-col gap-2">
            <p className="text-sm font-bold">{s.baslik}</p>
            <ul className="flex flex-col gap-1.5 text-sm text-metin-3">
              {s.satirlar.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-cizgi-soluk">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-metin-3">
          <span>© {new Date().getFullYear()} BASoftBaby</span>
          <span>ETBİS kaydı açılışta eklenecek</span>
        </div>
      </div>
    </footer>
  );
}
