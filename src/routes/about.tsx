import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "../components/ui/button";
import { SiteHeader } from "../components/SiteHeader";
import { SkipLink } from "../components/SkipLink";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Still" },
      {
        name: "description",
        content:
          "How Still works: three ways to read, an honest note on one-word-at-a-time reading, and a library that stays in your browser.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <SkipLink href="#main">Skip to content</SkipLink>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto max-w-[1080px] px-13 pt-12 pb-16 max-[600px]:px-[23px] max-[600px]:pt-7 max-[600px]:pb-12"
      >
        <article className="max-w-[640px]">
          <h1 className="mb-5 text-[clamp(38px,5vw,56px)] leading-[1.08]">About Still</h1>
          <p className="m-0 text-[15px] leading-[1.85] text-muted-foreground max-[600px]:text-[14px]">
            Still is a quiet place to read. Paste an article or import a book, then read it the way
            that suits you right now, at a pace you set.
          </p>

          <Section title="Three ways to read">
            <dl className="m-0 grid gap-4">
              <Mode name="Article">
                The whole passage in view, like a well-set page. Read freely.
              </Mode>
              <Mode name="Guided">
                A soft highlight moves through the text at your pace. Tap a word to pause there.
              </Mode>
              <Mode name="Focus">
                One word at a time in a fixed spot, with a colored letter to rest your eye on.
                Images and tables pause the flow so you can look at them properly.
              </Mode>
            </dl>
            <p>
              All three share one place in the text, so you can switch modes mid-sentence without
              losing your spot. With a keyboard, press <kbd>?</kbd> for shortcuts.
            </p>
          </Section>

          <Section title="An honest note on Focus">
            <p>
              Focus uses rapid serial visual presentation, or RSVP. The colored letter provides a
              steady visual anchor. It isn’t a promise of faster reading or better comprehension.
              Research on speed reading suggests that going faster usually means understanding less.
            </p>
            <p>
              Pause, reread, and slow down whenever you need to. The WPM setting controls
              presentation speed; punctuation pauses make the actual pace slower.
            </p>
            <a
              className="mt-4 inline-flex items-center gap-2 text-[13px] text-brand"
              href="https://journals.sagepub.com/doi/10.1177/1529100615623267"
              target="_blank"
              rel="noreferrer"
            >
              Read the research review
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </Section>

          <Section title="What you can read">
            <p>
              Paste any text, or import DRM-free, reflowable EPUB books up to 25 MB. Your library
              holds up to 100 readings. Each one keeps its own chapter and place; your pace setting
              is shared.
            </p>
          </Section>

          <Section title="Your library stays with you">
            <p>
              Everything you add stays in this browser. There are no accounts and no uploads, and
              your readings are never sent to a server. Your place is saved when you pause or leave.
            </p>
            <p>
              Clearing this site’s data removes your library, and some browsers clear data for sites
              you haven’t visited in a while. Export a backup from{" "}
              <Link to="/library">Library</Link> to keep a copy or move to another device. Restoring
              a backup adds its readings and keeps the progress you already have.
            </p>
          </Section>

          <div className="mt-12 border-0 border-t border-solid border-border pt-8">
            <Link
              className={buttonVariants({ className: "min-w-[130px] text-[13px] no-underline" })}
              to="/reader"
              search={{ sample: true }}
            >
              Try it <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 text-[14px] leading-[1.85] text-muted-foreground max-[600px]:mt-10 [&_p]:m-0 [&_p]:mt-4">
      <h2 className="m-0 mb-4 font-serif text-[26px] leading-[1.2] font-[450] tracking-[-.025em] text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Mode({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-sans text-[13px] font-semibold text-foreground">{name}</dt>
      <dd className="m-0 mt-1">{children}</dd>
    </div>
  );
}
