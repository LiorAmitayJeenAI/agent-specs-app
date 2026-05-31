import {
  AlignmentType,
  Document,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import JSZip from "jszip";

type RtlParagraphOptions = ConstructorParameters<typeof Paragraph>[0] & {
  rightToLeft?: boolean;
  bidirectional?: boolean;
  properties?: {
    rightToLeft?: boolean;
  };
};

export type WordExportValue = string | string[] | boolean | number | undefined;

export type WordExportBlock =
  | { kind: "title"; text: string }
  | { kind: "meta"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "label"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "editableText"; value: string }
  | { kind: "editableList"; value: string[] }
  | { kind: "editableSelect"; value: string }
  | { kind: "editableBoolean"; value: boolean }
  | { kind: "empty"; text: string }
  | { kind: "space" }
  | { kind: "image"; imageData: Uint8Array; width: number; height: number };

const HEBREW_FONT = {
  ascii: "Arial",
  hAnsi: "Arial",
  cs: "Arial",
  eastAsia: "Arial",
};

const HEBREW_ALIGNMENT = AlignmentType.START;
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const RTL_PARAGRAPH_TAGS =
  '<w:bidi w:val="1"/><w:mirrorIndents w:val="1"/><w:jc w:val="start"/>';
const RTL_RUN_TAGS =
  '<w:rtl w:val="1"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:lang w:val="he-IL" w:eastAsia="he-IL" w:bidi="he-IL"/>';
const RTL_TABLE_TAGS = '<w:bidiVisual w:val="1"/><w:jc w:val="start"/>';
const RTL_SETTINGS_TAGS = '<w:bidi w:val="1"/>';

export const formatDocumentValue = (value: WordExportValue) => {
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "-";
  if (typeof value === "boolean") return value ? "כן" : "לא";
  if (typeof value === "number") return String(value);
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "-";
};

const forceOnOffTag = (xml: string, tagName: string) =>
  xml.replace(new RegExp(`<${tagName}(?:\\s[^>]*)?\\/>`, "g"), `<${tagName} w:val="1"/>`);

const forceStartAlignmentTag = (xml: string) =>
  xml
    .replace(/<w:jc\b[^>]*\/>/g, (match) => {
      const valMatch = match.match(/w:val="([^"]+)"/);
      const val = valMatch?.[1];
      if (val === "center" || val === "both") return match;
      return '<w:jc w:val="start"/>';
    })
    .replace(/<w:jc\b[^>]*>[^<]*<\/w:jc>/g, '<w:jc w:val="start"/>');

const ensureXmlChild = (
  xml: string,
  parentTag: string,
  childPattern: RegExp,
  childXml: string,
  position: "start" | "end" = "start"
) =>
  xml.replace(
    new RegExp(`<${parentTag}([^>]*)>([\\s\\S]*?)</${parentTag}>`, "g"),
    (match, attributes: string, innerXml: string) => {
      if (childPattern.test(innerXml)) return match;

      const nextInnerXml = position === "start" ? `${childXml}${innerXml}` : `${innerXml}${childXml}`;
      return `<${parentTag}${attributes}>${nextInnerXml}</${parentTag}>`;
    }
  );

const ensureParagraphRtl = (xml: string) => {
  const withExpandedProperties = xml.replace(
    /<w:pPr([^>]*)\/>/g,
    `<w:pPr$1>${RTL_PARAGRAPH_TAGS}</w:pPr>`
  );

  const withParagraphProperties = ensureXmlChild(
    withExpandedProperties.replace(
      /<w:p(\s[^>]*)?>(?!<w:pPr[\s>])/g,
      `<w:p$1><w:pPr>${RTL_PARAGRAPH_TAGS}</w:pPr>`
    ),
    "w:pPr",
    /<w:bidi\b/,
    '<w:bidi w:val="1"/>'
  ).replace(
    /<w:pPr([^>]*)>([\s\S]*?)<\/w:pPr>/g,
    (_match, attributes: string, innerXml: string) => {
      const existingJc = innerXml.match(/<w:jc\s+[^>]*w:val="([^"]+)"[^>]*\/>/);
      const existingJcValue = existingJc?.[1];
      const shouldPreserveAlignment =
        existingJcValue === "center" || existingJcValue === "both";

      const withoutBidiAndJc = innerXml
        .replace(/<w:bidi\s*\/?>/g, "")
        .replace(/<w:bidi\s[^>]*\/>/g, "")
        .replace(/<w:jc\b[^>]*\/>/g, "")
        .replace(/<w:jc\b[^>]*>[^<]*<\/w:jc>/g, "");

      const withMirrorIndents = /<w:mirrorIndents\b/.test(withoutBidiAndJc)
        ? withoutBidiAndJc
        : `${withoutBidiAndJc}<w:mirrorIndents w:val="1"/>`;

      const jcTag = shouldPreserveAlignment
        ? existingJc![0]
        : '<w:jc w:val="start"/>';

      return `<w:pPr${attributes}><w:bidi w:val="1"/>${withMirrorIndents}${jcTag}</w:pPr>`;
    }
  );

  return forceOnOffTag(withParagraphProperties, "w:bidi");
};

