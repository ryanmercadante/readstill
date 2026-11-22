import { Link } from "@tanstack/react-router";

export function Wordmark() {
  return (
    <Link
      className="inline-flex items-center font-serif text-[34px] leading-none font-semibold tracking-[-0.04em] no-underline max-[520px]:text-[30px]"
      to="/"
      aria-label="Still home"
    >
      <span className="mr-[13px] flex items-center gap-[5px]" aria-hidden="true">
        <i className="h-[18px] w-[3px] rounded-[2px] bg-brand" />
        <i className="h-[25px] w-[3px] rounded-[2px] bg-brand" />
      </span>
      still<span className="text-brand">.</span>
    </Link>
  );
}
