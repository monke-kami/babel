import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Bookmark, 
  History, 
  Star, 
  Paperclip, 
  FileUp,
  Download, 
  FileText, 
  ImageIcon,
  Bot, 
  Menu, 
  X,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  ArrowUpRight,
  ArrowUp,
  Database,
  Globe,
  Lightbulb,
  ChevronDown,
  Share
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_ERROR_MESSAGE,
  createAttachmentMeta,
  hasDraggedFiles,
  type AttachmentMeta
} from "@/lib/attachments";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  pdf?: AttachmentMeta;
  attachments?: AttachmentMeta[];
  isSaved?: boolean;
}

interface SavedSubject {
  code: string;
  name: string;
  recurrenceRate: number;
  lastAnalyzed: string;
  color: string;
  topicsCount: number;
}



// Subject database for rich contextual feedback
const SUBJECT_DATABASE: Record<string, {
  name: string;
  recurrenceRate: number;
  topics: { name: string; weight: number; desc: string }[];
  pdfs: { name: string; size: string; year: string }[];
}> = {
  CST302: {
    name: "Operating Systems",
    recurrenceRate: 87,
    topics: [
      { name: "Process Synchronization & Semaphores", weight: 95, desc: "Critical section problems, producer-consumer, readers-writers." },
      { name: "Page Replacement Algorithms", weight: 88, desc: "FIFO, LRU, Optimal page replacement calculations." },
      { name: "Disk Scheduling (SSTF, SCAN, C-SCAN)", weight: 78, desc: "Arm movement calculations and cylinder scheduling." },
      { name: "Deadlock Detection & Banker's Algorithm", weight: 74, desc: "Resource allocation graph, safety algorithms." },
      { name: "CPU Scheduling Algorithms", weight: 70, desc: "SJF, Round Robin with Gantt charts." }
    ],
    pdfs: [
      { name: "CST302_OS_Regular_2023.pdf", size: "1.2 MB", year: "2023" },
      { name: "CST302_OS_Supp_2022.pdf", size: "1.1 MB", year: "2022" },
      { name: "CST302_OS_Regular_2021.pdf", size: "980 KB", year: "2021" }
    ]
  },
  CST304: {
    name: "Database Management Systems",
    recurrenceRate: 82,
    topics: [
      { name: "Normalization (3NF, BCNF, 4NF)", weight: 92, desc: "Functional dependencies and schema decomposition." },
      { name: "ER Diagram to Relational Schema Mapping", weight: 85, desc: "Entity sets, relationship attributes, key constraints." },
      { name: "ACID Properties & Transaction Schedules", weight: 80, desc: "Conflict serializability, view serializability, lock protocols." },
      { name: "SQL Query Writing & Joins", weight: 75, desc: "Correlated subqueries, group by, nested aggregates." },
      { name: "Indexing & B+ Trees", weight: 68, desc: "Structure, insertion, deletion trace." }
    ],
    pdfs: [
      { name: "CST304_DBMS_Regular_2023.pdf", size: "1.4 MB", year: "2023" },
      { name: "CST304_DBMS_Supp_2022.pdf", size: "1.3 MB", year: "2022" },
      { name: "CST304_DBMS_Regular_2021.pdf", size: "1.1 MB", year: "2021" }
    ]
  },
  CST306: {
    name: "Computer Networks",
    recurrenceRate: 79,
    topics: [
      { name: "TCP Congestion Control (Slow Start, Avoidance)", weight: 90, desc: "Threshold, additive increase, multiplicative decrease." },
      { name: "IP Subnetting & CIDR Address Allocation", weight: 84, desc: "Network mask, first address, broadcast address calculations." },
      { name: "Routing Protocols (Link State vs Distance Vector)", weight: 80, desc: "Dijkstra's & Bellman-Ford algorithm iterations." },
      { name: "Sliding Window Protocols (GBN, Selective Repeat)", weight: 72, desc: "Efficiency, sequence number calculations." },
      { name: "DNS Query Resolution & Hierarchy", weight: 65, desc: "Recursive vs Iterative queries, root servers." }
    ],
    pdfs: [
      { name: "CST306_CN_Regular_2023.pdf", size: "1.5 MB", year: "2023" },
      { name: "CST306_CN_Supp_2022.pdf", size: "1.4 MB", year: "2022" },
      { name: "CST306_CN_Regular_2021.pdf", size: "1.2 MB", year: "2021" }
    ]
  },
  CST308: {
    name: "Design & Engineering",
    recurrenceRate: 65,
    topics: [
      { name: "Design Thinking Stages & Ideation", weight: 85, desc: "Empathize, Define, Ideate, Prototype, Test framework." },
      { name: "Modular Product Architectures", weight: 72, desc: "Function structure, module clustering, interface design." },
      { name: "Value Engineering & Cost Optimization", weight: 68, desc: "Function-cost matrix, worth estimation." },
      { name: "Intellectual Property Rights (IPR) & Patents", weight: 60, desc: "Patent search, claims, filing requirements." }
    ],
    pdfs: [
      { name: "CST308_DE_Regular_2023.pdf", size: "950 KB", year: "2023" },
      { name: "CST308_DE_Regular_2022.pdf", size: "910 KB", year: "2022" }
    ]
  }
};

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialSubject = searchParams.get("subject") || "";
  
  const [isLanding, setIsLanding] = useState(location.pathname === "/");
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (location.pathname === "/") {
      setIsLanding(true);
      setIsExiting(false);
    } else {
      setIsLanding(false);
      setIsExiting(false);
    }
  }, [location.pathname]);

  const [landingInput, setLandingInput] = useState("");
  
  const handleLandingSubmit = (subject: string) => {
    setIsExiting(true);
    setTimeout(() => {
      setIsLanding(false);
      navigate(`/chat?subject=${encodeURIComponent(subject)}`);
    }, 1200); 
  };

  const landingChips = [
    { code: "CST302", name: "Operating Systems", icon: <BookOpen className="w-4 h-4" /> },
    { code: "CST304", name: "DBMS", icon: <Database className="w-4 h-4" /> },
    { code: "CST306", name: "Computer Networks", icon: <Globe className="w-4 h-4" /> },
    { code: "CST308", name: "Design & Engineering", icon: <Lightbulb className="w-4 h-4" /> },
  ];

  // Try matching subject code or default to CST302
  const parsedCode = initialSubject.trim().toUpperCase();
  const matchedCode = Object.keys(SUBJECT_DATABASE).find(
    code => code === parsedCode || SUBJECT_DATABASE[code].name.toUpperCase().includes(parsedCode)
  ) || "CST302";

  const currentSubjectInfo = SUBJECT_DATABASE[matchedCode];

  const [activeTab, setActiveTab] = useState<"analyses" | "saved" | "favorites">("analyses");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSubjectCode, setCurrentSubjectCode] = useState(matchedCode);
  const [messages, setMessages] = useState<Message[]>([]);
  const hasTriggered = useRef(false);

  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachmentMeta[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [isErrorFading, setIsErrorFading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Download simulation state map
  const [downloadStates, setDownloadStates] = useState<Record<string, "idle" | "loading" | "done">>({});

  // Saved Subjects state
  const [savedSubjects] = useState<SavedSubject[]>([
    { code: "CST302", name: "Operating Systems", recurrenceRate: 87, lastAnalyzed: "10 mins ago", color: "from-blue-600 to-indigo-600", topicsCount: 5 },
    { code: "CST304", name: "Database Management Systems", recurrenceRate: 82, lastAnalyzed: "1 hour ago", color: "from-indigo-600 to-purple-600", topicsCount: 5 },
    { code: "CST306", name: "Computer Networks", recurrenceRate: 79, lastAnalyzed: "Yesterday", color: "from-blue-500 to-cyan-600", topicsCount: 5 }
  ]);
  const [savedFilter, setSavedFilter] = useState("");


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, thinkingSteps]);

  useEffect(() => {
    if (attachmentError) {
      setIsErrorFading(false);
      const fadeTimer = setTimeout(() => {
        setIsErrorFading(true);
      }, 2500);
      const removeTimer = setTimeout(() => {
        setAttachmentError("");
        setIsErrorFading(false);
      }, 3000);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [attachmentError]);

  const triggerSubjectAnalysis = async (code: string, customPrompt?: string) => {
    const subjectInfo = SUBJECT_DATABASE[code] || { name: code };
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: customPrompt || `Can you find the PYQs and key topics for ${subjectInfo.name}?`
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setThinkingSteps(["Initiating web scraper for KTU papers..."]);

    try {
      const uiSteps = [
        "Downloading KTU past year question papers...",
        "Parsing PDFs and extracting questions...",
        "Clustering similar questions via Vector DB...",
        "Running TinyLlama to generate canonical forms...",
        "Compiling final ranked PDF..."
      ];
      
      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < uiSteps.length) {
          setThinkingSteps(prev => {
            if (!prev.includes(uiSteps[currentStep])) {
              return [...prev, uiSteps[currentStep]];
            }
            return prev;
          });
          currentStep++;
        }
      }, 3500);

      const res = await fetch(`http://localhost:8000/api/generate-full-report/${code}`, {
        method: "POST"
      });
      
      clearInterval(progressInterval);
      const data = await res.json();
      
      setIsTyping(false);
      setThinkingSteps([]);

      if (res.ok && data.status === "success") {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: `I have successfully analyzed the past year papers for **${code}** using our TinyLlama pipeline. I have compiled the ranked, canonical questions into a PDF for you.`,
          pdf: {
            name: `${code}_ranked.pdf`,
            size: "Generated Report",
            label: "Download Ranked Questions"
          }
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.detail || "Unknown error from backend");
      }
    } catch (err) {
      setIsTyping(false);
      setThinkingSteps([]);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: `Oops, something went wrong while talking to the KalamBot backend: ${err}. Make sure the FastAPI server is running!`
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  useEffect(() => {
    if (!isLanding && currentSubjectCode && messages.length === 0 && !hasTriggered.current) {
      hasTriggered.current = true;
      triggerSubjectAnalysis(currentSubjectCode);
    }
  }, [isLanding, currentSubjectCode, messages.length]);

  // Handle switching subjects from right panel or saved list
  const selectSubject = (code: string) => {
    setCurrentSubjectCode(code);
    hasTriggered.current = true;
    setMessages([]);
    triggerSubjectAnalysis(code);
    setActiveTab("analyses");
    setSidebarOpen(false);
  };

  const attachAllowedFiles = (files?: FileList | File[] | null) => {
    setAttachmentError("");

    const fileList = Array.from(files ?? []);
    if (fileList.length === 0) return false;

    const allowedFiles = fileList.map(createAttachmentMeta).filter(Boolean) as AttachmentMeta[];

    if (allowedFiles.length === 0) {
      setAttachmentError(ATTACHMENT_ERROR_MESSAGE);
      return false;
    }

    const newUniqueFiles = allowedFiles.filter(
      newFile => !attachedFiles.some(existing => existing.name === newFile.name)
    );

    if (newUniqueFiles.length < allowedFiles.length) {
      setAttachmentError("File already uploaded.");
      if (newUniqueFiles.length === 0) return false;
    }

    setAttachedFiles(prev => [...prev, ...newUniqueFiles]);
    return true;
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const didAttach = attachAllowedFiles(e.target.files);

    if (!didAttach) {
      e.target.value = "";
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    if (attachedFiles.length === 1 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getAttachmentIcon = (label?: string, className = "h-4.5 w-4.5 text-primary") => {
    if (label?.includes("Image")) {
      return <ImageIcon className={className} />;
    }

    return <FileText className={className} />;
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e.dataTransfer)) return;

    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e.dataTransfer)) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e.dataTransfer)) return;

    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e.dataTransfer)) return;

    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    attachAllowedFiles(e.dataTransfer.files);
  };

  useEffect(() => {
    const handleClipboardPaste = (e: ClipboardEvent) => {
      const pastedFiles = Array.from(e.clipboardData?.items ?? [])
        .filter(item => item.kind === "file")
        .map(item => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      if (pastedFiles.length === 0) return;

      e.preventDefault();
      attachAllowedFiles(pastedFiles);
    };

    window.addEventListener("paste", handleClipboardPaste);

    return () => {
      window.removeEventListener("paste", handleClipboardPaste);
    };
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputVal.trim();

    if (!trimmedInput && attachedFiles.length === 0) return;

    const userText = trimmedInput || `Attached ${attachedFiles.map(f => f.name).join(", ")}`;
    
    setInputVal("");
    setAttachedFiles([]);
    setAttachmentError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    await triggerSubjectAnalysis(currentSubjectCode, userText);
  };

  const handleDownloadPDF = async (fileName: string) => {
    setDownloadStates(prev => ({ ...prev, [fileName]: "loading" }));
    
    try {
      const response = await fetch(`http://localhost:8000/api/download/${fileName}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      setDownloadStates(prev => ({ ...prev, [fileName]: "done" }));
      setTimeout(() => {
        // Reset to idle after displaying success check
        setDownloadStates(prev => ({ ...prev, [fileName]: "idle" }));
      }, 1500);
    } catch (error) {
      console.error('Error downloading file:', error);
      setDownloadStates(prev => ({ ...prev, [fileName]: "idle" }));
      alert(`Error downloading ${fileName}`);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const toggleBookmarkMessage = (id: string) => {
    setMessages(prev =>
      prev.map(msg => (msg.id === id ? { ...msg, isSaved: !msg.isSaved } : msg))
    );
  };

  // Filtered list of saved subjects
  const filteredSaved = savedSubjects.filter(
    s => s.code.toLowerCase().includes(savedFilter.toLowerCase()) || 
         s.name.toLowerCase().includes(savedFilter.toLowerCase())
  );

  // List of favorited/starred messages
  const starredMessages = messages.filter(m => m.isSaved);

  return (
    <div
      className="bg-black text-on-surface h-screen max-h-screen overflow-hidden flex font-sans antialiased relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png')",
          backgroundAttachment: "fixed",
        }}
      />
      <div className="absolute inset-0 bg-black/80 z-0 pointer-events-none" />

      {/* ═══ Landing Hero Overlay ═══ */}
      <div 
        className={cn(
          "absolute inset-0 z-50 flex flex-col items-center px-6 transition-all duration-[1200ms] ease-in-out",
          (!isExiting && isLanding) ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-12 pointer-events-none"
        )}
      >
        {/* Top Header */}
        <nav className="absolute top-0 left-0 w-full z-50 flex items-center px-6 md:px-16 h-20 bg-transparent animate-fade-in-up">
          <div className="flex items-center gap-2 text-xl md:text-2xl font-bold tracking-tight text-neutral-100/90 select-none">
            <div className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center shadow-sm shadow-black/20">
              <Bookmark className="h-5 w-5 text-blue-200/80" />
            </div>
            <span>KalamBot</span>
          </div>
        </nav>

        {/* Hero Content & Search Bar Centered */}
        <div className="flex-1 w-full flex flex-col items-center justify-center z-10 px-4 mt-8">
          <div className="text-center max-w-3xl w-full mx-auto animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6">
              KalamBot.AI
            </h1>
            <p className="text-base md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto font-sans leading-relaxed">
              Analyze KTU PYQs in Seconds. Discover repeated topics, frequently asked questions, and high-priority exam areas.
            </p>
            
            <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-600/30 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="flex items-center bg-black/60 backdrop-blur-md rounded-full border border-neutral-700/80 shadow-2xl px-2 py-2 w-full transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 relative z-10">
                <input
                  type="text"
                  value={landingInput}
                  onChange={(e) => setLandingInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && landingInput.trim()) {
                      e.preventDefault();
                      handleLandingSubmit(landingInput);
                    }
                  }}
                  placeholder="Enter Subject Code (e.g. CST302 or Operating Systems)"
                  className="flex-1 bg-transparent border-none text-white text-base md:text-lg px-4 py-2 focus:outline-none placeholder:text-neutral-500 font-sans"
                />
                
                <div className="flex items-center gap-1.5 mr-1">
                  <button
                    disabled={!landingInput.trim()}
                    onClick={() => handleLandingSubmit(landingInput)}
                    className={cn(
                      "flex items-center justify-center rounded-full w-11 h-11 transition-all shrink-0 cursor-pointer shadow-md",
                      !landingInput.trim()
                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                        : "bg-white text-black hover:bg-neutral-200 hover:scale-105"
                    )}
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center flex-wrap gap-3 mt-8 animate-fade-in-up [animation-delay:400ms]">
              {landingChips.map((chip, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setLandingInput(chip.code);
                    setTimeout(() => {
                      handleLandingSubmit(chip.code);
                    }, 400);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900/50 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 rounded-xl text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm"
                >
                  <span className="text-primary/80">{chip.icon}</span>
                  <span className="text-sm font-medium">{chip.code} ({chip.name})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {isDragActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface/80 backdrop-blur-xl px-6 pointer-events-none">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-primary/35 bg-[#1c1924]/95 p-6 text-center shadow-2xl shadow-black/50">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15 shadow-lg shadow-primary/15">
              <FileUp className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-bold text-white">Drop file to attach</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">
              PDF, JPEG, PNG, and text files are supported.
            </p>
          </div>
        </div>
      )}

      {/* SideNavBar (Desktop/Drawer) */}
      <aside className={`flex flex-col h-full py-4 bg-[#0a0a0a] border-r border-white/10 shrink-0 z-40 fixed md:sticky top-0 w-[260px] ${
        isLanding 
          ? "-translate-x-full" 
          : (sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")
      }`}>
        <div className="px-3 mb-4 flex justify-between items-center">
          <button 
            onClick={() => navigate("/")}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:bg-white/5 transition-all cursor-pointer font-medium"
          >
            <div className="h-7 w-7 rounded-full bg-white flex items-center justify-center">
              <span className="text-black text-lg pb-0.5">+</span>
            </div>
            <span className="text-sm">New Search</span>
          </button>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex-grow overflow-y-auto px-3 space-y-0.5">
          <p className="text-xs font-semibold text-neutral-500 px-3 py-2 mt-2">Library</p>
          <button 
            onClick={() => { setActiveTab("analyses"); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "analyses"
                ? "bg-white/10 text-white font-medium"
                : "text-neutral-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <History className="h-4 w-4" />
            <span className="text-sm">Recent Analyses</span>
          </button>
          <button 
            onClick={() => { setActiveTab("saved"); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "saved"
                ? "bg-white/10 text-white font-medium"
                : "text-neutral-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span className="text-sm">Saved Subjects</span>
          </button>
          <button 
            onClick={() => { setActiveTab("favorites"); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === "favorites"
                ? "bg-white/10 text-white font-medium"
                : "text-neutral-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Star className="h-4 w-4" />
            <span className="text-sm">Favorites</span>
          </button>
        </div>

        <div className="px-3 mt-auto pt-4">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white transition-all cursor-pointer">
            <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
              KB
            </div>
            <div className="text-sm font-medium text-left">
              KalamBot Account
            </div>
          </button>         
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col relative h-screen max-h-screen overflow-hidden ${
        isLanding ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}>
        
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-6 h-14 bg-transparent sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors mr-1"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button className="flex items-center gap-2 text-lg font-bold text-white hover:bg-white/5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
              <span>KalamBot AI</span>
              <ChevronDown className="h-4 w-4 text-neutral-400 ml-1" />
            </button>
          </div>

          <div className="flex items-center">
            <button className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer" title="Share Chat">
              <Share className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Tab Canvas panels */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* VIEW: Analyses (Default Workspace) */}
          {activeTab === "analyses" && (
            <div className="flex-1 flex overflow-hidden w-full">
              
              {/* Chat Column */}
              <div className="flex-1 flex flex-col relative h-full bg-transparent overflow-hidden">
                
                {/* Scrollable Conversation */}
                <div className="flex-1 overflow-y-auto px-6 py-6 pb-36 flex flex-col gap-6 max-w-3xl mx-auto w-full scrollbar-none">
                  
                  {messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex gap-4 w-full ${msg.sender === "user" ? "justify-end" : "justify-start"} group`}
                    >
                      {/* AI Avatar */}
                      {msg.sender === "ai" && (
                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center shrink-0 mt-0.5 bg-white/5">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}

                      {/* Chat Bubble Container */}
                      <div className={`relative ${msg.sender === "user" ? "max-w-[70%]" : "max-w-[85%] flex-1"}`}>
                        {msg.sender === "user" ? (
                          <div className="bg-[#2f2f2f] text-white px-5 py-3 rounded-3xl rounded-tr-md flex flex-col gap-3">
                            <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            {msg.pdf && (
                              <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                  {getAttachmentIcon(msg.pdf.label)}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-semibold text-white truncate">{msg.pdf.name}</h4>
                                  <p className="text-xs text-neutral-400 mt-0.5 font-medium">{msg.pdf.label ?? "PDF Document"} - {msg.pdf.size}</p>
                                </div>
                              </div>
                            )}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-col gap-2 mt-1">
                                {msg.attachments.map((file, idx) => (
                                  <div key={idx} className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                      {getAttachmentIcon(file.label)}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-semibold text-white truncate">{file.name}</h4>
                                      <p className="text-xs text-neutral-400 mt-0.5 font-medium">{file.label ?? "PDF Document"} - {file.size}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-white py-1 flex flex-col gap-3">
                            <p className="text-base leading-relaxed whitespace-pre-wrap font-sans text-neutral-200">{msg.text}</p>
                            
                            {msg.pdf && (
                              <div className="bg-[#171717] border border-white/10 rounded-xl p-3 flex items-center gap-3.5 hover:bg-[#202020] transition-colors group/pdf cursor-pointer max-w-sm mt-2">
                                <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center shrink-0">
                                  <FileText className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-white truncate">{msg.pdf.name}</h4>
                                  <p className="text-xs text-neutral-400 mt-0.5 font-medium">PDF Document • {msg.pdf.size}</p>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadPDF(msg.pdf!.name);
                                  }}
                                  disabled={downloadStates[msg.pdf.name] === "loading"}
                                  className="w-8 h-8 rounded-full hover:bg-white/10 active:scale-95 flex items-center justify-center shrink-0 transition-colors text-white ml-1 cursor-pointer"
                                >
                                  {downloadStates[msg.pdf.name] === "loading" ? (
                                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : downloadStates[msg.pdf.name] === "done" ? (
                                    <Check className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        {msg.sender === "ai" && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 mt-2">
                            <button 
                              onClick={() => copyToClipboard(msg.text, msg.id)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
                              title="Copy Answer"
                            >
                              {copiedMessageId === msg.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <button 
                              onClick={() => toggleBookmarkMessage(msg.id)}
                              className={`p-1.5 rounded-lg hover:bg-white/10 transition-all cursor-pointer ${
                                msg.isSaved ? "text-amber-400" : "text-neutral-400 hover:text-white"
                              }`}
                              title={msg.isSaved ? "Starred" : "Star Answer"}
                            >
                              <Star className={`h-4 w-4 ${msg.isSaved ? "fill-amber-400 text-amber-400" : ""}`} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Thinking Checkpoints List */}
                  {isTyping && (
                    <div className="flex flex-col items-start w-full">
                      <div className="flex items-center gap-2 mb-1.5 select-none">
                        <div className="w-6.5 h-6.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                          KalamBot AI
                        </span>
                      </div>
                      
                      <div className="bg-[#171421]/60 border border-white/5 p-4.5 rounded-2xl rounded-tl-sm w-[85%] max-w-md flex flex-col gap-2.5 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                          <span className="text-sm font-semibold text-white">Generating predictive report...</span>
                        </div>
                        <div className="space-y-2">
                          {thinkingSteps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs md:text-sm text-on-surface-variant animate-fadeIn">
                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="font-mono">{step}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 text-xs md:text-sm text-on-surface-variant/40">
                            <div className="h-3.5 w-3.5 flex items-center justify-center shrink-0">
                              <div className="h-2 w-2 border border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                            <span className="italic">Running statistics...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Fixed Input Form */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-6 px-4 md:px-8 z-20 pointer-events-none">
                  <div className="max-w-3xl mx-auto w-full relative pointer-events-auto">
                    <form onSubmit={handleSendMessage}>
                      {(attachedFiles.length > 0 || attachmentError) && (
                        <div className="mb-2 flex gap-2 justify-start max-w-full overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 pb-1">
                          {attachedFiles.map((file, idx) => (
                            <div key={idx} className="shrink-0 w-48 bg-[#2f2f2f] border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-2.5 shadow-lg shadow-black/20">
                              <div className="shrink-0 bg-white/5 p-1.5 rounded-lg">
                                {getAttachmentIcon(file.label, "h-4 w-4 text-white")}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                                <p className="text-[10px] text-neutral-400 truncate">{file.size}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttachedFile(idx)}
                                className="h-6 w-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer ml-auto"
                                title="Remove attachment"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          {attachmentError && (
                            <div className={`shrink-0 bg-error-container/30 border border-error/30 rounded-xl px-3 py-2 text-xs font-medium text-on-error-container flex items-center transition-opacity duration-500 ${isErrorFading ? "opacity-0" : "opacity-100"}`}>
                              {attachmentError}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="bg-[#2f2f2f] rounded-[24px] flex items-center p-1.5 shadow-lg shadow-black/40 focus-within:ring-1 focus-within:ring-white/20 transition-all">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept={ATTACHMENT_ACCEPT}
                          onChange={handleFileSelection}
                          className="hidden"
                        />
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-all shrink-0 cursor-pointer ml-1"
                          title="Attach file"
                        >
                          <Paperclip className="h-5 w-5" />
                        </button>
                        
                        <input 
                          type="text"
                          value={inputVal}
                          onChange={(e) => setInputVal(e.target.value)}
                          autoComplete="off"
                          className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder:text-neutral-400 text-[15px] px-2 font-sans" 
                          placeholder="Ask anything"
                        />
                        
                        <button 
                          type="submit"
                          disabled={(!inputVal.trim() && attachedFiles.length === 0) || isTyping}
                          className="w-9 h-9 mr-1 flex items-center justify-center rounded-full active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all shrink-0 cursor-pointer"
                        >
                          {isTyping ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <div className={`w-full h-full rounded-full flex items-center justify-center transition-colors ${(inputVal.trim() || attachedFiles.length > 0) ? "bg-white text-black" : "bg-[#424242] text-neutral-400"}`}>
                               <ArrowUp className="h-5 w-5 stroke-[2.5]" />
                            </div>
                          )}
                        </button>
                      </div>
                      
                      <div className="text-center mt-2.5">
                        <span className="text-[10px] text-neutral-500 font-medium tracking-wide">KalamBot AI can make mistakes. Check important info.</span>
                      </div>
                    </form>
                  </div>
                </div>

              </div>



            </div>
          )}

          {/* VIEW: Saved Subjects List */}
          {activeTab === "saved" && (
            <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 max-w-5xl mx-auto w-full relative z-10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white">Your Saved Subject Dashboard</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Subjects saved to your primary academic analysis pipeline.</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
                  <input 
                    type="text" 
                    value={savedFilter}
                    onChange={(e) => setSavedFilter(e.target.value)}
                    placeholder="Search saved subjects..."
                    className="w-full bg-[#1c1924] border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary/50 text-white placeholder:text-on-surface-variant/40"
                  />
                </div>
              </div>

              {filteredSaved.length === 0 ? (
                <div className="glass-panel border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                  <Bookmark className="h-10 w-10 text-on-surface-variant/50 mb-3" />
                  <h4 className="text-sm font-semibold text-white">No matches found</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Try resetting the filter or bookmark a subject from the home screen.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSaved.map((sub) => (
                    <div 
                      key={sub.code}
                      onClick={() => selectSubject(sub.code)}
                      className="glass-panel border-white/5 hover:border-primary/40 rounded-2xl p-5 hover:scale-[1.02] cursor-pointer transition-all duration-200 flex flex-col relative overflow-hidden group hover:shadow-lg hover:shadow-primary/5"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white font-mono text-xs font-bold shadow-md shadow-primary/20">
                          {sub.code.substring(0, 3)}
                        </div>
                        <span className="text-[10px] font-mono text-primary font-bold px-2 py-0.5 bg-primary/10 rounded-full border border-primary/25">
                          {sub.recurrenceRate}% repetition
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                        {sub.name}
                      </h4>
                      <p className="text-xs text-on-surface-variant font-mono mt-1 pr-1">{sub.code}</p>

                      <div className="border-t border-white/5 mt-6 pt-4 flex items-center justify-between text-[10px] text-on-surface-variant font-medium">
                        <span>Analyzed {sub.lastAnalyzed}</span>
                        <span className="flex items-center gap-1 text-primary">
                          Open workspace <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: Favorites Panel */}
          {activeTab === "favorites" && (
            <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 max-w-4xl mx-auto w-full relative z-10">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white">Starred Insights</h3>
                <p className="text-xs text-on-surface-variant mt-1">Starred questions, priority notes, or AI summaries for review.</p>
              </div>

              {starredMessages.length === 0 ? (
                <div className="glass-panel border-white/5 rounded-2xl p-16 text-center flex flex-col items-center justify-center">
                  <Star className="h-10 w-10 text-on-surface-variant/40 mb-3" />
                  <h4 className="text-sm font-semibold text-white">No starred items yet</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Hover over an AI answer in the workspace and click the star button to save key info here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {starredMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      className="glass-panel border-white/5 rounded-2xl p-5 relative group/fav"
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                          <Bot className="h-3.5 w-3.5" /> Saved Response
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => copyToClipboard(msg.text, msg.id)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors cursor-pointer"
                            title="Copy text"
                          >
                            {copiedMessageId === msg.id ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                          <button 
                            onClick={() => toggleBookmarkMessage(msg.id)}
                            className="p-1 rounded bg-white/5 hover:bg-amber-400/20 text-amber-400 transition-colors cursor-pointer"
                            title="Remove Star"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-on-surface/90 whitespace-pre-wrap font-sans">
                        {msg.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
