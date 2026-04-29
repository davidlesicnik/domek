"use client";

import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { trackAnalyticsEvent } from "@/lib/analytics";

type SignInOptionsProps = Readonly<{
  locale: string;
  nextPath: string;
}>;

function authStartHref(nextPath: string) {
  const params = new URLSearchParams({ next: nextPath });
  return `/auth/start/google?${params.toString()}`;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function SignInOptions({ locale, nextPath }: SignInOptionsProps) {
  const t = useTranslations("login");

  return (
    <div className="grid gap-4">
      <form
        action="/auth/email"
        className="grid gap-2.5 rounded-md border border-[#ddd7cc] bg-[#fbfaf6] p-4"
        method="post"
        onSubmit={() => trackAnalyticsEvent("login_started", { provider: "email" })}
      >
        <input name="locale" type="hidden" value={locale} />
        <input name="next" type="hidden" value={nextPath} />
        <label className="text-sm font-semibold text-[#3c413e]" htmlFor="login-email">
          {t("emailLabel")}
        </label>
        <div className="flex items-center gap-2 rounded-md border border-[#d6ddd6] bg-white px-3">
          <Mail aria-hidden className="h-4 w-4 text-[#7b827d]" />
          <input
            autoComplete="email"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[#202321] outline-none placeholder:text-[#9aa09b]"
            id="login-email"
            maxLength={320}
            name="email"
            placeholder={t("emailPlaceholder")}
            required
            type="email"
          />
        </div>
        <p className="text-xs leading-5 text-[#7a817c]">{t("emailHelp")}</p>
        <button
          className="inline-flex h-11 items-center justify-center rounded-md bg-[#232323] px-4 text-sm font-semibold text-white transition hover:bg-[#3a3d39]"
          type="submit"
        >
          {t("sendMagicLink")}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#e1ddd3]" />
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#7a817c]">
          {t("orContinueWithGoogle")}
        </p>
        <div className="h-px flex-1 bg-[#e1ddd3]" />
      </div>

      <a
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-4 text-sm font-medium text-[#4a4f4c] transition hover:border-[#9ab59d] hover:bg-[#eef7ef]"
        href={authStartHref(nextPath)}
        onClick={() => trackAnalyticsEvent("login_started", { provider: "google" })}
      >
        <GoogleIcon />
        {t("continueWithGoogle")}
      </a>
    </div>
  );
}
