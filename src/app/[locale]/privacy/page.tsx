import { Link } from "@/i18n/navigation";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Privacy policy — Domek",
};

const lastUpdated = "5 May 2026";

export default function PrivacyPage() {
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
          Privacy policy
        </h1>
        <div className="mt-3 inline-flex rounded-full border border-[#dfddd6] bg-[#fdfcf8] px-3 py-1 text-xs font-medium text-[#686e6a]">
          Last updated: {lastUpdated}
        </div>

        <div className="mt-8 space-y-9 text-sm leading-7 text-[#686e6a]">
          <section className="rounded-md border border-[#d9ded7] bg-[#f8fbf7] px-4 py-4 text-[#47534a]">
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">TL;DR</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Domek uses your data to run your household board, keep accounts secure, and send service messages.</li>
              <li>We do not sell personal data or household content.</li>
              <li>If analytics is enabled, it is used only for aggregate product and website usage insights.</li>
              <li>Paddle handles paid plan checkout and billing as merchant of record.</li>
              <li>You can ask to access, correct, delete, export, restrict, or object to use of your data.</li>
            </ul>
          </section>

          <section>
            <p>
              Domek is a household planner for shared calendars, tasks, notes, chores, lists, and expenses. This policy
              explains what personal data we collect, why we use it, who helps us process it, and the choices you have.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Who controls the data</h2>
            <p className="mt-3">
              The data controller for Domek is David Lesičnik,{" "}
              Glavni Trg 4, 2380 Slovenj Gradec, Slovenia. For privacy requests, contact{" "}
              <a
                href="mailto:privacy@domekapp.com"
                className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
              >
                privacy@domekapp.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Data we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Account data, such as your name, email address, profile image, sign-in provider, and session data.</li>
              <li>Contact form data, such as your name, email address, message, and delivery status.</li>
              <li>Household data, such as household name, members, roles, colors, emojis, and invite email addresses.</li>
              <li>
                Content you and household members add, including calendar events, chores, notes, to-do lists, shopping
                lists, expense categories, amounts, dates, and notes.
              </li>
              <li>
                Technical and request data needed to run the service, protect sessions, troubleshoot errors, and prevent
                misuse.
              </li>
              <li>
                Aggregate analytics data, if analytics is enabled for the site.
              </li>
              <li>
                Billing and subscription data processed through Paddle when paid plans are enabled.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
              Why we use personal data
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Account and session data: create your account, authenticate you, and keep you signed in. Lawful basis: contract performance.</li>
              <li>Household data and content: provide shared features. Lawful basis: contract performance.</li>
              <li>Invite and service-message data: send transactional emails. Lawful basis: contract performance or legitimate interests.</li>
              <li>Contact form data: receive and respond to support questions. Lawful basis: legitimate interests.</li>
              <li>Technical logs and security events: secure Domek and maintain infrastructure. Lawful basis: legitimate interests.</li>
              <li>Billing and subscription data: manage paid plans through Paddle. Lawful basis: contract performance and legal obligation.</li>
              <li>
                Aggregate analytics data: understand product and website usage trends without storing household content.
                Lawful basis: legitimate interests. Read the{" "}
                <Link href="/cookies" className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]">
                  cookie policy
                </Link>{" "}
                for information about essential cookies used by the service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Who we share data with</h2>
            <p className="mt-3">We do not sell personal data or household content.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Supabase, for authentication and database services.</li>
              <li>Resend, for transactional email delivery.</li>
              <li>Umami, for aggregate product and website analytics if enabled.</li>
              <li>Paddle, for checkout, payment, tax, and subscription management.</li>
              <li>Hosting and infrastructure providers, including Railway if used for deployment.</li>
              <li>Authorities, courts, or advisers when required by law.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">How we protect data</h2>
            <p className="mt-3">
              We use HTTPS/TLS, HTTP security headers, server-side session checks, household-scoped access controls,
              role checks for owner-only actions, hashed invite tokens, server-only secrets, and environment validation.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Cookies and analytics</h2>
            <p className="mt-3">
              Essential cookies keep you signed in and support secure authentication flows. Read the{" "}
              <Link href="/cookies" className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]">
                cookie policy
              </Link>{" "}
              for details.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">International transfers</h2>
            <p className="mt-3">
              Some providers may process data outside the EEA. We rely on Standard Contractual Clauses or other
              approved transfer mechanisms where required.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">How long we keep data</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Account and household content: kept while the account or household is active.</li>
              <li>Database backups: retained for up to about 35 days on a rolling schedule.</li>
              <li>Invite records: kept until expiry, acceptance, or revocation.</li>
              <li>Contact form messages: kept only as long as needed.</li>
              <li>Technical logs: retained for 7 days unless longer retention is needed.</li>
              <li>Billing records: kept for the period required by tax, accounting, and legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Your rights</h2>
            <p className="mt-3">
              You may have the right to request access, correction, deletion, portability, restriction, or objection to
              processing. Email{" "}
              <a href="mailto:privacy@domekapp.com" className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]">
                privacy@domekapp.com
              </a>
              . We respond within one month where GDPR applies.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Changes</h2>
            <p className="mt-3">
              We may update this policy when Domek changes. If a change materially affects how personal data is used,
              we will provide notice where required.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Helpful links</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <Link href="/cookies" className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]">
                  Cookie policy
                </Link>
              </li>
              <li>
                <a href="https://www.paddle.com/legal/privacy" rel="noreferrer" target="_blank" className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]">
                  Paddle privacy policy
                </a>
              </li>
              <li>
                <a href="https://umami.is/privacy" rel="noreferrer" target="_blank" className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]">
                  Umami privacy policy
                </a>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
