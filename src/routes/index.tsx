import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "../components/Wordmark";
import landingStylesUrl from "../landing.css?url";

export const Route = createFileRoute("/")({
  head: () => ({ links: [{ rel: "stylesheet", href: landingStylesUrl }] }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Wordmark />
        <span className="tagline">Make room for reading.</span>
      </header>

      <main id="main" className="landing-shell">
        <section className="landing-intro" aria-labelledby="landing-title">
          <h1 id="landing-title">
            A little space.
            <br />
            One word at a time.
          </h1>
          <p className="landing-description">
            Still lets you move from the whole passage to one word at a time. Find a comfortable
            pace, and return to the bigger picture whenever you need it.
          </p>
          <Link className="primary-button landing-cta" to="/reader">
            Try it <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <p className="landing-note">
            Start with a sample or paste your own text. No account needed.
          </p>
        </section>

        <figure
          className="reading-preview"
          aria-label="A preview of the article and focus reading views"
        >
          <div className="preview-passage">
            <span className="preview-label">The whole passage</span>
            <p>
              There is a small <mark>bookshop</mark> on a quiet street, the kind of place you might
              walk past if you were in a hurry.
            </p>
          </div>
          <div className="preview-focus">
            <span className="preview-label">A single word</span>
            <div className="preview-word-stage">
              <span className="preview-word">
                <span>bo</span>
                <span className="anchor-letter">o</span>
                <span>kshop</span>
              </span>
            </div>
          </div>
          <figcaption>Two ways to read. One place in the text.</figcaption>
        </figure>

        <footer className="landing-footer">
          <p>Your text and progress stay in this browser.</p>
          <p>Understanding comes before speed.</p>
        </footer>
      </main>
    </>
  );
}
