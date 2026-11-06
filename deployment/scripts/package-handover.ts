import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

function git(args: string[]) {
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || "Git operation failed");
  return result.stdout.trim();
}
const tag = process.argv.slice(2).find(arg=>!arg.startsWith("--")) ?? "v0.2.1-handover";
if (!/^v\d+\.\d+\.\d+-handover$/.test(tag)) throw new Error("Use a versioned handover tag, for example v0.2.1-handover");
if (git(["status", "--porcelain"])) throw new Error("Packaging requires a clean committed worktree");
const commit = git(["rev-parse", `${tag}^{commit}`]);
if (commit !== git(["rev-parse", "HEAD"])) throw new Error("The release tag must identify the current HEAD");
const tree = git(["rev-parse", "HEAD^{tree}"]);
const validation = JSON.parse(readFileSync("releases/validation/result.json", "utf8"));
if (validation.exitCode !== 0 || validation.sourceTree !== tree) throw new Error("Successful recorded validation must match the exact committed source tree");
const files = git(["ls-tree", "-r", "--name-only", tag]).split("\n");
if (files.some(file=>/(^|\/)(node_modules|releases|test-results|out|cache)(\/|$)|(^|\/)\.env$/.test(file))) throw new Error("Generated/private files were found in the source tree");
const directory = resolve("releases", `finternet-poc-${tag}`);
const archive = resolve("releases", `finternet-poc-${tag}-source.zip`);
mkdirSync(directory, { recursive: true });
git(["archive", "--format=zip", "--prefix=source/", `--output=${archive}`, tag]);
const checksum = createHash("sha256").update(readFileSync(archive)).digest("hex");
copyFileSync("releases/validation/VALIDATION.md", resolve(directory, "VALIDATION.md"));
let screenshotCount = 0;
if (existsSync("test-results")) {
  mkdirSync(resolve(directory, "evidence"), { recursive: true });
  for (const name of readdirSync("test-results").filter(name=>name.endsWith(".png"))) {
    copyFileSync(resolve("test-results", name), resolve(directory, "evidence", name));
    screenshotCount++;
  }
}
writeFileSync(resolve(directory, "MANIFEST.md"), `# Finternet PoC handover manifest\n\n- Version/tag: \`${tag}\`\n- Repository: https://github.com/mihirbrahme/finternet-poc\n- Commit: \`${commit}\`\n- Validated source tree: \`${tree}\`\n- Package created: ${new Date().toISOString()}\n- Tracked source files: ${files.length}\n- Validation: PASS, completed ${validation.completedAt}\n- Screenshots: ${screenshotCount}\n- Source archive SHA-256: \`${checksum}\`\n\n## Contents\n\n- \`source/\`: exact tagged Git source, expanded from the source archive; begin with \`source/HANDOVER.md\`.\n- \`VALIDATION.md\`: captured checks for this exact source tree.\n- \`evidence/\`: generated desktop/mobile/role screenshots, illustrative rather than real recovery evidence.\n\nDependencies, compiler artifacts, local chain state, credentials and .git history are excluded. Install from the lockfile. Documentation is Markdown. For history or subsequent fixes, use the repository and tag. The separately distributed source ZIP has the checksum above; the complete bundle has its own sidecar checksum.\n\n## Source inventory\n\n${files.map(file=>`- \`${file}\``).join("\n")}\n`);
console.log(JSON.stringify({ tag, commit, tree, directory, sourceArchive: archive, sha256: checksum, screenshots: screenshotCount }, null, 2));
