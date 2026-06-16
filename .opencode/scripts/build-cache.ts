import { execSync } from "child_process";
import fs from "fs";

const domains = [
  "auth",
  "activities",
  "athletes",
  "training",
  "billing"
];

function runCodeGraph(query: string) {
  return execSync(`codegraph query "${query}"`).toString();
}

function buildDomainCache(domain: string) {
  console.log(`Building cache for ${domain}...`);

  const graphData = runCodeGraph(domain);

  // ⚠️ esto después lo podés mejorar con parsing real
  const content = `
# ${domain}

Auto-generated context.

## Raw Graph
${graphData.slice(0, 2000)}
`;

  fs.writeFileSync(
    `.opencode/context/cache/${domain}.md`,
    content
  );
}

domains.forEach(buildDomainCache);
