import { Link } from "@/i18n/navigation";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Account deletion — Domek",
};

const effectiveDate = "26 May 2026";

export default function AccountDeletionPage() {
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
          Account deletion
        </h1>
        <div className="mt-3 inline-flex rounded-full border border-[#dfddd6] bg-[#fdfcf8] px-3 py-1 text-xs font-medium text-[#686e6a]">
          Effective date: {effectiveDate}
        </div>

        <div className="mt-8 space-y-9 text-sm leading-7 text-[#686e6a]">
          <section className="rounded-md border border-[#d9ded7] bg-[#f8fbf7] px-4 py-4 text-[#47534a]">
            <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">TL;DR</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>You can delete your Domek account directly in the mobile app under Account settings.</li>
              <li>If you own a household with other members still attached, transfer ownership or clean up the household first.</li>
              <li>Deleting your account removes access to your household data and signs you out of the app.</li>
              <li>If you cannot complete deletion in-app, contact us and we will help verify and process the request.</li>
            </ul>
          </section>

          <section>
            <p>
              This page explains the public account-deletion path for Domek mobile. The primary deletion flow is
              available in-app so authenticated users can complete the request themselves.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Delete your account in the app</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Open the Domek mobile app and sign in to the account you want to remove.</li>
              <li>Go to <span className="font-medium text-[#3c413e]">Account settings</span>.</li>
              <li>Scroll to the <span className="font-medium text-[#3c413e]">Delete account</span> section.</li>
              <li>Confirm the deletion prompt.</li>
            </ol>
            <p className="mt-3">
              When the deletion succeeds, Domek signs you out. If the same account is still linked to a household,
              server-side checks determine whether the deletion can proceed safely.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">If you are the household owner</h2>
            <p className="mt-3">
              Domek blocks account deletion when the account is the owner of a household that still has other members.
              This prevents orphaned shared data and keeps access rules intact for the rest of the household.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Transfer household ownership to another member, or</li>
              <li>Remove the remaining members and delete the household first.</li>
            </ul>
            <p className="mt-3">
              After that, return to <span className="font-medium text-[#3c413e]">Account settings</span> and retry the
              deletion flow.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Need help?</h2>
            <p className="mt-3">
              If you cannot access the app, cannot finish the household cleanup steps, or need help confirming how
              account deletion affects your data, contact us:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                Privacy requests:{" "}
                <a
                  href="mailto:privacy@domekapp.com"
                  className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
                >
                  privacy@domekapp.com
                </a>
              </li>
              <li>
                General support:{" "}
                <a
                  href="mailto:contact@domekapp.com"
                  className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
                >
                  contact@domekapp.com
                </a>
              </li>
              <li>
                Support form:{" "}
                <Link
                  href="/contact"
                  className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
                >
                  Contact page
                </Link>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">Related policies</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <Link
                  href="/privacy"
                  className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
                >
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
                >
                  Terms of use
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
