import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Murabaha",
  description: "Лендинг и калькулятор рассрочки Murabaha",
};

/**
 * Static export cannot serve unknown `/ur/{slug}` routes.
 * This runs before Next boots: remember the slug, open the home page so hydration
 * matches `index.html`, then the landing puts `/ur/{slug}` back into the address bar.
 */
const PARTNER_PATH_BOOTSTRAP = `(function(){
  var nativeReplace = history.replaceState.bind(history);
  var match = location.pathname.match(/^\\/ur\\/([^/]+)\\/?$/);
  if (!match) return;
  var slug = match[1];
  try { slug = decodeURIComponent(slug); } catch (e) {}
  slug = String(slug || "").trim().toLowerCase();
  if (!slug) return;
  window.__murabahaPathSlug = slug;
  window.__murabahaRestorePartnerUrl = function () {
    nativeReplace(history.state, "", "/ur/" + slug);
  };
  nativeReplace(history.state, "", "/");
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <Script id="murabaha-partner-path" strategy="beforeInteractive">
          {PARTNER_PATH_BOOTSTRAP}
        </Script>
        {children}
      </body>
    </html>
  );
}
