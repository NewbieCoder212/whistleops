import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import Officials from "./pages/admin/Officials";
import AdminConfig from "./pages/admin/AdminConfig";
import ImportGames from "./pages/admin/ImportGames";
import Schedule from "./pages/admin/Schedule";
import Finance from "./pages/admin/Finance";
import AvailabilityOverview from "./pages/admin/AvailabilityOverview";
import OfficialSchedule from "./pages/dashboard/Schedule";
import OfficialHome from "./pages/dashboard/Home";
import Availability from "./pages/dashboard/Availability";
import OfficialProfile from "./pages/dashboard/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Admin Command Center — requires admin/staff role */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/officials" element={<Officials />} />
            <Route path="/admin/config" element={<AdminConfig />} />
            <Route path="/admin/import-games" element={<ImportGames />} />
            <Route path="/admin/schedule" element={<Schedule />} />
            <Route path="/admin/finance" element={<Finance />} />
            <Route path="/admin/availability" element={<AvailabilityOverview />} />
          </Route>

          {/* Official Self-Service Portal — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Navigate to="/dashboard/schedule" replace />} />
            <Route path="/dashboard/home" element={<Navigate to="/dashboard/schedule" replace />} />
            <Route path="/dashboard/schedule" element={<OfficialSchedule />} />
            <Route path="/dashboard/availability" element={<Availability />} />
            <Route path="/dashboard/profile" element={<OfficialProfile />} />
            {/* Legacy — keep it working */}
            <Route path="/dashboard/home-old" element={<OfficialHome />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
