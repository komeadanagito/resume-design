export type ExtractedArtifact = {
  identifier: string;
  type: string;
  title: string;
  content: string;
};

export type ExtractionResult = {
  chatText: string;
  artifacts: ExtractedArtifact[];
};

const ARTIFACT_RE = /<artifact\s+([^>]*)>([\s\S]*?)<\/artifact>/g;

function readAttr(attrs: string, name: string): string | undefined {
  const match = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return match?.[1];
}

/**
 * One-shot extraction of <artifact> blocks from a completed assistant message.
 * Streaming chunk-level parsing is deferred to slice 11 — slice 3 ships the
 * artifact at message_completed time, which keeps tag-across-chunk handling
 * out of the hot path.
 */
export function extractArtifacts(text: string): ExtractionResult {
  const artifacts: ExtractedArtifact[] = [];
  const chatText = text
    .replace(ARTIFACT_RE, (_whole, attrs: string, body: string) => {
      const identifier = readAttr(attrs, "identifier") ?? `artifact-${artifacts.length + 1}`;
      artifacts.push({
        identifier,
        type: readAttr(attrs, "type") ?? "text/html",
        title: readAttr(attrs, "title") ?? identifier,
        content: sanitizeArtifactHtml(body.trim())
      });
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { chatText, artifacts };
}

/**
 * Server-side sanitization before anything reaches the sandboxed iframe:
 * no scripts, no event handlers, no nested iframes, no remote stylesheets.
 */
export function sanitizeArtifactHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<script[^>]*\/?>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<iframe[^>]*\/?>/gi, "")
    .replace(/<(object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(object|embed)[^>]*\/?>/gi, "")
    .replace(/<link[^>]*href="https?:\/\/[^"]*"[^>]*\/?>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/@import\s+url\([^)]*\);?/gi, "");
}
