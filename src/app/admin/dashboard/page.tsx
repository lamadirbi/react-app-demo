"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

type Paginated<T> = { data: T[]; total?: number };

export default function AdminDashboardPage() {
  const { user } = useRequireAuth({ allowedRoles: ["admin"] });
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [usersCount, setUsersCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      apiFetch<Paginated<unknown>>("/admin/physicians/pending"),
      apiFetch<Paginated<unknown>>("/admin/users"),
    ]).then(([pending, users]) => {
      if (!mounted) return;
      if (pending.ok) setPendingCount(pending.data.total ?? pending.data.data?.length ?? 0);
      if (users.ok) setUsersCount(users.data.total ?? users.data.data?.length ?? 0);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      <AppHeader title="لوحة المدير" backHref="/" userRole={user?.role} />

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Card>
          <CardBody className="p-6">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">لوحة المدير</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              أهلاً {user?.name} — إدارة المستخدمين وتوثيق الأطباء.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Card className="hover:brightness-[1.03]">
                <CardBody className="p-5">
                  <div className="text-sm text-zinc-500">طلبات توثيق أطباء</div>
                  <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {pendingCount ?? "..."}
                  </div>
                  <Link href="/admin/physicians" className="mt-4 inline-block text-sm font-semibold text-(--gc-accent)">
                    مراجعة الطلبات
                  </Link>
                </CardBody>
              </Card>

              <Card className="hover:brightness-[1.03]">
                <CardBody className="p-5">
                  <div className="text-sm text-zinc-500">المستخدمون</div>
                  <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {usersCount ?? "..."}
                  </div>
                  <Link href="/admin/users" className="mt-4 inline-block text-sm font-semibold text-(--gc-accent)">
                    إدارة المستخدمين
                  </Link>
                </CardBody>
              </Card>
            </div>

            <Alert variant="info" className="mt-6">
              يمكنك تعطيل حسابات المرضى والأطباء، ومراجعة شهادات الأطباء الجدد قبل السماح لهم برؤية سجلات المرضى.
            </Alert>
          </CardBody>
        </Card>
      </main>
    </div>
  );
}
