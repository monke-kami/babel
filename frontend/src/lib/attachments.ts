export type AttachmentMeta = {
  name: string;
  size: string;
  label: string;
};

export const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain"
];

export const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".txt"];

export const ATTACHMENT_ACCEPT = [
  ...ALLOWED_ATTACHMENT_TYPES,
  ...ALLOWED_ATTACHMENT_EXTENSIONS
].join(",");

export const ATTACHMENT_ERROR_MESSAGE = "Only PDF, JPEG, PNG, and text files can be attached.";

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAttachmentLabel(file: File) {
  const lowerName = file.name.toLowerCase();

  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "PDF Document";
  }

  if (file.type === "image/jpeg" || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    return "JPEG Image";
  }

  if (file.type === "image/png" || lowerName.endsWith(".png")) {
    return "PNG Image";
  }

  if (file.type === "text/plain" || lowerName.endsWith(".txt")) {
    return "Text File";
  }

  return null;
}

export function createAttachmentMeta(file: File): AttachmentMeta | null {
  const label = getAttachmentLabel(file);

  if (!label) return null;

  return {
    name: file.name,
    size: formatFileSize(file.size),
    label
  };
}

export function hasDraggedFiles(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) return false;

  return Array.from(dataTransfer.types).includes("Files");
}
