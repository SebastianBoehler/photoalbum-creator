"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

export type EdgeCrop = {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
};

export type CropReviewItem = {
  id: string;
  previewUrl: string;
  width: number;
  height: number;
  analysis?: { crop?: EdgeCrop };
  userCrop?: EdgeCrop;
};

type Props = {
  items: CropReviewItem[];
  onChangeCrop: (id: string, crop?: EdgeCrop | null) => void;
  onBack: () => void;
};

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize({ width: cr.width, height: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size } as const;
}

export default function CropReview({ items, onChangeCrop, onBack }: Props) {
  const itemsWithCrop = useMemo(() => items.filter((i) => i.analysis?.crop), [items]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex > itemsWithCrop.length - 1) {
      setActiveIndex(Math.max(0, itemsWithCrop.length - 1));
    }
  }, [itemsWithCrop.length, activeIndex]);

  const current = itemsWithCrop[activeIndex];

  const effectiveCrop: EdgeCrop = useMemo(() => {
    if (!current) return {};
    return current.userCrop && Object.keys(current.userCrop).length > 0
      ? current.userCrop
      : current.analysis?.crop || {};
  }, [current]);

  const [draftCrop, setDraftCrop] = useState<EdgeCrop>(effectiveCrop);

  useEffect(() => {
    setDraftCrop(effectiveCrop);
  }, [effectiveCrop, current?.id]);

  const { ref: boxRef, size } = useElementSize<HTMLDivElement>();

  const scaleX = current ? (size.width || 1) / current.width : 1;
  const scaleY = current ? (size.height || 1) / current.height : 1;

  const leftW = (draftCrop.left || 0) * scaleX;
  const rightW = (draftCrop.right || 0) * scaleX;
  const topH = (draftCrop.top || 0) * scaleY;
  const bottomH = (draftCrop.bottom || 0) * scaleY;

  const goPrev = useCallback(() => setActiveIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(
    () => setActiveIndex((i) => Math.min(itemsWithCrop.length - 1, i + 1)),
    [itemsWithCrop.length]
  );

  const clampLeft = useCallback(
    (val: number) => {
      if (!current) return 0;
      const right = draftCrop.right || 0;
      return Math.max(0, Math.min(val, current.width - 10 - right));
    },
    [current, draftCrop.right]
  );

  const clampRight = useCallback(
    (val: number) => {
      if (!current) return 0;
      const left = draftCrop.left || 0;
      return Math.max(0, Math.min(val, current.width - 10 - left));
    },
    [current, draftCrop.left]
  );

  const clampTop = useCallback(
    (val: number) => {
      if (!current) return 0;
      const bottom = draftCrop.bottom || 0;
      return Math.max(0, Math.min(val, current.height - 10 - bottom));
    },
    [current, draftCrop.bottom]
  );

  const clampBottom = useCallback(
    (val: number) => {
      if (!current) return 0;
      const top = draftCrop.top || 0;
      return Math.max(0, Math.min(val, current.height - 10 - top));
    },
    [current, draftCrop.top]
  );

  if (!current || itemsWithCrop.length === 0) {
    return (
      <div className="h-full w-full grid place-items-center gap-4">
        <div className="text-neutral-600">No items with AI crop suggestions.</div>
        <button className="px-4 h-10 rounded-md border" onClick={onBack}>Back to Gallery</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-600">
          {activeIndex + 1} / {itemsWithCrop.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-9 px-3 rounded-md border disabled:opacity-50"
            onClick={goPrev}
            disabled={activeIndex === 0}
          >
            Prev
          </button>
          <button
            className="h-9 px-3 rounded-md border disabled:opacity-50"
            onClick={goNext}
            disabled={activeIndex >= itemsWithCrop.length - 1}
          >
            Next
          </button>
          <button className="h-9 px-3 rounded-md border" onClick={onBack}>Back</button>
        </div>
      </div>

      <div
        ref={boxRef}
        className="relative w-full max-w-5xl mx-auto rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900"
        style={{ aspectRatio: `${current.width} / ${current.height}` }}
      >
        <Image
          src={current.previewUrl}
          alt="preview"
          fill
          className="object-contain"
          unoptimized
        />

        {/* Overlay masks */}
        {/* Left */}
        {leftW > 0 && (
          <div className="absolute top-0 left-0 bottom-0 bg-black/40" style={{ width: `${leftW}px` }} />
        )}
        {/* Right */}
        {rightW > 0 && (
          <div className="absolute top-0 right-0 bottom-0 bg-black/40" style={{ width: `${rightW}px` }} />
        )}
        {/* Top */}
        {topH > 0 && (
          <div
            className="absolute top-0 bg-black/40"
            style={{ left: `${leftW}px`, right: `${rightW}px`, height: `${topH}px` }}
          />
        )}
        {/* Bottom */}
        {bottomH > 0 && (
          <div
            className="absolute bottom-0 bg-black/40"
            style={{ left: `${leftW}px`, right: `${rightW}px`, height: `${bottomH}px` }}
          />
        )}
        {/* Visible frame */}
        <div
          className="absolute pointer-events-none border-2 border-white/70"
          style={{ left: `${leftW}px`, right: `${rightW}px`, top: `${topH}px`, bottom: `${bottomH}px` }}
        />
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Left */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2"><span>Left</span><span>{Math.round(draftCrop.left || 0)} px</span></div>
          <input
            type="range"
            min={0}
            max={current.width}
            value={draftCrop.left || 0}
            className="w-full"
            onChange={(e) => {
              const v = clampLeft(Number(e.target.value));
              setDraftCrop((c) => ({ ...c, left: v }));
            }}
          />
        </div>
        {/* Right */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2"><span>Right</span><span>{Math.round(draftCrop.right || 0)} px</span></div>
          <input
            type="range"
            min={0}
            max={current.width}
            value={draftCrop.right || 0}
            className="w-full"
            onChange={(e) => {
              const v = clampRight(Number(e.target.value));
              setDraftCrop((c) => ({ ...c, right: v }));
            }}
          />
        </div>
        {/* Top */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2"><span>Top</span><span>{Math.round(draftCrop.top || 0)} px</span></div>
          <input
            type="range"
            min={0}
            max={current.height}
            value={draftCrop.top || 0}
            className="w-full"
            onChange={(e) => {
              const v = clampTop(Number(e.target.value));
              setDraftCrop((c) => ({ ...c, top: v }));
            }}
          />
        </div>
        {/* Bottom */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2"><span>Bottom</span><span>{Math.round(draftCrop.bottom || 0)} px</span></div>
          <input
            type="range"
            min={0}
            max={current.height}
            value={draftCrop.bottom || 0}
            className="w-full"
            onChange={(e) => {
              const v = clampBottom(Number(e.target.value));
              setDraftCrop((c) => ({ ...c, bottom: v }));
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <button
            className="h-10 px-3 rounded-md border disabled:opacity-50"
            disabled={!current.analysis?.crop}
            onClick={() => {
              setDraftCrop(current.analysis?.crop || {});
            }}
          >
            Reset
          </button>
          <button
            className="h-10 px-3 rounded-md border"
            onClick={() => {
              onChangeCrop(current.id, null); // remove userCrop
              setDraftCrop(current.analysis?.crop || {});
            }}
          >
            Clear
          </button>
        </div>
        <button
          className="h-10 px-4 rounded-md bg-black text-white"
          onClick={() => {
            onChangeCrop(current.id, { ...draftCrop });
            if (activeIndex < itemsWithCrop.length - 1) {
              setActiveIndex((i) => i + 1);
            }
          }}
        >
          Save & Next
        </button>
      </div>
    </div>
  );
}
