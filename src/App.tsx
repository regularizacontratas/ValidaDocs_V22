// ✅ src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import AdminFormsManagement from "./pages/admin/AdminFormsManagement";

// Auth pages
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";

// SuperAdmin pages
import { SuperAdminDashboard } from "./pages/superadmin/SuperAdminDashboard";
import { CompaniesManagement } from "./pages/superadmin/CompaniesManagement";
import { FormsManagement } from "./pages/superadmin/FormsManagement";
import { FormBuilder } from "./pages/superadmin/FormBuilder";
import { UsersManagement } from "./pages/superadmin/UsersManagement";
import { SuperAdminSubmissions } from "./pages/superadmin/SuperAdminSubmissions";
import RapidForms from "./pages/superadmin/RapidForms";

// Admin pages
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminSubmissions } from "./pages/admin/AdminSubmissions";
import { FormAssignments } from "./pages/admin/FormAssignments";
import AuditPanel from "./pages/admin/AuditPanel"; // ✅ el correcto

// User pages
import { UserDashboard } from "./pages/user/UserDashboard";
import { UserForms } from "./pages/user/UserForms";
import { FillForm } from "./pages/user/FillForm";
import { UserSubmissions } from "./pages/user/UserSubmissions";
import { SubmissionDetail } from "./pages/user/SubmissionDetail";

// Reports
import ReportsDashboard from "./pages/reports/ReportsDashboard";
import ReportsRelations from "./pages/reports/ReportsRelations";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login y Registro */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* SUPER_ADMIN */}
          <Route
            path="/superadmin/dashboard"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/companies"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <CompaniesManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/users"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <UsersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/forms"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <FormsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/forms/:formId"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <FormBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/submissions"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <SuperAdminSubmissions />
              </ProtectedRoute>
            }
          />
          {/* Ruta para creación rápida de formularios */}
          <Route
            path="/superadmin/rapid-forms"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <RapidForms />
              </ProtectedRoute>
            }
          />

          {/* ADMIN */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          {/* Nueva experiencia: lista + crear desde modal */}
          <Route
            path="/admin/forms"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminFormsManagement />
              </ProtectedRoute>
            }
          />
          {/* Redirigimos la ruta antigua de creación a la nueva lista */}
          <Route
            path="/admin/forms/create"
            element={<Navigate to="/admin/forms" replace />}
          />
          <Route
            path="/admin/forms/assignments"
            element={
              <ProtectedRoute role="ADMIN">
                <FormAssignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/submissions"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminSubmissions />
              </ProtectedRoute>
            }
          />

          {/* ✅ Nueva ruta única de auditoría */}
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute role={["ADMIN", "SUPER_ADMIN"]}>
                <AuditPanel />
              </ProtectedRoute>
            }
          />

          {/* USER */}
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute role="USER">
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/forms"
            element={
              <ProtectedRoute role="USER">
                <UserForms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/forms/:formId"
            element={
              <ProtectedRoute role={["USER", "ADMIN"]}>
                <FillForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/submissions"
            element={
              <ProtectedRoute role="USER">
                <UserSubmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/submissions/:submissionId"
            element={
              <ProtectedRoute role="USER">
                <SubmissionDetail />
              </ProtectedRoute>
            }
          />

          {/* Reports */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute role={["USER", "ADMIN", "SUPER_ADMIN"]}>
                <ReportsDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/relations"
            element={
              <ProtectedRoute role={["USER", "ADMIN", "SUPER_ADMIN"]}>
                <ReportsRelations />
              </ProtectedRoute>
            }
          />

          {/* Default */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
