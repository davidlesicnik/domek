"use client";

import { useEffect, useMemo, useState } from "react";

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

function paddleEnvironment(clientToken: string): PaddleEnvironment {
  return clientToken.startsWith("test_") ? "sandbox" : "live";
}

export function PaddleCheckoutLauncher({
  appUserId,
  clientToken,
  customerEmail,
  priceId,
  successUrl,
}: PaddleCheckoutLauncherProps) {
  const [isReady, setIsReady] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const environment = useMemo(() => paddleEnvironment(clientToken), [clientToken]);

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
        finishWithError("Paddle loaded, but the checkout library did not initialize.");
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
                locale: "en",
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
        console.error("[PaddleCheckoutLauncher] initialize failed", error);
        finishWithError("Paddle loaded, but checkout setup failed. Check the browser console.");
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
          () => finishWithError("Paddle checkout could not load. Refresh and try again."),
          { once: true },
        );
      }

      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.dataset.domekPaddle = "true";
    script.addEventListener("load", initializePaddle, { once: true });
    script.addEventListener(
      "error",
      () => finishWithError("Paddle checkout could not load. Refresh and try again."),
      { once: true },
    );
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [clientToken, environment]);

  function launchCheckout() {
    const paddleWindow = window as PaddleCheckoutWindow;

    if (!paddleWindow.Paddle) {
      setCheckoutError("Checkout is still loading. Try again in a moment.");
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
          locale: "en",
          successUrl,
          theme: "light",
          variant: "one-page",
        },
      });
    } catch (error) {
      console.error("[PaddleCheckoutLauncher] checkout open failed", error);
      setCheckoutError("Paddle checkout could not open. Check the browser console.");
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
        {isReady ? "Start 30-day trial with Paddle" : "Loading checkout..."}
      </button>
      {checkoutError ? (
        <p className="text-sm font-medium text-[#a6543c]">{checkoutError}</p>
      ) : null}
    </>
  );
}
