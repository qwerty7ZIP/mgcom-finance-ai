import { ProtectedLayout } from "@/components/ProtectedLayout";
import { TendersGantt } from "@/components/diagram/TendersGantt";

export default function DiagramPage() {
  return (
    <ProtectedLayout>
      <TendersGantt />
    </ProtectedLayout>
  );
}

