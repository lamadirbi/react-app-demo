export type PlatformStats = {
  completed_consultations: number;
  verified_physicians: number;
  registered_patients: number;
};

export function formatStatValue(n: number): string {
  return new Intl.NumberFormat("ar").format(n);
}

export function buildStatCards(stats: PlatformStats) {
  return [
    {
      value: formatStatValue(stats.completed_consultations),
      label: "استشارة مكتملة",
    },
    {
      value: formatStatValue(stats.verified_physicians),
      label: "طبيب موثّق",
    },
    {
      value: formatStatValue(stats.registered_patients),
      label: "مراجع مسجّل",
    },
  ];
}
