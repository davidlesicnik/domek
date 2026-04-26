import { CookiePreferences } from "@/components/analytics/cookie-preferences";
import { Footer } from "@/components/layout/footer";
import { BackButton } from "@/components/navigation/back-button";
import { Link } from "@/i18n/navigation";

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
        <div className="mt-8 space-y-7 text-sm leading-7 text-[#686e6a]">
          <p>
            Cookies are small text files stored on your device that help websites function and understand how they
            are used.
          </p>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Who sets cookies</h2>
            <p className="mt-3">
              Domek sets essential cookies to keep you signed in and protect your session. Google Analytics may set
              cookies to collect usage data when you accept optional cookies.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Optional cookies</h2>
            <p className="mt-3">
              Optional cookies are used to understand how Domek is used. Analytics is configured not to include
              household names, invite tokens, note text, list item text, expense amounts, or other household content.
            </p>
            <p className="mt-3">
              You can learn more about how Google uses data in Google&apos;s{" "}
              <a
                className="font-semibold underline underline-offset-2"
                href="https://policies.google.com/privacy"
                rel="noreferrer"
                target="_blank"
              >
                privacy policy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">How long cookies last</h2>
            <p className="mt-3">
              Essential sign-in cookies may be session or persistent cookies. Domek stores your cookie choice for
              180 days. Google Analytics cookies may be persistent and last for the period set by Google unless you
              reject or clear them.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Your choice</h2>
            <p className="mt-3">
              You can change your cookie preferences at any time from this page. Blocking essential cookies may
              prevent sign-in from working.
            </p>
            <div className="mt-4">
              <CookiePreferences />
            </div>
          </section>

          <div className="-mt-2">
            <BackButton fallbackHref="/" label="Back to previous page" />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