const ARIAL_FONTS_TAG = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>';

const normalizeRunProperties = (innerXml: string): string => {
  const withoutRtl = innerXml.replace(/<w:rtl\s*\/?>/g, "").replace(/<w:rtl\s[^>]*\/>/g, "");

  const withArial = withoutRtl.replace(/<w:rFonts\s[^>]*\/>/g, ARIAL_FONTS_TAG);
  const hasFonts = /<w:rFonts\b/.test(withArial);
  const withFonts = hasFonts ? withArial : `${ARIAL_FONTS_TAG}${withArial}`;

  return `<w:rtl w:val="1"/>${withFonts}`;
};

const ensureRunRtl = (xml: string) => {
  const withExpandedProperties = xml.replace(
    /<w:rPr([^>]*)\/>/g,
    `<w:rPr$1>${RTL_RUN_TAGS}</w:rPr>`
  );

  return forceOnOffTag(
    ensureXmlChild(
      withExpandedProperties.replace(
        /<w:r(\s[^>]*)?>(?!<w:rPr[\s>])/g,
        `<w:r$1><w:rPr>${RTL_RUN_TAGS}</w:rPr>`
      ),
      "w:rPr",
      /<w:rtl\b/,
      '<w:rtl w:val="1"/>'
    ).replace(
      /<w:rPr([^>]*)>([\s\S]*?)<\/w:rPr>/g,
      (_match, attributes: string, innerXml: string) => {
        const normalized = normalizeRunProperties(innerXml);
        const withLang = /<w:lang\b/.test(normalized)
          ? normalized.replace(/<w:lang\b([^>]*)\/>/g, (_langMatch, langAttributes: string) => {
                const withVal = /\bw:val=/.test(langAttributes)
                  ? langAttributes
                  : `${langAttributes} w:val="he-IL"`;
                const withEastAsia = /\bw:eastAsia=/.test(withVal)
                  ? withVal
                  : `${withVal} w:eastAsia="he-IL"`;
                const withBidi = /\bw:bidi=/.test(withEastAsia)
                  ? withEastAsia
                  : `${withEastAsia} w:bidi="he-IL"`;
                return `<w:lang${withBidi}/>`;
              })
          : `${normalized}<w:lang w:val="he-IL" w:eastAsia="he-IL" w:bidi="he-IL"/>`;
        return `<w:rPr${attributes}>${withLang}</w:rPr>`;
      }
    ),
    "w:rtl"
  );
};

const ensureTableRtl = (xml: string) => {
  const withExpandedProperties = xml.replace(
    /<w:tblPr([^>]*)\/>/g,
    `<w:tblPr$1>${RTL_TABLE_TAGS}</w:tblPr>`
  );

  return forceOnOffTag(
    ensureXmlChild(
      withExpandedProperties.replace(
        /<w:tbl(\s[^>]*)?>(?!<w:tblPr[\s>])/g,
        `<w:tbl$1><w:tblPr>${RTL_TABLE_TAGS}</w:tblPr>`
      ),
      "w:tblPr",
      /<w:bidiVisual\b/,
      '<w:bidiVisual w:val="1"/>'
    ).replace(
      /<w:tblPr([^>]*)>([\s\S]*?)<\/w:tblPr>/g,
      (_match, attributes: string, innerXml: string) =>
        /<w:jc\b/.test(innerXml)
          ? `<w:tblPr${attributes}>${forceStartAlignmentTag(innerXml)}</w:tblPr>`
          : `<w:tblPr${attributes}>${innerXml}<w:jc w:val="start"/></w:tblPr>`
    ),
    "w:bidiVisual"
  );
};

const ensureSectionRtl = (xml: string) => {
  const withExpandedSectPr = xml.replace(
    /<w:sectPr([^>]*)\/>/g,
    '<w:sectPr$1><w:bidi w:val="1"/><w:rtlGutter w:val="1"/></w:sectPr>'
  );

  const withRtlGutter = ensureXmlChild(
    withExpandedSectPr,
    "w:sectPr",
    /<w:rtlGutter\b/,
    '<w:rtlGutter w:val="1"/>'
  );

  const withBidiSection = ensureXmlChild(
    withRtlGutter,
    "w:sectPr",
    /<w:bidi\b/,
    '<w:bidi w:val="1"/>'
  );

  return forceOnOffTag(forceOnOffTag(withBidiSection, "w:rtlGutter"), "w:bidi");
};

