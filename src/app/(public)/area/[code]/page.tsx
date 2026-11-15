import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AreaView } from "@/components/public/area-view";
import { PublicChrome } from "@/components/public/public-chrome";
import { resolveArea } from "@/lib/geography";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const area = resolveArea((await params).code);
  return { title: area ? `${area.name} results` : "Page not found" };
}

export default async function AreaPage({ params }: Props) {
  const area = resolveArea((await params).code);
  if (!area) notFound();
  return (
    <PublicChrome>
      <AreaView area={area} />
    </PublicChrome>
  );
}
