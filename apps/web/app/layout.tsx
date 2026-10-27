import "./globals.css";
import { Nav, Footer } from "../components/shell";
export const metadata = {
  title: "3KNOT — Automotive XR",
  description:
    "Create a vehicle that feels like you. Explore, configure and connect with your studio.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
