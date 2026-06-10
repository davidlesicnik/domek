import type { ReactNode } from "react";

type AuthNoticeProps = Readonly<{
  kind: "error" | "success";
  text: string;
}>;

type AuthPageShellProps = Readonly<{
  children: ReactNode;
  className: string;
  maxWidthClassName: string;
}>;

type AuthFormCardProps = Readonly<{
  children: ReactNode;
  footer?: ReactNode;
  label?: string;
  labelTone?: "rose" | "sage";
  notice?: AuthNoticeProps | null;
  subtitle: string;
  title: string;
}>;

const authTextLinkClassName =
  "underline-offset-2 transition hover:text-[var(--text-strong)] hover:underline";

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AuthPageShell({
  children,
  className,
  maxWidthClassName,
}: AuthPageShellProps) {
  return (
    <main className="min-h-dvh border-t-4 border-[var(--surface-strong)] bg-[var(--page-background)] px-4 py-8 text-[var(--text-primary)] sm:px-6">
      <div className={joinClassNames("mx-auto flex min-h-[calc(100dvh-5rem)] w-full items-center", maxWidthClassName)}>
        <section className={className}>{children}</section>
      </div>
    </main>
  );
}

export function AuthFormCard({
  children,
  footer,
  label,
  labelTone = "sage",
  notice,
  subtitle,
  title,
}: AuthFormCardProps) {
  return (
    <>
      {label ? (
        <p
          className={joinClassNames(
            "font-serif text-xs font-semibold uppercase tracking-normal",
            labelTone === "rose"
              ? "text-[var(--accent-rose-text)]"
              : "text-[var(--accent-sage-text)]",
          )}
        >
          {label}
        </p>
      ) : null}
      <h1 className="mt-3 font-serif text-4xl font-semibold tracking-normal text-[var(--text-strong)]">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-[var(--text-muted)]">{subtitle}</p>
      {notice ? <AuthNotice kind={notice.kind} text={notice.text} /> : null}
      {children}
      {footer}
    </>
  );
}

export function AuthNotice({ kind, text }: AuthNoticeProps) {
  return (
    <p
      className={joinClassNames(
        "mt-4 rounded-md px-3 py-2 text-sm font-medium",
        kind === "success"
          ? "border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] text-[var(--accent-sage-text)]"
          : "border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] text-[var(--accent-rose-text)]",
      )}
    >
      {text}
    </p>
  );
}

export function AuthTextLink({
  children,
  className,
}: Readonly<{
  children: ReactNode;
  className?: string;
}>) {
  return <span className={joinClassNames(authTextLinkClassName, className)}>{children}</span>;
}

export { authTextLinkClassName };
