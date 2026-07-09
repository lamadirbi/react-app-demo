import type { ApiResult } from "@/lib/api";

type MockUser = {
  id: number;
  name: string;
  email: string;
  role: "patient" | "physician" | "admin";
  is_disabled?: boolean;
  physician_profile?: {
    id: number;
    specialty: string;
    certificate: string;
    verification_status: "pending" | "approved" | "rejected";
    rejection_reason?: string | null;
    certificate_files?: MockFile[];
  } | null;
};

type MockMedicalProfile = {
  id: number;
  user_id: number;
  height_cm: number | null;
  weight_kg: number | null;
  chronic_diseases: string;
  medical_history: string;
  allergies: string;
  current_medications: string;
};

type MockFile = {
  id: number;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  file_kind: string;
  created_at: string;
};

type MockConsultation = {
  id: number;
  patient_id: number;
  physician_id: number | null;
  question_text: string;
  status: "pending" | "completed";
  assignment_mode?: "queue" | "direct";
  submitted_at: string;
  responded_at?: string | null;
  physician_response?: string | null;
  medical_files: MockFile[];
};

type MockState = {
  users: MockUser[];
  medicalProfiles: MockMedicalProfile[];
  consultations: MockConsultation[];
  files: MockFile[];
  nextId: { user: number; profile: number; consultation: number; file: number };
};

const STORAGE_KEY = "gc_mock_state_v2";

function nowIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

function seedState(): MockState {
  const certFile: MockFile = {
    id: 1,
    original_name: "شهادة-تخصص.pdf",
    mime_type: "application/pdf",
    size_bytes: 245_000,
    file_kind: "pdf",
    created_at: nowIso(30),
  };

  const labFile: MockFile = {
    id: 2,
    original_name: "تحاليل-دم.pdf",
    mime_type: "application/pdf",
    size_bytes: 128_000,
    file_kind: "pdf",
    created_at: nowIso(5),
  };

  const xrayFile: MockFile = {
    id: 3,
    original_name: "أشعة-صدر.jpg",
    mime_type: "image/jpeg",
    size_bytes: 512_000,
    file_kind: "image",
    created_at: nowIso(5),
  };

  const pendingCert: MockFile = {
    id: 4,
    original_name: "شهادة-طب-أسرة.pdf",
    mime_type: "application/pdf",
    size_bytes: 198_000,
    file_kind: "pdf",
    created_at: nowIso(2),
  };

  return {
    users: [
      {
        id: 1,
        name: "سارة أحمد",
        email: "patient@demo.com",
        role: "patient",
      },
      {
        id: 2,
        name: "د. محمد الخالدي",
        email: "doctor@demo.com",
        role: "physician",
        physician_profile: {
          id: 1,
          specialty: "طب القلب",
          certificate: "البورد الأمريكي في أمراض القلب",
          verification_status: "approved",
          certificate_files: [certFile],
        },
      },
      {
        id: 3,
        name: "د. ليلى حسن",
        email: "doctor2@demo.com",
        role: "physician",
        physician_profile: {
          id: 2,
          specialty: "طب الأطفال",
          certificate: "تخصص طب أطفال — جامعة القاهرة",
          verification_status: "approved",
          certificate_files: [certFile],
        },
      },
      {
        id: 4,
        name: "د. عمر يوسف",
        email: "pending@demo.com",
        role: "physician",
        physician_profile: {
          id: 3,
          specialty: "طب الأسرة",
          certificate: "شهادة مزاولة المهنة",
          verification_status: "pending",
          certificate_files: [pendingCert],
        },
      },
      {
        id: 5,
        name: "مدير النظام",
        email: "admin@demo.com",
        role: "admin",
      },
    ],
    medicalProfiles: [
      {
        id: 1,
        user_id: 1,
        height_cm: 165,
        weight_kg: 62,
        chronic_diseases: "ضغط دم خفيف",
        medical_history: "لا عمليات جراحية سابقة",
        allergies: "البنسلين",
        current_medications: "أملوديبين 5mg يومياً",
      },
    ],
    consultations: [
      {
        id: 1,
        patient_id: 1,
        physician_id: 2,
        assignment_mode: "queue",
        question_text:
          "أعاني من صداع مستمر منذ أسبوعين مع دوخة خفيفة، خاصة عند الوقوف. هل يمكن مراجعة التحاليل المرفقة؟",
        status: "completed",
        submitted_at: nowIso(10),
        responded_at: nowIso(8),
        physician_response:
          "بعد مراجعة التحاليل والأعراض، يبدو أن الصداع مرتبط بارتفاع ضغط الدم الخفيف. أنصح بمتابعة قياس الضغط يومياً، والاستمرار على العلاج الحالي. إذا استمر الصداع أكثر من أسبوعين إضافية، يُفضّل زيارة طوارئ أو إعادة التقييم.",
        medical_files: [labFile, xrayFile],
      },
      {
        id: 2,
        patient_id: 1,
        physician_id: null,
        assignment_mode: "queue",
        question_text:
          "طفلي (5 سنوات) يعاني من سعال جاف منذ 4 أيام بدون حرارة. هل أحتاج مضاد حيوي؟",
        status: "pending",
        submitted_at: nowIso(1),
        medical_files: [],
      },
      {
        id: 3,
        patient_id: 1,
        physician_id: 2,
        assignment_mode: "queue",
        question_text: "أشعر بخفقان في القلب أحياناً بعد المجهود. هل هذا طبيعي مع ضغط الدم؟",
        status: "pending",
        submitted_at: nowIso(3),
        medical_files: [labFile],
      },
      {
        id: 4,
        patient_id: 1,
        physician_id: 2,
        assignment_mode: "direct",
        question_text:
          "أرسلت هذه الاستشارة مباشرة للدكتور محمد. أعاني من آلام في المفاصل منذ أسبوع.",
        status: "pending",
        submitted_at: nowIso(2),
        medical_files: [],
      },
    ],
    files: [certFile, labFile, xrayFile, pendingCert],
    nextId: { user: 10, profile: 10, consultation: 10, file: 10 },
  };
}

