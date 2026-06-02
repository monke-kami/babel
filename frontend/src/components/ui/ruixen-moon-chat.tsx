"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_ERROR_MESSAGE,
  createAttachmentMeta,
  hasDraggedFiles,
  type AttachmentMeta
} from "@/lib/attachments";
import {
  ImageIcon,
  FileUp,
  MonitorIcon,
  CircleUserRound,
  ArrowUpIcon,
  Paperclip,
  FileText,
  X,
  Code2,
  Palette,
  Layers,
  Rocket,
  Plus,
  Mic,
} from "lucide-react";

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`; // reset first
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

export interface RuixenMoonChatProps {
  onSearchSubmit?: (subject: string) => void;
  isSearching?: boolean;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  quickActions?: { icon: React.ReactNode; label: string; onClick?: () => void }[];
}

export default function RuixenMoonChat({
  onSearchSubmit,
  isSearching = false,
  title = "Ruixen AI",
  subtitle = "Build something amazing — just start typing below.",
  placeholder = "Type your request...",
  quickActions,
}: RuixenMoonChatProps) {
  const [message, setMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachmentMeta[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [isErrorFading, setIsErrorFading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

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

  const getAttachmentIcon = (label?: string, className = "h-4.5 w-4.5 text-blue-400 shrink-0") => {
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

  const handleSend = () => {
    const trimmedMessage = message.trim();

    if ((!trimmedMessage && attachedFiles.length === 0) || isSearching) return;
    if (onSearchSubmit) {
      const fileNames = attachedFiles.map(f => f.name).join(", ");
      onSearchSubmit(trimmedMessage || `Attached ${fileNames}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const defaultQuickActions: { icon: React.ReactNode; label: string; onClick?: () => void }[] = [
    { icon: <Code2 className="w-4 h-4" />, label: "Generate Code" },
    { icon: <Rocket className="w-4 h-4" />, label: "Launch App" },
    { icon: <Layers className="w-4 h-4" />, label: "UI Components" },
    { icon: <Palette className="w-4 h-4" />, label: "Theme Ideas" },
    { icon: <CircleUserRound className="w-4 h-4" />, label: "User Dashboard" },
    { icon: <MonitorIcon className="w-4 h-4" />, label: "Landing Page" },
    { icon: <FileUp className="w-4 h-4" />, label: "Upload Docs" },
    { icon: <ImageIcon className="w-4 h-4" />, label: "Image Assets" },
  ];

  const actionsToRender = quickActions || defaultQuickActions;

  return (
    <div
      className="relative w-full h-screen bg-cover bg-center flex flex-col items-center"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        backgroundImage:
          "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png')",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Deep dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-[#0d0a14]/60 to-[#0a070f] z-0 pointer-events-none" />
      {isDragActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xl px-6 pointer-events-none">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-blue-500/35 bg-neutral-950/95 p-6 text-center shadow-2xl shadow-black/60">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/15 shadow-lg shadow-blue-500/15">
              <FileUp className="h-7 w-7 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-white">Drop file to attach</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
              PDF, JPEG, PNG, and text files are supported.
            </p>
          </div>
        </div>
      )}

      {/* Centered AI Title */}
      <div className="flex-1 w-full flex flex-col items-center justify-end pb-8 px-4 z-10">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white drop-shadow-xl tracking-tight select-none bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent animate-fade-in-up [animation-delay:300ms]">
            {title}
          </h1>
          <p className="mt-4 text-base md:text-lg lg:text-xl text-neutral-300 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed font-normal animate-fade-in-up [animation-delay:1500ms]">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Input Box Section */}
      <div className="w-full max-w-3xl mb-[20vh] px-4 z-10 animate-fade-in-up [animation-delay:900ms]">
        <div className="flex flex-col gap-3">
          {(attachedFiles.length > 0 || attachmentError) && (
            <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-neutral-700/80 p-2 shadow-lg mx-auto w-full flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="shrink-0 w-48 rounded-xl border border-blue-500/30 bg-neutral-950/80 px-2.5 py-1.5 flex items-center gap-2.5">
                  <div className="shrink-0 bg-white/5 p-1.5 rounded-lg">
                    {getAttachmentIcon(file.label, "h-4 w-4 text-blue-400")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                    <p className="text-[10px] text-neutral-400 truncate">{file.size}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttachedFile(idx)}
                    className="h-6 w-6 shrink-0 rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer ml-auto"
                    title="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {attachmentError && (
                <div className={cn(
                  "shrink-0 rounded-xl border border-red-400/30 bg-red-950/35 px-3 py-2 text-xs font-medium text-red-100 flex items-center transition-opacity duration-500",
                  isErrorFading ? "opacity-0" : "opacity-100"
                )}>
                  {attachmentError}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center bg-black/60 backdrop-blur-md rounded-full border border-neutral-700/80 shadow-2xl px-2 py-2 w-full transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT}
              onChange={handleFileSelection}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-full w-11 h-11 shrink-0 ml-1 cursor-pointer"
              title="Attach file"
            >
              <Plus className="w-5 h-5" />
            </Button>
            
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={attachedFiles.length > 0 ? "Type your prompt" : placeholder}
              className="flex-1 bg-transparent border-none text-white text-base md:text-lg px-4 py-2 focus:outline-none placeholder:text-neutral-500 font-sans"
            />
            
            <div className="flex items-center gap-1.5 mr-1">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-full w-11 h-11 shrink-0 cursor-pointer hidden sm:flex"
                title="Voice input"
              >
                <Mic className="w-5 h-5" />
              </Button>
              <Button
                disabled={(!message.trim() && attachedFiles.length === 0) || isSearching}
                onClick={handleSend}
                className={cn(
                  "flex items-center justify-center rounded-full w-11 h-11 transition-all shrink-0 cursor-pointer shadow-md",
                  ((!message.trim() && attachedFiles.length === 0) || isSearching)
                    ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                    : "bg-white text-black hover:bg-neutral-200 hover:scale-105"
                )}
              >
                {isSearching ? (
                  <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowUpIcon className="w-5 h-5" />
                )}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center flex-wrap gap-3 mt-6 animate-fade-in-up [animation-delay:1200ms]">
          {actionsToRender.map((action, index) => (
            <QuickAction
              key={index}
              icon={action.icon}
              label={action.label}
              onClick={action.onClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function QuickAction({ icon, label, onClick }: QuickActionProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border-neutral-700 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-all cursor-pointer"
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}
