import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";

import { Footer } from "@/components/layout/footer";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("metaTitle") };
}

export default function ContactPage() {
  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321] flex flex-col">
      <ContactHeader />
      <ContactMain />
      <Footer />
    </div>
  );
}

function ContactHeader() {
  return (
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
  );
}

function ContactMain() {
  const t = useTranslations("contact");
  const topics = [t("topicAccountIssues"), t("topicSelfHosting"), t("topicFeedback")];

  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
      <h1 className="font-serif text-3xl font-semibold tracking-normal text-[#171a18] sm:text-4xl">
        {t("title")}
      </h1>
      <div className="mt-4 max-w-[620px] text-sm leading-7 text-[#686e6a]">
        <p>{t("description")}</p>
        <p className="mt-1">
          {t("emailLabel")}{" "}
          <a
            className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
            href="mailto:contact@domekapp.com"
          >
            contact@domekapp.com
          </a>
        </p>
        <p className="mt-4">{t("communityNote")}</p>
      </div>
      <div className="mt-6 grid gap-2 text-sm text-[#4f5752] sm:grid-cols-3">
        {topics.map((item) => (
          <div key={item} className="rounded-md border border-[#dfddd6] bg-[#fdfcf8] px-3 py-2 font-medium">
            {item}
          </div>
        ))}
      </div>
      <section className="mt-8 rounded-md border border-[#dfddd6] bg-[#fdfcf8] p-5 text-sm leading-7 text-[#686e6a]">
        <h2 className="font-serif text-xl font-semibold tracking-normal text-[#171a18]">
          {t("ossTitle")}
        </h2>
        <p className="mt-3">{t("ossDescription")}</p>
        <p className="mt-3">
          <Link
            className="font-medium text-[#3d6f4a] underline underline-offset-2 hover:text-[#2d5638]"
            href="/login"
          >
            {t("loginLink")}
          </Link>
        </p>
      </section>
    </main>
  );
}
