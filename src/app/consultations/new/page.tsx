"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { uploadMedicalFiles } from "@/lib/medicalFiles";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { SelectedLocalFilesList } from "@/features/consultations";
import { MedicalProfileSummaryCard } from "@/features/profile";

type Consultation = {
  id: number;
  question_text: string;
  status: "pending" | "completed";
  submitted_at: string;
  assignment_mode?: "queue" | "direct";
};

type CreateResponse = { consultation: Consultation };

type MedicalProfile = {
  height_cm: number | null;
  weight_kg: number | null;
  chronic_diseases: string | null;
  medical_history: string | null;
  allergies: string | null;
  current_medications: string | null;
};
type ProfileResponse = { profile: MedicalProfile };

type VerifiedPhysician = {
  id: number;
  user_id: number;
  specialty: string;
  user?: { id: number; name: string };
};

type Paginated<T> = { data: T[] };

export default function NewConsultationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
          جاري التحميل...
        </div>
      }
    >
      <NewConsultationContent />
    </Suspense>
  );
}

function NewConsultationContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "direct" ? "direct" : "queue";
  const initialPhysicianId = searchParams.get("physician_id");

  const { user } = useRequireAuth({ allowedRoles: ["patient"] });
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<"queue" | "direct">(initialMode);
  const [selectedPhysicianId, setSelectedPhysicianId] = useState<string>(
    initialPhysicianId ?? ""
  );
  const [physicians, setPhysicians] = useState<VerifiedPhysician[]>([]);

  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFileIds, setUploadedFileIds] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiFetch<ProfileResponse>(`/medical-profile`)
      .then((res) => {
        if (!mounted) return;
        if (!res.ok) return;
        setProfile(res.data.profile);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    apiFetch<Paginated<VerifiedPhysician>>("/verified-physicians")
      .then((res) => {
        if (!mounted) return;
        if (!res.ok) return;
        setPhysicians(res.data.data ?? []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const selectedPhysician = useMemo(
    () => physicians.find((p) => String(p.user?.id ?? "") === selectedPhysicianId),
    [physicians, selectedPhysicianId]
  );

  const canSubmit = useMemo(() => {
    if (text.trim().length < 10) return false;
    if (assignmentMode === "direct" && !selectedPhysicianId) return false;
    return true;
  }, [text, assignmentMode, selectedPhysicianId]);

  async function uploadSelectedFiles() {
    if (files.length === 0) return [];
    setUploading(true);
    setError(null);
    const res = await uploadMedicalFiles(files);
    setUploading(false);
    if (!res.ok) {
      setError(res.message);
      return [];
    }
    const ids = res.data.files.map((f) => f.id);
    setUploadedFileIds(ids);
    return ids;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const ids = await uploadSelectedFiles();
    if (files.length > 0 && ids.length === 0) {
      setLoading(false);
      return;
    }

    const res = await apiFetch<CreateResponse>("/consultations", {
      method: "POST",
      body: JSON.stringify({
        question_text: text,
        file_ids: ids.length ? ids : undefined,
        assignment_mode: assignmentMode,
        physician_id:
          assignmentMode === "direct" ? Number(selectedPhysicianId) : undefined,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }

    window.location.href = `/consultations/${res.data.consultation.id}`;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <AppHeader title="استشارة جديدة" backHref="/consultations" userRole={user?.role} />

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card>
          <CardBody className="p-6">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              اكتب تفاصيل الاستشارة
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              اختر إرسالاً عشوائياً عبر الطابور، أو حدّد طبيباً موثّقاً مباشرة.
            </p>

            <form className="mt-6 grid gap-4" onSubmit={submit}>
              {profile ? (
                <MedicalProfileSummaryCard profile={profile} editHref="/profile" />
              ) : null}

              <div className="grid gap-3 rounded-2xl border border-(--border) bg-(--surface-2) p-4">
                <div className="text-sm font-semibold text-foreground">طريقة الإرسال</div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-(--border) bg-(--surface) p-3">
                  <input
                    type="radio"
                    name="assignment_mode"
                    checked={assignmentMode === "queue"}
                    onChange={() => setAssignmentMode("queue")}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium">طابور عام (عشوائي)</span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      تُرسل الاستشارة لأي طبيب موثّق متاح، وتنتظر أول طبيب يستلمها.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-(--border) bg-(--surface) p-3">
                  <input
                    type="radio"
                    name="assignment_mode"
                    checked={assignmentMode === "direct"}
                    onChange={() => setAssignmentMode("direct")}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium">طبيب محدد</span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      اختر طبيباً موثّقاً لإرسال الاستشارة إليه مباشرة دون انتظار الطابور.
                    </span>
                  </span>
                </label>

                {assignmentMode === "direct" ? (
                  <div className="grid gap-2">
                    <select
                      value={selectedPhysicianId}
                      onChange={(e) => setSelectedPhysicianId(e.target.value)}
                      required
                      className="rounded-xl border border-(--border) bg-(--surface) px-3 py-2 text-sm"
                    >
                      <option value="">اختر طبيباً موثّقاً</option>
                      {physicians.map((p) => (
                        <option key={p.id} value={p.user?.id ?? ""}>
                          {p.user?.name} — {p.specialty}
                        </option>
                      ))}
                    </select>
                    <Link href="/physicians" className="text-xs font-medium text-(--gc-accent)">
                      تصفح جميع الأطباء الموثّقين
                    </Link>
                    {selectedPhysician ? (
                      <Alert variant="info">
                        سيتم إرسال الاستشارة مباشرة إلى {selectedPhysician.user?.name}.
                      </Alert>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  نص الاستشارة
                </span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  minLength={10}
                  required
                  className="rounded-xl border border-(--border) bg-(--surface) px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-(--ring) dark:text-zinc-50"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  ملفات مرفقة (اختياري)
                </span>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (!picked.length) return;
                    setFiles((prev) => [...prev, ...picked]);
                  }}
                  className="block w-full text-sm text-zinc-700 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-200 dark:text-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-50 dark:hover:file:bg-zinc-700"
                />
                {files.length ? (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    تم اختيار {files.length} ملف(ات)
                    {uploadedFileIds.length ? ` — تم رفع ${uploadedFileIds.length}` : ""}
                  </div>
                ) : null}
              </label>

              {files.length ? (
                <Card className="bg-white dark:bg-zinc-950">
                  <CardBody className="p-4 text-sm">
                    <div className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      الملفات المختارة
                    </div>
                    <SelectedLocalFilesList
                      files={files}
                      onRemoveAt={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    />
                  </CardBody>
                </Card>
              ) : null}

              {error ? <Alert variant="error">{error}</Alert> : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/consultations" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    رجوع
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading || uploading || !canSubmit}
                  className="w-full sm:w-auto"
                >
                  {uploading
                    ? "جاري رفع الملفات..."
                    : loading
                      ? "جاري الإرسال..."
                      : "إرسال الاستشارة"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </main>
    </div>
  );
}
