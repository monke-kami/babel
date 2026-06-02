"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  const [attachedPdf, setAttachedPdf] = useState<{ name: string; size: string } | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePdfSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setAttachmentError("");

    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setAttachedPdf(null);
      setAttachmentError("Only PDF files can be attached.");
      e.target.value = "";
      return;
    }

    setAttachedPdf({
      name: file.name,
      size: formatFileSize(file.size),
    });
  };

  const clearAttachedPdf = () => {
    setAttachedPdf(null);
    setAttachmentError("");

    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();

    if ((!trimmedMessage && !attachedPdf) || isSearching) return;
    if (onSearchSubmit) {
      onSearchSubmit(trimmedMessage || `Attached ${attachedPdf!.name}`);
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
      style={{
        backgroundImage:
          "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png')",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Deep dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-[#0d0a14]/60 to-[#0a070f] z-0 pointer-events-none" />

      {/* Centered AI Title */}
      <div className="flex-1 w-full flex flex-col items-center justify-end pb-8 px-4 z-10">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white drop-shadow-xl tracking-tight select-none bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="mt-4 text-base md:text-lg lg:text-xl text-neutral-300 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed font-normal">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Input Box Section */}
      <div className="w-full max-w-3xl mb-[20vh] px-4 z-10">
        <div className="relative bg-black/60 backdrop-blur-md rounded-xl border border-neutral-700 shadow-2xl">
          {(attachedPdf || attachmentError) && (
            <div className="border-b border-neutral-800/70 px-3 py-2">
              {attachedPdf ? (
                <div className="max-w-full rounded-lg border border-blue-500/30 bg-neutral-950/80 px-3 py-2 flex items-center gap-3">
                  <FileText className="h-4.5 w-4.5 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{attachedPdf.name}</p>
                    <p className="text-[11px] text-neutral-400">PDF Document - {attachedPdf.size}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearAttachedPdf}
                    className="ml-auto h-7 w-7 shrink-0 rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    title="Remove PDF"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-red-400/30 bg-red-950/35 px-3 py-2 text-xs font-medium text-red-100">
                  {attachmentError}
                </div>
              )}
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "w-full px-4 py-3 resize-none border-none",
              "bg-transparent text-white text-sm",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-neutral-400 min-h-[48px]"
            )}
            style={{ overflow: "hidden" }}
          />

          {/* Footer Buttons */}
          <div className="flex items-center justify-between p-3 border-t border-neutral-800/50">
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handlePdfSelection}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="text-white hover:bg-neutral-800"
              title="Attach PDF"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Button
                disabled={(!message.trim() && !attachedPdf) || isSearching}
                onClick={handleSend}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                  ((!message.trim() && !attachedPdf) || isSearching)
                    ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                    : "bg-white text-black hover:bg-neutral-200"
                )}
              >
                {isSearching ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowUpIcon className="w-4 h-4" />
                )}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center flex-wrap gap-3 mt-6">
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
