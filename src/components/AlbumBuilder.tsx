"use client";

import React, { useCallback, useMemo, useState } from "react";
import NextImage from "next/image";
import { analyzeImage, type ImageAnalysis } from "@/hooks/ai";

type AlbumImage = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  status: "pending" | "analyzing" | "done" | "error";
  analysis?: ImageAnalysis;
  error?: string;
};

async function getImageDimensions(file: File): Promise<{ width: number; height: number }>
{
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
    return dims;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function bytesToReadable(size: number): string {
  const units = ["B", "KB", "MB", "GB"]; // we won't go beyond
  let idx = 0;
  let s = size;
  while (s > 1024 && idx < units.length - 1) {
    s /= 1024;
    idx += 1;
  }
  return `${s.toFixed(1)} ${units[idx]}`;
}

export default function AlbumBuilder() {
  const [items, setItems] = useState<AlbumImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const onFilesSelected = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const next: AlbumImage[] = [];
    for (const file of Array.from(files)) {
      const { width, height } = await getImageDimensions(file);
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      next.push({ id, file, previewUrl, width, height, status: "pending" });
    }

    setItems((prev) => [...prev, ...next]);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer?.files?.length) {
        await onFilesSelected(e.dataTransfer.files);
      }
    },
    [onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const analyzePending = useCallback(async () => {
    const toAnalyze = items.filter((x) => x.status === "pending");
    if (toAnalyze.length === 0) return;

    setIsAnalyzing(true);
    try {
      for (const it of toAnalyze) {
        // Update status to analyzing
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "analyzing" } : p)));
        try {
          const res = await analyzeImage({ file: it.file, width: it.width, height: it.height, mimeType: it.file.type });
          setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "done", analysis: res } : p)));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "error", error: message } : p)));
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [items]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => {
      if (p.id === id) URL.revokeObjectURL(p.previewUrl);
      return p.id !== id;
    }));
  }, []);

  const hasPending = useMemo(() => items.some((x) => x.status === "pending"), [items]);

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-80px)] w-full">
      {/* Sidebar */}
      <aside className="col-span-12 md:col-span-4 lg:col-span-3 border rounded-xl p-4 bg-white/50 dark:bg-black/20">
        <h2 className="text-lg font-semibold mb-3">Upload Photos</h2>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-xl p-6 transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50/40 dark:bg-blue-500/10" : "border-neutral-300"
          }`}
        >
          <input
            id="file-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onFilesSelected(e.target.files)}
          />
          <label htmlFor="file-input" className="flex flex-col items-center gap-2 cursor-pointer">
            <div className="text-sm text-neutral-600 dark:text-neutral-300">Drag & drop images here</div>
            <div className="text-xs text-neutral-500">or click to select</div>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            disabled={!hasPending || isAnalyzing}
            onClick={analyzePending}
            className="h-10 px-4 rounded-md bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </button>
          <button
            onClick={() => setItems([])}
            className="h-10 px-3 rounded-md border"
          >
            Clear
          </button>
        </div>

        <div className="mt-6 space-y-1 text-xs text-neutral-500">
          <p>• Supported: PNG, JPG, HEIC (browser dependent).</p>
          <p>• For full-page A4 print at 300 DPI, aim for ≥ 2480×3508 px.</p>
        </div>
      </aside>

      {/* Main grid */}
      <main className="col-span-12 md:col-span-8 lg:col-span-9 overflow-auto">
        {items.length === 0 ? (
          <div className="h-full grid place-items-center text-neutral-500">No images yet. Upload to begin.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {items.map((it) => (
              <div key={it.id} className="group border rounded-xl overflow-hidden bg-white/50 dark:bg-black/20">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <NextImage
                    src={it.previewUrl}
                    alt={it.file.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded-md bg-black/70 text-white">
                    {(it.width)}×{(it.height)}
                  </div>
                  {it.status === "analyzing" && (
                    <div className="absolute inset-0 grid place-items-center bg-black/40 text-white text-sm">
                      Analyzing...
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate" title={it.file.name}>{it.file.name}</div>
                    <div className="text-[10px] text-neutral-500">{bytesToReadable(it.file.size)}</div>
                  </div>

                  {it.status === "error" && (
                    <div className="text-xs text-red-600">{it.error}</div>
                  )}

                  {it.analysis && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          it.analysis.resolution.fullPagePrintOK ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {it.analysis.resolution.fullPagePrintOK ? "A4 Ready" : "Might be soft"}
                        </span>
                        <span className="text-[10px] text-neutral-500">{it.analysis.resolution.megapixels.toFixed(2)} MP</span>
                      </div>
                      <div className="text-sm">{it.analysis.contentSummary}</div>
                      {it.analysis.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {it.analysis.tags.slice(0, 6).map((t) => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {it.analysis.metadata && Object.keys(it.analysis.metadata).length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-neutral-600 cursor-pointer">Metadata</summary>
                          <ul className="mt-1 space-y-0.5">
                            {Object.entries(it.analysis.metadata)
                              .map(([k, v]) => (
                                <li key={k} className="text-[10px] text-neutral-500">
                                  {k}: {v}
                                </li>
                              ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => removeItem(it.id)}
                    >
                      Remove
                    </button>
                    {it.status === "pending" && (
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={async () => {
                          setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "analyzing" } : p)));
                          try {
                            const res = await analyzeImage({ file: it.file, width: it.width, height: it.height, mimeType: it.file.type });
                            setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "done", analysis: res } : p)));
                          } catch (err: unknown) {
                            const message = err instanceof Error ? err.message : "Unknown error";
                            setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "error", error: message } : p)));
                          }
                        }}
                      >
                        Analyze
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
