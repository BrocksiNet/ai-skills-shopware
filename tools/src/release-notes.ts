// Release notes from one CHANGELOG.md section, ready for `gh release create
// --notes-file`. GitHub renders every newline in a release body as a line
// break, so the hard-wrapped CHANGELOG prose would break mid-sentence there.
// This joins each wrapped paragraph and list item back into one line and
// leaves code blocks, tables and headings alone.

/** The body of `## [<version>]`, without its heading; undefined when absent. */
export function changelogSection(changelog: string, version: string): string | undefined {
  const wanted = version.replace(/^v/u, '');
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## [${wanted}]`));
  if (start === -1) return undefined;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^## |^\[[^\]]+\]: /u.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

const BLOCK_START = /^(#{1,6} |[-*+] |\d+[.)] |>|\||```|~~~|<!--)/u;

/** Join soft-wrapped lines; one paragraph or list item becomes one line. */
export function unwrap(markdown: string): string {
  const out: string[] = [];
  let fence = false;
  let joinable = false;
  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    if (/^(```|~~~)/u.test(trimmed)) {
      fence = !fence;
      out.push(line);
      joinable = false;
      continue;
    }
    if (fence || trimmed === '' || BLOCK_START.test(trimmed)) {
      out.push(line);
      // Only a list item takes the wrapped lines that follow it.
      joinable = !fence && /^([-*+] |\d+[.)] )/u.test(trimmed);
      continue;
    }
    const last = out.at(-1);
    if (joinable && last !== undefined) {
      out[out.length - 1] = `${last} ${trimmed}`;
    } else {
      out.push(line);
      joinable = true;
    }
  }
  return out.join('\n');
}

/** `https://github.com/<owner>/<repo>` from the CHANGELOG's compare links. */
export function repoUrl(changelog: string): string | undefined {
  return /^\[[^\]]+\]: (https:\/\/github\.com\/[^/\s]+\/[^/\s]+)\/(?:compare|releases)\//mu.exec(changelog)?.[1];
}

/** Point repo-relative links at the files as tagged, so they work on the release page. */
export function absoluteLinks(markdown: string, base: string): string {
  return markdown.replaceAll(/\]\((?![a-z][a-z0-9+.-]*:|#|\/)([^)\s]+)\)/giu, (_match, path: string) => {
    return `](${base}/${path.replace(/^\.\//u, '')})`;
  });
}

/** The release notes for `version`, or undefined when the CHANGELOG has no such section. */
export function releaseNotes(changelog: string, version: string): string | undefined {
  const section = changelogSection(changelog, version);
  if (section === undefined) return undefined;
  const repo = repoUrl(changelog);
  const tag = `v${version.replace(/^v/u, '')}`;
  const body = unwrap(section);
  return `${repo === undefined ? body : absoluteLinks(body, `${repo}/blob/${tag}`)}\n`;
}