const ensureNumberingRtl = (xml: string) =>
  ensureParagraphRtl(
    ensureRunRtl(
      ensureXmlChild(
        xml,
        "w:lvl",
        /<w:pPr\b/,
        '<w:pPr><w:bidi w:val="1"/><w:mirrorIndents w:val="1"/><w:jc w:val="start"/><w:ind w:right="720" w:hanging="360"/></w:pPr>',
        "end"
      )
    )
  ).replace(
    /<w:ind\b([^>]*)\/>/g,
    (match, attributes: string) => {
      if (/\bw:right=|\bw:start=/.test(attributes) || !/\bw:left=/.test(attributes)) {
        return match;
      }

      return `<w:ind${attributes.replace(/\bw:left=/, "w:right=")}/>`;
    }
  );

const ensureDocDefaultsRtl = (xml: string) => {
  const ensureDefaultProperties = (
    sourceXml: string,
    defaultTag: "w:pPrDefault" | "w:rPrDefault",
    propertiesTag: "w:pPr" | "w:rPr",
    rtlXml: string
  ) => {
    const withExpandedDefaults = sourceXml.replace(
      new RegExp(`<${defaultTag}([^>]*)\\/>`, "g"),
      `<${defaultTag}$1><${propertiesTag}>${rtlXml}</${propertiesTag}></${defaultTag}>`
    );

    const withDefaultContainer = /<w:docDefaults\b/.test(withExpandedDefaults)
      ? withExpandedDefaults
      : withExpandedDefaults.replace(
          /<w:styles([^>]*)>/,
          `<w:styles$1><w:docDefaults></w:docDefaults>`
        );

    const withDefaultTag = new RegExp(`<${defaultTag}\\b`).test(withDefaultContainer)
      ? withDefaultContainer
      : withDefaultContainer.replace(
          /<w:docDefaults([^>]*)>/,
          `<w:docDefaults$1><${defaultTag}><${propertiesTag}>${rtlXml}</${propertiesTag}></${defaultTag}>`
        );

    return withDefaultTag.replace(
      new RegExp(`<${defaultTag}([^>]*)>([\\s\\S]*?)</${defaultTag}>`, "g"),
      (_match, attributes: string, innerXml: string) => {
        const withProperties = new RegExp(`<${propertiesTag}\\b`).test(innerXml)
          ? innerXml
          : `<${propertiesTag}>${rtlXml}</${propertiesTag}>${innerXml}`;

        const patchedProperties =
          propertiesTag === "w:pPr" ? ensureParagraphRtl(withProperties) : ensureRunRtl(withProperties);

        return `<${defaultTag}${attributes}>${patchedProperties}</${defaultTag}>`;
      }
    );
  };

  return ensureDefaultProperties(
    ensureDefaultProperties(xml, "w:pPrDefault", "w:pPr", RTL_PARAGRAPH_TAGS),
    "w:rPrDefault",
    "w:rPr",
    RTL_RUN_TAGS
  );
};

const ensureStylesRtl = (xml: string) =>
  ensureDocDefaultsRtl(ensureParagraphRtl(ensureRunRtl(xml)));

const COMPAT_TAGS =
  '<w:compat>' +
  '<w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>' +
  '</w:compat>';

const ensureSettingsRtl = (xml: string) => {
  const withDocumentDirection = forceOnOffTag(
    ensureXmlChild(xml, "w:settings", /<w:bidi\b/, RTL_SETTINGS_TAGS, "end"),
    "w:bidi"
  );

  const withCompat = /<w:compat\b/.test(withDocumentDirection)
    ? withDocumentDirection.replace(
        /<w:compat([^>]*)>([\s\S]*?)<\/w:compat>/g,
        (match, attributes: string, innerXml: string) =>
          /<w:compatSetting[^>]*compatibilityMode/.test(innerXml)
            ? match
            : `<w:compat${attributes}>${innerXml}<w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>`
      )
    : withDocumentDirection.replace("</w:settings>", `${COMPAT_TAGS}</w:settings>`);

  if (/<w:themeFontLang\b/.test(withCompat)) {
    return withCompat.replace(/<w:themeFontLang\b([^>]*)\/>/g, (_match, attributes: string) => {
      const withVal = /\bw:val=/.test(attributes) ? attributes : `${attributes} w:val="he-IL"`;
      const withEastAsia = /\bw:eastAsia=/.test(withVal) ? withVal : `${withVal} w:eastAsia="he-IL"`;
      const withBidi = /\bw:bidi=/.test(withEastAsia) ? withEastAsia : `${withEastAsia} w:bidi="he-IL"`;

      return `<w:themeFontLang${withBidi}/>`;
    });
  }

  return withCompat.replace(
    "</w:settings>",
    '<w:themeFontLang w:val="he-IL" w:eastAsia="he-IL" w:bidi="he-IL"/></w:settings>'
  );
};

