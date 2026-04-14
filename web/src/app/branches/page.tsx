import { ProtectedLayout } from "@/components/ProtectedLayout";
import { TenderBranches } from "@/components/branches/TenderBranches";

export default function BranchesPage() {
  return (
    <ProtectedLayout>
      <TenderBranches />
    </ProtectedLayout>
  );
}
