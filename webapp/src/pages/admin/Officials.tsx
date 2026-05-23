import { AdminLayout } from "@/components/layout/AdminLayout";
import { OfficialsTable } from "@/features/officials/OfficialsTable";
import { ImportOfficialsSection } from "@/features/officials/ImportOfficialsSection";
import { useTranslation } from "@/i18n/I18nProvider";

export default function Officials() {
  const { t } = useTranslation();

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-5xl">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("officials.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("officials.description")}</p>
        </div>
        <ImportOfficialsSection />
        <OfficialsTable />
      </div>
    </AdminLayout>
  );
}
