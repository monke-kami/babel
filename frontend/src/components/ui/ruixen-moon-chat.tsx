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
  const [attachedFile, setAttachedFile] = useState<AttachmentMeta | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

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
    attachFirstAllowedFile(e.dataTransfer.files);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();

    if ((!trimmedMessage && !attachedFile) || isSearching) return;
    if (onSearchSubmit) {
      onSearchSubmit(trimmedMessage || `Attached ${attachedFile!.name}`);
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
          {(attachedFile || attachmentError) && (
            <div className="border-b border-neutral-800/70 px-3 py-2">
              {attachedFile ? (
                <div className="max-w-full rounded-lg border border-blue-500/30 bg-neutral-950/80 px-3 py-2 flex items-center gap-3">
                  {getAttachmentIcon(attachedFile.label)}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{attachedFile.name}</p>
                    <p className="text-[11px] text-neutral-400">{attachedFile.label} - {attachedFile.size}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearAttachedFile}
                    className="ml-auto h-7 w-7 shrink-0 rounded-full text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    title="Remove attachment"
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
              ref={fileInputRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              onChange={handleFileSelection}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-white hover:bg-neutral-800"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Button
                disabled={(!message.trim() && !attachedFile) || isSearching}
                onClick={handleSend}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                  ((!message.trim() && !attachedFile) || isSearching)
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
