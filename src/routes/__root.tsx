import { useState, type CSSProperties, type ReactNode } from "react";
import { createRootRoute, HeadContent, Link, Scripts } from "@tanstack/react-router";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import stylesUrl from "../styles.css?url";
import manropeUrl from "@fontsource-variable/manrope/index.css?url";
import sourceSerifUrl from "@fontsource-variable/source-serif-4/index.css?url";
import readingFontsUrl from "../reading-fonts.css?url";
import { readTheme, saveTheme, themeColors } from "../lib/theme";
import { ReaderProvider } from "../hooks/useReader";
import { ThemeContext } from "../hooks/useTheme";
import { ReadingFontContext } from "../hooks/useReadingFont";
import {
  readingFontFamily,
  readReadingFont,
  saveReadingFont,
  type ReadingFont,
} from "../lib/reading-font";
import { siteDescription, siteTitle, siteUrl } from "../lib/site";

export const Route = createRootRoute({
  beforeLoad: () => ({ theme: readTheme(), readingFont: readReadingFont() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Fallbacks for pages without their own head, such as Not Found. Each route
      // sets its title, description, canonical URL and preview text with pageHead().
      { title: siteTitle },
      { name: "description", content: siteDescription },
      // Link-preview tags shared by every page.
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Still" },
      { property: "og:image", content: `${siteUrl}/og.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content:
          "Still: A little space. Your own pace. Read freely, follow a moving highlight, or focus on one word at a time.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${siteUrl}/og.png` },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: manropeUrl },
      { rel: "stylesheet", href: sourceSerifUrl },
      { rel: "stylesheet", href: readingFontsUrl },
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
  const [readingFont, setReadingFont] = useState(initial.readingFont);
  const changeReadingFont = (next: ReadingFont) => {
    saveReadingFont(next);
    setReadingFont(next);
  };

  return (
    <html
      lang="en"
      data-theme={theme}
      data-font={readingFont}
      style={{ "--reading": readingFontFamily(readingFont) } as CSSProperties}
    >
      <head>
        <meta name="theme-color" content={themeColors[theme]} />
        <HeadContent />
      </head>
      <body>
        <ThemeContext value={{ theme, toggleTheme }}>
          <ReadingFontContext value={{ font: readingFont, setFont: changeReadingFont }}>
            <ReaderProvider>{children}</ReaderProvider>
          </ReadingFontContext>
        </ThemeContext>
        <TanStackDevtools
          config={{ position: "bottom-left" }}
          plugins={[{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  );
}
