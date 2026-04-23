import Link from "next/link";

import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Terms of use — Domek",
};

const effectiveDate = "23 April 2026";

export default function TermsPage() {
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
          Terms of use
        </h1>
        <div className="mt-3 inline-flex rounded-full border border-[#dfddd6] bg-[#fdfcf8] px-3 py-1 text-xs font-medium text-[#686e6a]">
          Effective date: {effectiveDate}
        </div>

        <div className="mt-8 space-y-9 text-sm leading-7 text-[#686e6a]">
          <section className="rounded-md border border-[#d9ded7] bg-[#f8fbf7] px-4 py-4 text-[#47534a]">
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">TL;DR</h2>
            <p className="mt-3">
              This is a short, plain-language summary of the Terms of Use. It does not
              replace the full terms and is not legally binding.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Domek is a shared household planner provided by David Lesičnik in Slovenia.</li>
              <li>You must be old enough to use the service and keep your account secure.</li>
              <li>Household members may see and use shared household content based on available permissions.</li>
              <li>You keep ownership of your content, but we may process it to provide and secure Domek.</li>
              <li>Domek is not for emergencies, professional advice, or highly sensitive records.</li>
              <li>Paid plans may be handled by Paddle or another merchant of record.</li>
              <li>Service access may be limited or ended for misuse, legal risk, security risk, or non-payment.</li>
            </ul>
          </section>

          <p>
            These Terms of Use govern your access to and use of Domek, a shared
            household planner for lists, notes, chores, calendars, household expenses,
            and related home planning features. By creating an account, joining a
            household, or using Domek, you agree to these terms.
          </p>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Who we are
            </h2>
            <p className="mt-3">
              Domek is provided by David Lesičnik, Glavni Trg 4, 2380 Slovenj
              Gradec, Slovenia. In these terms, &quot;Domek&quot;, &quot;we&quot;,
              &quot;us&quot;, and &quot;our&quot; refer to David Lesičnik. Contact:
              privacy@domekapp.com. Contact details for service, legal, and privacy
              questions are also available on the{" "}
              <Link className="font-semibold underline underline-offset-2" href="/contact">
                Contact
              </Link>{" "}
              page.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Using Domek
            </h2>
            <p className="mt-3">
              You must be at least 16 years old, or older if required by the laws of
              your country, to use Domek. You may use Domek only if you can enter into
              a binding agreement under the laws that apply to you. If you use Domek
              for a household, you are responsible for making sure your use and the use
              of invited members complies with these terms.
            </p>
            <p className="mt-3">
              You are responsible for keeping your sign-in method secure and for all
              activity under your account. Tell us promptly if you believe your account
              or household has been accessed without permission.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Households and invites
            </h2>
            <p className="mt-3">
              Domek is built around shared household spaces. Household members may see,
              add, edit, or remove shared household content depending on the features
              and permissions available in the service.
            </p>
            <p className="mt-3">
              If you invite someone to a household, you confirm that you are allowed to
              share that household space with them. You should not send invites in a
              misleading, abusive, or unlawful way.
            </p>
            <p className="mt-3">
              Domek does not mediate disputes between household members and is not
              responsible for how members use shared content or permissions.
            </p>
            <p className="mt-3">
              Content shared within a household may continue to be accessible to other
              household members after you leave or remove your account, unless deleted
              using available tools.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Your content
            </h2>
            <p className="mt-3">
              You keep ownership of the notes, lists, tasks, expense entries, calendar
              items, household names, member details, and other content you or your
              household add to Domek.
            </p>
            <p className="mt-3">
              You give us a limited permission to host, store, process, display,
              transmit, back up, and otherwise use that content only as needed to
              provide, secure, maintain, and improve Domek.
            </p>
            <p className="mt-3">
              You are responsible for the content you add. Do not add content that is
              unlawful, infringes someone else&apos;s rights, contains malicious code,
              or exposes another person&apos;s private information without a lawful
              reason.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Sensitive and important information
            </h2>
            <p className="mt-3">
              Domek is a household planning tool. It is not designed for emergency use,
              medical care, legal advice, financial advice, safety-critical
              coordination, or storing highly sensitive information.
            </p>
            <p className="mt-3">
              Do not rely on Domek as the only place where you keep essential records,
              urgent instructions, access credentials, official documents, medical
              information, or financial account details.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Acceptable use
            </h2>
            <p className="mt-3">
              You must not misuse Domek. This includes attempting to access accounts,
              households, systems, or data without permission; interfering with service
              operation; bypassing security or usage limits; scraping the service;
              reverse engineering the service except where law allows; sending spam;
              or using Domek for unlawful, harmful, abusive, or deceptive activity.
            </p>
            <p className="mt-3">
              We may suspend or limit access if we reasonably believe your use creates
              security, legal, operational, payment, or abuse risk, including removing
              content, restricting features, suspending accounts, or terminating access.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Plans, trials, and payments
            </h2>
            <p className="mt-3">
              Domek may offer free trials, free features, paid subscriptions, or other
              paid plans. Prices, included features, billing periods, taxes, renewal
              terms, and cancellation options will be shown at checkout or in the
              service before you buy.
            </p>
            <p className="mt-3">
              Payments may be processed by a third-party merchant of record, such as
              Paddle, which may appear on your billing statement.
            </p>
            <p className="mt-3">
              Unless stated otherwise at checkout, paid plans renew automatically until
              cancelled. If you cancel, you may continue to have access until the end of
              the paid period. Refunds are provided only where required by law or
              explicitly stated at checkout.
            </p>
            <p className="mt-3">
              If you are a consumer in the European Union, United Kingdom, or another
              country with mandatory consumer rights, nothing in these terms limits
              rights that cannot legally be limited by contract. Any statutory withdrawal
              or cancellation rights will apply as required by law.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Privacy
            </h2>
            <p className="mt-3">
              Our handling of personal data is described in the{" "}
              <Link className="font-semibold underline underline-offset-2" href="/privacy">
                Privacy policy
              </Link>
              . Our use of cookies and similar technologies is described in the{" "}
              <Link className="font-semibold underline underline-offset-2" href="/cookies">
                Cookie policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Third-party services
            </h2>
            <p className="mt-3">
              Domek may rely on third-party providers for hosting, authentication,
              payments, analytics, email delivery, infrastructure, and other service
              functions. Your use of third-party sign-in, payment, or platform services
              may also be governed by their own terms and policies.
            </p>
            <p className="mt-3">
              We are not responsible for third-party services or their availability,
              security, or practices.
            </p>
            <p className="mt-3">
              Third-party providers may be located in different countries and may
              process data outside your country of residence.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Service changes and availability
            </h2>
            <p className="mt-3">
              We may update, add, remove, suspend, or discontinue features from time to
              time. We aim to keep Domek available, but we do not guarantee uninterrupted
              or error-free service. Maintenance, outages, data provider issues, network
              failures, security work, failures of third-party providers or
              infrastructure, or other events may affect availability.
            </p>
            <p className="mt-3">
              Domek is not a service with guaranteed uptime or service level commitments
              unless explicitly stated.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Domek materials
            </h2>
            <p className="mt-3">
              Domek, including the software, design, branding, text, and other service
              materials, is owned by us or our licensors and is protected by intellectual
              property laws. These terms do not give you ownership of Domek or permission
              to copy, modify, distribute, sell, or lease any part of the service except
              as needed to use Domek normally.
            </p>
            <p className="mt-3">
              If you send feedback or suggestions, we may use them without restriction
              or obligation to you.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Ending access
            </h2>
            <p className="mt-3">
              You may stop using Domek at any time. We may suspend or terminate access
              if you breach these terms, fail to pay amounts due, create risk for Domek
              or other users, or if we must do so to comply with law.
            </p>
            <p className="mt-3">
              After access ends, we may suspend, restrict, retain, or delete account
              and household data in line with the Privacy policy, legal obligations,
              backup practices, abuse and security needs, and any product controls
              available to you.
            </p>
            <p className="mt-3">
              Sections relating to liability, disclaimers, intellectual property, and
              governing law continue to apply after termination.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Events outside our control
            </h2>
            <p className="mt-3">
              We are not liable for failure or delay in performance caused by events
              outside our reasonable control, including natural disasters, network
              failures, power outages, acts of government, or failures of third-party
              providers.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Assignment
            </h2>
            <p className="mt-3">
              We may assign or transfer these terms, in whole or in part, as part of a
              merger, sale of assets, financing, or acquisition. You may not assign your
              rights or obligations without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Disclaimers
            </h2>
            <p className="mt-3">
              Domek is provided on an &quot;as is&quot; and &quot;as available&quot;
              basis. To the fullest extent allowed by law, we disclaim warranties of
              merchantability, fitness for a particular purpose, non-infringement, and
              uninterrupted or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Liability
            </h2>
            <p className="mt-3">
              To the fullest extent allowed by law, we will not be liable for indirect,
              incidental, special, consequential, exemplary, or punitive damages, or for
              lost profits, lost revenue, lost data, or business interruption.
            </p>
            <p className="mt-3">
              To the fullest extent allowed by law, our total liability for claims
              relating to Domek or these terms is limited to the amount you paid to us
              for Domek in the twelve months before the event giving rise to the claim,
              or EUR 100 if you did not pay us during that period. This applies
              regardless of the legal theory, including contract, tort, negligence,
              strict liability, or otherwise.
            </p>
            <p className="mt-3">
              Nothing in these terms excludes or limits liability where it would be
              unlawful to do so, including liability for fraud, intentional misconduct,
              or mandatory consumer rights.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Changes to these terms
            </h2>
            <p className="mt-3">
              We may update these terms when the service, law, or our business changes.
              If changes are material, we will take reasonable steps to notify you, such
              as by posting the updated terms in the service or sending a notice to the
              email address connected to your account. Continued use after changes take
              effect means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Governing law
            </h2>
            <p className="mt-3">
              These terms are governed by the laws of Slovenia, unless mandatory
              consumer protection law gives you rights under the law of your place of
              residence. The courts of Slovenia may hear disputes relating to these
              terms or Domek, unless consumer law provides otherwise.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
              Contact
            </h2>
            <p className="mt-3">
              Questions about these terms can be sent to privacy@domekapp.com or
              through the{" "}
              <Link className="font-semibold underline underline-offset-2" href="/contact">
                Contact
              </Link>{" "}
              page.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
