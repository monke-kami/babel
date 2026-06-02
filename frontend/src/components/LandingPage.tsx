import { useState } from "react";
import { Bookmark, BookOpen, Database, Globe, Lightbulb } from "lucide-react";
import RuixenMoonChat from "@/components/ui/ruixen-moon-chat";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);

  const sampleChips = [
    { code: "CST302", name: "Operating Systems", icon: <BookOpen className="w-4 h-4" /> },
    { code: "CST304", name: "DBMS", icon: <Database className="w-4 h-4" /> },
    { code: "CST306", name: "Computer Networks", icon: <Globe className="w-4 h-4" /> },
    { code: "CST308", name: "Design & Engineering", icon: <Lightbulb className="w-4 h-4" /> },
  ];

  const handleSearchSubmit = (subject: string) => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      navigate(`/chat?subject=${encodeURIComponent(subject)}`);
    }, 1000);
  };

  const quickActions = sampleChips.map((chip) => ({
    icon: chip.icon,
    label: `${chip.code} (${chip.name})`,
    onClick: () => handleSearchSubmit(chip.code),
  }));

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      {/* Top Header */}
      <nav className="absolute top-0 left-0 w-full z-50 flex items-center px-6 md:px-16 h-20 bg-transparent">
        <div className="flex items-center gap-2 text-xl md:text-2xl font-bold tracking-tight text-white select-none">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-400 flex items-center justify-center shadow-md shadow-blue-500/25">
            <Bookmark className="h-5 w-5 text-white" />
          </div>
          <span>KalamBot</span>
        </div>
      </nav>

      {/* Main Ruixen Moon Chat Section */}
      <RuixenMoonChat
        title="KalamBot AI"
        subtitle="Analyze KTU PYQs in Seconds. Discover repeated topics, frequently asked questions, and high-priority exam areas."
        placeholder="Enter Subject Code (e.g. CST302 or Operating Systems)"
        onSearchSubmit={handleSearchSubmit}
        isSearching={isSearching}
        quickActions={quickActions}
      />
    </div>
  );
}
