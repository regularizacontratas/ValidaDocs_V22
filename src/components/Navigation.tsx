// ✅ src/components/Navigation.tsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  FileText,
  ClipboardList,
  Users,
  Building2,
  Menu,
  X,
  LogOut,
  Plus,
  Settings,
  Send,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function Navigation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 📱 mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // 🖥️ desktop: colapsar/expandir
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  // 🧩 Menús según rol
  const getMenuItems = () => {
    if (!user) return [];

    switch (user.role) {
      case "SUPER_ADMIN":
        return [
         //  { path: "/superadmin/dashboard", label: "Dashboard", icon: Home },
          { path: "/superadmin/companies", label: "Empresas", icon: Building2 },
          { path: "/superadmin/users", label: "Usuarios", icon: Users },
          { path: "/superadmin/forms", label: "Formularios", icon: FileText },
          // { path: "/superadmin/submissions", label: "Enviados", icon: Send },
          { path: "/superadmin/rapid-forms", label: "Rapid Forms", icon: Plus },
          { path: "/admin/audit", label: "Auditoría", icon: CheckCircle },
          { path: "/reports", label: "Informes", icon: BarChart3 },
          { path: "/reports/relations", label: "Reporte Empresas", icon: Building2 },
        ];

      case "ADMIN":
        return [
          { path: "/admin/dashboard", label: "Dashboard", icon: Home },
          { path: "/admin/forms", label: "Formularios", icon: FileText },
          { path: "/admin/forms/assignments", label: "Asignaciones", icon: Settings },
          { path: "/admin/submissions", label: "Enviados", icon: Send },
          { path: "/admin/audit", label: "Auditoría", icon: CheckCircle },
          { path: "/reports", label: "Informes", icon: BarChart3 },
          { path: "/reports/relations", label: "Reporte Empresas", icon: Building2 },
        ];

      case "USER":
        return [
          { path: "/user/dashboard", label: "Mis Formularios", icon: Home },
          { path: "/user/submissions", label: "Enviados", icon: ClipboardList },
          { path: "/reports", label: "Informes", icon: BarChart3 },
          { path: "/reports/relations", label: "Reporte Empresas", icon: Building2 },
        ];

      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* 🖥️ Desktop Navigation (colapsable) */}
      <div
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-gray-900 transition-[width] duration-200 ease-in-out
        ${collapsed ? "lg:w-16" : "lg:w-64"}`}
      >
        <div className="relative flex flex-col flex-grow pt-5 overflow-y-auto">
          {/* Toggle botón (solo desktop) */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex items-center justify-center absolute -right-3 top-6 h-6 w-6 rounded-full bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
            aria-label="Alternar barra lateral"
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Logo */}
          <div className={`flex items-center px-4 pb-4 border-b border-gray-700 ${collapsed ? "justify-center" : ""}`}>
            <FileText className="h-8 w-8 text-blue-500" />
            {!collapsed && (
              <span className="ml-2 text-xl font-semibold text-white">CheckDocs</span>
            )}
          </div>

          {/* User Info */}
          <div className={`px-4 py-4 border-b border-gray-700 ${collapsed ? "text-center" : ""}`}>
            {!collapsed ? (
              <>
                <p className="text-sm text-gray-400">Hola,</p>
                <p className="text-white font-medium break-all">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {user?.role === "SUPER_ADMIN"
                    ? "Super Admin"
                    : user?.role === "ADMIN"
                    ? "Administrador"
                    : "Usuario"}
                </p>
              </>
            ) : (
              // En colapsado, solo un puntito de estado/rol como pista visual
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              </div>
            )}
          </div>

          {/* Menu */}
          <nav className="flex-1 px-2 py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={`group flex items-center mb-1 text-sm font-medium rounded-md transition-colors
                    ${collapsed ? "justify-center py-2" : "px-2 py-2"}
                    ${active ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
                >
                  <Icon className={`${collapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`} />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className={`${collapsed ? "px-0" : "px-2"} pb-4`}>
            <button
              onClick={handleLogout}
              title={collapsed ? "Cerrar sesión" : undefined}
              className={`w-full flex items-center text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border-t border-gray-700 pt-4
              ${collapsed ? "justify-center py-2" : "px-2 py-2"}`}
            >
              <LogOut className={`${collapsed ? "h-5 w-5" : "mr-3 h-5 w-5"}`} />
              {!collapsed && "Cerrar Sesión"}
            </button>
          </div>
        </div>
      </div>

      {/* 📱 Mobile Navigation (igual que antes) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <FileText className="h-7 w-7 text-blue-500" />
            <span className="ml-2 text-lg font-semibold text-white">
              CheckDocs
            </span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-800">
            <div className="px-3 py-2 border-b border-gray-700 mb-2">
              <p className="text-sm text-gray-400">Hola,</p>
              <p className="text-white font-medium text-sm">
                {user?.name || user?.email}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {user?.role === "SUPER_ADMIN"
                  ? "Super Admin"
                  : user?.role === "ADMIN"
                  ? "Administrador"
                  : "Usuario"}
              </p>
            </div>

            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors ${
                    active ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}

            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 mt-2 text-base font-medium rounded-md text-gray-300 hover:bg-gray-700 border-t border-gray-700"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </>
  );
}
