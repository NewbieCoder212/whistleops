import { AdminLayout } from "@/components/layout/AdminLayout";
import { OfficialsTable } from "@/features/officials/OfficialsTable";
import { ImportOfficialsSection } from "@/features/officials/ImportOfficialsSection";

const Officials = () => (
  <AdminLayout>
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Officials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your roster, roles, certification levels, and bulk import from CSV.
        </p>
      </div>
      <ImportOfficialsSection />
      <OfficialsTable />
    </div>
  </AdminLayout>
);

export default Officials;
