import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Bookmark, 
  History, 
  Star, 
  Paperclip, 
  FileUp,
  Send, 
  Download, 
  FileText, 
  ImageIcon,
  Bot, 
  Menu, 
  X,
  ArrowLeft,
  Copy,
  Check,
  TrendingUp,
  BookOpen,
  Calendar,
  Sparkles,
  ArrowUpRight,
  BookmarkCheck
} from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  const initialSubject = searchParams.get("subject") || "";

  // Try matching subject code or default to CST302
  const parsedCode = initialSubject.trim().toUpperCase();
  const matchedCode = Object.keys(SUBJECT_DATABASE).find(
    code => code === parsedCode || SUBJECT_DATABASE[code].name.toUpperCase().includes(parsedCode)
  ) || "CST302";

  const currentSubjectInfo = SUBJECT_DATABASE[matchedCode];

  const [activeTab, setActiveTab] = useState<"analyses" | "saved" | "favorites">("analyses");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSubjectCode, setCurrentSubjectCode] = useState(matchedCode);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "user",
      text: `Can you find the PYQs and key topics for ${currentSubjectInfo.name}?`
    },
    {
      id: "2",
      sender: "ai",
      text: `I've analyzed the KTU examination database for **${currentSubjectInfo.name} (${currentSubjectCode})**. Historically, this course exhibits a **${currentSubjectInfo.recurrenceRate}% topic repetition rate** across core questions.

Here is the parsed question paper vault and the high-priority exam topics. Ask me anything about specific sub-units, derivations, or problem-solving templates!`,
      pdf: {
        name: currentSubjectInfo.pdfs[0].name,
        size: currentSubjectInfo.pdfs[0].size,
        label: "PDF Document"
      }
    }
  ]);

  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<Message["pdf"] | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Download simulation state map
  const [downloadStates, setDownloadStates] = useState<Record<string, "idle" | "loading" | "done">>({});

  // Saved Subjects state
  const [savedSubjects, setSavedSubjects] = useState<SavedSubject[]>([
    { code: "CST302", name: "Operating Systems", recurrenceRate: 87, lastAnalyzed: "10 mins ago", color: "from-blue-600 to-indigo-600", topicsCount: 5 },
    { code: "CST304", name: "Database Management Systems", recurrenceRate: 82, lastAnalyzed: "1 hour ago", color: "from-indigo-600 to-purple-600", topicsCount: 5 },
    { code: "CST306", name: "Computer Networks", recurrenceRate: 79, lastAnalyzed: "Yesterday", color: "from-blue-500 to-cyan-600", topicsCount: 5 }
  ]);
  const [savedFilter, setSavedFilter] = useState("");
  const [isSubjectBookmarked, setIsSubjectBookmarked] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, thinkingSteps]);

  // Handle switching subjects from right panel or saved list
  const selectSubject = (code: string) => {
    setCurrentSubjectCode(code);
    setIsSubjectBookmarked(savedSubjects.some(s => s.code === code));
    const subjectDetails = SUBJECT_DATABASE[code];
    setMessages([
      {
        id: "1",
        sender: "user",
        text: `Analyze ${subjectDetails.name} exam papers.`
      },
      {
        id: "2",
        sender: "ai",
        text: `Now viewing analysis for **${subjectDetails.name} (${code})**. I have populated the resources panel with the syllabus weights and exam papers.

I can help you review:
- **Part B high-mark derivations**
- **Numeric question templates** (e.g. page replacement calculation steps)
- **Unit-wise priority maps**`,
        pdf: {
          name: subjectDetails.pdfs[0].name,
          size: subjectDetails.pdfs[0].size,
          label: "PDF Document"
        }
      }
    ]);
    setActiveTab("analyses");
    setSidebarOpen(false);
  };

  const attachFile = (file?: File | null) => {
    setAttachmentError("");

    if (!file) return false;

    const attachment = createAttachmentMeta(file);

    if (!attachment) {
      setAttachedFile(null);
      setAttachmentError(ATTACHMENT_ERROR_MESSAGE);
      return false;
    }

    setAttachedFile(attachment);
    return true;
  };

  const attachFirstAllowedFile = (files?: FileList | File[] | null) => {
    const fileList = Array.from(files ?? []);

    if (fileList.length === 0) return false;

    const allowedFile = fileList.find(file => createAttachmentMeta(file));

    if (!allowedFile) {
      setAttachedFile(null);
      setAttachmentError(ATTACHMENT_ERROR_MESSAGE);
      return false;
    }

    return attachFile(allowedFile);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const didAttach = attachFirstAllowedFile(e.target.files);

    if (!didAttach) {
      e.target.value = "";
    }
  };

  const clearAttachedFile = () => {
    setAttachedFile(null);
    setAttachmentError("");

    if (fileInputRef.current) {
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
    attachFirstAllowedFile(e.dataTransfer.files);
  };

  useEffect(() => {
    const handleClipboardPaste = (e: ClipboardEvent) => {
      const pastedFiles = Array.from(e.clipboardData?.items ?? [])
        .filter(item => item.kind === "file")
        .map(item => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      if (pastedFiles.length === 0) return;

      e.preventDefault();
      attachFirstAllowedFile(pastedFiles);
    };

    window.addEventListener("paste", handleClipboardPaste);

    return () => {
      window.removeEventListener("paste", handleClipboardPaste);
    };
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputVal.trim();

    if (!trimmedInput && !attachedFile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: trimmedInput || `Attached ${attachedFile!.name}`,
      pdf: attachedFile ?? undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputVal("");
    clearAttachedFile();
    
    // Trigger Thinking Phase
    setIsTyping(true);
    setThinkingSteps([]);

    const steps = [
      "Querying the KTU Exam Archive database...",
      `Cross-referencing syllabus for ${SUBJECT_DATABASE[currentSubjectCode].name}...`,
      "Calculating historical weights & mark distributions...",
      "Formulating priority advice..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setThinkingSteps(prev => [...prev, steps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsTyping(false);
          setThinkingSteps([]);
          
          // Generate realistic answer based on keywords
          const userQuery = userMessage.text.toLowerCase();
          let responseText = `I have examined your request regarding **${SUBJECT_DATABASE[currentSubjectCode].name}**. Based on past patterns, the questions in this area generally focus on high-yield sections.`;
          
          if (userQuery.includes("synchronization") || userQuery.includes("semaphore") || userQuery.includes("critical")) {
            responseText = `For **Process Synchronization** (highly recurring at **95%** rate):
1. **Classical Synchronization Problems**: Ensure you practice the Producer-Consumer problem and Readers-Writers problem using Semaphores. One of these is extremely common in Part B (14 Marks).
2. **Peterson's Solution**: Be prepared to explain the hardware support for mutual exclusion (TestAndSet, Swap instructions).
3. **Dining Philosophers**: Learn the deadlock-free semaphore implementation.`;
          } else if (userQuery.includes("page") || userQuery.includes("replacement") || userQuery.includes("lru")) {
            responseText = `For **Page Replacement Algorithms** (recurring at **88%** rate):
- The exam frequently includes a 10 or 14-mark numerical problem asking you to trace **FIFO, LRU, and Optimal** page replacements for a given reference string (e.g., 7, 0, 1, 2, 0, 3...).
- *Tip*: Always compute the page fault ratio accurately and show the frame transitions in a neat grid. Optimal replacement always provides the lowest page fault count.`;
          } else if (userQuery.includes("pdf") || userQuery.includes("paper") || userQuery.includes("2023")) {
            responseText = `I have updated the **PYQ Vault** panel on the right with the direct download links for the question papers. You can click on the download button to save the PDF. Let me know if you want me to solve any specific questions from the 2023 paper!`;
          } else if (userQuery.includes("deadlock") || userQuery.includes("banker")) {
            responseText = `For **Deadlocks** (recurring at **74%** rate):
1. **Banker's Algorithm**: Expect a numerical question where you must prove safety and check if a specific process request can be granted immediately.
2. **Resource Allocation Graph (RAG)**: Be ready to draw and explain how loops indicate deadlocks in single-instance resources.
3. **Deadlock Prevention vs Avoidance**: Standard 6-mark theory question detailing the four necessary conditions (Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait).`;
          }

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: responseText
          };
          setMessages(prev => [...prev, aiMessage]);
        }, 800);
      }
    }, 1000);
  };

  const handleDownloadPDF = (fileName: string) => {
    setDownloadStates(prev => ({ ...prev, [fileName]: "loading" }));
    
    // Simulate progress
    setTimeout(() => {
      setDownloadStates(prev => ({ ...prev, [fileName]: "done" }));
      setTimeout(() => {
        // Reset to idle after displaying success check
        setDownloadStates(prev => ({ ...prev, [fileName]: "idle" }));
        alert(`Finished downloading ${fileName}`);
      }, 1500);
    }, 2000);
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

  const toggleSubjectBookmark = () => {
    if (isSubjectBookmarked) {
      setSavedSubjects(prev => prev.filter(s => s.code !== currentSubjectCode));
    } else {
      const info = SUBJECT_DATABASE[currentSubjectCode];
      setSavedSubjects(prev => [
        ...prev,
        {
          code: currentSubjectCode,
          name: info.name,
          recurrenceRate: info.recurrenceRate,
          lastAnalyzed: "Just now",
          color: "from-blue-600 to-indigo-600",
          topicsCount: info.topics.length
        }
      ]);
    }
    setIsSubjectBookmarked(!isSubjectBookmarked);
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
      className="bg-surface text-on-surface h-screen max-h-screen overflow-hidden flex font-sans mesh-bg antialiased relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="grid-overlay" />
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
      <aside className={`flex flex-col h-full py-6 bg-surface-container-low/95 backdrop-blur-xl border-r border-white/5 shrink-0 z-40 fixed md:sticky top-0 transition-transform duration-300 w-64 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div className="px-6 mb-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-on-surface select-none">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center shadow-md shadow-primary/25">
                <Bookmark className="h-4.5 w-4.5 text-on-primary-container" />
              </div>
              <span className="text-white">KalamBot</span>
            </div>
            <p className="text-[10px] text-on-surface-variant font-medium tracking-wide mt-1 select-none">
              Academic Dashboard
            </p>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex-grow overflow-y-auto px-3 space-y-1">
          <button 
            onClick={() => { setActiveTab("analyses"); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "analyses"
                ? "bg-primary-container/20 border border-primary/20 text-white font-semibold"
                : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
            }`}
          >
            <History className="h-4.5 w-4.5" />
            <span className="text-sm">Recent Analyses</span>
          </button>
          <button 
            onClick={() => { setActiveTab("saved"); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "saved"
                ? "bg-primary-container/20 border border-primary/20 text-white font-semibold"
                : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
            }`}
          >
            <BookOpen className="h-4.5 w-4.5" />
            <span className="text-sm">Saved Subjects</span>
            {savedSubjects.length > 0 && (
              <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                {savedSubjects.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => { setActiveTab("favorites"); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === "favorites"
                ? "bg-primary-container/20 border border-primary/20 text-white font-semibold"
                : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
            }`}
          >
            <Star className="h-4.5 w-4.5" />
            <span className="text-sm">Favorites</span>
            {starredMessages.length > 0 && (
              <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                {starredMessages.length}
              </span>
            )}
          </button>
        </div>

        <div className="px-3 mt-auto border-t border-white/5 pt-4">
          <button 
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            <span className="text-sm">Back to Home</span>
          </button>         
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-screen max-h-screen overflow-hidden">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-8 h-18 border-b border-white/5 bg-surface/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-on-surface-variant hover:text-on-surface p-1.5 rounded-lg hover:bg-white/5 transition-colors mr-1"
            >
              <Menu className="h-5 w-5" />
            </button>
            {activeTab === "analyses" ? (
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <span>{currentSubjectInfo.name}</span>
                  <span className="text-xs md:text-sm px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20 font-mono">
                    {currentSubjectCode}
                  </span>
                </h2>
                <p className="text-xs md:text-sm text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Exam predictive index loaded
                </p>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-white capitalize">
                {activeTab === "saved" ? "Saved Subjects" : "Bookmarked Insights"}
              </h2>
            )}
          </div>

          {activeTab === "analyses" && (
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleSubjectBookmark}
                className={`p-2 rounded-xl border border-white/5 transition-all cursor-pointer flex items-center gap-2 text-xs font-semibold ${
                  isSubjectBookmarked 
                    ? "bg-primary/20 border-primary/30 text-white" 
                    : "bg-[#1c1924] text-on-surface-variant hover:text-on-surface hover:bg-[#252130]"
                }`}
                title={isSubjectBookmarked ? "Remove from dashboard" : "Pin to dashboard"}
              >
                {isSubjectBookmarked ? <BookmarkCheck className="h-4.5 w-4.5 text-primary" /> : <Bookmark className="h-4.5 w-4.5" />}
                <span className="hidden sm:inline">{isSubjectBookmarked ? "Saved" : "Save Subject"}</span>
              </button>
            </div>
          )}
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
                      className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} w-full group`}
                    >
                      {/* Meta header for AI response */}
                      {msg.sender === "ai" && (
                        <div className="flex items-center gap-2 mb-1.5 select-none">
                          <div className="w-6.5 h-6.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Bot className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                            KalamBot AI
                          </span>
                        </div>
                      )}

                      {/* Chat Bubble Container */}
                      <div className="relative max-w-[85%]">
                        {msg.sender === "user" ? (
                          <div className="bg-[#1c1c28] border border-white/5 text-on-surface px-4.5 py-3 rounded-2xl rounded-tr-sm shadow-md flex flex-col gap-3">
                            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            {msg.pdf && (
                              <div className="bg-[#100d17]/70 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                  {getAttachmentIcon(msg.pdf.label)}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-semibold text-white truncate">{msg.pdf.name}</h4>
                                  <p className="text-xs text-on-surface-variant mt-0.5 font-medium">{msg.pdf.label ?? "PDF Document"} - {msg.pdf.size}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-[#171421]/60 border border-white/5 text-on-surface p-4 rounded-2xl rounded-tl-sm shadow-md backdrop-blur-sm flex flex-col gap-3">
                            <p className="text-sm md:text-base leading-relaxed text-on-surface/90 whitespace-pre-wrap font-sans">{msg.text}</p>
                            
                            {msg.pdf && (
                              <div className="bg-[#100d17] border border-white/5 rounded-xl p-3.5 flex items-center gap-3.5 hover:border-primary/45 transition-all duration-200 group/pdf cursor-pointer">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover/pdf:bg-primary/15 transition-colors">
                                  <FileText className="h-5 w-5 text-on-surface-variant group-hover/pdf:text-primary transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-white truncate">{msg.pdf.name}</h4>
                                  <p className="text-xs text-on-surface-variant mt-0.5 font-medium">PDF Document • {msg.pdf.size}</p>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadPDF(msg.pdf!.name);
                                  }}
                                  disabled={downloadStates[msg.pdf.name] === "loading"}
                                  className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 active:scale-95 flex items-center justify-center shrink-0 transition-colors text-primary ml-1 cursor-pointer"
                                >
                                  {downloadStates[msg.pdf.name] === "loading" ? (
                                    <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

                        {/* Action buttons (only for AI answers, hidden by default, shown on hover) */}
                        {msg.sender === "ai" && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 mt-1.5 ml-2">
                            <button 
                              onClick={() => copyToClipboard(msg.text, msg.id)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-all cursor-pointer"
                              title="Copy Answer"
                            >
                              {copiedMessageId === msg.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <button 
                              onClick={() => toggleBookmarkMessage(msg.id)}
                              className={`p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer ${
                                msg.isSaved ? "text-amber-400" : "text-on-surface-variant hover:text-white"
                              }`}
                              title={msg.isSaved ? "Starred" : "Star Answer"}
                            >
                              <Star className={`h-3.5 w-3.5 ${msg.isSaved ? "fill-amber-400 text-amber-400" : ""}`} />
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
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface via-surface/95 to-transparent pt-6 pb-9 px-6 md:px-8 z-20">
                  <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto w-full relative">
                    {(attachedFile || attachmentError) && (
                      <div className="mb-2 flex justify-start">
                        {attachedFile ? (
                          <div className="max-w-full bg-[#1c1924] border border-primary/25 rounded-xl px-3 py-2 flex items-center gap-3 shadow-lg shadow-black/20">
                            {getAttachmentIcon(attachedFile.label, "h-4.5 w-4.5 text-primary shrink-0")}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{attachedFile.name}</p>
                              <p className="text-[11px] text-on-surface-variant">{attachedFile.label} - {attachedFile.size}</p>
                            </div>
                            <button
                              type="button"
                              onClick={clearAttachedFile}
                              className="p-1 rounded-full text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                              title="Remove attachment"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="bg-error-container/30 border border-error/30 rounded-xl px-3 py-2 text-xs font-medium text-on-error-container">
                            {attachmentError}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="bg-[#211e27] rounded-full border border-white/10 flex items-center p-2.5 shadow-lg shadow-black/30 backdrop-blur-md focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ATTACHMENT_ACCEPT}
                        onChange={handleFileSelection}
                        className="hidden"
                      />
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-white/5 transition-all shrink-0 cursor-pointer"
                        title="Attach file"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      
                      <input 
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        autoComplete="off"
                        className="flex-1 bg-transparent border-none focus:outline-none text-on-surface placeholder:text-on-surface-variant/40 text-base md:text-[17px] px-3 font-sans" 
                        placeholder={`Ask anything about ${currentSubjectInfo.name} exams...`}
                      />
                      
                      <button 
                        type="submit"
                        disabled={(!inputVal.trim() && !attachedFile) || isTyping}
                        className="bg-primary text-white font-semibold text-sm px-6 py-3 rounded-full hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0 ml-1 cursor-pointer shadow-md shadow-primary/25"
                      >
                        <span>Ask AI</span>
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </form>
                </div>

              </div>

              {/* Subject Insights Panel (Desktop Sidebar) */}
              <div className="hidden lg:flex w-80 border-l border-white/5 bg-surface-container-lowest/50 backdrop-blur-md flex-col overflow-y-auto p-6 scrollbar-none z-10">
                <div className="space-y-6">
                  
                  {/* Gauge widget */}
                  <div className="bg-[#1c1924] border border-white/5 rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" /> Topic Recurrence
                    </span>

                    <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle 
                          cx="64" cy="64" r="54" 
                          stroke="rgba(255,255,255,0.03)" 
                          strokeWidth="8" 
                          fill="transparent" 
                        />
                        <circle 
                          cx="64" cy="64" r="54" 
                          stroke="#0C3BEB" 
                          strokeWidth="8" 
                          fill="transparent" 
                          strokeDasharray={2 * Math.PI * 54}
                          strokeDashoffset={2 * Math.PI * 54 * (1 - currentSubjectInfo.recurrenceRate / 100)}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-3xl font-extrabold text-white font-mono">{currentSubjectInfo.recurrenceRate}%</span>
                        <span className="text-[9px] text-primary font-bold uppercase tracking-widest mt-0.5">Match</span>
                      </div>
                    </div>

                    <p className="text-sm font-bold text-white mt-1.5">Predictive Index</p>
                    <p className="text-xs text-on-surface-variant max-w-[200px] leading-relaxed mt-0.5">
                      Questions have high repeat patterns in regular schedules.
                    </p>
                  </div>

                  {/* PYQ Downloads List */}
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 select-none flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" /> Past Year Papers
                    </h3>
                    <div className="space-y-2">
                      {currentSubjectInfo.pdfs.map((pdf) => (
                        <div 
                          key={pdf.name}
                          onClick={() => handleDownloadPDF(pdf.name)}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-[#1c1924] border border-white/5 hover:border-primary/40 hover:bg-[#23202e] transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                              <FileText className="h-4 w-4 text-on-surface-variant group-hover:text-primary transition-colors" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{pdf.year} Paper</h4>
                              <p className="text-xs text-on-surface-variant font-medium mt-0.5">{pdf.size}</p>
                            </div>
                          </div>
                          <button 
                            disabled={downloadStates[pdf.name] === "loading"}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-on-surface-variant hover:text-white transition-colors cursor-pointer shrink-0"
                          >
                            {downloadStates[pdf.name] === "loading" ? (
                              <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : downloadStates[pdf.name] === "done" ? (
                              <Check className="h-3.5 w-3.5 text-green-400" />
                            ) : (
                              <Download className="h-3.5 w-3.5 text-on-surface-variant group-hover:text-primary" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hot Focus Areas */}
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 select-none flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> High Priority Focus
                    </h3>
                    <div className="space-y-3">
                      {currentSubjectInfo.topics.map((topic) => (
                        <div 
                          key={topic.name}
                          onClick={() => {
                            setInputVal(`Tell me about exam questions for: ${topic.name}`);
                          }}
                          className="bg-[#1c1924] border border-white/5 hover:border-primary/30 p-3.5 rounded-xl hover:bg-[#23202e] cursor-pointer transition-all group"
                        >
                          <div className="flex justify-between items-center text-sm font-semibold mb-1">
                            <span className="text-white truncate group-hover:text-primary transition-colors pr-2">{topic.name}</span>
                            <span className="text-primary font-mono shrink-0">{topic.weight}%</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-1.5">
                            <div 
                              className="bg-primary h-full rounded-full transition-all duration-1000"
                              style={{ width: `${topic.weight}%` }}
                            />
                          </div>

                          <p className="text-xs text-on-surface-variant/80 line-clamp-2 leading-relaxed">
                            {topic.desc}
                          </p>
                        </div>
                      ))}
                    </div>
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
