/**
 * Reads CHANGELOG.md (the "Keep a Changelog" layout this project uses) into a structure the page can show:
 *
 *   # Change Log                       -> title (ignored) and intro lines
 *   ## [Unreleased] / ## [2026-10-01] Email Platform   -> a release
 *   ### Security / Added / Fixed / Changed             -> a section of a release
 *   - text                                              -> an item (a continuation line is joined to it)
 *
 * Only this layout is understood. Anything else becomes a plain note, so nothing is dropped.
 */
export const parseChangelog = (text) => {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const intro = [];
  const releases = [];
  let release = null;
  let section = null;
  let item = null; // the list item that continuation lines are joined to

  const ensureSection = () => {
    if (!section) {
      section = { title: "", items: [], notes: [] };
      release.sections.push(section);
    }
    return section;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");

    const releaseMatch = line.match(/^## (.*)$/);
    if (releaseMatch) {
      // "[2026-10-01] Email Platform" -> label "2026-10-01", subtitle "Email Platform"
      const heading = releaseMatch[1].trim();
      const bracket = heading.match(/^\[([^\]]+)\]\s*(.*)$/);
      release = {
        label: bracket ? bracket[1] : heading,
        subtitle: bracket ? bracket[2] : "",
        notes: [],
        sections: [],
      };
      releases.push(release);
      section = null;
      item = null;
      continue;
    }

    if (!release) {
      // Everything before the first release: the "# Change Log" title and a few intro lines
      if (line && !line.startsWith("# ")) intro.push(line);
      continue;
    }

    const sectionMatch = line.match(/^### (.*)$/);
    if (sectionMatch) {
      section = { title: sectionMatch[1].trim(), items: [], notes: [] };
      release.sections.push(section);
      item = null;
      continue;
    }

    const itemMatch = line.match(/^- (.*)$/);
    if (itemMatch) {
      item = itemMatch[1];
      const target = ensureSection();
      target.items.push(item);
      item = target.items.length - 1; // index of the item being built
      continue;
    }

    if (!line.trim()) {
      item = null;
      continue;
    }

    if (item !== null && /^\s+\S/.test(rawLine)) {
      // Continuation of the previous list item
      section.items[item] = `${section.items[item]} ${line.trim()}`;
      continue;
    }

    // A plain paragraph under a release or a section
    (section ? section.notes : release.notes).push(line.trim());
  }

  return { intro, releases };
};

/** Splits a line into plain text, `code`, **bold** and [text](https://link) pieces. */
export const splitInline = (text) => {
  const pieces = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) pieces.push({ type: "text", value: text.slice(last, match.index) });
    const token = match[0];
    if (token.startsWith("`")) {
      pieces.push({ type: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("**")) {
      pieces.push({ type: "bold", value: token.slice(2, -2) });
    } else {
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      pieces.push({ type: "link", value: link[1], href: link[2] });
    }
    last = match.index + token.length;
  }
  if (last < text.length) pieces.push({ type: "text", value: text.slice(last) });
  return pieces;
};
