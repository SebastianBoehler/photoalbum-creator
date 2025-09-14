"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";

// Google Gemini provider via Vercel AI SDK
// Requires GOOGLE_GENERATIVE_AI_API_KEY to be set in your environment.
const model = google("gemini-2.5-flash");
// https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai

const analysisSchema = z.object({
  contentSummary: z.string(),
  tags: z.array(z.string()).default([]),
  objects: z.array(z.string()).default([]),
  fullPagePrintOK: z.boolean(),
  notes: z.string().optional(),
  suggestions: z.array(z.string()).default([]),
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
  suggestions: string[];
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

  const prompt = `You are a photo editor. Analyze the attached image and return JSON following the schema. Consider resolution: ${width}x${height} px (~${mp.toFixed(
    2
  )} MP).
- contentSummary: <= 12 words, objective caption.
- tags: 3-6 short tags.
- objects: main subjects or concepts.
- fullPagePrintOK: true if this image can be printed full-bleed on an A4 page (2480x3508 px at 300 DPI) without noticeable quality loss; otherwise false. Use the provided resolution to decide. Add brief notes if not OK.
- suggestions: optional short corrections like "slightly crop left", "increase exposure +0.3EV".`;

  const arrayBuffer = await file.arrayBuffer();
  const mediaType = mimeType || file.type;

  const { object } = await generateObject({
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
  });

  const resolved = {
    contentSummary: object.contentSummary,
    tags: object.tags,
    resolution: {
      width,
      height,
      megapixels: mp,
      fullPagePrintOK: object.fullPagePrintOK,
      notes: object.notes,
    },
    objects: object.objects,
    fullPagePrintOK: object.fullPagePrintOK,
    notes: object.notes,
    suggestions: object.suggestions,
  };

  return resolved;
}
