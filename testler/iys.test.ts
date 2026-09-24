import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { iysCsv, iysTarihi, sonDurumlar } from "@/server/iys-bicim";

/** İYS dosyası (K-125). */

describe("İYS dosyası", () => {
  it("tarih Türkiye saatiyle, İYS biçiminde", () => {
    assert.equal(iysTarihi(new Date("2026-09-24T12:04:05Z")), "2026-09-24 15:04:05");
  });

  it("aynı adresin yalnızca son kararı gidiyor", () => {
    const k = sonDurumlar([
      { eposta: "a@b.com", durum: "RET", kaynak: "HS_WEB", tarih: new Date("2026-09-02") },
      { eposta: "A@b.com", durum: "ONAY", kaynak: "HS_WEB", tarih: new Date("2026-09-01") },
      { eposta: "c@d.com", durum: "ONAY", kaynak: "HS_WEB", tarih: new Date("2026-09-01") },
    ]);
    assert.equal(k.length, 2);
    assert.equal(k.find((x) => x.eposta.toLowerCase() === "a@b.com")?.durum, "RET");
  });

  it("CSV: başlık, izin türü e-posta, alıcı bireysel, tırnak kaçışı", () => {
    const csv = iysCsv([
      { eposta: 'x,"y"@b.com', durum: "ONAY", kaynak: "HS_WEB", tarih: new Date("2026-09-24T00:00:00Z") },
    ]);
    const [baslik, satir] = csv.trim().split("\r\n");
    assert.equal(baslik, "type,source,recipient,status,consentDate,recipientType");
    assert.equal(satir, 'EPOSTA,HS_WEB,"x,""y""@b.com",ONAY,2026-09-24 03:00:00,BIREYSEL');
  });
});
