import { Footer } from "@/components/layout/footer";
import { Link } from "@/i18n/navigation";

export const metadata = {
  title: "Privacy policy — Domek",
};

const lastUpdated = "10 June 2026";

export default function PrivacyPage() {
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
          Privacy policy
        </h1>
        <div className="mt-3 inline-flex rounded-full border border-[#dfddd6] bg-[#fdfcf8] px-3 py-1 text-xs font-medium text-[#686e6a]">
          Last updated: {lastUpdated}
        </div>

        <div className="mt-8 space-y-9 text-sm leading-7 text-[#686e6a]">
          <section className="rounded-md border border-[#d9ded7] bg-[#f8fbf7] px-4 py-4 text-[#47534a]">
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">TL;DR</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Domek uses your data to run your household board, keep accounts secure, and send service emails.</li>
              <li>We do not sell personal data or household content.</li>
              <li>The core app does not ship advertising, analytics trackers, or payment processing.</li>
              <li>Self-hosted operators choose where Domek runs and whether email is configured.</li>
              <li>You can ask to access, correct, delete, export, restrict, or object to use of your data.</li>
            </ul>
          </section>

          <section>
            <p>
              Domek is a household planner for shared calendars, tasks, notes, chores, lists, and expenses. This
              policy explains what personal data we collect, why we use it, who helps process it, and the choices you
              have.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Who controls the data</h2>
            <p className="mt-3">
              The data controller for the hosted Domek website and first-party communications is David Lesičnik,
              Glavni Trg 4, 2380 Slovenj Gradec, Slovenia. For privacy requests, contact{" "}
              <a
                href="mailto:privacy@domekapp.com"
                className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
              >
                privacy@domekapp.com
              </a>
              .
            </p>
            <p className="mt-3">
              If you self-host Domek, you or your organization may be the data controller for the deployment you run.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Data we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Account data, such as your name, email address, password hash, and session data.</li>
              <li>Household data, such as household name, members, roles, colors, emojis, and invite email addresses.</li>
              <li>
                Content you and household members add, including calendar events, chores, notes, to-do lists,
                shopping lists, expense categories, amounts, dates, and notes.
              </li>
              <li>
                Technical and request data needed to run the service, protect sessions, troubleshoot errors, and
                prevent misuse.
              </li>
              <li>Optional email-delivery metadata when an operator enables SMTP for invites or password resets.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
              Why we use personal data
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Account and session data: create your account, authenticate you, and keep you signed in.</li>
              <li>Household data and content: provide shared features.</li>
              <li>Invite and password-reset data: send transactional emails when email is configured.</li>
              <li>Technical logs and security events: secure Domek and maintain infrastructure.</li>
              <li>
                Essential cookies and stored session tokens: keep the app secure and usable. Read the{" "}
                <Link
                  href="/cookies"
                  className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
                >
                  cookie policy
                </Link>{" "}
                for more detail.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Who we share data with</h2>
            <p className="mt-3">We do not sell personal data or household content.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Infrastructure, database, email, and backup providers chosen by the operator running the app.</li>
              <li>Authorities, courts, or advisers when required by law.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">How we protect data</h2>
            <p className="mt-3">
              We use HTTPS/TLS, HTTP security headers, server-side session checks, household-scoped access controls,
              role checks for owner-only actions, hashed invite tokens, server-only secrets, and environment
              validation.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Cookies and analytics</h2>
            <p className="mt-3">
              Essential cookies keep you signed in and support secure authentication flows. The core app does not ship
              advertising pixels or analytics trackers. Read the{" "}
              <Link
                href="/cookies"
                className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
              >
                cookie policy
              </Link>{" "}
              for details.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">International transfers</h2>
            <p className="mt-3">
              Transfers depend on the infrastructure and service providers chosen by the operator running Domek. If you
              self-host, review the providers you use and apply the safeguards required in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">How long we keep data</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Account and household content: kept while the account or household is active.</li>
              <li>Database backups: retained according to the operator’s backup schedule.</li>
              <li>Invite records: kept until expiry, acceptance, or revocation.</li>
              <li>Technical logs: retained only as long as needed for operations and security.</li>
              <li>Email-delivery logs: retained only when SMTP is enabled and only as long as needed for troubleshooting.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Your rights</h2>
            <p className="mt-3">
              You may have the right to request access, correction, deletion, portability, restriction, or objection to
              processing. Email{" "}
              <a
                href="mailto:privacy@domekapp.com"
                className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
              >
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
