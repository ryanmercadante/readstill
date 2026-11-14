import { createFileRoute } from "@tanstack/react-router";
import App from "../App";

export const Route = createFileRoute("/reader")({
  head: () => ({ meta: [{ title: "Reader — Still" }] }),
  component: App,
});
