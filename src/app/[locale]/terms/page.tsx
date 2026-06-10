import { Footer } from "@/components/layout/footer";
import { Link } from "@/i18n/navigation";

export const metadata = {
  title: "Terms of use — Domek",
};

const effectiveDate = "10 June 2026";

export default function TermsPage() {
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
          Terms of use
        </h1>
        <div className="mt-3 inline-flex rounded-full border border-[#dfddd6] bg-[#fdfcf8] px-3 py-1 text-xs font-medium text-[#686e6a]">
          Effective date: {effectiveDate}
        </div>

        <div className="mt-8 space-y-9 text-sm leading-7 text-[#686e6a]">
          <section className="rounded-md border border-[#d9ded7] bg-[#f8fbf7] px-4 py-4 text-[#47534a]">
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">TL;DR</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Domek is a shared household planner provided by David Lesičnik in Slovenia.</li>
              <li>You must be old enough to use the service and keep your account secure.</li>
              <li>Household members may see and use shared household content based on available permissions.</li>
              <li>You keep ownership of your content, but we may process it to provide and secure Domek.</li>
              <li>Domek is not for emergencies, professional advice, or highly sensitive records.</li>
              <li>The core app is offered without built-in billing or paid-plan access controls.</li>
              <li>Service access may be limited or ended for misuse, legal risk, or security risk.</li>
            </ul>
          </section>

          <p>
            These Terms of Use govern your access to and use of Domek. By creating an account, joining a household, or
            using Domek, you agree to these terms.
          </p>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Who we are</h2>
            <p className="mt-3">
              Domek is provided by David Lesičnik, Glavni Trg 4, 2380 Slovenj Gradec, Slovenia. Contact:
              privacy@domekapp.com. See the{" "}
              <Link className="font-semibold underline underline-offset-2" href="/contact">
                Contact
              </Link>{" "}
              page for more details.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Using Domek</h2>
            <p className="mt-3">
              You must be at least 16 years old to use Domek. You are responsible for keeping your sign-in secure and
              for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Households and invites</h2>
            <p className="mt-3">
              Household members may see, add, edit, or remove shared household content. If you invite someone to a
              household, you confirm you are allowed to share that space with them. Domek does not mediate disputes
              between household members.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Your content</h2>
            <p className="mt-3">
              You keep ownership of content you add to Domek. You give us a limited permission to host, store, and
              process that content only as needed to provide and secure Domek. You are responsible for the content you
              add.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Sensitive information</h2>
            <p className="mt-3">
              Domek is not designed for emergency use, medical care, legal advice, or storing highly sensitive
              information. Do not rely on Domek as the only place you keep essential records.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Acceptable use</h2>
            <p className="mt-3">
              You must not misuse Domek. This includes attempting unauthorized access, interfering with service
              operation, or using Domek for unlawful activity. We may suspend or limit access for abuse or security
              risk.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Self-hosting and operators</h2>
            <p className="mt-3">
              Domek is designed to be self-hosted. If you run it for yourself or others, you are responsible for your
              deployment, backups, email setup, and compliance obligations for the environment you choose.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Privacy</h2>
            <p className="mt-3">
              See the{" "}
              <Link className="font-semibold underline underline-offset-2" href="/privacy">
                Privacy policy
              </Link>{" "}
              and{" "}
              <Link className="font-semibold underline underline-offset-2" href="/cookies">
                Cookie policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Disclaimers</h2>
            <p className="mt-3">
              Domek is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the fullest extent
              allowed by law, we disclaim warranties of merchantability, fitness for a particular purpose, and
              uninterrupted operation.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Liability</h2>
            <p className="mt-3">
              To the fullest extent allowed by law, our total liability is limited to EUR 100. Nothing limits
              liability where it would be unlawful to do so.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Governing law</h2>
            <p className="mt-3">
              These terms are governed by the laws of Slovenia, unless mandatory consumer protection law gives you
              rights under your local law.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">Contact</h2>
            <p className="mt-3">
              Questions can be sent to privacy@domekapp.com or through the{" "}
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
