import { buttonVariants } from "../components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "../components/SiteHeader";
import { SkipLink } from "../components/SkipLink";
import { pageHead } from "../lib/page-head";
import { siteDescription, siteTitle } from "../lib/site";

export const Route = createFileRoute("/")({
  head: () => pageHead({ path: "/", title: siteTitle, description: siteDescription }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      <SkipLink href="#main">Skip to content</SkipLink>
      <SiteHeader />

      <main
        id="main"
        className="mx-auto max-w-[1080px] px-13 pt-12 pb-7 max-[600px]:px-[23px] max-[600px]:pt-7 max-[600px]:pb-6"
      >
        <section className="max-w-[700px]" aria-labelledby="landing-title">
          <h1
            id="landing-title"
            className="mb-5 text-[clamp(44px,6vw,72px)] leading-[1.08] max-[600px]:text-[clamp(38px,9vw,52px)]"
          >
            A little space.
            <br />
            Your own pace.
          </h1>
          <p className="m-0 mb-6 max-w-[520px] text-[15px] leading-[1.85] text-muted-foreground max-[600px]:text-[14px]">
            Read freely, follow a moving highlight, or focus on one word at a time. Still gives you
            three ways to read, with one shared place in the text.
          </p>
          <Link
            className={buttonVariants({ className: "min-w-[130px] text-[13px] no-underline" })}
            to="/reader"
            search={{ sample: true }}
          >
            Try it <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <p className="m-0 mt-[15px] text-[12px] leading-[1.7] text-muted-foreground">
            Start with a sample or paste your own text. No account needed, and it all stays in this
            browser.
          </p>
        </section>

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
              There is a small bookshop on a quiet street, the kind of place you might walk past if
              you were in a hurry.
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
      </main>
    </>
  );
}
