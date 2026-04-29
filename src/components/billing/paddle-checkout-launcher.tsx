"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

type PaddleEnvironment = "live" | "sandbox";
type PaddleDebugEventPayload = Readonly<{
  name?: string;
  data?: {
    code?: string;
    detail?: string;
    documentation_url?: string;
    errors?: Array<{
      field?: string;
      message?: string;
    }>;
    type?: string;
  };
  id?: string;
}>;

type PaddleCheckoutWindow = Window & {
  Paddle?: {
    Checkout: {
      open: (options: {
        customer?: { email?: string | null };
        customData?: Record<string, unknown>;
        items: Array<{ priceId: string; quantity: number }>;
        settings?: {
          displayMode?: "overlay";
          locale?: string;
          successUrl?: string;
          theme?: "light";
          variant?: "one-page";
        };
      }) => void;
    };
    Environment?: {
      set: (environment: PaddleEnvironment) => void;
    };
    Initialize: (options: {
      checkout?: {
        settings?: {
          displayMode?: "overlay";
          locale?: string;
          theme?: "light";
          variant?: "one-page";
        };
      };
      eventCallback?: (event: PaddleDebugEventPayload) => void;
      token: string;
    }) => void;
    Update?: (options: {
      eventCallback?: (event: PaddleDebugEventPayload) => void;
    }) => void;
  };
  __domekPaddleToken?: string;
};

type PaddleCheckoutLauncherProps = Readonly<{
  appUserId: string;
  clientToken: string;
  customerEmail: string | null;
  priceId: string;
  successUrl: string;
}>;

const paddleScriptUrl = "https://cdn.paddle.com/paddle/v2/paddle.js";

function maskedTokenPrefix(clientToken: string): string {
  return clientToken.startsWith("live_") ? "live_" : "test_";
}

function paddleEnvironment(clientToken: string): PaddleEnvironment {
  return clientToken.startsWith("test_") ? "sandbox" : "live";
}

function paddleCheckoutLocale(locale: string): string | undefined {
  switch (locale) {
    case "en-US":
    case "en-GB":
      return "en";
    default:
      return undefined;
  }
}

