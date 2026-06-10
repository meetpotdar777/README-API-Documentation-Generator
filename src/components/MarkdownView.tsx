import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownViewProps {
  markdown: string;
}

export default function MarkdownView({ markdown }: MarkdownViewProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pre-process markdown into sections or render standard HTML with rich styling safely
  const renderMarkdown = (text: string) => {
    // Heal broken images and links split across line breaks due to LLM wrapping
    let healedText = text.replace(/!\[([^\]]*)\]\s*\r?\n\s*\(([^)]*)\)/g, "![$1]($2)");
    healedText = healedText.replace(/\[([^\]]+)\]\s*\r?\n\s*\(([^)]*)\)/g, "[$1]($2)");

    const lines = healedText.split("\n");
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = "";
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const elements: React.ReactNode[] = [];

    const flushTable = (index: number) => {
      if (tableHeaders.length > 0 || tableRows.length > 0) {
        elements.push(
          <div key={`table-${index}`} className="my-6 overflow-x-auto rounded-lg border border-slate-200 shadow-xs">
            <table className="w-full text-left border-collapse text-sm text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {tableHeaders.map((h, i) => (
                    <th key={i} className="px-4 py-3 font-semibold text-slate-800">
                      {h.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-2.5 font-sans whitespace-pre-wrap">
                        {renderInlineFormatting(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableHeaders = [];
        tableRows = [];
      }
      inTable = false;
    };

    const renderInlineFormatting = (str: string) => {
      // Strip outer/residual container tags from the inline output stream
      const cleanStr = str
        .replace(/<p[^>]*>/gi, "")
        .replace(/<\/p>/gi, "")
        .replace(/<div[^>]*>/gi, "")
        .replace(/<\/div>/gi, "")
        .replace(/<br\s*\/?>/gi, " ");

      const parts: React.ReactNode[] = [];
      let currentStr = cleanStr;
      let keyCounter = 0;

      // Match markdown rules
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
      const boldRegex = /\*\*([^*]+)\*\*/;
      const inlineCodeRegex = /`([^`]+)`/;

      // Match raw HTML syntax rules
      const htmlBoldRegex = /<strong>(.*?)<\/strong>/i;
      const htmlBoldRegex2 = /<b>(.*?)<\/b>/i;
      const htmlItalicRegex = /<em>(.*?)<\/em>/i;
      const htmlItalicRegex2 = /<i>(.*?)<\/i>/i;
      const htmlCodeRegex = /<code>(.*?)<\/code>/i;

      while (currentStr) {
        const earliestMatch = [
          { type: 'image', match: currentStr.match(imageRegex) },
          { type: 'link', match: currentStr.match(linkRegex) },
          { type: 'bold', match: currentStr.match(boldRegex) },
          { type: 'htmlBold', match: currentStr.match(htmlBoldRegex) },
          { type: 'htmlBold2', match: currentStr.match(htmlBoldRegex2) },
          { type: 'htmlItalic', match: currentStr.match(htmlItalicRegex) },
          { type: 'htmlItalic2', match: currentStr.match(htmlItalicRegex2) },
          { type: 'htmlCode', match: currentStr.match(htmlCodeRegex) },
          { type: 'code', match: currentStr.match(inlineCodeRegex) }
        ]
          .filter(m => m.match && m.match.index !== undefined)
          .sort((a, b) => (a.match!.index || 0) - (b.match!.index || 0))[0];

        if (!earliestMatch) {
          parts.push(<span key={`text-${keyCounter++}`}>{currentStr}</span>);
          break;
        }

        const index = earliestMatch.match!.index || 0;
        if (index > 0) {
          parts.push(<span key={`text-pre-${keyCounter++}`}>{currentStr.slice(0, index)}</span>);
        }

        const [full, text, url] = earliestMatch.match!;

        if (earliestMatch.type === 'image') {
          parts.push(
            <img
              key={`img-${keyCounter++}`}
              src={url}
              alt={text}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="inline-block max-h-10 mr-1.5 my-1"
            />
          );
        } else if (earliestMatch.type === 'link') {
          parts.push(
            <a
              key={`link-${keyCounter++}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              {text}
            </a>
          );
        } else if (earliestMatch.type === 'bold' || earliestMatch.type === 'htmlBold' || earliestMatch.type === 'htmlBold2') {
          parts.push(
            <strong key={`bold-${keyCounter++}`} className="font-bold text-slate-900">
              {text}
            </strong>
          );
        } else if (earliestMatch.type === 'htmlItalic' || earliestMatch.type === 'htmlItalic2') {
          parts.push(
            <em key={`em-${keyCounter++}`} className="italic text-slate-800">
              {text}
            </em>
          );
        } else if (earliestMatch.type === 'code' || earliestMatch.type === 'htmlCode') {
          parts.push(
            <code
              key={`code-${keyCounter++}`}
              className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[11px] font-semibold"
            >
              {text}
            </code>
          );
        }

        currentStr = currentStr.slice(index + full.length);
      }

      return parts;
    };

    const CodeBlock = ({ code, lang, blockIndex }: { code: string; lang: string; blockIndex: number; key?: any }) => {
      const [blockCopied, setBlockCopied] = useState(false);
      const handleBlockCopy = () => {
        navigator.clipboard.writeText(code);
        setBlockCopied(true);
        setTimeout(() => setBlockCopied(false), 1500);
      };

      return (
        <div key={`code-block-${blockIndex}`} className="my-6 rounded-lg overflow-hidden bg-slate-900 text-slate-100 font-mono text-sm shadow-md border border-slate-800">
          <div className="flex bg-slate-800/80 px-4 py-2 border-b border-slate-800 text-xs items-center justify-between text-slate-400">
            <span>{lang || "text"}</span>
            <button
              onClick={handleBlockCopy}
              className="flex items-center gap-1 hover:text-white transition-colors py-1 px-1.5 rounded-md hover:bg-slate-700"
            >
              {blockCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{blockCopied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <pre className="p-4 overflow-x-auto leading-relaxed whitespace-pre font-mono text-slate-200">
            <code>{code}</code>
          </pre>
        </div>
      );
    };

    let currentAlign = "left";
    let badgeBuffer: React.ReactNode[] = [];

    const flushBadges = (index: number) => {
      if (badgeBuffer.length > 0) {
        elements.push(
          <div key={`badges-group-${index}`} className={`flex flex-wrap items-center gap-2.5 py-2 px-4 bg-slate-50 border border-slate-150 rounded-xl my-4 hover:border-indigo-200 hover:bg-slate-50/50 transition-all shadow-2xs max-w-max ${currentAlign === 'center' ? 'mx-auto justify-center' : ''}`}>
            {badgeBuffer}
          </div>
        );
        badgeBuffer = [];
      }
    };

    const isPureBadgeLine = (l: string) => {
      const trimmed = l.trim();
      if (!trimmed) return false;
      // Matches standard markdown images: `![alt](url)`
      // Matches linked markdown images: `[![alt](url)](link)`
      // Matches raw HTML image tags or shields.io badges
      const badgePattern = /(\[!\[[^\]]*\]\([^)]+\)\]\([^)]+\)|!\[[^\]]*\]\([^)]+\)|<img[^>]+\/>|&nbsp;)/g;
      const cleaned = trimmed.replace(badgePattern, "").trim();
      return cleaned === "";
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLower = line.trim().toLowerCase();

      // Check for standalone HTML container alignment markers
      if (trimmedLower === "</p>" || trimmedLower === "</div>") {
        currentAlign = "left";
        continue;
      }
      if (trimmedLower === "<p>" || trimmedLower === "<div>") {
        continue;
      }
      if ((trimmedLower.startsWith("<p ") || trimmedLower.startsWith("<div ")) && trimmedLower.includes('align="center"')) {
        currentAlign = "center";
        
        // If content is embedded inside on same line, extract it and skip standalone processing
        const tagRemoved = line.replace(/<p[^>]*>/i, "").replace(/<div[^>]*>/i, "").trim();
        if (tagRemoved === "") {
          continue;
        }
      }

      // Code blocks selector
      if (line.trim().startsWith("```")) {
        flushTable(i);
        flushBadges(i);
        if (inCodeBlock) {
          // Finish code block
          const fullCode = codeBlockContent.join("\n");
          elements.push(
            <CodeBlock key={`block-${i}`} code={fullCode} lang={codeBlockLang} blockIndex={i} />
          );
          codeBlockContent = [];
          codeBlockLang = "";
          inCodeBlock = false;
        } else {
          // Start code block
          inCodeBlock = true;
          codeBlockLang = line.replace("```", "").trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Group consecutive pure badge elements side by side in a single flexwrap container
      if (isPureBadgeLine(line)) {
        flushTable(i);
        badgeBuffer.push(...renderInlineFormatting(line));
        continue;
      } else {
        flushBadges(i);
      }

      // Check for blockquote
      if (line.trim().startsWith(">")) {
        flushTable(i);
        const quoteText = line.trim().substring(1).trim();
        elements.push(
          <div key={`quote-${i}`} className="my-5 bg-indigo-50/20 border-l-4 border-indigo-500 p-4.5 rounded-r-xl text-slate-600 italic font-sans leading-relaxed shadow-3xs border-y border-r border-indigo-100/40 text-sm">
            {renderInlineFormatting(quoteText)}
          </div>
        );
        continue;
      }

      // Check for horizontal rule
      if (line.trim() === "---" || line.trim() === "***") {
        flushTable(i);
        elements.push(<hr key={i} className="my-8 border-t border-slate-150" />);
        continue;
      }

      // Check for raw HTML headings first
      const htmlH1Match = line.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (htmlH1Match) {
        flushTable(i);
        const text = htmlH1Match[1];
        const isCentered = line.toLowerCase().includes('align="center"') || currentAlign === "center";
        elements.push(
          <h1 key={`html-h1-${i}`} className={`text-3xl font-extrabold font-display tracking-tight text-slate-900 mt-8 mb-4 border-b-2 border-slate-100 pb-2.5 flex items-center gap-2 ${isCentered ? 'text-center justify-center mx-auto' : ''}`}>
            {renderInlineFormatting(text)}
          </h1>
        );
        continue;
      }

      const htmlH2Match = line.match(/<h2[^>]*>(.*?)<\/h2>/i);
      if (htmlH2Match) {
        flushTable(i);
        const text = htmlH2Match[1];
        const isCentered = line.toLowerCase().includes('align="center"') || currentAlign === "center";
        elements.push(
          <h2 key={`html-h2-${i}`} className={`text-2xl font-bold font-display tracking-tight text-slate-800 mt-6 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2 ${isCentered ? 'text-center justify-center mx-auto' : ''}`}>
            {renderInlineFormatting(text)}
          </h2>
        );
        continue;
      }

      const htmlH3Match = line.match(/<h3[^>]*>(.*?)<\/h3>/i);
      if (htmlH3Match) {
        flushTable(i);
        const text = htmlH3Match[1];
        const isCentered = line.toLowerCase().includes('align="center"') || currentAlign === "center";
        elements.push(
          <h3 key={`html-h3-${i}`} className={`text-xl font-bold font-display text-slate-800 mt-5 mb-2 flex items-center gap-2 ${isCentered ? 'text-center justify-center mx-auto' : ''}`}>
            {renderInlineFormatting(text)}
          </h3>
        );
        continue;
      }

      // Check for standard markdown headings
      if (line.trim().startsWith("#")) {
        flushTable(i);
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          const depth = headingMatch[1].length;
          const text = headingMatch[2];
          const renderedText = renderInlineFormatting(text);
          const alignClass = currentAlign === "center" ? "text-center justify-center mx-auto" : "";

          if (depth === 1) {
            elements.push(<h1 key={i} className={`text-3xl font-extrabold font-display tracking-tight text-slate-900 mt-8 mb-4 border-b-2 border-slate-100 pb-2.5 flex items-center gap-2 ${alignClass}`}>{renderedText}</h1>);
          } else if (depth === 2) {
            elements.push(<h2 key={i} className={`text-2xl font-bold font-display tracking-tight text-slate-800 mt-6 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 ${alignClass}`}>{renderedText}</h2>);
          } else if (depth === 3) {
            elements.push(<h3 key={i} className={`text-xl font-semibold font-display text-slate-800 mt-5 mb-2 flex items-center gap-2 ${alignClass}`}>{renderedText}</h3>);
          } else {
            elements.push(<h4 key={i} className={`text-lg font-semibold text-slate-700 mt-4 mb-2 ${currentAlign === 'center' ? 'text-center' : ''}`}>{renderedText}</h4>);
          }
          continue;
        }
      }

      // Check for lists
      if (line.trim().startsWith("* ") || line.trim().startsWith("- ") || /^\d+\.\s/.test(line.trim())) {
        flushTable(i);
        const isOrdered = /^\d+\.\s/.test(line.trim());
        const cleanedText = isOrdered
          ? line.trim().replace(/^\d+\.\s/, "")
          : line.trim().slice(2);

        // Check if there's a task checkbox
        const isTask = cleanedText.startsWith("[ ]") || cleanedText.startsWith("[x]") || cleanedText.startsWith("[X]");
        if (isTask) {
          const checked = cleanedText.startsWith("[x]") || cleanedText.startsWith("[X]");
          const taskLabel = cleanedText.slice(3).trim();
          elements.push(
            <div key={i} className="flex items-start gap-2.5 my-2 pl-4">
              <input
                type="checkbox"
                checked={checked}
                readOnly
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-not-allowed"
              />
              <span className={`text-sm text-slate-600 ${checked ? 'line-through text-slate-400' : 'font-medium text-slate-700'}`}>
                {renderInlineFormatting(taskLabel)}
              </span>
            </div>
          );
        } else {
          elements.push(
            <div key={i} className={`flex items-start gap-2.5 my-2 pl-4 ${currentAlign === 'center' ? 'justify-center text-center' : ''}`}>
              {isOrdered ? (
                <span className="text-xs font-mono text-indigo-600 font-bold min-w-5 mt-0.5">{line.trim().match(/^\d+\./)?.[0]}</span>
              ) : (
                <span className="mt-2 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500" />
              )}
              <span className="text-sm text-slate-600 leading-relaxed font-normal">
                {renderInlineFormatting(cleanedText)}
              </span>
            </div>
          );
        }
        continue;
      }

      // Check for tables
      if (line.trim().startsWith("|")) {
        const cells = line.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        // Determine if separator row
        const isSeparator = cells.every(c => c.startsWith(":") || c.startsWith("-") || c === "");
        if (isSeparator) {
          inTable = true;
          continue;
        }

        if (!inTable) {
          // Table header row
          tableHeaders = cells;
          inTable = true;
        } else {
          // Data row
          tableRows.push(cells);
        }
        continue;
      } else {
        // Line doesn't start with pipe, so end active table
        if (inTable) {
          flushTable(i);
        }
      }

      // Paragraphs/Plain Text
      if (line.trim()) {
        elements.push(
          <p key={i} className={`text-sm text-slate-600 font-normal leading-relaxed my-3.5 whitespace-pre-wrap ${currentAlign === "center" ? "text-center mx-auto flex flex-wrap justify-center items-center gap-2" : ""}`}>
            {renderInlineFormatting(line)}
          </p>
        );
      }
    }

    // Flush remaining structures at EOF
    flushBadges(lines.length);
    if (inTable) {
      flushTable(lines.length);
    }

    return elements;
  };

  return (
    <div className="relative bg-white rounded-xl border border-slate-200/80 p-6 md:p-8 max-w-none shadow-xs">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 font-semibold">Copied Markdown!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Raw Markdown</span>
            </>
          )}
        </button>
      </div>

      <div className="markdown-body select-text">
        {renderMarkdown(markdown)}
      </div>
    </div>
  );
}
