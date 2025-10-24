import { Roboto } from "next/font/google";
import localFont from "next/font/local";
import "@rainbow-me/rainbowkit/styles.css";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = {
  metadataBase: new URL("https://bugchan.xyz"),
  ...getMetadata({
    title: "BugChan",
    description: "A Decentralized Bug Bounty Platform",
  }),
};

const akiraExpanded = localFont({
  src: [{ path: "../public/fonts/AkiraExpanded.otf", weight: "800" }],
  variable: "--font-akira",
  display: "swap",
});
const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={`${akiraExpanded.variable} ${roboto.variable} antialiased`}>
      <body>
        <ThemeProvider enableSystem>
          <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
