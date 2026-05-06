import Script from "next/script";

const umamiBeforeSendScript = `
  (function() {
    function sanitizePathname(pathname) {
      var segments = pathname.split("/");

      for (var index = 0; index < segments.length - 1; index += 1) {
        if (segments[index] === "invite" && segments[index + 1]) {
          segments[index + 1] = "[token]";
        }
      }

      return segments.join("/") || "/";
    }

    function sanitizeRelativeUrl(value) {
      try {
        var url = new URL(value, window.location.origin);
        var isAbsolute = /^[a-zA-Z][a-zA-Z\\d+\\-.]*:/.test(value);
        var isSameOrigin = url.origin === window.location.origin;

        if (isAbsolute && !isSameOrigin) {
          return value;
        }

        url.pathname = sanitizePathname(url.pathname);

        var next = url.searchParams.get("next");
        if (next) {
          var nextUrl = new URL(next, window.location.origin);
          nextUrl.pathname = sanitizePathname(nextUrl.pathname);
          url.searchParams.set("next", nextUrl.pathname + nextUrl.search + nextUrl.hash);
        }

        return isAbsolute ? url.toString() : url.pathname + url.search + url.hash;
      } catch {
        return value.replace(/\\/invite\\/[^/?#]+/g, "/invite/[token]");
      }
    }

    window.domekUmamiBeforeSend = function(type, payload) {
      if (!payload || typeof payload !== "object") {
        return payload;
      }

      var nextPayload = Object.assign({}, payload);

      if (typeof nextPayload.url === "string") {
        nextPayload.url = sanitizeRelativeUrl(nextPayload.url);
      }

      if (typeof nextPayload.referrer === "string") {
        nextPayload.referrer = sanitizeRelativeUrl(nextPayload.referrer);
      }

      return nextPayload;
    };
  })();
`;

export function UmamiAnalytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  if (!websiteId) {
    return null;
  }

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: umamiBeforeSendScript }} />
      <Script
        src="https://cloud.umami.is/script.js"
        data-before-send="domekUmamiBeforeSend"
        data-website-id={websiteId}
        strategy="afterInteractive"
      />
    </>
  );
}
