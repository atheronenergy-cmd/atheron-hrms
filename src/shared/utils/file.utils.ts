export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function isAllowedMimeType(mimeType: string, allowed: string[]): boolean {
  return allowed.some((type) => {
    if (type.endsWith("/*")) {
      return mimeType.startsWith(type.replace("/*", "/"));
    }
    return mimeType === type;
  });
}

export function buildStorageKey(companyId: string, category: string, entityId: string, filename: string): string {
  return `${companyId}/${category}/${entityId}/${filename}`;
}
