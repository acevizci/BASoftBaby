import { seritAyariGetir, yayindakiDuyurular, type Duyuru } from "@/server/duyuru";

function Mesaj({ duyuru }: { duyuru: Duyuru }) {
  if (duyuru.link) {
    return (
      <a className="serit-mesaj" href={duyuru.link}>
        {duyuru.metin}
      </a>
    );
  }
  return <span className="serit-mesaj">{duyuru.metin}</span>;
}

/**
 * Mesaj dizisi iki kez basılır; ikincisi ekran okuyucudan gizlenir, çünkü
 * sadece kaymanın kesintisiz görünmesi için var.
 */
export default async function DuyuruSeridi() {
  const [ayar, duyurular] = await Promise.all([seritAyariGetir(), yayindakiDuyurular()]);

  if (!ayar.acik || duyurular.length === 0) return null;

  const dizi = duyurular.map((d) => <Mesaj key={d.id} duyuru={d} />);

  return (
    <div
      className={`serit${ayar.mobildeGoster ? "" : " hidden sm:block"}`}
      data-hiz={ayar.hiz}
      data-renk={ayar.renk}
      data-dur-hover={ayar.durdurHover ? "1" : "0"}
    >
      <div className="serit-iz">
        <div className="serit-dizi">{dizi}</div>
        <div className="serit-dizi" data-kopya="1" aria-hidden="true">
          {dizi}
        </div>
      </div>
    </div>
  );
}
