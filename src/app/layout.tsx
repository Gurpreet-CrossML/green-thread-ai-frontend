import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import MainLayout from "@/app/main-layout";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/app/Sessionproviders";
import StoreProvider from "@/redux/store-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Store Signals AI Analytics",
    default: "Store Signals AI Analytics",
  },
  description:
    "Store Signals AI Analytics is a master dashboard for all your store's analytics needs. It provides insights into sales, customer behavior, and inventory management, helping you make informed decisions to grow your business.",
};

/**
 * Lets the browser's page translator (e.g. Chrome's Google Translate) run on
 * the dashboard without crashing it. The translator replaces text nodes React
 * still manages, and React then fails ("removeChild": not a child) when it
 * updates them, which blanks the page. This makes those two DOM calls skip a
 * node that is no longer where React left it, instead of throwing.
 */
const TRANSLATE_GUARD = `
(function () {
  if (typeof Node !== "function" || !Node.prototype) return;
  var removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) return child;
    return removeChild.apply(this, arguments);
  };
  var insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return insertBefore.apply(this, arguments);
  };
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
      data-scroll-behavior="smooth"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TRANSLATE_GUARD }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Providers>
          <StoreProvider>
            <TooltipProvider>
              <MainLayout>{children}</MainLayout>
            </TooltipProvider>
            <Toaster theme="light" />
          </StoreProvider>
        </Providers>
      </body>
    </html>
  );
}
