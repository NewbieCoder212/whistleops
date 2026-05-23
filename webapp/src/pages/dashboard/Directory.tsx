import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OfficialsDirectoryPanel } from "@/features/directory/OfficialsDirectoryPanel";

export default function OfficialDirectory() {
  return (
    <DashboardLayout>
      <OfficialsDirectoryPanel variant="dashboard" />
    </DashboardLayout>
  );
}