const patchDocxXml = async (
  zip: JSZip,
  path: string,
  transform: (xml: string) => string
) => {
  const file = zip.file(path);
  if (!file) return;

  const xml = await file.async("string");
  zip.file(path, transform(xml));
};

const MINIMAL_SETTINGS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '</w:settings>';

const enforceHebrewRtlInDocx = async (blob: Blob) => {
  const zip = await JSZip.loadAsync(blob);

  await patchDocxXml(zip, "word/document.xml", (xml) =>
    ensureSectionRtl(ensureTableRtl(ensureParagraphRtl(ensureRunRtl(xml))))
  );
  await patchDocxXml(zip, "word/styles.xml", ensureStylesRtl);
  await patchDocxXml(zip, "word/numbering.xml", ensureNumberingRtl);

  if (!zip.file("word/settings.xml")) {
    zip.file("word/settings.xml", MINIMAL_SETTINGS_XML);
  }
  await patchDocxXml(zip, "word/settings.xml", ensureSettingsRtl);

  return zip.generateAsync({
    type: "blob",
    mimeType: DOCX_MIME_TYPE,
    compression: "DEFLATE",
  });
};

const docParagraph = (
  text: string,
  options: { bold?: boolean; heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel] } = {}
) => {
  const isTitle = options.heading === HeadingLevel.TITLE;
  const isHeading1 = options.heading === HeadingLevel.HEADING_1;
  const isHeading2 = options.heading === HeadingLevel.HEADING_2;
  const size = isTitle ? 36 : isHeading1 ? 28 : isHeading2 ? 24 : 22;
  const color = isTitle ? "1A1A2E" : isHeading1 ? "1A1A2E" : isHeading2 ? "334155" : "334155";

  return new Paragraph({
    alignment: HEBREW_ALIGNMENT,
    bidirectional: true,
    heading: options.heading,
    run: {
      font: HEBREW_FONT,
      language: {
        value: "he-IL",
        bidirectional: "he-IL",
      },
      rightToLeft: true,
      size,
      sizeComplexScript: size,
    },
    spacing: {
      before: isHeading1 || isHeading2 ? 180 : 0,
      after: isTitle ? 260 : isHeading1 ? 180 : isHeading2 ? 120 : 100,
      line: 300,
    },
    children: [
      new TextRun({
        text,
        bold: options.bold || isTitle || isHeading1 || isHeading2,
        boldComplexScript: options.bold || isTitle || isHeading1 || isHeading2,
        color,
        font: HEBREW_FONT,
        language: {
          value: "he-IL",
          bidirectional: "he-IL",
        },
        rightToLeft: true,
        size,
        sizeComplexScript: size,
      }),
    ],
  } as RtlParagraphOptions);
};

const docBlockParagraph = (block: WordExportBlock): Paragraph => {
  if (block.kind === "image") {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 },
      children: [
        new ImageRun({
          type: "png",
          data: block.imageData,
          transformation: { width: block.width, height: block.height },
        }),
      ],
    });
  }

  if (block.kind === "title") return docParagraph(block.text, { heading: HeadingLevel.TITLE });
  if (block.kind === "heading") return docParagraph(block.text, { heading: HeadingLevel.HEADING_1 });
  if (block.kind === "subheading") return docParagraph(block.text, { heading: HeadingLevel.HEADING_2 });
  if (block.kind === "label") return docParagraph(`${block.text}:`, { bold: true });
  if (block.kind === "editableText") return docParagraph(formatDocumentValue(block.value));
  if (block.kind === "editableList") return docParagraph(formatDocumentValue(block.value));
  if (block.kind === "editableSelect") return docParagraph(formatDocumentValue(block.value));
  if (block.kind === "editableBoolean") return docParagraph(formatDocumentValue(block.value));
  if (block.kind === "space") return docParagraph("");
  return docParagraph(block.text);
};

