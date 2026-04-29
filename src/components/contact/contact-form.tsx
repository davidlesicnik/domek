"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useSubmitCooldown } from "@/components/forms/use-submit-cooldown";
import type { ContactActionState } from "@/lib/actions/contact";
import {
  PUBLIC_FORM_HONEYPOT_FIELD,
  PUBLIC_MUTATION_COOLDOWN_MS,
} from "@/lib/public-form";

const initialState: ContactActionState = {
  error: null,
  success: false,
};

type ContactFormProps = Readonly<{
  action: (prevState: ContactActionState, formData: FormData) => Promise<ContactActionState>;
}>;

export function ContactForm({ action }: ContactFormProps) {
  const t = useTranslations("contact");
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);
  const cooldown = useSubmitCooldown(
    "domek:contact-submit",
    PUBLIC_MUTATION_COOLDOWN_MS.contact,
  );
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  useEffect(() => {
    if (pending || !submittedRef.current) {
      return;
    }

    submittedRef.current = false;

    if (state.success || (state.error && !state.fieldErrors)) {
      cooldown.startCooldown();
    }
  }, [cooldown, pending, state.error, state.fieldErrors, state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-8 grid gap-5 rounded-md border border-[#dfddd6] bg-[#fdfcf8] p-4 sm:p-6"
      onSubmit={(event) => {
        if (cooldown.isCoolingDown) {
          event.preventDefault();
          setClientError(
            t("formCooldown", {
              seconds: cooldown.remainingSeconds,
            }),
          );
          return;
        }

        setClientError(null);
        submittedRef.current = true;
      }}
    >
      <input
        aria-hidden="true"
        autoComplete="off"
        className="hidden"
        name={PUBLIC_FORM_HONEYPOT_FIELD}
        tabIndex={-1}
        type="text"
      />
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-[#3c413e]" htmlFor="contact-name">
          {t("formName")} <span className="font-normal text-[#9a9e9b]">{t("formNameOptional")}</span>
        </label>
        <input
          autoComplete="name"
          className="rounded-md border border-[#d7d4cb] bg-white px-3 py-2.5 text-sm text-[#202321] outline-none transition placeholder:text-[#a8aaa5] focus:border-[#5f7f5d] focus:ring-2 focus:ring-[#dce8d8]"
          id="contact-name"
          maxLength={120}
          name="name"
          type="text"
        />
        {state.fieldErrors?.name ? (
          <p className="text-xs font-medium text-[#b94e3f]">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-[#3c413e]" htmlFor="contact-email">
          {t("formEmail")}
        </label>
        <input
          autoComplete="email"
          className="rounded-md border border-[#d7d4cb] bg-white px-3 py-2.5 text-sm text-[#202321] outline-none transition placeholder:text-[#a8aaa5] focus:border-[#5f7f5d] focus:ring-2 focus:ring-[#dce8d8]"
          id="contact-email"
          maxLength={320}
          name="email"
          required
          type="email"
        />
        {state.fieldErrors?.email ? (
          <p className="text-xs font-medium text-[#b94e3f]">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-[#3c413e]" htmlFor="contact-message">
          {t("formMessage")}
        </label>
        <textarea
          className="min-h-36 rounded-md border border-[#d7d4cb] bg-white px-3 py-2.5 text-sm leading-6 text-[#202321] outline-none transition placeholder:text-[#a8aaa5] focus:border-[#5f7f5d] focus:ring-2 focus:ring-[#dce8d8]"
          id="contact-message"
          maxLength={4000}
          minLength={10}
          name="message"
          required
        />
        {state.fieldErrors?.message ? (
          <p className="text-xs font-medium text-[#b94e3f]">{state.fieldErrors.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={`text-sm font-medium ${state.success ? "text-[#3d6f4a]" : "text-[#b94e3f]"}`}
        >
          {state.success ? t("formSuccess") : clientError ?? state.error}
        </p>
        <button
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#232323] px-4 text-sm font-semibold text-[#fdfcf8] transition hover:bg-[#3a3a37] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={pending}
          type="submit"
        >
          <Send aria-hidden className="h-4 w-4" />
          <span>{pending ? t("formSending") : t("formSend")}</span>
        </button>
      </div>
    </form>
  );
}
