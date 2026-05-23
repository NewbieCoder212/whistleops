import { AdminLayout } from "@/components/layout/AdminLayout";
import { OfficialsDirectoryPanel } from "@/features/directory/OfficialsDirectoryPanel";

export default function AdminDirectory() {
  return (
    <AdminLayout>
      <OfficialsDirectoryPanel variant="admin" />
    </AdminLayout>
  );
}
