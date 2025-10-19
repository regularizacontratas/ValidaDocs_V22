import { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/Button";
import { FileText, LogOut, User, BarChart3 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // ✅ Mostrar botón de informes a todos los roles autenticados
  const canSeeReports =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "ADMIN" ||
    user?.role === "USER";

  // ✅ Detectar si la ruta actual pertenece a /reports
  const isReportsActive = location.pathname.startsWith("/reports");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔹 Barra de navegación superior */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 🔹 Logo y título */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ValidaDocs</h1>
                <p className="text-xs text-gray-500">{title}</p>
              </div>
            </div>

            {/* 🔹 Navegación y usuario */}
            <div className="flex items-center gap-6">
              {/* 📊 Enlace a Informes */}
              {canSeeReports && (
                <Link
                  to="/reports"
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isReportsActive
                      ? "text-blue-600 bg-blue-50 border border-blue-200"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  }`}
                >
                  <BarChart3
                    className={`w-4 h-4 ${
                      isReportsActive ? "text-blue-600" : "text-gray-500"
                    }`}
                  />
                  <span>Informes</span>
                </Link>
              )}

              {/* 👤 Datos de usuario */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    {user?.name || user?.email}
                  </p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
              </div>

              {/* 🔒 Botón salir */}
              <Button
                variant="secondary"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* 🔹 Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