const MAX_IMAGE_WIDTH = 550;
const MAX_IMAGE_HEIGHT = 400;
const WORD_LOGO_WIDTH = 120;
const WORD_LOGO_PATH = "/JEEN_logo.png";

function scaleImageDimensions(
  naturalWidth: number,
  naturalHeight: number
): { width: number; height: number } {
  let width = naturalWidth;
  let height = naturalHeight;

  if (width > MAX_IMAGE_WIDTH) {
    height = Math.round(height * (MAX_IMAGE_WIDTH / width));
    width = MAX_IMAGE_WIDTH;
  }
  if (height > MAX_IMAGE_HEIGHT) {
    width = Math.round(width * (MAX_IMAGE_HEIGHT / height));
    height = MAX_IMAGE_HEIGHT;
  }

  return { width, height };
}

async function loadImageFromUrl(url: string): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 400, height: 300 });
      img.src = url;
    });

    return { data, ...scaleImageDimensions(dimensions.width, dimensions.height) };
  } catch {
    return null;
  }
}

async function loadImageFromBase64(dataUrl: string): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  try {
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;
    const binary = atob(base64);
    const data = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);

    const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 400, height: 300 });
      img.src = dataUrl;
    });

    return { data, ...scaleImageDimensions(dimensions.width, dimensions.height) };
  } catch {
    return null;
  }
}

export async function resolveImageBlock(
  imageSource: { url?: string; preview?: string }
): Promise<WordExportBlock | null> {
  let result: { data: Uint8Array; width: number; height: number } | null = null;

  if (imageSource.preview) {
    result = await loadImageFromBase64(imageSource.preview);
  }

  if (!result && imageSource.url) {
    result = await loadImageFromUrl(imageSource.url);
  }

  if (!result) return null;

  return { kind: "image", imageData: result.data, width: result.width, height: result.height };
}

async function createLogoHeader(): Promise<Header | undefined> {
  const logo = await loadImageFromUrl(WORD_LOGO_PATH);
  if (!logo) return undefined;

  const logoHeight = Math.round(logo.height * (WORD_LOGO_WIDTH / logo.width));

  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 120 },
        children: [
          new ImageRun({
            type: "png",
            data: logo.data,
            transformation: { width: WORD_LOGO_WIDTH, height: logoHeight },
          }),
        ],
      }),
    ],
  });
}

export const createHebrewWordBlob = async (blocks: WordExportBlock[]) => {
  const children = blocks.map((block) => docBlockParagraph(block));
  const logoHeader = await createLogoHeader();

  const doc = new Document({
    creator: "AI Agent Specs App",
    title: "מסמך אפיון סוכן AI",
    description: "מסמך אפיון בעברית לסוכן AI",
    styles: {
      default: {
        document: {
          run: {
            font: HEBREW_FONT,
            language: {
              value: "he-IL",
              bidirectional: "he-IL",
            },
            rightToLeft: true,
            size: 22,
            sizeComplexScript: 22,
            color: "334155",
          },
          paragraph: {
            alignment: HEBREW_ALIGNMENT,
            spacing: { after: 100, line: 300 },
          },
        },
        title: {
          run: {
            font: HEBREW_FONT,
            language: { value: "he-IL", bidirectional: "he-IL" },
            rightToLeft: true,
            bold: true,
            boldComplexScript: true,
            size: 36,
            sizeComplexScript: 36,
            color: "1A1A2E",
          },
          paragraph: {
            alignment: HEBREW_ALIGNMENT,
            spacing: { after: 260 },
          },
        },
        heading1: {
          run: {
            font: HEBREW_FONT,
            language: { value: "he-IL", bidirectional: "he-IL" },
            rightToLeft: true,
            bold: true,
            boldComplexScript: true,
            size: 28,
            sizeComplexScript: 28,
            color: "1A1A2E",
          },
          paragraph: {
            alignment: HEBREW_ALIGNMENT,
            spacing: { before: 220, after: 160 },
          },
        },
        heading2: {
          run: {
            font: HEBREW_FONT,
            language: { value: "he-IL", bidirectional: "he-IL" },
            rightToLeft: true,
            bold: true,
            boldComplexScript: true,
            size: 24,
            sizeComplexScript: 24,
            color: "334155",
          },
          paragraph: {
            alignment: HEBREW_ALIGNMENT,
            spacing: { before: 160, after: 120 },
          },
        },
      },
    },
    sections: [
      {
        headers: logoHeader ? { default: logoHeader } : undefined,
        properties: {
          page: {
            margin: {
              top: 1134,
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children,
      },
    ],
  });

  const generatedBlob = await Packer.toBlob(doc);
  return enforceHebrewRtlInDocx(generatedBlob);
};
