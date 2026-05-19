"use client";

import * as React from "react";
import { useActionState } from "react";
import { Camera, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadProfilePhoto, uploadProfileCv, removeProfileCv, type ProfileFormState } from "./actions";

const INITIAL: ProfileFormState = { ok: true };

/**
 * Profile photo uploader. Shows the current avatar (or initials fallback),
 * a file picker, and relays success/failure through a sonner toast.
 *
 * When `targetUserId` is passed (admin usage), the upload targets that
 * user instead of `self` — the server action enforces ADMIN for that
 * cross-user write.
 */
export function ProfilePhotoUploader({
  targetUserId,
  currentPhotoUrl,
  fallback,
  label = "Profil fotoğrafı",
}: {
  targetUserId?: string;
  currentPhotoUrl: string | null;
  fallback: string;
  label?: string;
}) {
  const [state, action, pending] = useActionState(uploadProfilePhoto, INITIAL);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (pending) return;
    if (state.message) {
      if (state.ok) {
        toast.success(state.message);
        formRef.current?.reset();
      } else {
        toast.error(state.message);
      }
    }
  }, [state, pending]);

  return (
    <form ref={formRef} action={action} className="flex items-start gap-4">
      {targetUserId ? <input type="hidden" name="userId" value={targetUserId} /> : null}
      <div
        className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-2xl font-semibold text-muted-foreground shadow-sm ring-4 ring-background sm:h-36 sm:w-36"
      >
        {currentPhotoUrl ? (
          // Intentional <img>: storage URL is private, unknown dimensions;
          // next/image would add build-time constraints that we don't need.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentPhotoUrl}
            alt={label}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          fallback
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label className="text-sm font-medium">{label}</label>
        <p className="text-[11px] text-muted-foreground">
          JPEG, PNG veya WebP · en fazla 5 MB
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            required
            disabled={pending}
            className="max-w-xs cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Yükleniyor…
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5" />
                Yükle
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * CV uploader / remover. When a CV already exists, a download link + a
 * remove button are shown. Uploading replaces the previous file.
 */
export function CvUploader({
  targetUserId,
  hasCv,
  cvOriginalName,
  viewerIsSelf,
}: {
  targetUserId?: string;
  hasCv: boolean;
  cvOriginalName: string | null;
  /** Viewer's id matches the user whose CV is shown — controls download visibility. */
  viewerIsSelf: boolean;
}) {
  const [state, action, pending] = useActionState(uploadProfileCv, INITIAL);
  const [removing, startRemove] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  // The download link works from admin pages too (admin is allowed),
  // and from self. In any other read context we omit the link — but this
  // component is only rendered on profil or admin user-edit pages.
  const showDownload = hasCv && viewerIsSelf;

  React.useEffect(() => {
    if (pending) return;
    if (state.message) {
      if (state.ok) {
        toast.success(state.message);
        formRef.current?.reset();
      } else {
        toast.error(state.message);
      }
    }
  }, [state, pending]);

  return (
    <div className="space-y-3">
      {hasCv ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="min-w-0 truncate">{cvOriginalName ?? "CV yüklenmiş"}</span>
          {showDownload ? (
            <a
              href={`/api/profil/cv/${targetUserId ?? ""}`}
              className="ml-auto text-xs text-primary hover:underline"
            >
              İndir
            </a>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={
              "h-auto px-2 py-1 text-destructive hover:text-destructive" +
              (showDownload ? "" : " ml-auto")
            }
            disabled={removing}
            onClick={() => {
              startRemove(async () => {
                try {
                  await removeProfileCv(targetUserId);
                  toast.success("CV kaldırıldı.");
                } catch {
                  toast.error("CV kaldırılamadı.");
                }
              });
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Kaldır
          </Button>
        </div>
      ) : null}

      <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
        {targetUserId ? <input type="hidden" name="userId" value={targetUserId} /> : null}
        <Input
          type="file"
          name="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          disabled={pending}
          className="max-w-xs cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Yükleniyor…
            </>
          ) : hasCv ? (
            "Değiştir"
          ) : (
            "CV Yükle"
          )}
        </Button>
      </form>
      <p className="text-[11px] text-muted-foreground">
        PDF veya Word · en fazla 10 MB
      </p>
    </div>
  );
}
