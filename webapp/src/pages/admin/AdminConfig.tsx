import { AdminLayout } from "@/components/layout/AdminLayout";
import { CertificationLevelsPanel } from "@/features/certification/CertificationLevelsPanel";
import { LeagueQualificationsPanel } from "@/features/certification/LeagueQualificationsPanel";
import { PayRatesPanel } from "@/features/finance/PayRatesPanel";
import { RosterDisplayPanel } from "@/features/config/RosterDisplayPanel";
import { AvailabilityWindowPanel } from "@/features/config/AvailabilityWindowPanel";
import { PositionLabelsPanel } from "@/features/config/PositionLabelsPanel";
import { IncidentNotifyPanel } from "@/features/config/IncidentNotifyPanel";
import { VenuesPanel } from "@/features/venues/VenuesPanel";

const AdminConfig = () => (
  <AdminLayout>
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pay rates, certification, league rules, rinks, roster display, availability, and incident notifications.
        </p>
      </div>

      <PayRatesPanel />
      <VenuesPanel />
      <PositionLabelsPanel />
      <RosterDisplayPanel />
      <AvailabilityWindowPanel />
      <IncidentNotifyPanel />
      <CertificationLevelsPanel />
      <LeagueQualificationsPanel />
    </div>
  </AdminLayout>
);

export default AdminConfig;
