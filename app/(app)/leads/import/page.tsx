import Link from "next/link";
import { CsvImport } from "@/components/CsvImport";

export default function ImportPage() {
  return (
    <main className="space-y-4 px-4 pt-4">
      <Link href="/leads" className="text-sm text-muted">← Лиды</Link>
      <h1 className="font-display text-2xl font-bold uppercase">Импорт лидов</h1>
      <p className="text-sm text-muted">
        Google Sheets → Файл → Скачать → CSV. Лиды станут вашими. Дубликаты по телефону пропускаются.
      </p>
      <CsvImport />
    </main>
  );
}
