// ✅ src/pages/admin/AdminFormBuilder.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { formsRepository } from "../../repositories/forms.repository";
import { formFieldsRepository } from "../../repositories/form-fields.repository";
import { useAuth } from "../../hooks/useAuth";
import { ArrowLeft, ChevronRight, FileText, Loader2, CheckCircle, AlertCircle, User, Building } from "lucide-react";
import { Button } from "../../components/Button";

export function AdminFormBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jsonPreview, setJsonPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // 🧩 Cargar JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setJsonPreview(json);
        setError("");
      } catch {
        setError("El archivo no tiene un formato JSON válido.");
      }
    };
    reader.readAsText(file);
  };

  // 🧠 Crear formulario y luego campos
  const handleCreateForm = async () => {
    if (!jsonPreview || !user?.company_id) {
      setError("No se pudo procesar la información del formulario o empresa.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Paso 1: Crear el formulario
      const formData = {
        form_name: jsonPreview.nombreFormulario,
        description: jsonPreview.descripcion,
        target_type: jsonPreview.tipoTarget.toUpperCase() === "PERSONA" ? "PERSONA" : "EMPRESA",
        owner_company_id: user.company_id,
        created_by: user.id,
      };

      const { data: form, error: formError } = await formsRepository.create(formData);
      if (formError) throw new Error(formError.message);

      // Paso 2: Crear campos asociados
      const fields = jsonPreview.campos.map((c: any, index: number) => ({
        form_id: form[0].id,
        label: c.etiquetaCampo,
        type: c.tipoDato.toLowerCase(),
        placeholder_text: c.placeholder,
        required: c.esRequerido,
        ai_validation_prompt: c.promptIA,
        field_order: index + 1,
      }));

      for (const field of fields) {
        await formFieldsRepository.create(field);
      }

      setSuccess("Formulario creado exitosamente.");
      setTimeout(() => navigate("/superadmin/forms"), 1500);
    } catch (err: any) {
      console.error("Error creando formulario:", err);
      setError(err.message || "Error al crear el formulario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Crear Formulario Rápido">
      <div className="space-y-6">
        {/* 🧭 Ruta superior */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/admin/dashboard" className="hover:text-gray-700">Inicio</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/admin/forms/create" className="hover:text-gray-700">Formularios</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Crear Formulario Rápido</span>
        </nav>

        <Link
          to="/admin/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 gap-1 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Panel
        </Link>

        {/* 🧾 Encabezado */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Crear Formulario Rápido</h2>
          <p className="text-gray-600 mb-4">
            Carga un archivo JSON con la definición del formulario. Podrás editarlo después si lo deseas.
          </p>

          <input type="file" accept=".json" onChange={handleFileUpload} className="mb-4" />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center text-sm text-red-700 mb-4">
              <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center text-sm text-green-700 mb-4">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
              {success}
            </div>
          )}
        </div>

        {/* 📋 Vista previa */}
        {jsonPreview && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Vista previa del formulario</h3>

            <div className="mb-4 text-sm text-gray-700">
              <p><strong>Nombre:</strong> {jsonPreview.nombreFormulario}</p>
              <p><strong>Descripción:</strong> {jsonPreview.descripcion}</p>
              <p className="flex items-center mt-2">
                <strong className="mr-1">Tipo de Target:</strong>
                {jsonPreview.tipoTarget === "Persona" ? (
                  <span className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                    <User className="w-3 h-3 mr-1" /> Persona
                  </span>
                ) : (
                  <span className="inline-flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                    <Building className="w-3 h-3 mr-1" /> Empresa
                  </span>
                )}
              </p>
              <p><strong>Empresa Propietaria:</strong> {user.company_name || "Mi Empresa"}</p>
            </div>

            <table className="w-full border border-gray-200 rounded-lg text-sm text-gray-700">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="py-2 px-3 text-left">Etiqueta</th>
                  <th className="py-2 px-3 text-left">Tipo</th>
                  <th className="py-2 px-3 text-left">Placeholder</th>
                  <th className="py-2 px-3 text-center">Requerido</th>
                </tr>
              </thead>
              <tbody>
                {jsonPreview.campos.map((campo: any, index: number) => (
                  <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">{campo.etiquetaCampo}</td>
                    <td className="py-2 px-3">{campo.tipoDato}</td>
                    <td className="py-2 px-3">{campo.placeholder}</td>
                    <td className="py-2 px-3 text-center">{campo.esRequerido ? "Sí" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mt-6">
              <Button onClick={handleCreateForm} loading={loading}>
                Crear Formulario
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
