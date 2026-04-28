import { getRequestConfig } from "next-intl/server";

import { localeMessageFile, routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${localeMessageFile(locale)}.json`)).default,
  };
});
