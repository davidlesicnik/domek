import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { BlogPromoCta } from "@/components/blog/blog-shell";

type Tone = "rose" | "sage" | "sun";

type CalloutProps = Readonly<{
  children: ReactNode;
  title: string;
  tone?: Tone;
}>;

type NoteProps = Readonly<{
  children: ReactNode;
  title?: string;
}>;

type InlineCtaProps = Readonly<{
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  title: string;
}>;

const toneClasses: Record<Tone, string> = {
  rose: "border-[#ead0cb] bg-[#fbefeb] text-[#8d4c45]",
  sage: "border-[#cfe0d2] bg-[#eef6ef] text-[#45614c]",
  sun: "border-[#e4d899] bg-[#fbf4cf] text-[#64571f]",
};

function MdxLink({ href = "", ...props }: ComponentPropsWithoutRef<"a">) {
  const className = "font-medium text-[#526c56] underline decoration-[#adc5b5] underline-offset-4 transition hover:text-[#3f5745]";

  if (href.startsWith("/")) {
    return <Link href={href} className={className} {...props} />;
  }

  return <a href={href} className={className} {...props} />;
}

export function Callout({ children, title, tone = "sage" }: CalloutProps) {
  return (
    <aside className={`rounded-md border p-5 ${toneClasses[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-normal">{title}</p>
      <div className="mt-2 text-sm leading-6 [&_p]:mt-0">{children}</div>
    </aside>
  );
}

export function Note({ children, title = "Note" }: NoteProps) {
  return (
    <aside className="rounded-md border border-[#e4ddd2] bg-[#fffaf1] p-5 text-[#6c6759]">
      <p className="text-[11px] font-semibold uppercase tracking-normal">{title}</p>
      <div className="mt-2 text-sm leading-6 [&_p]:mt-0">{children}</div>
    </aside>
  );
}

export function Checklist({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ul className="grid gap-3 rounded-md border border-[#e4ddd2] bg-[#fffdf8] p-5 text-sm leading-6 text-[#4d5550] [&>li]:relative [&>li]:pl-6 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-2.5 [&>li]:before:h-2.5 [&>li]:before:w-2.5 [&>li]:before:rounded-full [&>li]:before:bg-[#9fb8a7]">
      {children}
    </ul>
  );
}

export function InlineCta({ body, ctaHref, ctaLabel, title }: InlineCtaProps) {
  return <BlogPromoCta body={body} ctaHref={ctaHref} ctaLabel={ctaLabel} eyebrow="Use this in Domek" title={title} />;
}

export const blogMdxComponents = {
  a: MdxLink,
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="border-l-2 border-[#b9cdbc] pl-4 italic text-[#5e6661]" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="mt-12 font-serif text-3xl font-semibold tracking-normal text-[#171a18]" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-10 font-serif text-2xl font-semibold tracking-normal text-[#171a18]" {...props} />
  ),
  hr: (props: ComponentPropsWithoutRef<"hr">) => <hr className="border-[#e4ddd2]" {...props} />,
  li: (props: ComponentPropsWithoutRef<"li">) => <li className="text-sm leading-7 text-[#4d5550]" {...props} />,
  ol: (props: ComponentPropsWithoutRef<"ol">) => <ol className="grid gap-3 pl-5 marker:text-[#8a8f8b]" {...props} />,
  p: (props: ComponentPropsWithoutRef<"p">) => <p className="mt-5 text-base leading-8 text-[#4d5550]" {...props} />,
  strong: (props: ComponentPropsWithoutRef<"strong">) => <strong className="font-semibold text-[#202321]" {...props} />,
  ul: (props: ComponentPropsWithoutRef<"ul">) => <ul className="grid gap-3 pl-5 marker:text-[#8a8f8b]" {...props} />,
  Callout,
  Checklist,
  InlineCta,
  Note,
};
