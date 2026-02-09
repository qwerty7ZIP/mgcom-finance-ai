import { ProtectedHome } from "@/components/ProtectedHome";
import { getDbTable } from "@/lib/dbTable";

export default async function Home() {
  const { columns, rows } = await getDbTable("clients");

  return (
    <ProtectedHome initialColumns={columns} initialRows={rows} />
  );
}
