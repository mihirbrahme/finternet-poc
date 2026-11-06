import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
function markdownFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const child = `${path}/${entry.name}`;
    return entry.isDirectory() ? markdownFiles(child) : entry.name.endsWith(".md") ? [child] : [];
  });
}
const files = ["README.md", "HANDOVER.md", ...["docs", "apps", "agents", "deployment", "samples"].flatMap(markdownFiles)];
const broken: string[]=[];
for (const file of files) {
  const prose = readFileSync(file,"utf8").replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, "");
  for(const match of prose.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target=match[1].split("#")[0];
    if(!target || /^https?:\/\//.test(target)) continue;
    if(!existsSync(resolve(dirname(file),decodeURIComponent(target)))) broken.push(`${file}: ${target}`);
  }
}
if(broken.length) throw new Error(`Broken documentation links:\n${broken.join("\n")}`);
console.log(`Local Markdown links passed in ${files.length} documentation files.`);
