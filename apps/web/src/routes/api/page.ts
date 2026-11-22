import { createFileRoute } from "@tanstack/react-router";
import { handlePageImport } from "../../server/page-import.server";

export const Route = createFileRoute("/api/page")({
  server: {
    handlers: {
      POST: ({ request }) => handlePageImport(request),
    },
  },
});
