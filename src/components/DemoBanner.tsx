"use client";

import { MOCK_MODE } from "@/lib/api";
import { resetMockData } from "@/lib/mockApi";

export function DemoBanner() {
  if (!MOCK_MODE) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
      <span className="font-semibold">نسخة تجريبية</span>
      {" — "}
      بيانات محاكاة للعرض فقط، لا تُستخدم لأغراض طبية حقيقية.
      <button
        type="button"
        onClick={() => {
          resetMockData();
          window.location.reload();
        }}
        className="mr-2 underline hover:no-underline"
      >
        إعادة ضبط البيانات
      </button>
    </div>
  );
}
