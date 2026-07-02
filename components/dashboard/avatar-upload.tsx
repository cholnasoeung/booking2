"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toastSuccess, toastError } from "@/lib/utils/swal";

type EntityType = "user" | "employee" | "driver";

type AvatarUploadProps = {
  entityType: EntityType;
  entityId: string;
  currentAvatar?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  onUploaded?: (url: string) => void;
};

const SIZE = {
  sm: { wrapper: "h-10 w-10", text: "text-sm", camera: "h-4 w-4 p-0.5" },
  md: { wrapper: "h-16 w-16", text: "text-lg", camera: "h-5 w-5 p-1" },
  lg: { wrapper: "h-24 w-24", text: "text-2xl", camera: "h-6 w-6 p-1" },
};

const GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-600",
  "from-sky-500 to-blue-600",
];

function nameToGradient(name: string) {
  const code = name.charCodeAt(0) || 0;
  return GRADIENTS[code % GRADIENTS.length];
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

export default function AvatarUpload({
  entityType,
  entityId,
  currentAvatar,
  name,
  size = "md",
  onUploaded,
}: AvatarUploadProps) {
  const [avatar, setAvatar] = useState<string | null>(currentAvatar ?? null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const s = SIZE[size];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", entityType);
      form.append("id", entityId);

      const res  = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok) {
        toastError(json.message ?? "Upload failed");
        return;
      }
      setAvatar(json.url);
      onUploaded?.(json.url);
      toastSuccess("Profile picture updated.");
    } catch {
      toastError("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <div
        className={`${s.wrapper} rounded-full overflow-hidden ring-2 ring-white shadow-md`}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${nameToGradient(name)} text-white font-bold ${s.text}`}
          >
            {initials(name)}
          </div>
        )}
      </div>

      {/* Camera overlay button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors disabled:opacity-60"
        title="Change profile picture"
      >
        {uploading
          ? <Loader2 className={`${s.camera} animate-spin`} />
          : <Camera className={s.camera} />
        }
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

// ── AvatarPicker ──────────────────────────────────────────────────────────────
// Like AvatarUpload but for Add forms: stores the file locally (no upload yet).
// Parent calls uploadAvatarFile(file, type, id) after entity is created.

type AvatarPickerProps = {
  name: string;
  file: File | null;
  onChange: (file: File) => void;
  size?: "sm" | "md" | "lg";
};

export function AvatarPicker({ name, file, onChange, size = "md" }: AvatarPickerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const s = SIZE[size];

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    onChange(f);
  };

  return (
    <div className="relative inline-block">
      <div className={`${s.wrapper} rounded-full overflow-hidden ring-2 ring-white shadow-md`}>
        {preview ? (
          <img src={preview} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${nameToGradient(name)} text-white font-bold ${s.text}`}>
            {initials(name)}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
        title="Add profile picture"
      >
        <Camera className={s.camera} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

export async function uploadAvatarFile(
  file: File,
  type: "user" | "employee" | "driver",
  id: string
): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("type", type);
  fd.append("id", id);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  if (!res.ok) return null;
  const json = await res.json();
  return json.url ?? null;
}
