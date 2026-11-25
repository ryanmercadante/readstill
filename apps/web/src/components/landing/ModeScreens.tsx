import { Fragment, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { anchorParts } from "@still/reader-core";
import { GuidedPassage, PASSAGE, START, WORDS, useFocusPlayback, useGuidedPlayback } from "./demos";
import { buttonVariants } from "../ui/button";

/**
 * Scroll progress for one full-screen sheet: `enter` runs 0 → 1 as it rises into
 * place, `leave` runs 0 → 1 as the next sheet slides over it.
 */
export function useScreenProgress(ref: RefObject<HTMLElement | null>) {
  const { scrollYProgress: enter } = useScroll({
    target: ref,
    offset: ["start end", "start 0.15"],
  });
  const { scrollYProgress: leave } = useScroll({ target: ref, offset: ["end end", "end start"] });
  return { enter, leave };
}

/** The leaving sheet sinks back and fades while the next one covers it. */
export function useRecede(leave: MotionValue<number>) {
  const y = useTransform(leave, [0, 1], ["0%", "40%"]);
  const scale = useTransform(leave, [0, 1], [1, 0.92]);
  const opacity = useTransform(leave, [0, 0.8], [1, 0]);
  return { y, scale, opacity };
}

/** True while a sheet is snapped in place, so its demo can play. */
function useSettled(enter: MotionValue<number>, leave: MotionValue<number>) {
  const [settled, setSettled] = useState(false);
  const update = () => setSettled(enter.get() > 0.95 && leave.get() < 0.5);
  useMotionValueEvent(enter, "change", update);
  useMotionValueEvent(leave, "change", update);
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- read the initial position once
  useEffect(update, []);
  return settled;
}

/** Keeps the snap points clear of the sticky header. */
function useHeaderOffset() {
  useEffect(() => {
    const header = document.querySelector("header");
    const root = document.documentElement;
    if (!header) return;
    const sync = () => root.style.setProperty("--landing-header", `${header.offsetHeight}px`);
    const observer = new ResizeObserver(sync);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--landing-header");
    };
  }, []);
}

type DemoProps = {
  enter: MotionValue<number>;
  settled: boolean;
  still: boolean;
};

export function ModeScreens() {
  useHeaderOffset();
  const still = !!useReducedMotion();
  const { scrollYProgress } = useScroll();

  return (
    <div className="landing-screens">
      <ModeScreen
        step={1}
        title="Article"
        description="Read freely, with the whole passage in view."
        demo={(props) => <ArticleDemo {...props} />}
      />
      <ModeScreen
        step={2}
        title="Guided"
        description="Follow a paced highlight through the passage."
        demo={(props) => <GuidedDemo {...props} />}
      />
      <ModeScreen
        step={3}
        title="Focus"
        description="Read one word at a time, at a pace you choose."
        demo={(props) => <FocusDemo {...props} />}
      >
        <div className="mt-6 border-0 border-t border-solid border-border pt-5">
          <p className="m-0 mb-5 text-[13px] leading-[1.7] text-muted-foreground">
            Three ways to read. Switch modes without losing your place.
          </p>
          <Link
            className={buttonVariants({ className: "min-w-[130px] text-[13px] no-underline" })}
            to="/reader"
            search={{ sample: true }}
          >
            Start reading <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </ModeScreen>
      {!still && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-x-0 bottom-0 z-30 h-[2px] origin-left bg-brand"
          style={{ scaleX: scrollYProgress }}
        />
      )}
    </div>
  );
}

