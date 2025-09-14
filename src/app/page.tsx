import AlbumBuilder from "@/components/AlbumBuilder";

export default function Home() {
  return (
    <div className="min-h-screen p-6 sm:p-8">
      <header className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl font-semibold">AI Photo Album Creator</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Upload photos, analyze print readiness, and prepare for a clean, professional album layout.
        </p>
      </header>
      <section className="max-w-7xl mx-auto">
        <AlbumBuilder />
      </section>
    </div>
  );
}
