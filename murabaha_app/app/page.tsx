import { Suspense } from "react";
import { LandingExperience } from "@/components/landing/LandingExperience";

export default function HomePage() {
  return (
    <Suspense>
      <LandingExperience />
    </Suspense>
  );
}
