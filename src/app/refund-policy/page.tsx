import Link from "next/link";

import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Refund policy — Domek",
};

const effectiveDate = "23 April 2026";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321] flex flex-col">
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
              <li>Domek includes a 30-day free trial before any paid charge is made.</li>
              <li>After trial, Domek is billed as a yearly subscription.</li>
              <li>
                You can cancel at any time. Cancellation stops future renewals and access continues until the current
                paid year ends.
              </li>
              <li>
                We typically do not offer prorated refunds for unused time, but we review edge cases in a fair and
                reasonable way.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              30-day free trial
            </h2>
            <p className="mt-3">
              New paid households start with a 30-day free trial. You can cancel during trial and you will not be
              charged for the yearly subscription.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Yearly subscription billing
            </h2>
            <p className="mt-3">
              Once the trial ends, Domek bills annually. Your subscription renews each year until canceled.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Refunds</h2>
            <p className="mt-3">
              If you were charged after your free trial, you can request a refund within 14 days of the first yearly
              charge if usage has been minimal after the charge, based on our reasonable assessment. We review these
              requests in good faith.
            </p>
            <p className="mt-3">
              If you were charged due to an unintended renewal, contact us within a short period after the charge (for
              example, within a few days) and we&apos;ll review it.
            </p>
            <p className="mt-3">
              After that period, yearly subscription charges are typically non-refundable to the extent permitted by
              applicable consumer protection laws, and we generally do not provide prorated refunds for partial years.
            </p>
            <p className="mt-3">
              If your payment is processed by a merchant of record (for example, Paddle), refunds may in some cases be
              handled directly through that provider under their policies and procedures.
            </p>
            <p className="mt-3">The same general refund approach applies to renewal charges.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              How to request a refund
            </h2>
            <p className="mt-3">
              Email{" "}
              <a className="font-semibold underline underline-offset-2" href="mailto:support@domekapp.com">
                support@domekapp.com
              </a>{" "}
              with the account email, charge date, and reason for the request. We aim to respond within a few business
              days.
            </p>
            <p className="mt-3">
              If something feels off, reach out — we&apos;d rather fix it than have you leave unhappy.
            </p>
          </section>

          <p className="text-xs text-[#8a908b]">
            This refund policy is provided for clarity and does not limit any mandatory consumer rights that apply in your
            country.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
