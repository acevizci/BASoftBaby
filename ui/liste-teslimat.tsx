"use client";

import { useRef } from "react";

/**
 * Ödemede "liste sahibinin adresine gönder" seçimi (K-149).
 *
 * Seçilince formdaki adres alanları (`data-adres-alani`) gizlenip devre dışı
 * kalıyor: devre dışı alan ne doğrulanıyor ne gönderiliyor. Adres sunucuda
 * liste sahibinin kayıtlı adresinden yazılıyor; buraya hiç gelmiyor.
 */
export default function ListeTeslimat({ sahipAdi }: { sahipAdi: string }) {
  const kutu = useRef<HTMLDivElement>(null);

  function sec(listeye: boolean) {
    const form = kutu.current?.closest("form");
    form?.querySelectorAll<HTMLElement>("[data-adres-alani]").forEach((alan) => {
      alan.hidden = listeye;
      alan
        .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
        .forEach((g) => (g.disabled = listeye));
    });
  }

  const SECENEK =
    "flex items-start gap-3 rounded-[10px] border-[1.5px] border-cizgi bg-yuzey p-3 has-[:checked]:border-mercan has-[:checked]:bg-mercan-soluk";

  return (
    <div ref={kutu} className="flex flex-col gap-2 sm:col-span-2">
      <label className={SECENEK}>
        <input
          type="radio"
          name="teslimat"
          value="liste"
          onChange={() => sec(true)}
          className="mt-0.5 h-4 w-4 accent-[var(--mercan)]"
        />
        <span>
          <span className="block text-sm font-bold">{sahipAdi} adresine gönder</span>
          <span className="block text-xs text-metin-3">
            Kargo doğrudan liste sahibine gider. Adresi sana gösterilmez; aşağıya yalnızca kendi
            adını, e-postanı ve telefonunu yaz.
          </span>
        </span>
      </label>
      <label className={SECENEK}>
        <input
          type="radio"
          name="teslimat"
          value="kendi"
          defaultChecked
          onChange={() => sec(false)}
          className="mt-0.5 h-4 w-4 accent-[var(--mercan)]"
        />
        <span>
          <span className="block text-sm font-bold">Yazacağım adrese gönder</span>
          <span className="block text-xs text-metin-3">Kendi adresine ya da istediğin adrese.</span>
        </span>
      </label>
    </div>
  );
}
