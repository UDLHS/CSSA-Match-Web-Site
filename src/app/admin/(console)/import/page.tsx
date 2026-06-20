import { CsvImportScreen } from "@/components/admin/import/csv-import-screen";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import squads — Fiesta Admin" };

export default function AdminImportPage() {
  return <CsvImportScreen />;
}
