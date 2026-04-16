import Link from "next/link";

import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Cookie policy — Domek",
};

export default function CookiesPage() {
  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321] flex flex-col">
      <header className="border-b border-[#dfddd6] bg-[#fdfcf8]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="font-serif text-3xl font-semibold tracking-normal text-[#171a18] hover:opacity-80 transition"
          >
            Domek
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <h1 className="font-serif text-3xl font-semibold tracking-normal text-[#171a18] sm:text-4xl">
          Cookie policy
        </h1>
        <div className="mt-8 space-y-5 text-sm leading-7 text-[#686e6a]">
          <p>
            Domek uses essential cookies to keep you signed in and protect your session.
            These cookies are required for the home board to work.
          </p>
          <p>
            If analytics is enabled, Domek may also use Google Analytics cookies to
            understand aggregate page views and product events. Analytics should not
            include household names, invite tokens, note text, list item text, expense
            amounts, or other household content.
          </p>
          <p>
            You can limit or block cookies in your browser settings. Blocking essential
            cookies may prevent sign-in and shared household features from working.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
