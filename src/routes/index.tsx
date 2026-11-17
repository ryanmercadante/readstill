import { createFileRoute } from "@tanstack/react-router";
import { LandingHero } from "../components/landing/LandingHero";
import { ModeScreens } from "../components/landing/ModeScreens";
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

/** The three modes side by side, used above 800px and before the page hydrates. */
function ModesFigure() {
  return (
    <figure
      className="m-0 mt-10 grid grid-cols-3 border-0 border-t border-solid border-border max-[900px]:grid-cols-1 max-[600px]:mt-7"
      aria-label="A preview of the Article, Guided, and Focus reading modes"
    >
      <div className="py-5 pr-7 max-[900px]:pr-0">
        <h2 className="m-0 font-sans text-[13px] font-semibold tracking-normal">Article</h2>
        <p className="m-0 mt-2 text-[12px] leading-[1.7] text-muted-foreground">
          Read freely, with the whole passage in view.
        </p>
        <p className="m-0 mt-4 font-serif text-[21px] leading-[1.7]">
          There is a small bookshop on a quiet street, the kind of place you might walk past if you
          were in a hurry.
        </p>
      </div>
      <div className="border-0 border-l border-solid border-border px-7 py-5 max-[900px]:border-t max-[900px]:border-l-0 max-[900px]:px-0">
        <h2 className="m-0 font-sans text-[13px] font-semibold tracking-normal">Guided</h2>
        <p className="m-0 mt-2 text-[12px] leading-[1.7] text-muted-foreground">
          Follow a paced highlight through the passage.
        </p>
        <p className="m-0 mt-4 font-serif text-[21px] leading-[1.7]">
          There is a small{" "}
          <mark className="rounded-[3px] bg-highlight px-[3px] py-0 text-highlight-foreground">
            bookshop
          </mark>{" "}
          on a quiet street, the kind of place you might walk past if you were in a hurry.
        </p>
      </div>
      <div className="border-0 border-l border-solid border-border py-5 pl-7 max-[900px]:border-t max-[900px]:border-l-0 max-[900px]:pl-0">
        <h2 className="m-0 font-sans text-[13px] font-semibold tracking-normal">Focus</h2>
        <p className="m-0 mt-2 text-[12px] leading-[1.7] text-muted-foreground">
          Read one word at a time, at a pace you choose.
        </p>
        <div className="relative mt-4 flex min-h-[124px] items-center before:absolute before:top-3 before:left-1/2 before:h-[15px] before:w-px before:bg-brand before:content-[''] after:absolute after:bottom-3 after:left-1/2 after:h-[15px] after:w-px after:bg-brand after:content-['']">
          <span className="sr-only">bookshop</span>
          <span
            aria-hidden="true"
            className="grid w-full grid-cols-[1fr_auto_1fr] font-serif text-[44px]"
          >
            <span className="text-right">bo</span>
            <span className="text-brand">o</span>
            <span>kshop</span>
          </span>
        </div>
      </div>
      <figcaption className="col-span-full border-0 border-t border-solid border-border pt-4 text-[12px] text-muted-foreground">
        Three ways to read. Switch modes without losing your place.
      </figcaption>
    </figure>
  );
}
