import SearchBar from "@/components/search/SearchBar";

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto max-w-lg px-4 py-3">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-bold text-surface text-sm">
            M
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">
              MacroLens
            </h1>
            <p className="text-[10px] text-neutral font-mono">
              AI Investment Research
            </p>
          </div>
        </div>
        <SearchBar />
      </div>
    </header>
  );
}
