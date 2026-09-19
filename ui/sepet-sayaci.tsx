import Link from "next/link";
import { sepetAdedi } from "@/server/sepet";

export default async function SepetSayaci() {
  const adet = await sepetAdedi();

  return (
    <Link
      href="/sepet"
      className="rounded-full bg-mercan-soluk px-3 py-1.5 text-xs font-bold text-mercan-koyu transition hover:brightness-95"
    >
      Sepet{adet > 0 ? ` · ${adet}` : ""}
    </Link>
  );
}