function ModeScreen({
  step,
  title,
  description,
  demo,
  children,
}: {
  step: number;
  title: string;
  description: string;
  demo: (props: DemoProps) => ReactNode;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const still = !!useReducedMotion();
  const { enter, leave } = useScreenProgress(ref);
  const settled = useSettled(enter, leave);
  const recede = useRecede(leave);
  // The heading arrives a beat ahead of the demo.
  const headY = useTransform(enter, [0, 0.7], [48, 0]);
  const headOpacity = useTransform(enter, [0.1, 0.7], [0, 1]);
  const id = `mode-${title.toLowerCase()}`;

  return (
    <section
      ref={ref}
      aria-labelledby={id}
      className="landing-screen relative flex flex-col justify-center border-0 border-t border-solid border-border bg-background py-8"
      style={{ zIndex: step }}
    >
      <motion.div className="origin-top" style={still ? undefined : recede}>
        <motion.div style={still ? undefined : { y: headY, opacity: headOpacity }}>
          <p className="m-0 text-[12px] font-semibold text-brand tabular-nums">{step} of 3</p>
          <h2
            id={id}
            className="m-0 mt-2 font-serif text-[clamp(34px,9vw,44px)] leading-[1.1] font-[450] tracking-[-0.035em]"
          >
            {title}
          </h2>
          <p className="m-0 mt-3 text-[14px] leading-[1.7] text-muted-foreground">{description}</p>
        </motion.div>
        <div className="mt-8">{demo({ enter, settled, still })}</div>
        {children}
      </motion.div>
    </section>
  );
}

/** Article: the passage comes into focus word by word as the sheet rises. */
function ArticleDemo({ enter, still }: DemoProps) {
  return (
    <>
      <p className="sr-only">{PASSAGE}</p>
      <p aria-hidden="true" className="m-0 font-serif text-[23px] leading-[1.7]">
        {WORDS.map((word, index) => (
          <Fragment key={index}>
            <SettlingWord word={word} index={index} enter={enter} still={still} />{" "}
          </Fragment>
        ))}
      </p>
    </>
  );
}

function SettlingWord({
  word,
  index,
  enter,
  still,
}: {
  word: string;
  index: number;
  enter: MotionValue<number>;
  still: boolean;
}) {
  const start = 0.15 + (index / WORDS.length) * 0.55;
  const range = [start, start + 0.3];
  const opacity = useTransform(enter, range, [0, 1]);
  const y = useTransform(enter, range, ["0.6em", "0em"]);
  const blur = useTransform(enter, range, [6, 0]);
  const filter = useMotionTemplate`blur(${blur}px)`;
  return (
    <motion.span className="inline-block" style={still ? undefined : { opacity, y, filter }}>
      {word}
    </motion.span>
  );
}

/**
 * Guided: scrolling scrubs the highlight up to the first word, then, once the sheet
 * settles, it paces through the passage on its own and loops.
 */
function GuidedDemo({ enter, settled, still }: DemoProps) {
  const playing = settled && !still;
  const [index, setIndex] = useGuidedPlayback(playing);

  useMotionValueEvent(enter, "change", (progress) => {
    if (!playing && !still) setIndex(Math.round(Math.min(1, progress / 0.9) * START));
  });

  return (
    <GuidedPassage
      index={index}
      still={still}
      layoutId="guided-highlight"
      className="text-[23px] leading-[1.7]"
    />
  );
}

/**
 * Focus: a focus pull. The sentence starts at reading size, then the camera closes
 * in on the anchor letter while the surrounding words blur away. Once settled, it
 * reads on one word at a time.
 */
function FocusDemo({ enter, settled, still }: DemoProps) {
  const [index] = useFocusPlayback(settled && !still);

  const scale = useTransform(enter, [0.15, 0.9], [0.5, 1]);
  const contextOpacity = useTransform(enter, [0.25, 0.8], [1, 0]);
  const contextBlur = useTransform(enter, [0.25, 0.8], [0, 10]);
  const contextFilter = useMotionTemplate`blur(${contextBlur}px)`;
  const ticks = useTransform(enter, [0.65, 1], [0, 1]);

  const word = WORDS[index];
  const parts = anchorParts(word);
  const before = WORDS.slice(0, index).join(" ");
  const after = WORDS.slice(index + 1).join(" ");
  const context = still ? undefined : { opacity: contextOpacity, filter: contextFilter };

  return (
    <div className="relative flex min-h-[clamp(110px,22svh,150px)] items-center overflow-hidden">
      <span className="sr-only">bookshop</span>
      <motion.div
        aria-hidden="true"
        className="absolute top-2 left-1/2 h-[15px] w-px origin-top bg-brand"
        style={still ? undefined : { scaleY: ticks }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute bottom-2 left-1/2 h-[15px] w-px origin-bottom bg-brand"
        style={still ? undefined : { scaleY: ticks }}
      />
      <motion.div
        aria-hidden="true"
        className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] font-serif text-[46px] leading-none whitespace-pre"
        style={still ? undefined : { scale }}
      >
        <span className="flex justify-end">
          <span className="shrink-0">
            {before && !still && <motion.span style={context}>{before} </motion.span>}
            {parts.before}
          </span>
        </span>
        <span className="text-brand">{parts.anchor}</span>
        <span className="flex justify-start">
          <span className="shrink-0">
            {parts.after}
            {after && !still && <motion.span style={context}> {after}</motion.span>}
          </span>
        </span>
      </motion.div>
    </div>
  );
}
