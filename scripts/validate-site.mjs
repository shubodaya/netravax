import { readFile } from "node:fs/promises";

const files = [
  "index.html",
  "privacy.html",
  "terms.html",
  "security.html",
  "src/main.js",
  "src/styles.css",
  "vite.config.js",
  "public/_redirects",
  "public/sitemap.xml",
  "docs/audit-and-migration-plan.md",
  "docs/deployment.md"
];

const requiredIndexSnippets = [
  "Netravax Technologies",
  "https://app.netravax.shubodaya.dev/",
  "application/ld+json",
  "id=\"contactForm\""
];

async function main() {
  const loaded = new Map();
  await Promise.all(
    files.map(async (file) => {
      loaded.set(file, await readFile(file, "utf8"));
    })
  );

  const index = loaded.get("index.html");
  const redirects = loaded.get("public/_redirects");
  const css = loaded.get("src/styles.css");

  const missing = requiredIndexSnippets.filter((snippet) => !index.includes(snippet));
  if (missing.length) {
    throw new Error(`Missing index snippets: ${missing.join(", ")}`);
  }

  if (!redirects.includes("/app/* https://app.netravax.shubodaya.dev/:splat 302")) {
    throw new Error("Missing /app/* migration redirect.");
  }

  if (!css.includes("@media (prefers-reduced-motion: reduce)")) {
    throw new Error("Missing reduced-motion stylesheet support.");
  }

  console.log("Static validation passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
