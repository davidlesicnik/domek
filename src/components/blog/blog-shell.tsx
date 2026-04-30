import Link from "next/link";
import type { ReactNode } from "react";

type BlogTopicPillProps = Readonly<{
  topic: string;
}>;

type ArticleCardProps = Readonly<{
  description: string;
  href: string;
  publishedLabel: string;
  title: string;
  topic: string;
}>;

type BlogPromoCtaProps = Readonly<{
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  eyebrow?: string;
  title: string;
}>;

export function BlogShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321]">
      <BlogHeader />
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        {children}
      </main>
      <BlogFooter />
    </div>
  );
}

export function BlogHeader() {
  return (
    <header className="border-b border-[#dfddd6] bg-[#fdfcf8]">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/en-US" className="font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
            Domek
          </Link>
          <nav aria-label="Blog navigation" className="hidden sm:block">
            <ul className="flex items-center gap-5 text-sm text-[#68706b]">
              <li>
                <Link className="transition hover:text-[#202321]" href="/blog">
                  Blog
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-[#202321]" href="/en-US/pricing">
                  Pricing
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <Link
          className="inline-flex h-8 items-center justify-center rounded-full border border-[#b9cdbc] bg-[#eef7ef] px-5 text-xs font-semibold text-[#526c56] transition hover:bg-[#e1f0e3]"
          href="/en-US/login"
        >
          Start your home board
        </Link>
      </div>
    </header>
  );
}

export function BlogFooter() {
  return (
    <footer className="border-t border-[#dfddd6] bg-[#fdfcf8] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#9ea49f]">Practical planning ideas for calmer homes.</p>
        <nav aria-label="Blog footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#9ea49f]">
            <li>
              <Link className="underline-offset-2 transition hover:text-[#686e6a] hover:underline" href="/en-US/privacy">
                Privacy
              </Link>
            </li>
            <li>
              <Link className="underline-offset-2 transition hover:text-[#686e6a] hover:underline" href="/en-US/terms">
                Terms
              </Link>
            </li>
            <li>
              <Link className="underline-offset-2 transition hover:text-[#686e6a] hover:underline" href="/en-US/contact">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

export function BlogTopicPill({ topic }: BlogTopicPillProps) {
  return (
    <span className="inline-flex rounded-full border border-[#dad1b8] bg-[#f6f1e4] px-3 py-1 text-[11px] font-semibold uppercase tracking-normal text-[#6f6240]">
      {topic}
    </span>
  );
}

export function ArticleCard({ description, href, publishedLabel, title, topic }: ArticleCardProps) {
  return (
    <article className="rounded-md border border-[#e4ddd2] bg-[#fffdf8] p-5 shadow-[0_10px_30px_rgba(31,35,30,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(31,35,30,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <BlogTopicPill topic={topic} />
        <p className="text-xs text-[#8a8f8b]">{publishedLabel}</p>
      </div>
      <h2 className="mt-4 font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
        <Link className="transition hover:text-[#526c56]" href={href}>
          {title}
        </Link>
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#68706b]">{description}</p>
      <Link className="mt-5 inline-flex text-sm font-medium text-[#526c56] transition hover:text-[#3f5745]" href={href}>
        Read the article
      </Link>
    </article>
  );
}

export function BlogPromoCta({
  body,
  ctaHref = "/en-US/login",
  ctaLabel = "Try Domek",
  eyebrow = "Bring it into one place",
  title,
}: BlogPromoCtaProps) {
  return (
    <section className="rounded-md border border-[#cfe0d2] bg-[#eef6ef] p-6 shadow-[0_12px_30px_rgba(82,108,86,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-normal text-[#58705e]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl font-semibold tracking-normal text-[#1d2c21]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4c6352]">{body}</p>
      <Link
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-[#a8beb0] bg-[#dceade] px-5 py-3 text-sm font-semibold text-[#45614c] transition hover:bg-[#d0e2d3]"
        href={ctaHref}
      >
        {ctaLabel}
      </Link>
    </section>
  );
}
