import { rehberGetir } from "@/server/rehber";
import { BOYUT, paylasimKarti } from "@/server/paylasim-gorseli";

/** Rehber yazısının paylaşım kartı (K-132). */
export const size = BOYUT;
export const contentType = "image/png";
export const alt = "BASoftBaby rehber";
export const revalidate = 3600;

export default async function Gorsel({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const y = await rehberGetir(slug);
  return paylasimKarti({ baslik: y?.baslik ?? "Rehber", altBaslik: y?.ozet || "BASoftBaby rehber" });
}
