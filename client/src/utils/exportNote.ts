import type { Editor } from '@tiptap/react';

type ExportFormat = 'html' | 'md' | 'txt' | 'json' | 'doc' | 'pdf';

interface ProseMirrorNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: ProseMirrorNode[];
}

const MIME_TYPES: Record<ExportFormat, string> = {
  html: 'text/html;charset=utf-8',
  md: 'text/markdown;charset=utf-8',
  txt: 'text/plain;charset=utf-8',
  json: 'application/json;charset=utf-8',
  doc: 'application/msword;charset=utf-8',
  pdf: 'text/html;charset=utf-8',
};

function escapeMarkdown(text: string) {
  return text.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1');
}

function sanitizeFileName(title: string) {
  const clean = title
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 80);

  return clean || 'Untitled note';
}

function getTextContent(node: ProseMirrorNode): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(getTextContent).join('');
}

function renderInlineMarkdown(node: ProseMirrorNode): string {
  if (node.text !== undefined) {
    let text = escapeMarkdown(node.text);
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') text = `**${text}**`;
      if (mark.type === 'italic') text = `_${text}_`;
      if (mark.type === 'strike') text = `~~${text}~~`;
      if (mark.type === 'code') text = `\`${text.replace(/`/g, '\\`')}\``;
    }
    return text;
  }

  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'image') {
    const src = String(node.attrs?.src ?? '');
    const alt = String(node.attrs?.alt ?? 'Image');
    return src ? `![${escapeMarkdown(alt)}](${src})` : '';
  }

  return (node.content ?? []).map(renderInlineMarkdown).join('');
}

function renderBlockMarkdown(node: ProseMirrorNode, depth = 0): string {
  const children = node.content ?? [];

  switch (node.type) {
    case 'doc':
      return children.map(child => renderBlockMarkdown(child, depth)).filter(Boolean).join('\n\n');
    case 'heading': {
      const level = Number(node.attrs?.level ?? 1);
      return `${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${children.map(renderInlineMarkdown).join('')}`;
    }
    case 'paragraph':
      return children.map(renderInlineMarkdown).join('');
    case 'bulletList':
      return children.map(child => renderBlockMarkdown(child, depth)).join('\n');
    case 'orderedList':
      return children.map((child, index) => renderBlockMarkdown({ ...child, attrs: { ...child.attrs, order: index + 1 } }, depth)).join('\n');
    case 'listItem': {
      const marker = typeof node.attrs?.order === 'number' ? `${node.attrs.order}.` : '-';
      const body = children.map(child => renderBlockMarkdown(child, depth + 1)).join('\n');
      return `${'  '.repeat(depth)}${marker} ${body.replace(/\n/g, `\n${'  '.repeat(depth + 1)}`)}`;
    }
    case 'blockquote':
      return children
        .map(child => renderBlockMarkdown(child, depth))
        .join('\n')
        .split('\n')
        .map(line => `> ${line}`)
        .join('\n');
    case 'codeBlock':
      return `\`\`\`\n${getTextContent(node)}\n\`\`\``;
    case 'horizontalRule':
      return '---';
    case 'image':
      return renderInlineMarkdown(node);
    default:
      return children.map(child => renderBlockMarkdown(child, depth)).join('\n');
  }
}

function buildHtmlDocument(title: string, bodyHtml: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; line-height: 1.6; max-width: 760px; margin: 48px auto; padding: 0 24px; color: #111827; }
    img { max-width: 100%; height: auto; }
    pre { background: #111827; color: #f9fafb; padding: 16px; overflow: auto; border-radius: 8px; }
    blockquote { border-left: 4px solid #d1d5db; margin-left: 0; padding-left: 16px; color: #4b5563; }
  </style>
</head>
<body>
  <h1>${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
  ${bodyHtml}
</body>
</html>`;
}

function downloadFile(content: string, fileName: string, format: ExportFormat) {
  const blob = new Blob([content], { type: MIME_TYPES[format] });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function printPdf(htmlDocument: string) {
  const iframe = document.createElement('iframe');
  iframe.title = 'PDF export';
  iframe.setAttribute('aria-hidden', 'true');https://github.com/Chirag5017/NoteCraft
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 500);
  };

  document.body.appendChild(iframe);

  const printDocument = iframe.contentDocument;
  const printWindow = iframe.contentWindow;
  if (!printDocument || !printWindow) {
    cleanup();
    throw new Error('PDF export failed. Please try again.');
  }

  printDocument.open();
  printDocument.write(htmlDocument);
  printDocument.close();

  await new Promise<void>(resolve => {
    if (printDocument.readyState === 'complete') {
      resolve();
      return;
    }
    iframe.onload = () => resolve();
  });

  await Promise.all(
    Array.from(printDocument.images).map(image => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>(resolve => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    })
  );

  await printDocument.fonts?.ready.catch(() => undefined);

  printWindow.onafterprint = cleanup;
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
    window.setTimeout(cleanup, 1000);
  }, 100);
}

export function exportNote(editor: Editor, title: string, format: ExportFormat) {
  const fileName = sanitizeFileName(title);
  const htmlDocument = buildHtmlDocument(fileName, editor.getHTML());
  const json = editor.getJSON() as ProseMirrorNode;

  if (format === 'pdf') {
    void printPdf(htmlDocument);
    return;
  }

  if (format === 'html') {
    downloadFile(htmlDocument, fileName, format);
    return;
  }

  if (format === 'doc') {
    downloadFile(htmlDocument, fileName, format);
    return;
  }

  if (format === 'txt') {
    downloadFile(editor.getText(), fileName, format);
    return;
  }

  if (format === 'json') {
    downloadFile(JSON.stringify(json, null, 2), fileName, format);
    return;
  }

  downloadFile(renderBlockMarkdown(json), fileName, format);
}

export type { ExportFormat };
