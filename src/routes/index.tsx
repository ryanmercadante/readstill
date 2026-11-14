import { buttonVariants } from "../components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "../components/SiteHeader";
import { SkipLink } from "../components/SkipLink";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      <SkipLink href="#main">Skip to content</SkipLink>
      <SiteHeader />

      <main
        id="main"
        className="mx-auto max-w-[1080px] px-13 pt-[82px] pb-7 max-[600px]:px-[23px] max-[600px]:pt-[46px] max-[600px]:pb-6"
      >
        <section className="max-w-[700px]" aria-labelledby="landing-title">
          <h1
            id="landing-title"
            className="mb-[26px] text-[clamp(44px,6vw,72px)] leading-[1.08] max-[600px]:text-[clamp(38px,9vw,52px)]"
          >
            A little space.
            <br />
            One word at a time.
          </h1>
          <p className="m-0 mb-7 max-w-[520px] text-[15px] leading-[1.85] text-muted-foreground max-[600px]:text-[14px]">
            Still lets you move from the whole passage to one word at a time. Find a comfortable
            pace, and return to the bigger picture whenever you need it.
          </p>
          <Link
            className={buttonVariants({ className: "min-w-[130px] text-[13px] no-underline" })}
            to="/reader"
            search={{ sample: true }}
          >
            Try it <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <p className="m-0 mt-[15px] text-[12px] leading-[1.7] text-muted-foreground">
            Start with a sample or paste your own text. No account needed.
          </p>
        </section>

        <figure
          className="m-0 mt-[58px] grid grid-cols-2 border-0 border-t border-solid border-border max-[600px]:mt-[38px] max-[600px]:grid-cols-1"
          aria-label="A preview of the article and focus reading views"
        >
          <div className="py-[26px] pr-[46px] max-[600px]:pr-0">
            <span className="text-[11px] text-muted-foreground">The whole passage</span>
            <p className="m-0 mt-[18px] font-serif text-[22px] leading-[1.8] max-[600px]:text-[21px]">
              There is a small{" "}
              <mark className="rounded-[3px] bg-highlight px-[3px] py-0 text-highlight-foreground">
                bookshop
              </mark>{" "}
              on a quiet street, the kind of place you might walk past if you were in a hurry.
            </p>
          </div>
          <div className="border-0 border-l border-solid border-border py-[26px] pl-[34px] max-[600px]:border-t max-[600px]:border-l-0 max-[600px]:pl-0">
            <span className="text-[11px] text-muted-foreground">A single word</span>
            <div className="relative flex min-h-[155px] items-center before:absolute before:top-3 before:left-1/2 before:h-[15px] before:w-px before:bg-brand before:content-[''] after:absolute after:bottom-3 after:left-1/2 after:h-[15px] after:w-px after:bg-brand after:content-['']">
              <span className="grid w-full grid-cols-[1fr_auto_1fr] font-serif text-[clamp(38px,4.5vw,58px)] max-[600px]:text-[46px]">
                <span className="text-right">bo</span>
                <span className="text-brand">o</span>
                <span>kshop</span>
              </span>
            </div>
          </div>
          <figcaption className="col-span-full border-0 border-t border-solid border-border pt-4 text-[12px] text-muted-foreground">
            Two ways to read. One place in the text.
          </figcaption>
        </figure>

        <footer className="mt-12 flex justify-between gap-4 text-[11px] leading-[1.7] text-muted-foreground max-[600px]:mt-8 max-[600px]:flex-col max-[600px]:gap-1.5">
          <p className="m-0">Your text and progress stay in this browser.</p>
          <p className="m-0">Understanding comes before speed.</p>
        </footer>
      </main>
    </>
  );
}
