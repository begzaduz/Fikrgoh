export type ContentBlockType = "text" | "heading" | "quote" | "list" | "image" | "divider";
export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  text?: string;
  items?: string[];
  url?: string;
  caption?: string;
};

export const newBlock = (type: ContentBlockType = "text"): ContentBlock => ({
  id: crypto.randomUUID(),
  type,
  ...(type === "list" ? { items: [""] } : {}),
  ...(type === "image" ? { caption: "" } : {}),
  ...(type === "divider" ? {} : { text: "" }),
});

export function cleanBlocks(raw: unknown): ContentBlock[] | null {
  if (!Array.isArray(raw)) return null;
  const allowed: ContentBlockType[] = ["text", "heading", "quote", "list", "image", "divider"];
  const blocks = raw.slice(0, 40).flatMap((item): ContentBlock[] => {
    if (!item || typeof item !== "object") return [];
    const b = item as Record<string, unknown>;
    if (!allowed.includes(b.type as ContentBlockType)) return [];
    const type = b.type as ContentBlockType;
    const id = typeof b.id === "string" ? b.id : crypto.randomUUID();
    if (type === "divider") return [{ id, type }];
    if (type === "image") return typeof b.url === "string" ? [{ id, type, url: b.url, caption: typeof b.caption === "string" ? b.caption : "" }] : [];
    if (type === "list") return [{ id, type, items: Array.isArray(b.items) ? b.items.filter((x): x is string => typeof x === "string").slice(0, 30) : [] }];
    return [{ id, type, text: typeof b.text === "string" ? b.text.slice(0, 12000) : "" }];
  });
  return blocks.length ? blocks : null;
}

export function blocksToText(blocks: ContentBlock[]): string {
  return blocks.map((b) => {
    if (b.type === "divider") return "";
    if (b.type === "image") return b.caption ?? "";
    if (b.type === "list") return (b.items ?? []).join(" ");
    return b.text ?? "";
  }).filter(Boolean).join("\n\n");
}
