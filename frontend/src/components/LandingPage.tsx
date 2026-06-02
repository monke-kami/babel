import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  ArrowRight, 
  Bookmark
} from "lucide-react";

export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleChipClick = (subject: string) => {
    setSearchQuery(subject);
    searchInputRef.current?.focus();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    // Simulate navigation/processing
    setTimeout(() => {
      setIsSearching(false);
      alert(`Analyzing PYQs for subject: ${searchQuery}\n(This would navigate to the PYQ Analysis workspace)`);
    }, 1500);
  };

  const sampleChips = [
    { code: "CST302", name: "Operating Systems" },
    { code: "CST304", name: "DBMS" },
    { code: "CST306", name: "Computer Networks" },
    { code: "CST308", name: "Design & Engineering" },
  ];

  return (
    <div className="bg-surface text-on-surface h-screen max-h-screen overflow-hidden flex flex-col font-sans mesh-bg antialiased relative">
      <div className="grid-overlay" />

      {/* Top Header */}
      <nav className="fixed top-0 w-full z-50 flex items-center px-6 md:px-16 h-20 bg-transparent transition-all duration-300">
        <div className="flex items-center gap-2 text-xl md:text-2xl font-bold tracking-tight text-on-surface select-none">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center shadow-md shadow-primary/25">
            <Bookmark className="h-5 w-5 text-on-primary-container" />
          </div>
          <span>KalamBot</span>
        </div>
      </nav>

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 md:px-16 w-full max-w-[1280px] mx-auto relative z-10">
        
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-10 flex flex-col items-center gap-5">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gradient leading-tight tracking-tight select-none">
            Analyze KTU PYQs in Seconds
          </h1>
          <p className="text-base md:text-lg text-on-surface-variant max-w-xl font-normal leading-relaxed">
            Discover repeated topics, frequently asked questions, and high-priority exam areas using state-of-the-art academic intelligence.
          </p>
        </div>

        {/* Search / Action Interface */}
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-5">
          <form 
            onSubmit={handleSearchSubmit}
            className={`w-full glass-panel rounded-2xl p-2 flex flex-col sm:flex-row items-center gap-2 shadow-lg shadow-primary/5 transition-all duration-300 ${
              searchFocused ? "border-primary/60 ring-2 ring-primary/20 scale-[1.01]" : "border-white/10"
            }`}
          >
            <div className="flex-grow flex items-center px-4 py-3 w-full">
              <Search className={`h-5 w-5 mr-3 transition-colors ${searchFocused ? "text-primary" : "text-on-surface-variant"}`} />
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full bg-transparent border-none text-on-surface font-mono text-sm focus:outline-none placeholder:text-on-surface-variant/40" 
                placeholder="Enter Subject Code (e.g. CST302 or Operating Systems)"
              />
            </div>
            
            <button 
              type="submit"
              disabled={isSearching}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-container text-on-primary-container px-8 py-3.5 rounded-xl font-semibold text-sm hover:opacity-95 active:scale-[0.98] disabled:opacity-70 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-md shadow-primary/20"
            >
              {isSearching ? (
                <>
                  <div className="h-4 w-4 border-2 border-on-primary-container border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Analyze PYQs</span>
                  <ArrowRight className="h-4.5 w-4.5" />
                </>
              )}
            </button>
          </form>

          {/* Subject suggestion chips */}
          <div className="flex flex-wrap justify-center items-center gap-2 mt-1">
            <span className="text-on-surface-variant/75 text-[11px] font-semibold uppercase tracking-wider mr-1.5 select-none">
              Popular:
            </span>
            {sampleChips.map((chip) => (
              <button 
                key={chip.code}
                onClick={() => handleChipClick(chip.code)}
                className="px-3.5 py-1.5 rounded-full border border-white/5 bg-[#18181b] hover:bg-[#202024] font-medium text-xs text-on-surface-variant hover:text-on-surface hover:border-primary/50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-primary/5"
              >
                {chip.code}
              </button>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
