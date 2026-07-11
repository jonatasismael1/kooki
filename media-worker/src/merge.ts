export function mergeTranscripts(parts: string[]) {
  return parts.reduce((all, part) => {
    if (!all) return part.trim();
    const words = part.trim().split(/\s+/); const tail = all.split(/\s+/).slice(-20);
    let overlap = 0;
    for (let n = Math.min(20, words.length, tail.length); n >= 3; n--)
      if (tail.slice(-n).join(" ").toLowerCase() === words.slice(0, n).join(" ").toLowerCase()) { overlap = n; break; }
    return `${all} ${words.slice(overlap).join(" ")}`.trim();
  }, "");
}
