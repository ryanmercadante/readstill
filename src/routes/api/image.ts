import { createFileRoute } from "@tanstack/react-router";
import { handleImageImport } from "../../server/page-import.server";

export const Route = createFileRoute("/api/image")({
  server: {
    handlers: {
      POST: ({ request }) => handleImageImport(request),
    },
  },
});
