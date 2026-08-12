// Single source of truth for the site's public URL and contact addresses.
// getahead.ai is not owned by this project — it's a parked domain currently
// listed for sale on a domain marketplace (confirmed: it 301s to an Efty
// listing) — so hardcoding it as metadataBase silently 404s every og:image
// and points canonical tags at a page that isn't this site. Everything
// derives from NEXT_PUBLIC_SITE_URL instead; set it once in Vercel
// (Production/Preview/Development) and change it in exactly one place when
// a real domain is bought.
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Vercel sets this automatically to the project's assigned production
  // domain (its *.vercel.app alias, or a custom domain once one is
  // attached) — a reasonable fallback so this doesn't need to be set
  // manually in every environment before it works at all.
  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProdUrl) return `https://${vercelProdUrl}`;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3005";
}

export const SITE_URL = resolveSiteUrl();
