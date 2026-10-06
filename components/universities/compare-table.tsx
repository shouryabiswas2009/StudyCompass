import { getDisplayRanking } from "@/lib/matching";
import { Flag } from "@/components/flag";
import type { Profile, University } from "@/lib/types";

const rows: {
  label: string;
  render: (university: University, profile: Profile | null) => React.ReactNode;
}[] = [
  {
    label: "Country",
    render: (u) => (
      <span className="flex items-center gap-1.5">
        <Flag country={u.country} />
        {u.country}
      </span>
    ),
  },
  { label: "Tuition", render: (u) => `$${u.tuition.toLocaleString()}/yr` },
  {
    label: "QS ranking",
    render: (u, profile) => {
      const ranking = profile
        ? getDisplayRanking(u, profile)
        : { rank: u.qs_ranking, label: "Overall" };
      return `#${ranking.rank} (${ranking.label})`;
    },
  },
  { label: "Acceptance rate", render: (u) => `${u.acceptance_rate}%` },
  {
    label: "Degree levels",
    render: (u) =>
      (u.degree_levels ?? []).length > 0 ? u.degree_levels.join(", ") : "Unknown",
  },
  {
    label: "Popular programs",
    render: (u) => u.popular_programs.join(", "),
  },
];

export function CompareTable({
  universityA,
  universityB,
  profile,
}: {
  universityA: University;
  universityB: University;
  profile: Profile | null;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="w-32 p-4 text-left font-medium text-muted-foreground">
              &nbsp;
            </th>
            <th className="p-4 text-left font-semibold">{universityA.name}</th>
            <th className="p-4 text-left font-semibold">{universityB.name}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b last:border-0">
              <td className="p-4 font-medium text-muted-foreground">
                {row.label}
              </td>
              <td className="p-4">{row.render(universityA, profile)}</td>
              <td className="p-4">{row.render(universityB, profile)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
