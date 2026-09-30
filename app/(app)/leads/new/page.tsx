import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";

export default function NewLeadPage() {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Link href="/leads" className="text-sm text-muted">← Лиды</Link>
      <h1 className="font-display text-2xl font-bold uppercase">Новый лид</h1>
      <LeadForm />
    </main>
  );
}
