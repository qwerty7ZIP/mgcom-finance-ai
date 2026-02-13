import { ProtectedLayout } from "@/components/ProtectedLayout";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <ProtectedLayout>
      <AnalyticsDashboard />
    </ProtectedLayout>
  );
}
