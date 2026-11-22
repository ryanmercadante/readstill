import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight } from "lucide-react";
import { motion, useReducedMotion, useTransform } from "motion/react";
import { buttonVariants } from "../ui/button";
import { useRecede, useScreenProgress } from "./ModeScreens";

/** The opening screen. On phones it is the first full-screen sheet in the scroll. */
export function LandingHero({ compact }: { compact: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const animate = compact && !reduceMotion;
  const { leave } = useScreenProgress(ref);
  const recede = useRecede(leave);
  // The second line trails the first, a small parallax as the sheet sinks.
  const trail = useTransform(leave, [0, 1], [0, 36]);
  const cue = useTransform(leave, [0, 0.25], [1, 0]);

  return (
    <section
      ref={ref}
      className="landing-screen relative max-w-[700px] max-[800px]:flex max-[800px]:flex-col max-[800px]:justify-center max-[800px]:pt-10 max-[800px]:pb-24"
      aria-labelledby="landing-title"
    >
      <motion.div className="origin-top" style={animate ? recede : undefined}>
        <h1
          id="landing-title"
          className="mb-5 text-[clamp(44px,6vw,72px)] leading-[1.08] max-[600px]:text-[clamp(38px,9vw,52px)]"
        >
          A little space.
          <br />
          <motion.span className="inline-block" style={animate ? { y: trail } : undefined}>
            Your own pace.
          </motion.span>
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
      </motion.div>
      {compact && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-2.5 text-[17px] text-muted-foreground"
          style={animate ? { opacity: cue } : undefined}
        >
          Three ways to read
          <motion.span
            className="flex"
            animate={animate ? { y: [0, 8, 0] } : undefined}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowDown size={30} strokeWidth={1.75} />
          </motion.span>
        </motion.div>
      )}
    </section>
  );
}
