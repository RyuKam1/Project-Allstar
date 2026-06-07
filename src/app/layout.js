import "./globals.css";
import Footer from "@/components/Layout/Footer";
import BottomNav from "@/components/Layout/BottomNav";
import RouteFocus from "@/components/Layout/RouteFocus";
import ScrollRestoration from "@/components/Layout/ScrollRestoration";
import { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeSwitcher from "@/components/UI/ThemeSwitcher";
import { NotificationCenter } from "@/components/UI/NotificationCenter";
import {
  getThemeFontsUrl,
  getThemeStyleObject,
  normalizeThemeId,
  THEME_COOKIE_NAME,
} from "@/lib/themeTypography";
import { cookies } from "next/headers";

export const metadata = {
  title: "Project AllStar - Sports Tournament Platform",
  description: "Discover stadiums, fields, and gyms near you. Join teams, compete in tournaments, and connect with athletes.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const theme = normalizeThemeId(cookieStore.get(THEME_COOKIE_NAME)?.value);
  const themeStyle = getThemeStyleObject(theme);
  const themeFontsUrl = getThemeFontsUrl(theme);

  return (
    <html
      lang="en"
      data-theme={theme}
      style={themeStyle}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link id="theme-fonts" href={themeFontsUrl} rel="stylesheet" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider initialTheme={theme}>
          <AuthProvider>
            <NotificationCenter>
              <div id="main-content" tabIndex={-1}>
                {children}
              </div>
              <Footer />
              <BottomNav />
              <RouteFocus />
              <Suspense fallback={null}>
                <ScrollRestoration />
              </Suspense>
              <ThemeSwitcher />
            </NotificationCenter>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