function loadState(): MockState {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    // ignore
  }
  const state = seedState();
  saveState(state);
  return state;
}

function saveState(state: MockState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getTokenUserId(): number | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("gc_token");
  if (!token) return null;
  const match = token.match(/^demo-(\d+)$/);
  if (match) return Number(match[1]);
  const state = loadState();
  const user = state.users.find((u) => `demo-${u.id}` === token);
  return user?.id ?? null;
}

function userPublic(u: MockUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    is_disabled: u.is_disabled ?? false,
    physician_profile: u.physician_profile
      ? {
          specialty: u.physician_profile.specialty,
          certificate: u.physician_profile.certificate,
          verification_status: u.physician_profile.verification_status,
          rejection_reason: u.physician_profile.rejection_reason ?? null,
        }
      : null,
  };
}

function patientOf(id: number, state: MockState) {
  const u = state.users.find((x) => x.id === id);
  return u ? { id: u.id, name: u.name, role: u.role } : null;
}

function physicianOf(id: number | null, state: MockState) {
  if (!id) return null;
  const u = state.users.find((x) => x.id === id);
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    physician_profile: u.physician_profile
      ? {
          specialty: u.physician_profile.specialty,
          certificate: u.physician_profile.certificate,
        }
      : null,
  };
}

function consultationListItem(c: MockConsultation, state: MockState) {
  const physician = physicianOf(c.physician_id, state);
  return {
    id: c.id,
    question_text: c.question_text,
    status: c.status,
    submitted_at: c.submitted_at,
    responded_at: c.responded_at ?? null,
    physician_response: c.physician_response ?? null,
    physician_id: c.physician_id,
    assignment_mode: c.assignment_mode ?? (c.physician_id ? "direct" : "queue"),
    physician: physician ? { id: physician.id, name: physician.name, role: physician.role } : null,
    patient: patientOf(c.patient_id, state),
  };
}

function consultationDetail(c: MockConsultation, state: MockState) {
  return {
    ...consultationListItem(c, state),
    physician: physicianOf(c.physician_id, state),
    medical_files: c.medical_files,
  };
}

