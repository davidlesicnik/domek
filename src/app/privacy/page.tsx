import Link from "next/link";

import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Privacy policy — Domek",
};

const lastUpdated = "23 April 2026";

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
              <li>Optional analytics runs only if you accept analytics cookies.</li>
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
              <li>Household data, such as household name, members, roles, colors, emojis, and invite email addresses.</li>
              <li>
                Content you and household members add, including calendar events, chores, notes, to-do lists, shopping
                lists, expense categories, amounts, dates, and notes.
              </li>
              <li>
                Technical and request data needed to run the service, protect sessions, troubleshoot errors, and prevent
                misuse. Based on Domek&apos;s source and hosting needs, this may include IP address, request date and
                time, requested path or endpoint, HTTP method, response status code, referrer, browser or user-agent
                details, forwarded host and protocol headers, session cookie metadata, and error details. Domek does not
                intentionally log household content as technical data.
              </li>
              <li>
                Cookie preference data and, if you accept optional cookies, Google Analytics usage events. Domek is
                configured not to send household names, invite tokens, note text, list item text, expense amounts, or
                other household content to analytics.
              </li>
              <li>
                Billing and subscription data processed through Paddle when paid plans are enabled, such as checkout,
                transaction, tax, invoice, subscription, and payment status information.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
              Why we use personal data
            </h2>
            <p className="mt-3">
              The main data categories, purposes, and GDPR lawful bases are:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                Account data and session data are used to create your account, authenticate you, and keep you signed in.
                The lawful basis is contract performance or steps taken before a contract.
              </li>
              <li>
                Household data and household content are used to provide shared calendars, notes, chores, lists,
                expenses, invites, member settings, and collaboration features. The lawful basis is contract performance.
              </li>
              <li>
                Invite email addresses and service-message data are used to send transactional emails, such as household
                invites and important service notices. The lawful basis is contract performance or legitimate interests.
              </li>
              <li>
                Technical logs, security events, and request metadata, such as IP address, timestamps, requested endpoint,
                HTTP method, response status, referrer, browser or user-agent details, forwarded host and protocol
                headers, session cookie metadata, and error details, are used to secure Domek, prevent abuse, debug
                issues, route authentication safely, and maintain reliable infrastructure. The lawful basis is legitimate
                interests.
              </li>
              <li>
                Billing, subscription, invoice, and payment status data are used to manage paid plans, taxes, accounting,
                refunds, and payment support through Paddle. The lawful basis is contract performance and legal
                obligation.
              </li>
              <li>
                Cookie preference data is used to remember your cookie choice. The lawful basis is legitimate interests
                for necessary preference storage.
              </li>
              <li>
                Google Analytics usage data is used to understand aggregate product usage only when you accept optional
                cookies. The lawful basis is consent, and you can change that choice on the{" "}
                <Link
                  href="/cookies"
                  className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
                >
                  cookie policy
                </Link>{" "}
                page.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Who we share data with</h2>
            <p className="mt-3">
              We do not sell personal data or household content. We share data with service providers only where needed
              to operate Domek, comply with law, or protect the service.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Supabase, for authentication, database services, and related application infrastructure.</li>
              <li>Resend, for transactional email delivery.</li>
              <li>Google Analytics, only when optional analytics cookies are accepted.</li>
              <li>
                Paddle, for checkout, payment processing, tax, invoice, subscription, fraud-prevention, and buyer support
                data when paid plans are enabled. Paddle acts as merchant of record and may process payment and billing
                data as an independent data controller under its own privacy notice.
              </li>
              <li>Hosting and infrastructure providers, including Railway if used for deployment.</li>
              <li>Authorities, courts, advisers, or other parties when required by law or needed to protect rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">How we protect data</h2>
            <p className="mt-3">
              We use technical and organizational safeguards appropriate for a small household-planning service. These
              include HTTPS/TLS for data in transit, HTTP security headers, server-side session checks for protected
              pages and API routes, household-scoped access controls, role checks for owner-only actions, hashed invite
              tokens, server-only secrets, environment validation, and provider access controls. We also use operational
              monitoring, request logging, and error logging to detect, investigate, and fix reliability or security
              issues.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
              Cookies and analytics
            </h2>
            <p className="mt-3">
              Essential cookies keep you signed in and protect your session. Optional analytics cookies are used only if
              you accept them. You can review cookie details and update your choice at any time on the{" "}
              <Link
                href="/cookies"
                className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
              >
                cookie policy
              </Link>{" "}
              page.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
              International transfers
            </h2>
            <p className="mt-3">
              Some providers may process data outside your country or outside the European Economic Area. Where required,
              we rely on data processing agreements and transfer safeguards, including Standard Contractual Clauses
              approved by the European Commission. For transfers from the United Kingdom, we use the UK International Data
              Transfer Agreement or the UK Addendum to the EU Standard Contractual Clauses where applicable. We also
              review provider security commitments and data-location options where available.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">How long we keep data</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Account and household content is kept while the account or household is active.</li>
              <li>
                Deleted account or household content is removed from the live service when deletion is completed, but may
                remain in backups for the rolling backup period.
              </li>
              <li>
                Database backups are retained on a rolling schedule for up to about 35 days. Backup retention may be
                adjusted as operational needs change.
              </li>
              <li>
                Invite links expire after 7 days. Invite records are kept until expiry, acceptance, or revocation, and
                may be retained after they are no longer active for abuse prevention, audit, or legal reasons.
              </li>
              <li>
                Technical logs, HTTP logs, and error records are retained for 7 days, unless logs need to be kept longer
                for security, incident investigation, or legal reasons.
              </li>
              <li>
                Billing, tax, invoice, and payment records are kept for the period required by tax, accounting, payment,
                chargeback, and legal obligations.
              </li>
              <li>
                Analytics data follows the retention settings of Google Analytics and your cookie choice, and is normally
                reviewed in aggregate rather than as household-level content.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Your rights</h2>
            <p className="mt-3">
              Depending on where you live, you may have the right to request access, correction, deletion, portability,
              restriction, or objection to processing. Where processing is based on consent, you can withdraw consent at
              any time.
            </p>
            <p className="mt-4">
              To make a privacy request, email{" "}
              <a
                href="mailto:privacy@domekapp.com"
                className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
              >
                privacy@domekapp.com
              </a>
              . We respond within one month where GDPR applies. If a request is complex or we receive many requests, we
              may extend that period by up to two further months and will explain the delay. We may need to verify your
              identity before acting on a request.
            </p>
            <p className="mt-4">
              We may refuse or limit a request where the law allows it, for example if a request is manifestly
              unfounded, excessive, conflicts with another person&apos;s rights, or conflicts with legal retention
              obligations. If we refuse a request, we will explain why where required.
            </p>
            <p className="mt-4">
              You also have the right to lodge a complaint with your local supervisory authority in the EEA, the UK
              Information Commissioner&apos;s Office if UK law applies, or another local data protection authority
              available to you.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
              Automated decision-making
            </h2>
            <p className="mt-3">
              Domek does not use automated decision-making or profiling that produces legal or similarly significant
              effects.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
              Children and household members
            </h2>
            <p className="mt-3">
              Domek is intended for adults and household organizers. It is not knowingly directed to children under 16 or
              the minimum age required by local law. Household members should avoid adding sensitive information about
              children or other people unless they have a lawful reason and permission to do so.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Changes</h2>
            <p className="mt-3">
              We may update this policy when Domek changes, when providers change, or when legal requirements change. If
              a change materially affects how personal data is used, we will provide notice before it takes effect where
              required.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Helpful links</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <Link
                  href="/cookies"
                  className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
                >
                  Cookie policy
                </Link>
              </li>
              <li>
                <a
                  href="https://www.paddle.com/legal/privacy"
                  rel="noreferrer"
                  target="_blank"
                  className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
                >
                  Paddle privacy policy
                </a>
              </li>
              <li>
                <a
                  href="https://policies.google.com/privacy"
                  rel="noreferrer"
                  target="_blank"
                  className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
                >
                  Google privacy policy
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
