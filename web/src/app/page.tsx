import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Dashboard } from "@/components/Dashboard";

export default async function Home() {
  return (
    <ProtectedLayout>
      <Dashboard />
    </ProtectedLayout>
  );
}
