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
              Domek sets essential cookies to keep you signed in, protect your session, and complete authentication
              flows safely.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">What the cookies do</h2>
            <p className="mt-3">
              These cookies support sign-in, session continuity, and security checks. They are not used to store
              household content such as notes, shopping items, expenses, or invite tokens.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">How long cookies last</h2>
            <p className="mt-3">
              Essential sign-in cookies may be session or persistent cookies, depending on the authentication flow and
              browser behavior.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Your choice</h2>
            <p className="mt-3">
              You can control or clear cookies from your browser settings. Blocking essential cookies may prevent
              sign-in from working correctly.
            </p>
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
