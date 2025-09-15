// Basic unit tests for pressReleaseStructuredGenerator using a fake chain.
// Using a lightweight custom assertion (no testing framework integrated yet).

import { generateStructuredPressRelease, __setTestChain, PressReleaseSchema } from "../server/ai/pressReleaseStructuredGenerator.js";

// Simple fake chain returning deterministic payload
const fakeChain = {
  invoke: async () => ({
    headline: "Acme Corp Launches Platform Upgrade",
    subheadline: "Enhancing performance and reliability for global users",
    body: "Acme Corp today announced a significant platform upgrade that improves latency and throughput across core services. The release follows months of optimization and user feedback integration.",
    quote: "This milestone reflects our commitment to excellence.",
    boilerplate: "Acme Corp is a leading provider of enterprise solutions.",
    contact: { name: "", email: "", phone: "" },
  })
};

async function run() {
  __setTestChain(fakeChain);
  const result = await generateStructuredPressRelease({
    company_name: "Acme Corp",
    main_story: "Platform upgrade improving performance",
    brand_tone: "Professional, confident",
  });

  // Validate with schema to ensure structural integrity
  const parsed = PressReleaseSchema.parse(result);

  const assertions: [string, boolean][] = [
    ["has headline", !!parsed.headline],
    ["headline length", parsed.headline.length <= 160],
    ["body length >= 50", parsed.body.length >= 50],
  ];

  const failed = assertions.filter(a => !a[1]);
  if (failed.length) {
    console.error("TEST FAILURES:\n" + failed.map(f => ` - ${f[0]}`).join("\n"));
    process.exit(1);
  } else {
    console.log("All press release structured generator tests passed.");
  }
}

run().catch(e => { console.error("Unhandled test error", e); process.exit(1); });
