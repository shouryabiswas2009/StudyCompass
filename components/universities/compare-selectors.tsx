"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UniversityOption = { id: string; name: string };

export function CompareSelectors({
  universities,
  selectedA,
  selectedB,
}: {
  universities: UniversityOption[];
  selectedA?: string;
  selectedB?: string;
}) {
  const router = useRouter();

  function updateQuery(next: { a?: string; b?: string }) {
    const params = new URLSearchParams();
    const a = next.a ?? selectedA;
    const b = next.b ?? selectedB;
    if (a) params.set("a", a);
    if (b) params.set("b", b);
    router.push(`/compare?${params.toString()}`);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-sm font-medium">University A</p>
        <Select
          value={selectedA}
          onValueChange={(value) => updateQuery({ a: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a university" />
          </SelectTrigger>
          <SelectContent>
            {universities.map((u) => (
              <SelectItem key={u.id} value={u.id} disabled={u.id === selectedB}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">University B</p>
        <Select
          value={selectedB}
          onValueChange={(value) => updateQuery({ b: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a university" />
          </SelectTrigger>
          <SelectContent>
            {universities.map((u) => (
              <SelectItem key={u.id} value={u.id} disabled={u.id === selectedA}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