export function PaddleCheckoutLauncher({
  appUserId,
  clientToken,
  customerEmail,
  priceId,
  successUrl,
}: PaddleCheckoutLauncherProps) {
  const locale = useLocale();
  const t = useTranslations("onboarding");
  const [isReady, setIsReady] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const environment = useMemo(() => paddleEnvironment(clientToken), [clientToken]);
  const checkoutLocale = useMemo(() => paddleCheckoutLocale(locale), [locale]);
  const successHost = useMemo(() => {
    try {
      return new URL(successUrl).host;
    } catch {
      return "invalid";
    }
  }, [successUrl]);

  useEffect(() => {
    let cancelled = false;
    const debugContext = {
      appLocale: locale,
      checkoutLocale: checkoutLocale ?? null,
      environment,
      priceId,
      successHost,
      tokenPrefix: maskedTokenPrefix(clientToken),
    };

    async function logPaddleDebug(
      kind: "checkout.error" | "checkout.warning" | "launcher.error",
      payload: Record<string, unknown>,
    ) {
      const body = JSON.stringify({
        kind,
        payload,
      });

      console.error("[PaddleCheckoutLauncher] debug", {
        kind,
        payload,
      });

      try {
        const blob = new Blob([body], { type: "application/json" });

        if (navigator.sendBeacon?.("/api/paddle/client-debug", blob)) {
          return;
        }
      } catch {
        // Fall back to fetch below.
      }

      try {
        await fetch("/api/paddle/client-debug", {
          body,
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          keepalive: true,
          method: "POST",
        });
      } catch (error) {
        console.error("[PaddleCheckoutLauncher] debug log failed", error);
      }
    }

    function finishWithError(message: string) {
      if (cancelled) return;
      setCheckoutError(message);
      setIsReady(false);
    }

    function initializePaddle() {
      const paddleWindow = window as PaddleCheckoutWindow;

      if (!paddleWindow.Paddle) {
        void logPaddleDebug("launcher.error", {
          ...debugContext,
          detail: "Paddle SDK loaded without window.Paddle",
          phase: "initialize",
        });
        finishWithError(t("paymentCheckoutErrorNotInitialized"));
        return;
      }

      const eventCallback = (event: PaddleDebugEventPayload) => {
        if (event.name !== "checkout.error" && event.name !== "checkout.warning") {
          return;
        }

        void logPaddleDebug(event.name, {
          ...debugContext,
          checkoutId: event.id ?? null,
          code: event.data?.code ?? null,
          detail: event.data?.detail ?? null,
          documentationUrl: event.data?.documentation_url ?? null,
          errors:
            event.data?.errors?.map((item) => ({
              field: item.field ?? null,
              message: item.message ?? null,
            })) ?? [],
          type: event.data?.type ?? null,
        });
      };

      try {
        if (environment === "sandbox") {
          paddleWindow.Paddle.Environment?.set("sandbox");
        }

        if (paddleWindow.__domekPaddleToken !== clientToken) {
          paddleWindow.Paddle.Initialize({
            checkout: {
              settings: {
                displayMode: "overlay",
                locale: checkoutLocale,
                theme: "light",
                variant: "one-page",
              },
            },
            eventCallback,
            token: clientToken,
          });

          paddleWindow.__domekPaddleToken = clientToken;
        } else {
          paddleWindow.Paddle.Update?.({
            eventCallback,
          });
        }

        if (!cancelled) {
          setCheckoutError(null);
          setIsReady(true);
        }
      } catch (error) {
        console.error("[PaddleCheckoutLauncher] initialize failed", error);
        void logPaddleDebug("launcher.error", {
          ...debugContext,
          detail: error instanceof Error ? error.message : "Unknown initialization error",
          phase: "initialize",
        });
        finishWithError(t("paymentCheckoutErrorSetup"));
      }
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-domek-paddle="true"]',
    );

    if (existingScript) {
      if ((window as PaddleCheckoutWindow).Paddle) {
        initializePaddle();
      } else {
        existingScript.addEventListener("load", initializePaddle, { once: true });
        existingScript.addEventListener(
          "error",
          () => {
            void logPaddleDebug("launcher.error", {
              ...debugContext,
              detail: "Paddle SDK script failed to load",
              phase: "script_load",
            });
            finishWithError(t("paymentCheckoutErrorLoad"));
          },
          { once: true },
        );
      }

      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    // NOSONAR: Paddle ships its checkout SDK from a fixed vendor CDN origin and updates it independently.
    // We rely on our CSP allowlist plus Paddle's scoped client token instead of pinning an SRI hash that would
    // break vendor-managed updates to the hosted checkout asset.
    script.src = paddleScriptUrl;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.domekPaddle = "true";
    script.addEventListener("load", initializePaddle, { once: true });
    script.addEventListener(
      "error",
      () => {
        void logPaddleDebug("launcher.error", {
          ...debugContext,
          detail: "Paddle SDK script failed to load",
          phase: "script_load",
        });
        finishWithError(t("paymentCheckoutErrorLoad"));
      },
      { once: true },
    );
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [checkoutLocale, clientToken, environment, locale, priceId, successHost, t]);

  function launchCheckout() {
    const paddleWindow = window as PaddleCheckoutWindow;

    if (!paddleWindow.Paddle) {
      setCheckoutError(t("paymentCheckoutErrorStillLoading"));
      return;
    }

    setCheckoutError(null);

    try {
      paddleWindow.Paddle.Checkout.open({
        customer: customerEmail ? { email: customerEmail } : undefined,
        customData: {
          appUserId,
        },
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: "overlay",
          locale: checkoutLocale,
          successUrl,
          theme: "light",
          variant: "one-page",
        },
      });
    } catch (error) {
      console.error("[PaddleCheckoutLauncher] checkout open failed", error);
      console.error("[PaddleCheckoutLauncher] debug", {
        appLocale: locale,
        checkoutLocale: checkoutLocale ?? null,
        detail: error instanceof Error ? error.message : "Unknown checkout open error",
        environment,
        phase: "checkout_open",
        priceId,
        successHost,
        tokenPrefix: maskedTokenPrefix(clientToken),
      });
      setCheckoutError(t("paymentCheckoutErrorOpen"));
    }
  }

  return (
    <>
      <button
        className="h-12 rounded-md bg-[#232323] px-5 text-sm font-semibold text-white transition hover:bg-[#3c413e] disabled:cursor-not-allowed disabled:bg-[#666b67]"
        disabled={!isReady}
        onClick={launchCheckout}
        type="button"
      >
        {isReady ? t("paymentCheckoutReady") : t("paymentCheckoutLoading")}
      </button>
      {checkoutError ? (
        <p className="text-sm font-medium text-[#a6543c]">{checkoutError}</p>
      ) : null}
    </>
  );
}
