"use client";

import React, { useCallback, useMemo } from "react";
import Image from "next/image";

export type LayoutKind = "single" | "twoColumns" | "twoRows" | "grid2x2";

export type LayoutItem = {
  id: string;
  previewUrl: string;
  width: number;
  height: number;
  analysis?: { layout?: LayoutKind };
};

export type Page = { type: LayoutKind; items: LayoutItem[] };

type Props = {
  items: LayoutItem[];
};

function chunk<T>(arr: T[], n: number) {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n));
  return res;
}

function buildPages(items: LayoutItem[]): Page[] {
  const singles: LayoutItem[] = [];
  const twoCols: LayoutItem[] = [];
  const twoRows: LayoutItem[] = [];
  const grid4: LayoutItem[] = [];

  const normalize = (it: LayoutItem): LayoutKind | undefined => {
    const raw = it.analysis?.layout as string | undefined;
    if (!raw) return undefined;
    const v = raw.toLowerCase();
    if (v === "single") return "single";
    if (v === "twocolumns" || v === "two-columns" || v === "col" || v === "column" || v === "columns") return "twoColumns";
    if (v === "tworows" || v === "two-rows" || v === "row" || v === "rows") return "twoRows";
    if (v === "grid2x2" || v === "grid" || v === "2x2") return "grid2x2";
    return undefined;
  };

  for (const it of items) {
    const kind = normalize(it);
    if (kind === "single") singles.push(it);
    else if (kind === "twoColumns") twoCols.push(it);
    else if (kind === "twoRows") twoRows.push(it);
    else if (kind === "grid2x2") grid4.push(it);
    else {
      // Fallback based on orientation: portrait -> twoColumns, landscape -> twoRows
      if (it.width >= it.height) twoRows.push(it);
      else twoCols.push(it);
    }
  }

  const pages: Page[] = [];
  for (const s of singles) pages.push({ type: "single", items: [s] });
  for (const pair of chunk(twoCols, 2)) {
    if (pair.length === 2) pages.push({ type: "twoColumns", items: pair });
    else pages.push({ type: "single", items: pair });
  }
  for (const pair of chunk(twoRows, 2)) {
    if (pair.length === 2) pages.push({ type: "twoRows", items: pair });
    else pages.push({ type: "single", items: pair });
  }
  for (const quad of chunk(grid4, 4)) {
    if (quad.length === 4) pages.push({ type: "grid2x2", items: quad });
    else if (quad.length === 3) pages.push({ type: "twoRows", items: quad.slice(0, 2) });
    else if (quad.length === 2) pages.push({ type: "twoColumns", items: quad });
    else if (quad.length === 1) pages.push({ type: "single", items: quad });
  }

  return pages;
}

function SinglePage({ item }: { item: LayoutItem }) {
  return (
    <div className="page bg-white">
      <div className="page-inner h-full w-full">
        <div className="relative w-full h-full">
          <Image src={item.previewUrl} alt="photo" fill className="object-contain" unoptimized />
        </div>
      </div>
    </div>
  );
}

function TwoColumnsPage({ items }: { items: LayoutItem[] }) {
  const [a, b] = items;
  return (
    <div className="page bg-white">
      <div className="page-inner h-full w-full grid grid-cols-2 gap-6">
        {[a, b].map((it) => (
          <div key={it.id} className="relative w-full h-full">
            <Image src={it.previewUrl} alt="photo" fill className="object-contain" unoptimized />
          </div>
        ))}
      </div>
    </div>
  );
}

function TwoRowsPage({ items }: { items: LayoutItem[] }) {
  const [a, b] = items;
  return (
    <div className="page bg-white">
      <div className="page-inner h-full w-full grid grid-rows-2 gap-6">
        {[a, b].map((it) => (
          <div key={it.id} className="relative w-full h-full">
            <Image src={it.previewUrl} alt="photo" fill className="object-contain" unoptimized />
          </div>
        ))}
      </div>
    </div>
  );
}

function Grid2x2Page({ items }: { items: LayoutItem[] }) {
  return (
    <div className="page bg-white">
      <div className="page-inner h-full w-full grid grid-cols-2 grid-rows-2 gap-6">
        {items.map((it) => (
          <div key={it.id} className="relative w-full h-full">
            <Image src={it.previewUrl} alt="photo" fill className="object-contain" unoptimized />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AlbumLayoutPreview({ items }: Props) {
  const pages = useMemo(() => buildPages(items), [items]);

  const onExport = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  return (
    <div className="print-root flex flex-col gap-4">
      <div className="flex items-center justify-between print-hide">
        <div className="text-sm text-neutral-600">Pages: {pages.length}</div>
        <button className="h-10 px-4 rounded-md bg-black text-white" onClick={onExport}>
          Export PDF
        </button>
      </div>

      <div className="flex flex-col items-center gap-8">
        {pages.map((p, idx) => {
          switch (p.type) {
            case "single":
              return <SinglePage key={idx} item={p.items[0]} />;
            case "twoColumns":
              return <TwoColumnsPage key={idx} items={p.items} />;
            case "twoRows":
              return <TwoRowsPage key={idx} items={p.items} />;
            case "grid2x2":
              return <Grid2x2Page key={idx} items={p.items} />;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
