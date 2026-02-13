import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Dashboard } from "@/components/Dashboard";
import { getDbTable } from "@/lib/dbTable";

export default async function Home() {
  const { columns, rows } = await getDbTable("clients");

  return (
    <ProtectedLayout>
      <Dashboard initialColumns={columns} initialRows={rows} />
    </ProtectedLayout>
  );
}
