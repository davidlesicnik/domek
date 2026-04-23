"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import type { ContactActionState } from "@/lib/actions/contact";

const initialState: ContactActionState = {
  error: null,
  success: false,
};

type ContactFormProps = Readonly<{
  action: (prevState: ContactActionState, formData: FormData) => Promise<ContactActionState>;
}>;

export function ContactForm({ action }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-8 grid gap-5 rounded-md border border-[#dfddd6] bg-[#fdfcf8] p-4 sm:p-6"
    >
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-[#3c413e]" htmlFor="contact-name">
          Name
        </label>
        <input
          autoComplete="name"
          className="rounded-md border border-[#d7d4cb] bg-white px-3 py-2.5 text-sm text-[#202321] outline-none transition placeholder:text-[#a8aaa5] focus:border-[#5f7f5d] focus:ring-2 focus:ring-[#dce8d8]"
          id="contact-name"
          maxLength={120}
          name="name"
          required
          type="text"
        />
        {state.fieldErrors?.name ? (
          <p className="text-xs font-medium text-[#b94e3f]">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-[#3c413e]" htmlFor="contact-email">
          Email
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
          Message
        </label>
        <textarea
          className="min-h-36 rounded-md border border-[#d7d4cb] bg-white px-3 py-2.5 text-sm leading-6 text-[#202321] outline-none transition placeholder:text-[#a8aaa5] focus:border-[#5f7f5d] focus:ring-2 focus:ring-[#dce8d8]"
          id="contact-message"
          maxLength={4000}
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
          {state.success ? "Message sent. We will reply by email." : state.error}
        </p>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#232323] px-4 text-sm font-semibold text-[#fdfcf8] transition hover:bg-[#3a3a37] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          <Send aria-hidden className="h-4 w-4" />
          <span>{pending ? "Sending" : "Send message"}</span>
        </button>
      </div>
    </form>
  );
}
