import { AreaView } from "@/components/public/area-view";
import { PublicChrome } from "@/components/public/public-chrome";
import { resolveArea } from "@/lib/geography";

export default function Home() {
  return (
    <PublicChrome>
      <AreaView area={resolveArea()!} />
    </PublicChrome>
  );
}
