import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/*
  Not Geist. Geist is what `create-next-app` installs, and a typeface nobody
  chose is the loudest thing on a page — it reads as a default because it is
  one.

  IBM Plex was drawn for machines that print: it has a mono cut that belongs on
  a receipt and a sans with enough character to carry a headline without
  shouting. The two are one family, so the terminal blocks and the prose share
  proportions instead of merely coexisting. That is the whole visual argument
  here — a till is an industrial object.

  Weights are picked, not imported wholesale: 400 and 600 only. Three weights on
  a page is already one too many.
*/
const plexSans = IBM_Plex_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aval — the co-sign rail for agent payments",
  description:
    "A Solana blockhash lasts about ninety seconds. Aval anchors an agent's payment to a durable nonce so it survives the human who has to approve it. Limits live in Rust, not in the prompt.",
  openGraph: {
    title: "Aval — the co-sign rail for agent payments",
    description:
      "Durable nonce instead of a blockhash. Limits enforced in Rust. No keys held on the charge path.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
