import "./globals.css";
import Footer from "@/components/Layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeSwitcher from "@/components/UI/ThemeSwitcher";

export const metadata = {
  title: "Project AllStar",
  description: "Discover stadiums, fields, and gyms near you.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Footer />
            <ThemeSwitcher />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
