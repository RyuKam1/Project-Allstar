import "./globals.css";
import Footer from "@/components/Layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeSwitcher from "@/components/UI/ThemeSwitcher";

export const metadata = {
  title: "Project AllStar - Sports Tournament Platform",
  description: "Discover stadiums, fields, and gyms near you. Join teams, compete in tournaments, and connect with athletes.",
  lang: "en",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>
          <AuthProvider>
            <main id="main-content">
              {children}
            </main>
            <Footer />
            <ThemeSwitcher />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
