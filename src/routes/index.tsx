import { createFileRoute } from "@tanstack/react-router";
import { LandingHero } from "../components/landing/LandingHero";
import { ModeScreens } from "../components/landing/ModeScreens";
import { ModesFigure } from "../components/landing/ModesFigure";
import { SiteHeader } from "../components/SiteHeader";
import { SkipLink } from "../components/SkipLink";
import { useCompactViewport } from "../hooks/useCompactViewport";
import { pageHead } from "../lib/page-head";
import { siteDescription, siteTitle } from "../lib/site";

export const Route = createFileRoute("/")({
  head: () => pageHead({ path: "/", title: siteTitle, description: siteDescription }),
  component: LandingPage,
});

function LandingPage() {
  const compact = useCompactViewport();
  return (
    <>
      <SkipLink href="#main">Skip to content</SkipLink>
      <SiteHeader />

      <main
        id="main"
        className="mx-auto max-w-[1080px] px-13 pt-12 pb-7 max-[800px]:py-0 max-[600px]:px-[23px]"
      >
        <LandingHero compact={compact} />
        {compact ? <ModeScreens /> : <ModesFigure />}
      </main>
    </>
  );
}
