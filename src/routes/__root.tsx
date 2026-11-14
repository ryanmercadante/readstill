import { useState, type ReactNode } from "react";
import { createRootRoute, HeadContent, Link, Scripts } from "@tanstack/react-router";
import stylesUrl from "../styles.css?url";
import manropeUrl from "@fontsource-variable/manrope/index.css?url";
import sourceSerifUrl from "@fontsource-variable/source-serif-4/index.css?url";
import { readTheme, saveTheme, themeColors } from "../lib/theme";
import { ThemeContext } from "../hooks/useTheme";

export const Route = createRootRoute({
  beforeLoad: () => ({ theme: readTheme() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Still — Make room for reading" },
      {
        name: "description",
        content:
          "Make room for reading. Move between the whole passage and one word at a time, at your own pace.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: manropeUrl },
      { rel: "stylesheet", href: sourceSerifUrl },
      { rel: "stylesheet", href: stylesUrl },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <main className="mx-auto max-w-[1000px] px-10 pt-[51px] pb-[210px] min-[1500px]:pt-[65px] max-[800px]:px-7 max-[800px]:pt-[37px] max-[520px]:px-[23px] max-[520px]:pt-[30px] max-[520px]:pb-[235px]">
      <h1>This page isn’t here.</h1>
      <p>
        <Link to="/">Return to Still</Link> or <Link to="/reader">open the reader</Link>.
      </p>
    </main>
  ),
});

function RootDocument({ children }: { children: ReactNode }) {
  const initial = Route.useRouteContext();
  const [theme, setTheme] = useState(initial.theme);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    saveTheme(next);
    setTheme(next);
  };

  return (
    <html lang="en" data-theme={theme}>
      <head>
        <meta name="theme-color" content={themeColors[theme]} />
        <HeadContent />
      </head>
      <body>
        <ThemeContext value={{ theme, toggleTheme }}>{children}</ThemeContext>
        <Scripts />
      </body>
    </html>
  );
}
