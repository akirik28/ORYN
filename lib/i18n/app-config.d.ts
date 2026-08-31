import type { Locale } from "./config";
import type en from "../../messages/en.json";

/**
 * Types next-intl against this app's actual locales and catalog.
 *
 * `use-intl` resolves its `Locale` and `Messages` types through this interface (see
 * node_modules/use-intl/dist/types/core/AppConfig.d.ts), so declaring it here buys two
 * compile-time guarantees that would otherwise be runtime surprises:
 *
 * - `useTranslations("nav")("hoem")` fails `npm run typecheck` instead of rendering the
 *   raw key to a student.
 * - English is the shape of record. Because `Messages` is typed from `en.json`, any key
 *   added there is immediately required everywhere it is used — the catalogs cannot drift
 *   apart silently.
 */
declare module "use-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
