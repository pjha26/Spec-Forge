import { Router, type Request, type Response } from "express";
import { db, specsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
} from "docx";

const router = Router();

type DocxChild = Paragraph;

function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // patterns: **bold**, *italic*, `code`, ***bold-italic***
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      runs.push(new TextRun({ text: text.slice(last, m.index) }));
    }
    if (m[2] !== undefined) {
      runs.push(new TextRun({ text: m[2], bold: true, italics: true }));
    } else if (m[3] !== undefined) {
      runs.push(new TextRun({ text: m[3], bold: true }));
    } else if (m[4] !== undefined) {
      runs.push(new TextRun({ text: m[4], italics: true }));
    } else if (m[5] !== undefined) {
      runs.push(new TextRun({
        text: m[5],
        font: "Courier New",
        size: 18,
        shading: { type: ShadingType.CLEAR, fill: "F3F4F6" },
      }));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last) }));
  }
  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }
  return runs;
}

function markdownToDocx(markdown: string): DocxChild[] {
  const lines = markdown.split("\n");
  const children: DocxChild[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      for (const cl of codeLines) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: cl || " ",
            font: "Courier New",
            size: 18,
            color: "1E3A5F",
          })],
          spacing: { before: 0, after: 0, line: 260 },
          shading: { type: ShadingType.CLEAR, fill: "F1F5F9" },
          indent: { left: convertInchesToTwip(0.2) },
          border: {
            left: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8", space: 5 },
          },
        }));
      }
      // blank line after block
      children.push(new Paragraph({ text: "", spacing: { before: 80, after: 80 } }));
      i++;
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2].replace(/\*\*/g, "");
      const headingMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };
      children.push(new Paragraph({
        heading: headingMap[level] ?? HeadingLevel.HEADING_1,
        children: [new TextRun({ text })],
        spacing: { before: level <= 2 ? 280 : 180, after: 80 },
        pageBreakBefore: level === 1,
      }));
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      children.push(new Paragraph({
        text: "",
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F0", space: 1 } },
        spacing: { before: 120, after: 120 },
      }));
      i++;
      continue;
    }

    // Bullet list item
    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
    if (bulletMatch) {
      const indent = Math.floor(bulletMatch[1].length / 2);
      children.push(new Paragraph({
        children: parseInline(bulletMatch[3]),
        bullet: { level: indent },
        spacing: { before: 40, after: 40 },
      }));
      i++;
      continue;
    }

    // Ordered list item
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (orderedMatch) {
      const indent = Math.floor(orderedMatch[1].length / 2);
      children.push(new Paragraph({
        children: parseInline(orderedMatch[2]),
        numbering: { reference: "ordered-list", level: indent },
        spacing: { before: 40, after: 40 },
      }));
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      children.push(new Paragraph({
        children: parseInline(line.slice(2)),
        indent: { left: convertInchesToTwip(0.3) },
        border: {
          left: { style: BorderStyle.SINGLE, size: 12, color: "7C3AED", space: 8 },
        },
        shading: { type: ShadingType.CLEAR, fill: "F5F3FF" },
        spacing: { before: 80, after: 80 },
      }));
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      children.push(new Paragraph({ text: "", spacing: { before: 40, after: 40 } }));
      i++;
      continue;
    }

    // Regular paragraph
    children.push(new Paragraph({
      children: parseInline(line),
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.LEFT,
    }));
    i++;
  }

  return children;
}

router.get("/:id/export/docx", async (req: Request, res: Response) => {
  const specId = Number(req.params.id);
  if (isNaN(specId)) {
    res.status(400).json({ error: "Invalid spec id" });
    return;
  }

  const [spec] = await db.select().from(specsTable).where(eq(specsTable.id, specId));
  if (!spec) {
    res.status(404).json({ error: "Spec not found" });
    return;
  }
  if (!spec.content) {
    res.status(400).json({ error: "Spec has no content yet" });
    return;
  }

  try {
    const contentChildren = markdownToDocx(spec.content);

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "ordered-list",
            levels: [
              { level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) } } } },
              { level: 1, format: "lowerLetter", text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } } },
            ],
          },
        ],
      },
      styles: {
        default: {
          document: {
            run: { font: "Calibri", size: 22, color: "1E293B" },
            paragraph: { spacing: { line: 276 } },
          },
        },
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: "Calibri", size: 40, bold: true, color: "1E293B" },
            paragraph: { spacing: { before: 360, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 4 } } },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: "Calibri", size: 32, bold: true, color: "312E81" },
            paragraph: { spacing: { before: 280, after: 80 } },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: "Calibri", size: 26, bold: true, color: "4338CA" },
            paragraph: { spacing: { before: 200, after: 60 } },
          },
          {
            id: "Heading4",
            name: "Heading 4",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { font: "Calibri", size: 24, bold: true, italics: true, color: "5B21B6" },
            paragraph: { spacing: { before: 160, after: 40 } },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1.25),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1.25),
              },
            },
          },
          children: [
            // Cover page
            new Paragraph({ text: "", spacing: { before: convertInchesToTwip(1.5), after: 0 } }),
            new Paragraph({
              children: [new TextRun({ text: spec.title, bold: true, font: "Calibri", size: 56, color: "1E293B" })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 120 },
            }),
            new Paragraph({
              children: [new TextRun({
                text: spec.specType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                font: "Calibri", size: 28, color: "7C3AED",
              })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 200 },
            }),
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 1 } },
              spacing: { before: 0, after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Generated by SpecForge  ·  ${new Date(spec.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, font: "Calibri", size: 20, color: "94A3B8" })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
            }),
            ...(spec.complexityScore !== null ? [new Paragraph({
              children: [new TextRun({ text: `Complexity Score: ${spec.complexityScore}/10`, font: "Calibri", size: 20, color: "94A3B8" })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 0 },
            })] : []),
            new Paragraph({ pageBreakBefore: true, text: "" }),
            // Body
            ...contentChildren,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-spec.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    req.log.error({ err }, "Failed to generate DOCX");
    res.status(500).json({ error: "Failed to generate DOCX" });
  }
});

export default router;