function parseBody(options: RequestInit): Record<string, unknown> {
  if (!options.body) return {};
  if (typeof FormData !== "undefined" && options.body instanceof FormData) {
    const obj: Record<string, unknown> = {};
    options.body.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }
  try {
    return JSON.parse(options.body as string) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

function makePlaceholderBlob(file: MockFile): Blob {
  if (file.mime_type?.startsWith("image/")) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#e0f2f1" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="#0d9488" font-size="18" font-family="sans-serif">${file.original_name}</text></svg>`;
    return new Blob([svg], { type: "image/svg+xml" });
  }
  const text = `%PDF-1.4\n% Mock file: ${file.original_name}\n`;
  return new Blob([text], { type: "application/pdf" });
}

export async function mockApiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<ApiResult<T>> {
  await delay(200 + Math.random() * 200);

  const state = loadState();
  const method = (options.method ?? "GET").toUpperCase();
  const userId = getTokenUserId();
  const currentUser = userId ? state.users.find((u) => u.id === userId) : null;
  const body = parseBody(options);

  // ── Auth ──
  if (path === "/auth/login" && method === "POST") {
    const email = String(body.email ?? "").toLowerCase().trim();
    const user = state.users.find((u) => u.email === email);
    if (!user) {
      return { ok: false, message: "بيانات الدخول غير صحيحة.", status: 401 };
    }
    if (user.is_disabled) {
      return { ok: false, message: "الحساب معطّل.", status: 403 };
    }
  return {
      ok: true,
      data: { user: userPublic(user), token: `demo-${user.id}` } as T,
    };
  }

  if (path === "/auth/register" && method === "POST") {
    const email = String(body.email ?? "").toLowerCase().trim();
    if (state.users.some((u) => u.email === email)) {
      return { ok: false, message: "البريد الإلكتروني مستخدم مسبقاً.", status: 422 };
    }
    const role = String(body.role ?? "patient") as MockUser["role"];
    const newUser: MockUser = {
      id: state.nextId.user++,
      name: String(body.name ?? "مستخدم جديد"),
      email,
      role,
      physician_profile:
        role === "physician"
          ? {
              id: state.nextId.profile++,
              specialty: "",
              certificate: "",
              verification_status: "pending",
              certificate_files: [],
            }
          : null,
    };
    state.users.push(newUser);
    if (role === "patient") {
      state.medicalProfiles.push({
        id: state.nextId.profile++,
        user_id: newUser.id,
        height_cm: null,
        weight_kg: null,
        chronic_diseases: "",
        medical_history: "",
        allergies: "",
        current_medications: "",
      });
    }
    saveState(state);
    return {
      ok: true,
      data: { user: userPublic(newUser), token: `demo-${newUser.id}` } as T,
    };
  }

  if (path === "/auth/me" && method === "GET") {
    if (!currentUser) {
      return { ok: false, message: "غير مصرح.", status: 401 };
    }
    return { ok: true, data: { user: userPublic(currentUser) } as T };
  }

  // ── Medical profile ──
  if (path === "/medical-profile") {
    if (!currentUser || currentUser.role !== "patient") {
      return { ok: false, message: "غير مصرح.", status: 403 };
    }
    let profile = state.medicalProfiles.find((p) => p.user_id === currentUser.id);
    if (!profile) {
      profile = {
        id: state.nextId.profile++,
        user_id: currentUser.id,
        height_cm: null,
        weight_kg: null,
        chronic_diseases: "",
        medical_history: "",
        allergies: "",
        current_medications: "",
      };
      state.medicalProfiles.push(profile);
    }
    if (method === "GET") {
      return { ok: true, data: { profile } as T };
    }
    if (method === "PUT") {
      Object.assign(profile, {
        height_cm: body.height_cm ?? profile.height_cm,
        weight_kg: body.weight_kg ?? profile.weight_kg,
        chronic_diseases: body.chronic_diseases ?? profile.chronic_diseases,
        medical_history: body.medical_history ?? profile.medical_history,
        allergies: body.allergies ?? profile.allergies,
        current_medications: body.current_medications ?? profile.current_medications,
      });
      saveState(state);
      return { ok: true, data: { profile } as T };
    }
  }

  // ── Physician profile ──
  if (path === "/physician-profile") {
    if (!currentUser || currentUser.role !== "physician") {
      return { ok: false, message: "غير مصرح.", status: 403 };
    }
    if (!currentUser.physician_profile) {
      currentUser.physician_profile = {
        id: state.nextId.profile++,
        specialty: "",
        certificate: "",
        verification_status: "pending",
        certificate_files: [],
      };
    }
    const profile = currentUser.physician_profile;
    if (method === "GET") {
      return {
        ok: true,
        data: {
          profile: {
            specialty: profile.specialty,
            certificate: profile.certificate,
            certificate_files: profile.certificate_files ?? [],
          },
        } as T,
      };
    }
    if (method === "PUT") {
      profile.specialty = String(body.specialty ?? profile.specialty);
      profile.certificate = String(body.certificate ?? profile.certificate);
      saveState(state);
      return {
        ok: true,
        data: {
          profile: {
            specialty: profile.specialty,
            certificate: profile.certificate,
            certificate_files: profile.certificate_files ?? [],
          },
        } as T,
      };
    }
  }

  // ── Medical files upload ──
  if (path === "/medical-files" && method === "POST") {
    const fileObj = body.file as File | undefined;
    const name = fileObj?.name ?? "ملف-مرفق.pdf";
    const kind = String(body.file_kind ?? "other");
    const newFile: MockFile = {
      id: state.nextId.file++,
      original_name: name,
      mime_type: fileObj?.type ?? "application/octet-stream",
      size_bytes: fileObj?.size ?? 50_000,
      file_kind: kind,
      created_at: nowIso(0),
    };
    state.files.push(newFile);
    const consultationId = body.consultation_id ? Number(body.consultation_id) : null;
    if (consultationId) {
      const c = state.consultations.find((x) => x.id === consultationId);
      if (c) c.medical_files.push(newFile);
    }
    saveState(state);
    return { ok: true, data: { file: newFile } as T };
  }

  // ── Consultations ──
  if (path === "/consultations" && method === "GET") {
    if (!currentUser) return { ok: false, message: "غير مصرح.", status: 401 };
    let rows: MockConsultation[];
    if (currentUser.role === "patient") {
      rows = state.consultations.filter((c) => c.patient_id === currentUser.id);
    } else if (currentUser.role === "physician") {
      rows = state.consultations.filter((c) => c.physician_id === currentUser.id);
    } else {
      rows = state.consultations;
    }
    return {
      ok: true,
      data: { data: rows.map((c) => consultationListItem(c, state)) } as T,
    };
  }

  if (path === "/consultations/queue" && method === "GET") {
    const rows = state.consultations.filter(
      (c) =>
        c.status === "pending" &&
        c.physician_id === null &&
        (c.assignment_mode ?? "queue") !== "direct",
    );
    return {
      ok: true,
      data: { data: rows.map((c) => consultationListItem(c, state)) } as T,
    };
  }

  if (path === "/consultations" && method === "POST") {
    if (!currentUser || currentUser.role !== "patient") {
      return { ok: false, message: "غير مصرح.", status: 403 };
    }
    const physicianId = body.physician_id ? Number(body.physician_id) : null;
    const assignmentMode =
      body.assignment_mode === "direct" || physicianId ? "direct" : "queue";
    const fileIds = (body.file_ids as number[]) ?? (body.medical_file_ids as number[]) ?? [];
    const attached = state.files.filter((f) => fileIds.includes(f.id));
    const newC: MockConsultation = {
      id: state.nextId.consultation++,
      patient_id: currentUser.id,
      physician_id: assignmentMode === "direct" ? physicianId : null,
      assignment_mode: assignmentMode,
      question_text: String(body.question_text ?? ""),
      status: "pending",
      submitted_at: nowIso(0),
      medical_files: attached,
    };
    state.consultations.unshift(newC);
    saveState(state);
    return { ok: true, data: { consultation: consultationDetail(newC, state) } as T };
  }

  const consultMatch = path.match(/^\/consultations\/(\d+)(\/claim|\/respond)?$/);
  if (consultMatch) {
    const cId = Number(consultMatch[1]);
    const action = consultMatch[2];
    const c = state.consultations.find((x) => x.id === cId);
    if (!c) return { ok: false, message: "الاستشارة غير موجودة.", status: 404 };

    if (action === "/claim" && method === "POST") {
      if (!currentUser || currentUser.role !== "physician") {
        return { ok: false, message: "غير مصرح.", status: 403 };
      }
      if (c.physician_id) {
        return { ok: false, message: "تم استلام الحالة من طبيب آخر.", status: 409 };
      }
      c.physician_id = currentUser.id;
      saveState(state);
      return { ok: true, data: { consultation: consultationListItem(c, state) } as T };
    }

    if (action === "/respond" && method === "POST") {
      if (!currentUser || currentUser.role !== "physician" || c.physician_id !== currentUser.id) {
        return { ok: false, message: "غير مصرح.", status: 403 };
      }
      c.physician_response = String(body.physician_response ?? "");
      c.status = "completed";
      c.responded_at = nowIso(0);
      saveState(state);
      return { ok: true, data: { consultation: consultationDetail(c, state) } as T };
    }

    if (method === "GET") {
      return { ok: true, data: { consultation: consultationDetail(c, state) } as T };
    }
  }

  // ── Verified physicians ──
  if (path.startsWith("/verified-physicians")) {
    const specialtyQ = path.includes("?")
      ? new URLSearchParams(path.split("?")[1]).get("specialty")?.trim()
      : null;
    let rows = state.users
      .filter(
        (u) =>
          u.role === "physician" && u.physician_profile?.verification_status === "approved",
      )
      .map((u) => ({
        id: u.physician_profile!.id,
        user_id: u.id,
        specialty: u.physician_profile!.specialty,
        certificate: u.physician_profile!.certificate,
        user: { id: u.id, name: u.name, email: u.email },
      }));
    if (specialtyQ) {
      rows = rows.filter((r) => r.specialty.includes(specialtyQ));
    }
    return { ok: true, data: { data: rows } as T };
  }

  // ── Admin ──
  if (path === "/admin/users" || path.startsWith("/admin/users?")) {
    const rows = state.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      is_disabled: u.is_disabled ?? false,
      physician_profile: u.physician_profile
        ? { verification_status: u.physician_profile.verification_status }
        : null,
    }));
    return { ok: true, data: { data: rows } as T };
  }

  const disableMatch = path.match(/^\/admin\/users\/(\d+)\/disabled$/);
  if (disableMatch && method === "PATCH") {
    const u = state.users.find((x) => x.id === Number(disableMatch[1]));
    if (!u) return { ok: false, message: "المستخدم غير موجود.", status: 404 };
    u.is_disabled = Boolean(body.is_disabled);
    saveState(state);
    return {
      ok: true,
      data: {
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          is_disabled: u.is_disabled,
        },
      } as T,
    };
  }

  if (path === "/admin/physicians/pending") {
    const rows = state.users
      .filter((u) => u.role === "physician" && u.physician_profile?.verification_status === "pending")
      .map((u) => ({
        id: u.physician_profile!.id,
        specialty: u.physician_profile!.specialty,
        certificate: u.physician_profile!.certificate,
        verification_status: u.physician_profile!.verification_status,
        user: { id: u.id, name: u.name, email: u.email },
        certificate_files: u.physician_profile!.certificate_files ?? [],
      }));
    return { ok: true, data: { data: rows, total: rows.length } as T };
  }

  if (path.startsWith("/admin/physicians")) {
    const statusMatch = path.match(/status=(\w+)/);
    const status = statusMatch?.[1] ?? "approved";
    const rows = state.users
      .filter(
        (u) =>
          u.role === "physician" && u.physician_profile?.verification_status === status,
      )
      .map((u) => ({
        id: u.physician_profile!.id,
        specialty: u.physician_profile!.specialty,
        certificate: u.physician_profile!.certificate,
        verification_status: u.physician_profile!.verification_status,
        rejection_reason: u.physician_profile!.rejection_reason,
        user: { id: u.id, name: u.name, email: u.email },
        certificate_files: u.physician_profile!.certificate_files ?? [],
      }));
    return { ok: true, data: { data: rows } as T };
  }

  const approveMatch = path.match(/^\/admin\/physicians\/(\d+)\/(approve|reject)$/);
  if (approveMatch && method === "POST") {
    const profileId = Number(approveMatch[1]);
    const action = approveMatch[2];
    const user = state.users.find((u) => u.physician_profile?.id === profileId);
    if (!user?.physician_profile) {
      return { ok: false, message: "الملف غير موجود.", status: 404 };
    }
    if (action === "approve") {
      user.physician_profile.verification_status = "approved";
      user.physician_profile.rejection_reason = null;
    } else {
      user.physician_profile.verification_status = "rejected";
      user.physician_profile.rejection_reason = String(
        body.rejection_reason ?? "لم تستوفِ متطلبات التوثيق.",
      );
    }
    saveState(state);
    return { ok: true, data: {} as T };
  }

  // ── Platform stats ──
  if (path === "/platform-stats" && method === "GET") {
    const completed = state.consultations.filter((c) => c.status === "completed").length;
    const verified = state.users.filter(
      (u) => u.role === "physician" && u.physician_profile?.verification_status === "approved",
    ).length;
    const patients = state.users.filter((u) => u.role === "patient").length;
    return {
      ok: true,
      data: {
        stats: {
          completed_consultations: completed,
          verified_physicians: verified,
          registered_patients: patients,
        },
      } as T,
    };
  }

  return { ok: false, message: `مسار تجريبي غير مدعوم: ${method} ${path}`, status: 404 };
}

export async function mockDownloadWithAuth(
  path: string,
): Promise<ApiResult<{ blob: Blob; filename?: string }>> {
  await delay(150);
  const match = path.match(/^\/medical-files\/(\d+)\/download/);
  if (!match) {
    return { ok: false, message: "الملف غير موجود.", status: 404 };
  }
  const state = loadState();
  const file = state.files.find((f) => f.id === Number(match[1]));
  if (!file) return { ok: false, message: "الملف غير موجود.", status: 404 };
  return {
    ok: true,
    data: { blob: makePlaceholderBlob(file), filename: file.original_name },
  };
}

export const DEMO_ACCOUNTS = [
  { role: "مراجع", email: "patient@demo.com", password: "demo" },
  { role: "طبيب", email: "doctor@demo.com", password: "demo" },
  { role: "مدير", email: "admin@demo.com", password: "demo" },
] as const;

export function resetMockData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
