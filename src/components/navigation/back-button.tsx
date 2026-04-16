"use client";

type BackButtonProps = Readonly<{
  fallbackHref?: string;
  label: string;
}>;

export function BackButton({ fallbackHref = "/", label }: BackButtonProps) {
  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(fallbackHref);
  }

  return (
    <button
      className="h-10 rounded-md px-0 text-sm font-semibold text-[#4f5752] underline underline-offset-4 transition hover:text-[#202321]"
      onClick={goBack}
      type="button"
    >
      {label}
    </button>
  );
}
