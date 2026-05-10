"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { logger } from "@/lib/logger";

type PaddleEnvironment = "live" | "sandbox";

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
      token: string;
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

  useEffect(() => {
    let cancelled = false;

    function finishWithError(message: string) {
      if (cancelled) return;
      setCheckoutError(message);
      setIsReady(false);
    }

    function initializePaddle() {
      const paddleWindow = window as PaddleCheckoutWindow;

      if (!paddleWindow.Paddle) {
        finishWithError(t("paymentCheckoutErrorNotInitialized"));
        return;
      }

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
            token: clientToken,
          });

          paddleWindow.__domekPaddleToken = clientToken;
        }

        if (!cancelled) {
          setCheckoutError(null);
          setIsReady(true);
        }
      } catch (error) {
        logger.error("[PaddleCheckoutLauncher] initialize failed", { error });
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
          () => finishWithError(t("paymentCheckoutErrorLoad")),
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
      () => finishWithError(t("paymentCheckoutErrorLoad")),
      { once: true },
    );
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [checkoutLocale, clientToken, environment, t]);

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
      logger.error("[PaddleCheckoutLauncher] checkout open failed", { error });
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
        {isReady ? (
          t("paymentCheckoutReady")
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg aria-hidden className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" d="M4 12a8 8 0 018-8" fill="currentColor" />
            </svg>
            {t("paymentCheckoutLoading")}
          </span>
        )}
      </button>
      {checkoutError ? (
        <p className="text-sm font-medium text-[#a6543c]">{checkoutError}</p>
      ) : null}
    </>
  );
}
