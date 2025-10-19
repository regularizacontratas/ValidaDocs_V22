// src/pages/reports/ReportsRelations.tsx
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Building2,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface VisibleForm {
  form_id: string;
  form_name: string;
  emitter_company_name: string;
  receiver_company_name: string;
  source_type: "assignment" | "request";
}

export default function ReportsRelations() {
  const navigate = useNavigate();
  const [relations, setRelations] = useState<VisibleForm[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRelations();
  }, []);

  async function loadRelations() {
    setLoading(true);
    const { data, error } = await supabase
      .from("visible_forms")
      .select("*")
      .order("form_name");

    if (error) console.error("Error cargando relaciones:", error);
    else setRelations(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <RefreshCw className="w-6 h-6 animate-spin mb-2" />
        Cargando relaciones entre empresas...
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate("/reports")}>
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </Button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Reporte Empresas
          </h1>
        </div>
        <Button onClick={loadRelations} variant="secondary">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </Button>
      </div>

      {/* Tabla */}
      {relations.length > 0 ? (
        <div className="overflow-auto border rounded-lg shadow-sm bg-white">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-800">
              <tr>
                <th className="p-3 text-left font-semibold border-b">Formulario</th>
                <th className="p-3 text-left font-semibold border-b">Emisor</th>
                <th className="p-3 text-center font-semibold border-b">Dirección</th>
                <th className="p-3 text-left font-semibold border-b">Receptor</th>
                <th className="p-3 text-left font-semibold border-b">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {relations.map((r) => (
                <tr key={r.form_id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-800">{r.form_name}</td>
                  <td className="p-3 text-gray-700">
                    {r.emitter_company_name || "—"}
                  </td>
                  <td className="p-3 text-center">
                    {r.source_type === "assignment" ? (
                      <ArrowRight className="w-5 h-5 text-green-600 inline-block" />
                    ) : (
                      <ArrowRightLeft className="w-5 h-5 text-blue-600 inline-block" />
                    )}
                  </td>
                  <td className="p-3 text-gray-700">
                    {r.receiver_company_name || "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        r.source_type === "assignment"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {r.source_type === "assignment" ? "Asignación" : "Solicitud"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No se encontraron relaciones entre empresas.
        </div>
      )}
    </div>
  );
}
