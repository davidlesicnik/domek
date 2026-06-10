import { Footer } from "@/components/layout/footer";
import { Link } from "@/i18n/navigation";

export const metadata = {
  title: "Refund policy — Domek",
};

const effectiveDate = "10 June 2026";

export default function RefundPolicyPage() {
  return (
    <div className="flex min-h-dvh flex-col border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321]">
      <header className="border-b border-[#dfddd6] bg-[#fdfcf8]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="font-serif text-3xl font-semibold tracking-normal text-[#171a18] transition hover:opacity-80"
          >
            Domek
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <h1 className="font-serif text-3xl font-semibold tracking-normal text-[#171a18] sm:text-4xl">
          Refund policy
        </h1>
        <div className="mt-3 inline-flex rounded-full border border-[#dfddd6] bg-[#fdfcf8] px-3 py-1 text-xs font-medium text-[#686e6a]">
          Effective date: {effectiveDate}
        </div>

        <div className="mt-8 space-y-8 text-sm leading-7 text-[#686e6a]">
          <section className="rounded-md border border-[#d9ded7] bg-[#f8fbf7] px-4 py-4 text-[#47534a]">
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Summary</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>The self-hosted Domek core does not charge end users.</li>
              <li>There is no built-in checkout, subscription, or trial flow in the app.</li>
              <li>If you buy hosting, email, or infrastructure from another provider, that provider sets its own refund terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Core app</h2>
            <p className="mt-3">
              Domek itself does not process payments in the self-hosted release. Because the app is free to run, there
              is no in-app refund process for core access.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Third-party services</h2>
            <p className="mt-3">
              If you choose paid hosting, managed PostgreSQL, SMTP, domains, or other infrastructure, those purchases
              are separate from Domek and follow the refund policies of the vendors you choose.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Questions</h2>
            <p className="mt-3">
              If you have a question about the open-source release or need help understanding what Domek does and does
              not handle, email{" "}
              <a className="font-semibold underline underline-offset-2" href="mailto:support@domekapp.com">
                support@domekapp.com
              </a>
              .
            </p>
          </section>

          <p className="text-xs text-[#8a908b]">
            This page does not limit any mandatory consumer rights that apply to services you buy from third-party
            providers.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
