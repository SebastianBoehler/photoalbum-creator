"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import exifr from "exifr";

const model = google("gemini-2.5-flash-lite");
// https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai

const analysisSchema = z.object({
  contentSummary: z.string(),
  tags: z.array(z.string()).default([]),
  objects: z.array(z.string()).default([]),
  // Layout recommendation to guide album page composition
  layout: z.enum(["single", "twoColumns", "twoRows", "grid2x2"]),
  notes: z.string().optional(),
});

export type ImageAnalysis = {
  contentSummary: string;
  tags: string[];
  objects: string[];
  resolution: {
    width: number;
    height: number;
    megapixels: number;
    fullPagePrintOK: boolean;
    notes?: string;
  };
  metadata: Record<string, string>;
  layout: "single" | "twoColumns" | "twoRows" | "grid2x2";
};

type AnalyzeParams = {
  file: Blob;
  width: number;
  height: number;
  mimeType?: string;
};

/**
 * analyzeImage
 * Server Action (no API route) that accepts a Blob from the client and returns a structured analysis.
 */
export async function analyzeImage({ file, width, height, mimeType }: AnalyzeParams) {
  const mp = (width * height) / 1_000_000;

  // Prepare binary and try to extract EXIF/metadata
  const arrayBuffer = await file.arrayBuffer();
  const mediaType = mimeType || file.type;

  const metadata: Record<string, string> = {};
  try {
    const exif = (await exifr.parse(arrayBuffer)) as Record<string, unknown> | undefined;
    if (exif) {
      const lat = exif.latitude as number | undefined;
      const lng = exif.longitude as number | undefined;
      const make = exif.Make as string | undefined;
      const exifModel = exif.Model as string | undefined;
      const lens = exif.LensModel as string | undefined;
      const fnum = exif.FNumber as number | undefined;
      const iso = exif.ISO as number | undefined;
      const exp = exif.ExposureTime as number | undefined;
      const focal = exif.FocalLength as number | undefined;
      const dt = (exif.DateTimeOriginal as Date | undefined) || (exif.CreateDate as Date | undefined);

      if (dt) metadata.time = new Date(dt).toISOString();
      if (lat != null && lng != null) metadata.location = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      if (make || exifModel) metadata.camera = [make, exifModel].filter(Boolean).join(" ");
      if (lens) metadata.lens = lens;
      if (fnum) metadata.aperture = `f/${fnum}`;
      if (iso) metadata.iso = String(iso);
      if (exp) metadata.exposure = exp >= 1 ? `${exp.toFixed(1)}s` : `1/${Math.round(1 / exp)}s`;
      if (focal) metadata.focalLength = `${focal}mm`;
    }
  } catch {
    // ignore metadata errors
  }

  const metaStr = Object.keys(metadata).length
    ? `\nMetadata:\n${Object.entries(metadata)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")}`
    : "";

  const prompt = `You are a photo editor. Analyze the attached image and return JSON following the schema. Consider resolution: ${width}x${height} px (~${mp.toFixed(
    2
  )} MP).${metaStr}
- contentSummary: <= 12 words, objective caption.
- tags: 3-6 short tags.
- objects: main subjects or concepts.
- layout: Choose ONE of { single | twoColumns | twoRows | grid2x2 } to recommend the best page layout for
that image for a 30cm x 30cm square album.
  Guidance:
   - single: strong "hero" image or when details warrant full-page.
   - twoColumns: two portrait-oriented images placed side-by-side (2 columns).
   - twoRows: two landscape-oriented images stacked vertically (2 rows).
   - grid2x2: four complementary images that work well as a 2x2 grid.`;

  //console.log(prompt);

  const { object, reasoning } = await generateObject({
    model,
    schema: analysisSchema,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt }],
      },
      {
        role: "user",
        content: [{ type: "file", data: arrayBuffer, mediaType }],
      },
    ],
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 2000,
          includeThoughts: true,
        },
      },
    },
  });

  //console.log(reasoning);

  //TODO: verification of type like description length, tags count, fullPagePrintOK boolean, etc.

  const resolved: ImageAnalysis = {
    contentSummary: object.contentSummary,
    tags: object.tags,
    resolution: {
      width,
      height,
      megapixels: mp,
      fullPagePrintOK: (width >= 2480 && height >= 3508) || (width >= 3508 && height >= 2480),
      notes: object.notes,
    },
    objects: object.objects,
    metadata,
    layout: object.layout,
  };
  console.log(resolved.layout);

  return resolved;
}
