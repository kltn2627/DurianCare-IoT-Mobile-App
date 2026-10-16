import { ExternalLink } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { DurianRemoteImage } from "@/src/components/DurianRemoteImage";
import { durianTheme } from "@/src/theme/durianTheme";

import { resolveKnowledgeMediaUrl } from "./knowledgeMedia";

type Block =
  | { id: string; type: "heading"; level: 1 | 2 | 3; text: string }
  | { id: string; type: "paragraph"; html: string; text: string }
  | { id: string; type: "list"; ordered: boolean; items: string[] }
  | { id: string; type: "image"; src: string; alt: string }
  | { id: string; type: "link"; href: string; text: string };

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value: string) {
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h1|h2|h3)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function attrs(tag: string) {
  const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1] ?? "";
  const alt = tag.match(/\salt=["']([^"']*)["']/i)?.[1] ?? "";
  const href = tag.match(/\shref=["']([^"']+)["']/i)?.[1] ?? "";
  return { alt: decodeEntities(alt), href, src };
}

function parseHtmlBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const pattern =
    /<(h[1-3])[^>]*>([\s\S]*?)<\/\1>|<(p|div)[^>]*>([\s\S]*?)<\/\3>|<(ul|ol)[^>]*>([\s\S]*?)<\/\5>|<img\b[^>]*>|<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(content))) {
    const raw = match[0];
    const id = `block-${index++}`;
    if (match[1]) {
      blocks.push({
        id,
        level: Number(match[1].slice(1)) as 1 | 2 | 3,
        text: stripTags(match[2] ?? ""),
        type: "heading",
      });
    } else if (match[3]) {
      const html = match[4] ?? "";
      const text = stripTags(html);
      if (text) blocks.push({ html, id, text, type: "paragraph" });
    } else if (match[5]) {
      const items = Array.from((match[6] ?? "").matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
        .map((item) => stripTags(item[1] ?? ""))
        .filter(Boolean);
      if (items.length) {
        blocks.push({ id, items, ordered: match[5].toLowerCase() === "ol", type: "list" });
      }
    } else if (raw.toLowerCase().startsWith("<img")) {
      const image = attrs(raw);
      const src = resolveKnowledgeMediaUrl(image.src);
      if (src) blocks.push({ alt: image.alt, id, src, type: "image" });
    } else if (raw.toLowerCase().startsWith("<a")) {
      const link = attrs(raw);
      const text = stripTags(match[7] ?? link.href);
      if (link.href) blocks.push({ href: link.href, id, text, type: "link" });
    }
  }
  if (blocks.length) return blocks;
  return plainBlocks(content);
}

function plainBlocks(content: string): Block[] {
  return content
    .split(/\n{2,}/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({ html: text, id: `plain-${index}`, text, type: "paragraph" as const }));
}

function inlineParts(html: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /<(strong|b|em|i)[^>]*>([\s\S]*?)<\/\1>|<a\b([^>]*)>([\s\S]*?)<\/a>|<br\s*\/?>/gi;
  let cursor = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    if (match.index > cursor) {
      parts.push(decodeEntities(stripTags(html.slice(cursor, match.index))));
    }
    const key = `inline-${index++}`;
    if (match[1]) {
      const tag = match[1].toLowerCase();
      const text = stripTags(match[2] ?? "");
      parts.push(<Text key={key} style={tag === "em" || tag === "i" ? styles.italic : styles.bold}>{text}</Text>);
    } else if (match[0].toLowerCase().startsWith("<a")) {
      const link = attrs(match[0]);
      const text = stripTags(match[4] ?? link.href);
      parts.push(<Text key={key} onPress={() => void Linking.openURL(link.href)} style={styles.inlineLink}>{text}</Text>);
    } else {
      parts.push("\n");
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < html.length) {
    parts.push(decodeEntities(stripTags(html.slice(cursor))));
  }
  return parts;
}

function parseBlocks(content: string): Block[] {
  return /<\/?[a-z][\s\S]*>/i.test(content) ? parseHtmlBlocks(content) : plainBlocks(content);
}

export function KnowledgeContentRenderer({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return (
    <View style={styles.root}>
      {blocks.map((block) => {
        if (block.type === "heading") {
          return (
            <Text key={block.id} style={[styles.heading, block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3]}>
              {block.text}
            </Text>
          );
        }
        if (block.type === "list") {
          return (
            <View key={block.id} style={styles.list}>
              {block.items.map((item, index) => (
                <View key={`${block.id}-${item}`} style={styles.listRow}>
                  <Text style={styles.bullet}>{block.ordered ? `${index + 1}.` : "•"}</Text>
                  <Text style={styles.paragraph}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }
        if (block.type === "image") {
          return (
            <DurianRemoteImage
              accessibilityLabel={block.alt || "Ảnh trong bài kiến thức"}
              feature="knowledge-inline-image"
              key={block.id}
              resizeMode="cover"
              uri={block.src}
              style={styles.image}
            />
          );
        }
        if (block.type === "link") {
          return (
            <Pressable key={block.id} onPress={() => void Linking.openURL(block.href)} style={styles.linkRow}>
              <ExternalLink color={durianTheme.colors.moss} size={15} />
              <Text style={styles.link}>{block.text || block.href}</Text>
            </Pressable>
          );
        }
        return (
          <Text key={block.id} style={styles.paragraph}>
            {inlineParts(block.html)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: { color: durianTheme.colors.moss, fontSize: 15, fontWeight: "900", lineHeight: 25, width: 24 },
  bold: { fontWeight: "900" },
  h1: { fontSize: 24, lineHeight: 32 },
  h2: { fontSize: 21, lineHeight: 29 },
  h3: { fontSize: 18, lineHeight: 25 },
  heading: { color: durianTheme.colors.mossDark, fontWeight: "900", marginTop: 8 },
  image: { backgroundColor: durianTheme.colors.mossSoft, borderRadius: 18, height: 220, width: "100%" },
  inlineLink: { color: durianTheme.colors.moss, fontWeight: "900", textDecorationLine: "underline" },
  italic: { fontStyle: "italic" },
  link: { color: durianTheme.colors.moss, flex: 1, fontSize: 14, fontWeight: "800", lineHeight: 20 },
  linkRow: { alignItems: "center", flexDirection: "row", gap: 8, minHeight: 36 },
  list: { gap: 8 },
  listRow: { alignItems: "flex-start", flexDirection: "row" },
  paragraph: { color: durianTheme.colors.ink, flex: 1, fontSize: 15, lineHeight: 25 },
  root: { gap: 14 },
});
