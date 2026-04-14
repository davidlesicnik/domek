import type { Provider } from "@supabase/supabase-js";
import type { ReactNode } from "react";

type OAuthButtonsProps = Readonly<{
  nextPath: string;
}>;

const providers: { icon: ReactNode; id: Provider; label: string }[] = [
  { icon: <GoogleIcon />, id: "google", label: "Continue with Google" },
  { icon: <GitHubIcon />, id: "github", label: "Continue with GitHub" },
];

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

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 text-[#202321]"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 1.25C6.06 1.25 1.25 6.06 1.25 12c0 4.75 3.08 8.78 7.35 10.2.54.1.74-.23.74-.52v-2c-2.99.65-3.62-1.29-3.62-1.29-.49-1.24-1.19-1.57-1.19-1.57-.98-.67.07-.66.07-.66 1.08.08 1.65 1.11 1.65 1.11.96 1.64 2.51 1.17 3.13.89.1-.7.38-1.17.69-1.44-2.39-.27-4.9-1.19-4.9-5.31 0-1.17.42-2.13 1.11-2.88-.11-.27-.48-1.36.11-2.84 0 0 .9-.29 2.96 1.1.86-.24 1.78-.36 2.69-.36.91 0 1.83.12 2.69.36 2.05-1.39 2.96-1.1 2.96-1.1.59 1.48.22 2.57.11 2.84.69.75 1.11 1.71 1.11 2.88 0 4.13-2.52 5.04-4.92 5.31.39.34.73 1 .73 2.02v2.94c0 .29.19.63.74.52A10.76 10.76 0 0 0 22.75 12c0-5.94-4.81-10.75-10.75-10.75Z" />
    </svg>
  );
}

function authStartHref(provider: Provider, nextPath: string) {
  const params = new URLSearchParams({ next: nextPath });
  return `/auth/start/${provider}?${params.toString()}`;
}

export function OAuthButtons({ nextPath }: OAuthButtonsProps) {
  const [google, github] = providers;
  return (
    <div className="grid gap-3">
      <a
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md bg-[#202321] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a3d39]"
        href={authStartHref(google.id, nextPath)}
      >
        {google.icon}
        {google.label}
      </a>
      <a
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-4 text-sm font-medium text-[#4a4f4c] transition hover:border-[#9ab59d] hover:bg-[#eef7ef]"
        href={authStartHref(github.id, nextPath)}
      >
        {github.icon}
        {github.label}
      </a>
    </div>
  );
}
