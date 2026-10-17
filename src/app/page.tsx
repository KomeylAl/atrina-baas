import { Suspense } from "react";
import { HomeRoot } from "@/components/home-root";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeRoot />
    </Suspense>
  );
}
