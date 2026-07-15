import type { ApiResult } from "@/lib/api";

type MockUser = {
  id: number;
  name: string;
  email: string;
  password?: string;
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

type MockMessage = {
  id: number;
  consultation_id: number;
  sender_id: number;
  sender_role: "patient" | "physician";
  body: string;
  created_at: string;
};

type MockPasswordResetToken = {
  email: string;
  token: string;
  expires_at: string;
};

type MockNotification = {
  id: string;
  user_id: number;
  title: string;
  body: string;
  href: string;
  kind: string;
  meta?: Record<string, unknown>;
  read_at?: string | null;
  created_at: string;
};

type MockState = {
  seed_revision?: number;
  users: MockUser[];
  medicalProfiles: MockMedicalProfile[];
  consultations: MockConsultation[];
  files: MockFile[];
  messages: MockMessage[];
  passwordResetTokens: MockPasswordResetToken[];
  notifications: MockNotification[];
  nextId: {
    user: number;
    profile: number;
    consultation: number;
    file: number;
    message: number;
    notification: number;
  };
};

const STORAGE_KEY = "gc_mock_state_v10";
const PREV_STORAGE_KEYS = [
  "gc_mock_state_v7",
  "gc_mock_state_v8",
  "gc_mock_state_v9",
];
const DEMO_DEFAULT_PASSWORD = "Care2026";
/** Bump when the demo seed must replace browsers that already saved this STORAGE_KEY. */
const SEED_REVISION = 2;

function nowIso(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

function userPassword(user: MockUser) {
  return user.password ?? DEMO_DEFAULT_PASSWORD;
}

function generateResetToken() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function ensureNotifications(state: MockState) {
  if (!state.notifications) state.notifications = [];
  if (!state.nextId.notification) state.nextId.notification = 1;
}

function pushNotification(
  state: MockState,
  userId: number,
  title: string,
  body: string,
  href: string,
  kind: string,
  meta?: Record<string, unknown>,
) {
  ensureNotifications(state);
  const user = state.users.find((u) => u.id === userId);
  if (!user || user.is_disabled) return;

  const consultationId = meta?.consultation_id != null ? Number(meta.consultation_id) : null;
  const recent = state.notifications.filter((n) => n.user_id === userId).slice(0, 20);
  const replyKinds = ["consultation_replied", "consultation_physician_message"];
  const isDup = recent.some((n) => {
    const ageMs = Date.now() - new Date(n.created_at).getTime();
    if (Number.isNaN(ageMs) || ageMs > 90_000) return false;
    const sameKind = n.kind === kind && (consultationId == null || Number(n.meta?.consultation_id) === consultationId);
    if (sameKind && ageMs <= 90_000) return true;
    if (
      consultationId != null &&
      replyKinds.includes(kind) &&
      replyKinds.includes(n.kind) &&
      Number(n.meta?.consultation_id) === consultationId &&
      ageMs <= 12_000
    ) {
      return true;
    }
    return false;
  });
  if (isDup) return;

  state.notifications.unshift({
    id: `n-${state.nextId.notification++}`,
    user_id: userId,
    title,
    body,
    href,
    kind,
    meta,
    read_at: null,
    created_at: nowIso(0),
  });
}

function pushNotificationToAdmins(
  state: MockState,
  title: string,
  body: string,
  href: string,
  kind: string,
  meta?: Record<string, unknown>,
) {
  state.users
    .filter((u) => u.role === "admin" && !u.is_disabled)
    .forEach((admin) => pushNotification(state, admin.id, title, body, href, kind, meta));
}

function seedState(): MockState {
  const certFile: MockFile = {
    id: 1,
    original_name: "شهادة-تخصص.jpg",
    mime_type: "image/jpeg",
    size_bytes: 245_000,
    file_kind: "image",
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

  const rejectedCert: MockFile = {
    id: 5,
    original_name: "شهادة-جلدية-قيد-المراجعة.pdf",
    mime_type: "application/pdf",
    size_bytes: 210_000,
    file_kind: "pdf",
    created_at: nowIso(3),
  };

  const sugarFile: MockFile = {
    id: 6,
    original_name: "تحليل-سكر-تراكمي.pdf",
    mime_type: "application/pdf",
    size_bytes: 96_000,
    file_kind: "pdf",
    created_at: nowIso(9),
  };

  const oldBloodFile: MockFile = {
    id: 7,
    original_name: "تحليل-دم-قديم.pdf",
    mime_type: "application/pdf",
    size_bytes: 110_000,
    file_kind: "pdf",
    created_at: nowIso(16),
  };

  return {
    seed_revision: SEED_REVISION,
    users: [
      {
        id: 1,
        name: "سارة أحمد",
        email: "sara.ahmad@gazacare.ps",
        password: DEMO_DEFAULT_PASSWORD,
        role: "patient",
      },
      {
        id: 7,
        name: "علي حسن",
        email: "ali.hassan@gazacare.ps",
        password: DEMO_DEFAULT_PASSWORD,
        role: "patient",
      },
      {
        id: 8,
        name: "نور خالد",
        email: "noor.khaled@gazacare.ps",
        password: DEMO_DEFAULT_PASSWORD,
        role: "patient",
      },
      {
        id: 9,
        name: "يوسف سمير",
        email: "yousef.samir@gazacare.ps",
        password: DEMO_DEFAULT_PASSWORD,
        role: "patient",
      },
      {
        id: 10,
        name: "هبة نضال",
        email: "heba.nidal@gazacare.ps",
        password: DEMO_DEFAULT_PASSWORD,
        role: "patient",
      },
      {
        id: 2,
        name: "د. محمد الخالدي",
        email: "m.khalidi@gazacare.ps",
        password: DEMO_DEFAULT_PASSWORD,
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
        email: "layla.hassan@gazacare.ps",
        password: DEMO_DEFAULT_PASSWORD,
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
        id: 11,
        name: "د. كريم نصار",
        email: "k.nassar@gazacare.ps",
        password: DEMO_DEFAULT_PASSWORD,
        role: "physician",
        physician_profile: {
          id: 5,
          specialty: "طب الأسرة",
          certificate: "اختصاص طب أسرة — وزارة الصحة",
          verification_status: "approved",
          certificate_files: [certFile],
        },
      },
      {
        id: 4,
        name: "د. عمر يوسف",
        email: "omar.yousef@gazacare.ps",
        password: DEMO_DEFAULT_PASSWORD,
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
        id: 6,
        name: "د. ليلى منصور",
        email: "laila.mansour@gazacare.ps",
        password: DEMO_DEFAULT_PASSWORD,
        role: "physician",
        physician_profile: {
          id: 4,
          specialty: "الأمراض الجلدية",
          certificate: "شهادة اختصاص جلدية — بحاجة إلى تحديث المرفقات.",
          verification_status: "rejected",
          rejection_reason:
            "صورة الشهادة غير واضحة. يُرجى رفع نسخة أوضح ثم إرسال الطلب مجدداً.",
          certificate_files: [rejectedCert],
        },
      },
      {
        id: 5,
        name: "مدير النظام",
        email: "admin@gazacare.ps",
        password: DEMO_DEFAULT_PASSWORD,
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
      {
        id: 2,
        user_id: 7,
        height_cm: 175,
        weight_kg: 82,
        chronic_diseases: "ربو خفيف",
        medical_history: "نوبات ربو موسمية، يستخدم بخاخ عند الحاجة.",
        allergies: "غبار الطلع",
        current_medications: "بخاخ فنتولين عند اللزوم",
      },
      {
        id: 3,
        user_id: 8,
        height_cm: 158,
        weight_kg: 54,
        chronic_diseases: "لا يوجد",
        medical_history: "ولادة قيصرية عام 2022.",
        allergies: "لا توجد",
        current_medications: "حديد وفيتامين د",
      },
      {
        id: 4,
        user_id: 9,
        height_cm: 180,
        weight_kg: 95,
        chronic_diseases: "سمنة، آلام أسفل الظهر",
        medical_history: "إنزلاق غضروفي قطني خفيف حسب رنين 2024.",
        allergies: "الأسبرين",
        current_medications: "باراسيتامول عند الحاجة",
      },
      {
        id: 5,
        user_id: 10,
        height_cm: 165,
        weight_kg: 60,
        chronic_diseases: "فقر دم محسّن",
        medical_history: "عولج فقر الدم عام 2023.",
        allergies: "لا توجد",
        current_medications: "لا أدوية مزمنة",
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
        physician_id: 2,
        assignment_mode: "direct",
        question_text:
          "نبض سريع أحياناً عند صعود الدرج مع تعب عام. هل أحتاج تخطيط قلب؟",
        status: "completed",
        submitted_at: nowIso(8),
        responded_at: nowIso(7),
        physician_response:
          "سجّلي النبض في الراحة والجهد ليومين، وراجعي لإجراء تخطيط قلب. استمري على الأدوية الحالية. أي ألم صدر أو ضيق تنفس شديد → الطوارئ فوراً.",
        medical_files: [sugarFile],
      },
      {
        id: 3,
        patient_id: 7,
        physician_id: 11,
        assignment_mode: "queue",
        question_text:
          "سعال ليلي منذ أسبوع مع صفير خفيف. لا حمى حالياً. هل أبدأ بخاخ ستيرويد؟",
        status: "completed",
        submitted_at: nowIso(12),
        responded_at: nowIso(11),
        physician_response:
          "ابدأ الفنتولين عند الحاجة كل 4–6 ساعات. إذا استمر الصفير أو ظهرت حمى راجع عيادة الصدر. لا تبدأ ستيرويد دون تقييم حضوري.",
        medical_files: [],
      },
      {
        id: 4,
        patient_id: 9,
        physician_id: 11,
        assignment_mode: "direct",
        question_text:
          "وزن 95 كغ وطول 180. أحس بتعب بعد الأكل الدسم. أريد خطة غذائية بسيطة.",
        status: "completed",
        submitted_at: nowIso(5),
        responded_at: nowIso(4),
        physician_response:
          "قلّل المشروبات المحلّاة والخبز الأبيض، زد الخضار والبقول، وامشِ 20–30 دقيقة يومياً. أعد قياس الوزن بعد أسبوعين.",
        medical_files: [],
      },
      {
        id: 5,
        patient_id: 10,
        physician_id: 3,
        assignment_mode: "queue",
        question_text:
          "دوخة خفيفة عند الوقوف السريع، وتحاليل قديمة أظهرت هيموغلوبين 10.8. هل أعيد تحليل دم؟",
        status: "completed",
        submitted_at: nowIso(15),
        responded_at: nowIso(14),
        physician_response:
          "نعم يُفضَّل إعادة صورة دم كاملة ومخزون الحديد. اشربي سوائل كافية وتجنّبي النهوض المفاجئ.",
        medical_files: [oldBloodFile],
      },
      {
        id: 6,
        patient_id: 8,
        physician_id: null,
        assignment_mode: "queue",
        question_text:
          "طفلي (5 سنوات) يعاني من سعال جاف منذ 4 أيام بدون حرارة. هل أحتاج مضاد حيوي؟",
        status: "pending",
        submitted_at: nowIso(1),
        medical_files: [],
      },
      {
        id: 7,
        patient_id: 1,
        physician_id: 2,
        assignment_mode: "queue",
        question_text: "أشعر بخفقان في القلب أحياناً بعد المجهود. هل هذا طبيعي مع ضغط الدم؟",
        status: "pending",
        submitted_at: nowIso(3),
        medical_files: [labFile],
      },
      {
        id: 8,
        patient_id: 1,
        physician_id: 2,
        assignment_mode: "direct",
        question_text:
          "أرسلت هذه الاستشارة مباشرة للدكتور محمد. أعاني من آلام في المفاصل منذ أسبوع.",
        status: "pending",
        submitted_at: nowIso(2),
        medical_files: [],
      },
      {
        id: 9,
        patient_id: 8,
        physician_id: 3,
        assignment_mode: "direct",
        question_text:
          "ابنتي عمرها 3 سنوات، حرارة 38.5 منذ أمس مع احتقان أنف. متى أراجع الطوارئ؟",
        status: "pending",
        submitted_at: nowIso(0),
        medical_files: [],
      },
    ],
    files: [certFile, labFile, xrayFile, pendingCert, rejectedCert, sugarFile, oldBloodFile],
    messages: [
      {
        id: 1,
        consultation_id: 1,
        sender_id: 2,
        sender_role: "physician",
        body:
          "بعد مراجعة التحاليل والأعراض، يبدو أن الصداع مرتبط بارتفاع ضغط الدم الخفيف. أنصح بمتابعة قياس الضغط يومياً، والاستمرار على العلاج الحالي.",
        created_at: nowIso(8),
      },
      {
        id: 2,
        consultation_id: 2,
        sender_id: 1,
        sender_role: "patient",
        body: "شكراً دكتور. سجلت النبض صباحاً 88 وفي المشي 110.",
        created_at: nowIso(6),
      },
      {
        id: 3,
        consultation_id: 2,
        sender_id: 2,
        sender_role: "physician",
        body: "ممتاز. أرسلي نتيجة التخطيط هنا بعد إجرائه لنراجعها معاً.",
        created_at: nowIso(5),
      },
    ],
    passwordResetTokens: [],
    notifications: [
      {
        id: "n-1",
        user_id: 1,
        title: "رد الطبيب على استشارتك",
        body: "الدكتور د. محمد الخالدي أرسل توصياته للاستشارة #1.",
        href: "/consultations/1",
        kind: "consultation_replied",
        meta: { consultation_id: 1 },
        read_at: null,
        created_at: nowIso(1),
      },
      {
        id: "n-2",
        user_id: 2,
        title: "استشارة جديدة موجّهة إليك",
        body: "استشارة جديدة من سارة أحمد (#8).",
        href: "/physician/consultations/8",
        kind: "consultation_direct",
        meta: { consultation_id: 8 },
        read_at: null,
        created_at: nowIso(0),
      },
      {
        id: "n-3",
        user_id: 5,
        title: "طلب توثيق طبيب جديد",
        body: "الدكتور د. عمر يوسف ينتظر مراجعة الشهادة.",
        href: "/admin/physicians",
        kind: "physician_pending",
        read_at: null,
        created_at: nowIso(0),
      },
      {
        id: "n-4",
        user_id: 6,
        title: "تم رفض طلب التوثيق",
        body: "صورة الشهادة غير واضحة. يُرجى رفع نسخة أوضح ثم إرسال الطلب مجدداً.",
        href: "/physician/dashboard",
        kind: "physician_rejected",
        read_at: null,
        created_at: nowIso(0),
      },
    ],
    nextId: {
      user: 12,
      profile: 6,
      consultation: 10,
      file: 8,
      message: 4,
      notification: 5,
    },
  };
}

function clearPrevStorageKeys() {
  if (typeof window === "undefined") return;
  for (const key of PREV_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

function isStaleSeed(state: MockState): boolean {
  if ((state.seed_revision ?? 0) < SEED_REVISION) return true;
  const patients = state.users.filter((u) => u.role === "patient").length;
  const completed = state.consultations.filter((c) => c.status === "completed").length;
  // Old demo seed had only 1 patient and 1 completed consultation.
  return patients < 5 || completed < 5;
}

function loadState(): MockState {
  if (typeof window === "undefined") return seedState();
  clearPrevStorageKeys();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockState;
      if (!isStaleSeed(parsed)) return parsed;
    }
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
  window.dispatchEvent(new Event("gc-mock-state-changed"));
}

function getTokenUserId(): number | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("gc_token");
  if (!token) return null;
  const match = token.match(/^gc-(\d+)$/);
  if (match) return Number(match[1]);
  const state = loadState();
  const user = state.users.find((u) => `gc-${u.id}` === token);
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
  if (!u) return null;
  const profile = state.medicalProfiles.find((p) => p.user_id === id) ?? null;
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    medical_profile: profile,
  };
}

function physicianOf(id: number | null, state: MockState) {
  if (!id) return null;
  const u = state.users.find((x) => x.id === id);
  if (!u) return null;
  const certFiles = u.physician_profile?.certificate_files ?? [];
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    physician_profile: u.physician_profile
      ? {
          specialty: u.physician_profile.specialty,
          certificate: u.physician_profile.certificate,
          certificate_files: certFiles,
          certificate_file: certFiles[0] ?? null,
          certificate_file_ids: certFiles.map((f) => f.id),
        }
      : null,
  };
}

function senderOf(id: number, state: MockState) {
  const u = state.users.find((x) => x.id === id);
  return u ? { id: u.id, name: u.name, role: u.role } : null;
}

function ensureLegacyPhysicianMessage(c: MockConsultation, state: MockState) {
  if (!state.messages) state.messages = [];
  if (!state.nextId.message) state.nextId.message = 1;
  if (!c.physician_response?.trim()) return;
  const hasPhysicianMsg = state.messages.some(
    (m) => m.consultation_id === c.id && m.sender_role === "physician",
  );
  if (hasPhysicianMsg) return;
  state.messages.push({
    id: state.nextId.message++,
    consultation_id: c.id,
    sender_id: c.physician_id ?? 0,
    sender_role: "physician",
    body: c.physician_response,
    created_at: c.responded_at ?? nowIso(0),
  });
}

function messagesOf(c: MockConsultation, state: MockState) {
  ensureLegacyPhysicianMessage(c, state);
  return (state.messages ?? [])
    .filter((m) => m.consultation_id === c.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((m) => ({
      ...m,
      sender: senderOf(m.sender_id, state),
    }));
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
    patient: patientOf(c.patient_id, state),
    medical_files: c.medical_files,
    messages: messagesOf(c, state),
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
  if (file.mime_type?.startsWith("image/") || file.file_kind === "image") {
    const label = file.original_name.replace(/[<>&]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b6e7a"/><stop offset="100%" stop-color="#15b9c6"/>
      </linearGradient></defs>
      <rect fill="url(#g)" width="640" height="420" rx="16"/>
      <rect x="28" y="28" width="584" height="364" rx="12" fill="#fff" fill-opacity="0.92"/>
      <text x="320" y="180" text-anchor="middle" fill="#0b3d47" font-size="28" font-family="Tahoma,sans-serif" font-weight="700">شهادة مهنية</text>
      <text x="320" y="230" text-anchor="middle" fill="#0d9488" font-size="18" font-family="Tahoma,sans-serif">${label}</text>
      <text x="320" y="290" text-anchor="middle" fill="#64748b" font-size="14" font-family="Tahoma,sans-serif">GazaCare Connect — Demo</text>
    </svg>`;
    return new Blob([svg], { type: "image/svg+xml" });
  }
  const safeName = file.original_name.replace(/[^\x20-\x7E]/g, "_").slice(0, 48);
  const stream = `BT /F1 16 Tf 72 720 Td (${safeName || "Certificate"}) Tj ET`;
  const parts = [
    "%PDF-1.4",
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "trailer<< /Size 6 /Root 1 0 R >>",
    "startxref",
    "0",
    "%%EOF",
  ];
  return new Blob([parts.join("\n")], { type: "application/pdf" });
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
    const password = String(body.password ?? "");
    const user = state.users.find((u) => u.email === email);
    if (!user || password !== userPassword(user)) {
      return { ok: false, message: "بيانات الدخول غير صحيحة.", status: 401 };
    }
    if (user.is_disabled) {
      return { ok: false, message: "الحساب معطّل.", status: 403 };
    }
  return {
      ok: true,
      data: { user: userPublic(user), token: `gc-${user.id}` } as T,
    };
  }

  if (path === "/auth/forgot-password" && method === "POST") {
    const email = String(body.email ?? "").toLowerCase().trim();
    const user = state.users.find((u) => u.email === email);
    const message = "تم تجهيز الرابط. استخدميه من الواجهة.";
    if (user && !user.is_disabled) {
      if (!state.passwordResetTokens) state.passwordResetTokens = [];
      const token = generateResetToken();
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 60);
      state.passwordResetTokens = state.passwordResetTokens.filter((t) => t.email !== email);
      state.passwordResetTokens.push({
        email,
        token,
        expires_at: expires.toISOString(),
      });
      saveState(state);
      const demoUrl = `/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
      return {
        ok: true,
        data: { message, demo_reset_token: token, demo_reset_url: demoUrl } as T,
      };
    }
    return {
      ok: true,
      data: {
        message:
        message: "البريد غير مسجّل. جرّبي حساباً من «دخول سريع».",
      } as T,
    };
  }

  if (path === "/auth/reset-password" && method === "POST") {
    const email = String(body.email ?? "").toLowerCase().trim();
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");
    const confirmation = String(body.password_confirmation ?? "");
    if (password.length < 8) {
      return { ok: false, message: "كلمة المرور قصيرة جداً.", status: 422 };
    }
    if (password !== confirmation) {
      return { ok: false, message: "تأكيد كلمة المرور غير متطابق.", status: 422 };
    }
    if (!state.passwordResetTokens) state.passwordResetTokens = [];
    const row = state.passwordResetTokens.find((t) => t.email === email && t.token === token);
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false, message: "رمز إعادة التعيين غير صالح أو منتهي.", status: 422 };
    }
    const user = state.users.find((u) => u.email === email);
    if (!user) {
      return { ok: false, message: "رمز إعادة التعيين غير صالح.", status: 422 };
    }
    user.password = password;
    state.passwordResetTokens = state.passwordResetTokens.filter((t) => t.email !== email);
    saveState(state);
    return {
      ok: true,
      data: { message: "تمت إعادة تعيين كلمة المرور. يمكنك تسجيل الدخول الآن." } as T,
    };
  }

  if (path === "/auth/change-password" && method === "POST") {
    if (!currentUser) {
      return { ok: false, message: "غير مصرح.", status: 401 };
    }
    const current = String(body.current_password ?? "");
    const password = String(body.password ?? "");
    const confirmation = String(body.password_confirmation ?? "");
    if (current !== userPassword(currentUser)) {
      return { ok: false, message: "كلمة المرور الحالية غير صحيحة.", status: 422 };
    }
    if (password.length < 8) {
      return { ok: false, message: "كلمة المرور الجديدة قصيرة جداً.", status: 422 };
    }
    if (password !== confirmation) {
      return { ok: false, message: "تأكيد كلمة المرور غير متطابق.", status: 422 };
    }
    currentUser.password = password;
    saveState(state);
    return {
      ok: true,
      data: { message: "تم تغيير كلمة المرور. سجّل دخولك من جديد." } as T,
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
      password: String(body.password ?? DEMO_DEFAULT_PASSWORD),
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
    } else if (role === "physician") {
      pushNotificationToAdmins(
        state,
        "طلب توثيق طبيب جديد",
        `الدكتور ${newUser.name} سجّل وينتظر مراجعة الشهادة.`,
        "/admin/physicians",
        "physician_pending",
        { user_id: newUser.id },
      );
    }
    saveState(state);
    return {
      ok: true,
      data: { user: userPublic(newUser), token: `gc-${newUser.id}` } as T,
    };
  }

  if (path === "/auth/me" && method === "GET") {
    if (!currentUser) {
      return { ok: false, message: "غير مصرح.", status: 401 };
    }
    return { ok: true, data: { user: userPublic(currentUser) } as T };
  }

  if (path === "/notifications/read-all" && method === "POST") {
    if (!currentUser) return { ok: false, message: "غير مصرح.", status: 401 };
    ensureNotifications(state);
    const now = nowIso(0);
    state.notifications.forEach((n) => {
      if (n.user_id === currentUser.id && !n.read_at) n.read_at = now;
    });
    saveState(state);
    return {
      ok: true,
      data: { message: "تم تعليم جميع الإشعارات كمقروءة.", unread_count: 0 } as T,
    };
  }

  const notifReadMatch = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === "POST") {
    if (!currentUser) return { ok: false, message: "غير مصرح.", status: 401 };
    ensureNotifications(state);
    const row = state.notifications.find(
      (n) => n.id === notifReadMatch[1] && n.user_id === currentUser.id,
    );
    if (!row) return { ok: false, message: "الإشعار غير موجود.", status: 404 };
    if (!row.read_at) row.read_at = nowIso(0);
    saveState(state);
    const unread = state.notifications.filter(
      (n) => n.user_id === currentUser.id && !n.read_at,
    ).length;
    return {
      ok: true,
      data: {
        notification: {
          id: row.id,
          title: row.title,
          body: row.body,
          href: row.href,
          kind: row.kind,
          meta: row.meta ?? {},
          read_at: row.read_at,
          created_at: row.created_at,
        },
        unread_count: unread,
      } as T,
    };
  }

  if ((path === "/notifications" || path.startsWith("/notifications?")) && method === "GET") {
    if (!currentUser) return { ok: false, message: "غير مصرح.", status: 401 };
    ensureNotifications(state);
    const unreadOnly = path.includes("unread_only=1");
    let rows = state.notifications.filter((n) => n.user_id === currentUser.id);
    if (unreadOnly) rows = rows.filter((n) => !n.read_at);
    rows = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20);
    const unread = state.notifications.filter(
      (n) => n.user_id === currentUser.id && !n.read_at,
    ).length;
    return {
      ok: true,
      data: {
        data: rows.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          href: n.href,
          kind: n.kind,
          meta: n.meta ?? {},
          read_at: n.read_at ?? null,
          created_at: n.created_at,
        })),
        unread_count: unread,
      } as T,
    };
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
            verification_status: profile.verification_status,
            rejection_reason: profile.rejection_reason ?? null,
          },
        } as T,
      };
    }
    if (method === "PUT") {
      profile.specialty = String(body.specialty ?? profile.specialty);
      profile.certificate = String(body.certificate ?? profile.certificate);
      if (Array.isArray(body.certificate_file_ids)) {
        const ids = (body.certificate_file_ids as number[]).map(Number);
        profile.certificate_files = state.files.filter((f) => ids.includes(f.id));
      }
      if (body.resubmit === true && profile.verification_status !== "approved") {
        profile.verification_status = "pending";
        profile.rejection_reason = null;
        pushNotificationToAdmins(
          state,
          "إعادة إرسال طلب توثيق",
          `الدكتور ${currentUser.name} أعاد إرسال طلب التوثيق للمراجعة.`,
          "/admin/physicians",
          "physician_resubmit",
          { user_id: currentUser.id },
        );
      }
      // Keep user object in state in sync
      const userIdx = state.users.findIndex((u) => u.id === currentUser.id);
      if (userIdx >= 0) {
        state.users[userIdx] = { ...currentUser, physician_profile: profile };
      }
      saveState(state);
      return {
        ok: true,
        data: {
          profile: {
            specialty: profile.specialty,
            certificate: profile.certificate,
            certificate_files: profile.certificate_files ?? [],
            verification_status: profile.verification_status,
            rejection_reason: profile.rejection_reason ?? null,
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
  if ((path === "/consultations" || path.startsWith("/consultations?")) && method === "GET") {
    if (!currentUser) return { ok: false, message: "غير مصرح.", status: 401 };
    let rows: MockConsultation[];
    if (currentUser.role === "patient") {
      rows = state.consultations.filter((c) => c.patient_id === currentUser.id);
    } else if (currentUser.role === "physician") {
      rows = state.consultations.filter((c) => c.physician_id === currentUser.id);
    } else {
      rows = state.consultations;
    }
    rows = [...rows].sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
    );
    return {
      ok: true,
      data: { data: rows.map((c) => consultationListItem(c, state)) } as T,
    };
  }

  if (path === "/consultations/queue" || path.startsWith("/consultations/queue?")) {
    if (method === "GET") {
      const rows = state.consultations
        .filter(
          (c) =>
            c.status === "pending" &&
            c.physician_id === null &&
            (c.assignment_mode ?? "queue") !== "direct",
        )
        .sort(
          (a, b) =>
            new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
        );
      return {
        ok: true,
        data: { data: rows.map((c) => consultationListItem(c, state)) } as T,
      };
    }
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
    if (assignmentMode === "direct" && physicianId) {
      const physician = state.users.find((u) => u.id === physicianId);
      if (physician) {
        pushNotification(
          state,
          physicianId,
          "استشارة جديدة موجّهة إليك",
          `استشارة جديدة من ${currentUser.name} (#${newC.id}).`,
          `/physician/consultations/${newC.id}`,
          "consultation_direct",
          { consultation_id: newC.id },
        );
      }
    }
    saveState(state);
    return { ok: true, data: { consultation: consultationDetail(newC, state) } as T };
  }

  const consultMatch = path.match(/^\/consultations\/(\d+)(\/claim|\/respond|\/messages)?$/);
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
      const patient = state.users.find((u) => u.id === c.patient_id);
      if (patient) {
        pushNotification(
          state,
          patient.id,
          "تم استلام استشارتك",
          `الدكتور ${currentUser.name} استلم استشارتك #${c.id}.`,
          `/consultations/${c.id}`,
          "consultation_claimed",
          { consultation_id: c.id },
        );
      }
      saveState(state);
      return { ok: true, data: { consultation: consultationListItem(c, state) } as T };
    }

    if (action === "/respond" && method === "POST") {
      if (!currentUser || currentUser.role !== "physician" || c.physician_id !== currentUser.id) {
        return { ok: false, message: "غير مصرح.", status: 403 };
      }
      const responseText = String(body.response ?? body.physician_response ?? "");
      const hadPhysicianReply =
        Boolean(c.physician_response?.trim()) ||
        (state.messages ?? []).some((m) => m.consultation_id === c.id && m.sender_role === "physician");
      c.physician_response = responseText;
      c.responded_at = nowIso(0);
      if (body.mark_completed !== false) {
        c.status = "completed";
      } else {
        c.status = "pending";
      }
      if (!state.messages) state.messages = [];
      if (!state.nextId.message) state.nextId.message = 1;
      state.messages.push({
        id: state.nextId.message++,
        consultation_id: c.id,
        sender_id: currentUser.id,
        sender_role: "physician",
        body: responseText,
        created_at: c.responded_at,
      });
      const patient = state.users.find((u) => u.id === c.patient_id);
      if (patient && !hadPhysicianReply) {
        pushNotification(
          state,
          patient.id,
          "رد الطبيب على استشارتك",
          `الدكتور ${currentUser.name} أرسل توصياته للاستشارة #${c.id}.`,
          `/consultations/${c.id}`,
          "consultation_replied",
          { consultation_id: c.id },
        );
      }
      saveState(state);
      return { ok: true, data: { consultation: consultationDetail(c, state) } as T };
    }

    if (action === "/messages" && method === "POST") {
      if (!currentUser) {
        return { ok: false, message: "غير مصرح.", status: 401 };
      }
      const msgBody = String(body.body ?? "").trim();
      if (msgBody.length < 2) {
        return { ok: false, message: "نص الرسالة قصير جداً.", status: 422 };
      }
      ensureLegacyPhysicianMessage(c, state);
      if (currentUser.role === "patient") {
        if (c.patient_id !== currentUser.id) {
          return { ok: false, message: "غير مصرح.", status: 403 };
        }
        const hasPhysicianReply =
          Boolean(c.physician_response?.trim()) ||
          (state.messages ?? []).some(
            (m) => m.consultation_id === c.id && m.sender_role === "physician",
          );
        if (!hasPhysicianReply) {
          return {
            ok: false,
            message: "يمكنك الرد بعد استلام إجابة الطبيب.",
            status: 422,
          };
        }
      } else if (currentUser.role === "physician") {
        if (c.physician_id && c.physician_id !== currentUser.id) {
          return { ok: false, message: "هذه الاستشارة لطبيب آخر.", status: 403 };
        }
        c.physician_id = currentUser.id;
        c.physician_response = msgBody;
        c.responded_at = nowIso(0);
      } else {
        return { ok: false, message: "غير مصرح.", status: 403 };
      }
      const priorPhysicianMessages =
        currentUser.role === "physician" &&
        (state.messages ?? []).some((m) => m.consultation_id === c.id && m.sender_role === "physician");
      if (!state.messages) state.messages = [];
      if (!state.nextId.message) state.nextId.message = 1;
      const message: MockMessage = {
        id: state.nextId.message++,
        consultation_id: c.id,
        sender_id: currentUser.id,
        sender_role: currentUser.role === "physician" ? "physician" : "patient",
        body: msgBody,
        created_at: nowIso(0),
      };
      state.messages.push(message);
      if (currentUser.role === "patient" && c.physician_id) {
        pushNotification(
          state,
          c.physician_id,
          "رد جديد من المراجع",
          `${currentUser.name} أرسل متابعة على الاستشارة #${c.id}.`,
          `/physician/consultations/${c.id}`,
          "consultation_patient_message",
          { consultation_id: c.id },
        );
      } else if (currentUser.role === "physician") {
        pushNotification(
          state,
          c.patient_id,
          priorPhysicianMessages ? "رد جديد من الطبيب" : "رد الطبيب على استشارتك",
          priorPhysicianMessages
            ? `الدكتور ${currentUser.name} أرسل متابعة على استشارتك #${c.id}.`
            : `الدكتور ${currentUser.name} أرسل توصياته للاستشارة #${c.id}.`,
          `/consultations/${c.id}`,
          priorPhysicianMessages ? "consultation_physician_message" : "consultation_replied",
          { consultation_id: c.id },
        );
      }
      saveState(state);
      return {
        ok: true,
        data: {
          message: { ...message, sender: senderOf(message.sender_id, state) },
          consultation: consultationDetail(c, state),
        } as T,
      };
    }

    if (method === "PATCH" || method === "PUT") {
      if (!currentUser || currentUser.role !== "patient" || c.patient_id !== currentUser.id) {
        return { ok: false, message: "غير مصرح.", status: 403 };
      }
      ensureLegacyPhysicianMessage(c, state);
      const hasPhysicianReply =
        Boolean(c.physician_response?.trim()) ||
        (state.messages ?? []).some(
          (m) => m.consultation_id === c.id && m.sender_role === "physician",
        );
      if (hasPhysicianReply) {
        return {
          ok: false,
          message: "لا يمكن تعديل الاستشارة بعد رد الطبيب.",
          status: 422,
        };
      }
      const nextText = String(body.question_text ?? "").trim();
      if (nextText.length < 10) {
        return { ok: false, message: "نص الاستشارة قصير جداً.", status: 422 };
      }
      c.question_text = nextText;
      if (Array.isArray(body.file_ids) || Array.isArray(body.medical_file_ids)) {
        const ids = ((body.file_ids as number[]) ?? (body.medical_file_ids as number[]) ?? [])
          .map(Number)
          .filter((n) => Number.isFinite(n));
        c.medical_files = state.files.filter((f) => ids.includes(f.id));
      }
      saveState(state);
      return { ok: true, data: { consultation: consultationDetail(c, state) } as T };
    }

    if (method === "GET") {
      if (!currentUser) {
        return { ok: false, message: "غير مصرح.", status: 401 };
      }
      if (currentUser.role === "patient" && c.patient_id !== currentUser.id) {
        return { ok: false, message: "غير مصرح.", status: 403 };
      }
      if (currentUser.role === "physician") {
        const profile = currentUser.physician_profile;
        if (profile?.verification_status !== "approved") {
          return {
            ok: false,
            message: "حسابك بانتظار موافقة الإدارة.",
            status: 403,
          };
        }
        const allowed =
          c.physician_id === null || c.physician_id === currentUser.id;
        if (!allowed) {
          return { ok: false, message: "غير مصرح.", status: 403 };
        }
      }
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
  function mapAdminUser(u: MockUser) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      is_disabled: u.is_disabled ?? false,
      physician_profile: u.physician_profile
        ? {
            specialty: u.physician_profile.specialty,
            verification_status: u.physician_profile.verification_status,
          }
        : null,
    };
  }

  function mapAdminPhysician(u: MockUser) {
    return {
      id: u.physician_profile!.id,
      specialty: u.physician_profile!.specialty,
      certificate: u.physician_profile!.certificate,
      verification_status: u.physician_profile!.verification_status,
      rejection_reason: u.physician_profile!.rejection_reason,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        is_disabled: u.is_disabled ?? false,
      },
      certificate_files: u.physician_profile!.certificate_files ?? [],
    };
  }

  if (path === "/admin/users" || path.startsWith("/admin/users?")) {
    const qs = path.includes("?") ? new URLSearchParams(path.split("?")[1]) : null;
    const role = qs?.get("role")?.trim() || "";
    const status = qs?.get("status")?.trim() || "";
    let rows = state.users.map(mapAdminUser);
    if (role) {
      rows = rows.filter((u) => u.role === role);
    }
    if (status === "disabled") {
      rows = rows.filter((u) => u.is_disabled);
    } else if (status === "active") {
      rows = rows.filter((u) => !u.is_disabled);
    }
    return { ok: true, data: { data: rows } as T };
  }

  const disableMatch = path.match(/^\/admin\/users\/(\d+)\/disabled$/);
  if (disableMatch && method === "PATCH") {
    const u = state.users.find((x) => x.id === Number(disableMatch[1]));
    if (!u) return { ok: false, message: "المستخدم غير موجود.", status: 404 };
    u.is_disabled = Boolean(body.disabled ?? body.is_disabled);
    if (u.is_disabled) {
      pushNotification(
        state,
        u.id,
        "تم تعطيل حسابك",
        "تم تعطيل حسابك من قبل الإدارة. تواصل مع الدعم إذا كان ذلك بالخطأ.",
        "/login",
        "account_disabled",
      );
    }
    saveState(state);
    return {
      ok: true,
      data: {
        user: mapAdminUser(u),
      } as T,
    };
  }

  // Approve/reject must be matched BEFORE /admin/physicians list routes
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
      pushNotification(
        state,
        user.id,
        "تم توثيق حسابك",
        "وافقت الإدارة على طلب توثيق حسابك كطبيب. يمكنك الآن استقبال الاستشارات.",
        "/physician/dashboard",
        "physician_approved",
      );
    } else {
      user.physician_profile.verification_status = "rejected";
      user.physician_profile.rejection_reason = String(
        body.reason ?? body.rejection_reason ?? "لم تستوفِ متطلبات التوثيق.",
      );
      pushNotification(
        state,
        user.id,
        "تم رفض طلب التوثيق",
        "رُفض طلب توثيق حسابك. يمكنك مراجعة السبب وإعادة الإرسال.",
        "/physician/dashboard",
        "physician_rejected",
      );
    }
    saveState(state);
    return { ok: true, data: {} as T };
  }

  if (path === "/admin/physicians/pending") {
    const rows = state.users
      .filter((u) => u.role === "physician" && u.physician_profile?.verification_status === "pending")
      .map(mapAdminPhysician);
    return { ok: true, data: { data: rows, total: rows.length } as T };
  }

  if (path === "/admin/physicians" || path.startsWith("/admin/physicians?")) {
    const qs = path.includes("?") ? new URLSearchParams(path.split("?")[1]) : null;
    const status = qs?.get("status")?.trim() || "approved";
    let rows = state.users.filter((u) => u.role === "physician" && u.physician_profile);
    if (status !== "all") {
      rows = rows.filter((u) => u.physician_profile?.verification_status === status);
    }
    return { ok: true, data: { data: rows.map(mapAdminPhysician) } as T };
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

  return { ok: false, message: `المسار غير متاح: ${method} ${path}`, status: 404 };
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

export const QUICK_LOGIN_ACCOUNTS = [
  {
    role: "مراجع",
    name: "سارة أحمد",
    email: "sara.ahmad@gazacare.ps",
    password: "Care2026",
  },
  {
    role: "طبيب",
    name: "د. محمد الخالدي",
    email: "m.khalidi@gazacare.ps",
    password: "Care2026",
  },
  {
    role: "طبيب مرفوض",
    name: "د. ليلى منصور",
    email: "laila.mansour@gazacare.ps",
    password: "Care2026",
  },
  {
    role: "مدير",
    name: "مدير النظام",
    email: "admin@gazacare.ps",
    password: "Care2026",
  },
] as const;

/** @deprecated use QUICK_LOGIN_ACCOUNTS */
export const DEMO_ACCOUNTS = QUICK_LOGIN_ACCOUNTS;

export function resetMockData() {
  if (typeof window === "undefined") return;
  clearPrevStorageKeys();
  localStorage.removeItem(STORAGE_KEY);
}
