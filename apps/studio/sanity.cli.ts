import { sanityProject } from "@repo/sanity/config";
import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: { projectId: sanityProject.projectId, dataset: sanityProject.dataset },
  // `pnpm --filter studio run deploy` (pnpm has its own `deploy` command) publishes the Studio at https://prathamesh-resorts.sanity.studio
  studioHost: "prathamesh-resorts",
  deployment: { appId: "r2fag7u9cqcumstoiybwievq" },
});
