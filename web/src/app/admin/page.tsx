import { ProtectedLayout } from "@/components/ProtectedLayout";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default function AdminPage() {
  return (
    <ProtectedLayout>
      <AdminPanel />
    </ProtectedLayout>
  );
}

