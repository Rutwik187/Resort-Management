// Lets plain Node load a resort site's content files for import-sites.ts:
// "@/…" resolves to that site's src folder, and photos become a stub, since
// only Next.js can load images.
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const imageStub = pathToFileURL(fileURLToPath(new URL("./site-content-image.cjs", import.meta.url))).href;

registerHooks({
  resolve(specifier, context, next) {
    if (/\.(jpe?g|png|webp|avif|gif|svg|mp4)$/i.test(specifier)) return { url: imageStub, shortCircuit: true };
    if (specifier.startsWith("@/")) {
      const site = context.parentURL?.match(/^(.*\/apps\/[^/]+\/src)\//)?.[1];
      if (site) return next(`${site}/${specifier.slice(2)}${/\.[a-z]+$/i.test(specifier) ? "" : ".ts"}`, context);
    }
    return next(specifier, context);
  },
});
