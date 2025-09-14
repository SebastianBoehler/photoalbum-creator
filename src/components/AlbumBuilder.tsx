"use client";

import React, { useCallback, useMemo, useState } from "react";
import NextImage from "next/image";
import { analyzeImage, type ImageAnalysis } from "@/hooks/ai";
import { bytesToReadable, getImageDimensions } from "@/hooks/utils";
import CropReview from "@/components/CropReview";
type AlbumImage = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  status: "pending" | "analyzing" | "done" | "error";
  analysis?: ImageAnalysis;
  error?: string;
  userCrop?: { left?: number; right?: number; top?: number; bottom?: number };
};

export default function AlbumBuilder() {
  const [items, setItems] = useState<AlbumImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [view, setView] = useState<"gallery" | "crop">("gallery");

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
  const cropCount = useMemo(() => items.filter((i) => i.analysis?.crop).length, [items]);

  const onChangeCrop = useCallback(
    (id: string, crop?: { left?: number; right?: number; top?: number; bottom?: number } | null) => {
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, userCrop: crop ?? undefined } : p)));
    },
    []
  );

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
        <div className="flex items-center gap-2 mb-4">
          <button
            className={`h-9 px-3 rounded-md border ${view === "gallery" ? "bg-black text-white border-black" : ""}`}
            onClick={() => setView("gallery")}
          >
            Gallery
          </button>
          <button
            className={`h-9 px-3 rounded-md border ${view === "crop" ? "bg-black text-white border-black" : ""}`}
            onClick={() => setView("crop")}
          >
            Crop review ({cropCount})
          </button>
        </div>

        {view === "gallery" ? (
          items.length === 0 ? (
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
                      {it.width}×{it.height}
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
          )
        ) : (
          <CropReview
            items={items.map((it) => ({
              id: it.id,
              previewUrl: it.previewUrl,
              width: it.width,
              height: it.height,
              analysis: it.analysis?.crop ? { crop: it.analysis.crop } : undefined,
              userCrop: it.userCrop,
            }))}
            onChangeCrop={onChangeCrop}
            onBack={() => setView("gallery")}
          />
        )}
      </main>
    </div>
  );
}
