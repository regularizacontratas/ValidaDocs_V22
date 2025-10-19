import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { fileAttachmentsRepository } from "../../repositories/file-attachments.repository";
import { storageRepository } from "../../repositories/storage.repository";
import { FileText, Download, ArrowLeft, ArrowRightCircle, Trash2 } from "lucide-react";
import { Button } from "../../components/Button";
import { useAuth } from "../../hooks/useAuth"; // ✅ agregado para obtener el rol del usuario
import { Modal } from "../../components/Modal";
import * as XLSX from "xlsx";

interface FormMatrixRow {
  row_value: string;
  form_statuses: Record<string, string>;
}

interface Company {
  id: string;
  name: string;
}

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth(); // ✅ usamos el contexto de autenticación

  const [labels, setLabels] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [matrix, setMatrix] = useState<FormMatrixRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // 🔸 Estado para la selección y eliminación de registros
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<string[]>([]);

  const STATUS_MAP: Record<
    string,
    { label: string; color: string; icon: string; bg: string }
  > = {
    DRAFT: { label: "Borrador", color: "#6B7280", icon: "📄", bg: "#F3F4F6" },
    SUBMITTED: { label: "Enviado", color: "#2563EB", icon: "📨", bg: "#DBEAFE" },
    VALIDATED: { label: "Validado", color: "#D97706", icon: "🔎", bg: "#FEF3C7" },
    APPROVED: { label: "Aprobado", color: "#059669", icon: "✅", bg: "#D1FAE5" },
    REJECTED: { label: "Rechazado", color: "#DC2626", icon: "❌", bg: "#FEE2E2" },
    PENDING_AI_VALIDATION: { label: "Pendiente IA", color: "#EA580C", icon: "🤖", bg: "#FFEDD5" },
    AI_VALIDATED: { label: "IA Validó", color: "#16A34A", icon: "🧠", bg: "#DCFCE7" },
    AI_VALIDATION_FAILED: { label: "Error IA", color: "#B91C1C", icon: "⚠️", bg: "#FEE2E2" },
  };

  useEffect(() => {
    async function fetchLabels() {
      const { data, error } = await supabase.rpc("get_all_field_labels");
      if (error) console.error("Error cargando labels:", error);
      else setLabels(data?.map((i: any) => i.label) || []);
    }
    fetchLabels();
  }, []);

  useEffect(() => {
    async function fetchCompanies() {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name");
      if (!error && data) setCompanies(data);
    }
    fetchCompanies();
  }, []);

  async function loadMatrix() {
    if (!selectedLabel) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_form_summary_matrix", {
      selected_label: selectedLabel,
      company_filter: selectedCompany || null,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    if (error) console.error("Error generando informe:", error);
    else setMatrix(data || []);
    setLoading(false);
    // Resetear filas seleccionadas al recargar el informe
    setSelectedRows([]);
  }

  /**
   * Alterna la selección de una fila según su valor único.
   * Si el valor ya está seleccionado, lo quita; de lo contrario lo agrega.
   */
  function toggleRow(value: string) {
    setSelectedRows((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  /**
   * Elimina registros y archivos asociados para los valores indicados.
   * Busca todas las submissions cuyos `values_json` contienen el `selectedLabel` con el valor correspondiente.
   * Para cada submission, borra archivos en almacenamiento y sus metadatos antes de borrar la submission.
   */
  async function handleDelete(values: string[]) {
    try {
      if (!selectedLabel) return;
      for (const val of values) {
        // Determinar los IDs de campos cuyo label coincide con el seleccionado
        const { data: fields, error: fieldErr } = await supabase
          .from('form_fields')
          .select('id')
          .eq('label', selectedLabel);
        if (fieldErr) {
          console.error('Error obteniendo campos por label', fieldErr);
          continue;
        }
        const submissionIds = new Set<string>();
        // Por cada campo con ese label, buscar submissions donde raw_values_json contenga ese valor
        for (const field of fields ?? []) {
          const { data: subs, error: fetchError } = await supabase
            .from('form_submissions')
            .select('id')
            // Usamos raw_values_json porque almacena valores en texto
            .contains('raw_values_json', { [field.id]: val });
          if (fetchError) {
            console.error('Error buscando submissions para eliminar:', fetchError);
            continue;
          }
          for (const s of subs ?? []) {
            submissionIds.add(s.id as string);
          }
        }
        // Eliminar cada submission y sus dependencias
        for (const submissionId of submissionIds) {
          // 1. Eliminar registros de validación de IA (logs y validaciones)
          try {
            const { data: validations, error: valErr } = await supabase
              .from('ai_validations')
              .select('id')
              .eq('submission_id', submissionId);
            if (!valErr) {
              for (const validation of validations ?? []) {
                await supabase
                  .from('ai_validation_logs')
                  .delete()
                  .eq('validation_id', validation.id);
              }
            }
            await supabase
              .from('ai_validations')
              .delete()
              .eq('submission_id', submissionId);
          } catch (e) {
            console.error('Error eliminando validaciones IA', e);
          }
          // 2. Eliminar validaciones de documentos asociadas
          try {
            await supabase
              .from('document_validations')
              .delete()
              .eq('submission_id', submissionId);
          } catch (e) {
            console.error('Error eliminando document_validations', e);
          }
          // 3. Eliminar archivos adjuntos y sus metadatos
          try {
            const attachments = await fileAttachmentsRepository.getBySubmission(submissionId);
            for (const att of attachments) {
              if (att.storage_path) {
                try {
                  await storageRepository.deleteFile(att.storage_path);
                } catch (err) {
                  console.error('Error eliminando archivo del storage', err);
                }
              }
              try {
                await fileAttachmentsRepository.delete(att.id);
              } catch (err) {
                console.error('Error eliminando metadatos de archivo', err);
              }
            }
          } catch (e) {
            console.error('Error obteniendo o eliminando adjuntos', e);
          }
          // 4. Eliminar la submission
          try {
            await supabase
              .from('form_submissions')
              .delete()
              .eq('id', submissionId);
          } catch (e) {
            console.error('Error eliminando submission', e);
          }
        }
      }
      // Recargar la matriz y limpiar selección
      await loadMatrix();
    } catch (err) {
      console.error('Error eliminando registros:', err);
    }
  }

  const exportToExcel = () => {
    if (matrix.length === 0) return;

    const allForms = Array.from(
      new Set(matrix.flatMap((r) => Object.keys(r.form_statuses)))
    );

    const worksheetData = [
      ["Valor", ...allForms],
      ...matrix.map((row) => [
        row.row_value,
        ...allForms.map((form) => {
          const status = row.form_statuses[form];
          const info = STATUS_MAP[status];
          return info ? `${info.icon} ${info.label}` : "";
        }),
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    ws["!cols"] = [{ wch: 25 }, ...allForms.map(() => ({ wch: 20 }))];
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(
      wb,
      `reporte_${selectedLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const statusCounters = Object.entries(
    matrix.reduce((acc, row) => {
      Object.values(row.form_statuses).forEach((status) => {
        acc[status] = (acc[status] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>)
  );

  // ✅ navegación segura según rol
  const handleBack = () => {
    if (user?.role === "SUPER_ADMIN") navigate("/superadmin/dashboard");
    else if (user?.role === "ADMIN") navigate("/admin/dashboard");
    else navigate("/user/dashboard");
  };

  return (
    <div className="p-6">
      {/* 🔹 Header principal */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </Button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Informes de Formularios
          </h1>
        </div>

        <div className="flex gap-3">
          {/* 🔹 Nuevo botón: ir al informe empresa ↔ empresa */}
          <Button
            variant="secondary"
            onClick={() => navigate("/reports/relations")}
          >
            <ArrowRightCircle className="w-4 h-4" />
            Ver informe entre empresas
          </Button>

          <Button onClick={loadMatrix} loading={loading}>
            Generar Informe
          </Button>
          <Button onClick={exportToExcel} variant="secondary">
            <Download className="w-4 h-4" />
            Exportar XLSX
          </Button>
        </div>
      </div>

      {/* 🔸 Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-700">Campo</label>
          <select
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
          >
            <option value="">Seleccionar...</option>
            {labels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Empresa</label>
          <select
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
          >
            <option value="">Todas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Desde</label>
          <input
            type="date"
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Hasta</label>
          <input
            type="date"
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* 🔹 Chips resumen */}
      {statusCounters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {statusCounters.map(([status, count]) => {
            const info = STATUS_MAP[status] || {
              label: status,
              color: "#6B7280",
              icon: "📄",
              bg: "#F3F4F6",
            };
            return (
              <div
                key={status}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ backgroundColor: info.bg, color: info.color }}
              >
                <span>{info.icon}</span>
                {info.label}: {count}
              </div>
            );
          })}
        </div>
      )}

      {/* 🔸 Tabla con selección y acciones de eliminación */}
      {matrix.length > 0 ? (
        <div className="overflow-auto border rounded-lg shadow-sm bg-white">
          {/* Mostrar botón de eliminar múltiple cuando hay filas seleccionadas */}
          {selectedRows.length > 0 && (
            <div className="flex justify-end p-3">
              <Button
                variant="danger"
                onClick={() => {
                  setRowsToDelete(selectedRows);
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar seleccionados ({selectedRows.length})
              </Button>
            </div>
          )}
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-800">
              <tr>
                <th className="p-3 text-left font-semibold border-b w-8"></th>
                <th className="p-3 text-left font-semibold border-b">Valor</th>
                {Array.from(
                  new Set(matrix.flatMap((r) => Object.keys(r.form_statuses)))
                ).map((form) => (
                  <th key={form} className="p-3 text-left font-semibold border-b">
                    {form}
                  </th>
                ))}
                <th className="p-3 text-center font-semibold border-b">Acción</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-blue-600"
                      checked={selectedRows.includes(row.row_value)}
                      onChange={() => toggleRow(row.row_value)}
                    />
                  </td>
                  <td className="p-3 font-medium text-gray-800">
                    {row.row_value}
                  </td>
                  {Array.from(
                    new Set(matrix.flatMap((r) => Object.keys(r.form_statuses)))
                  ).map((form) => {
                    const status = row.form_statuses[form];
                    const info = STATUS_MAP[status];
                    return (
                      <td key={form} className="p-3">
                        {status ? (
                          <div
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: info?.bg || "#F9FAFB",
                              color: info?.color || "#6B7280",
                            }}
                          >
                            <span>{info?.icon}</span>
                            {info?.label}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setRowsToDelete([row.row_value]);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-800"
                      title="Eliminar registro"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <p className="text-gray-500 text-center mt-8">
            No hay datos para mostrar.
          </p>
        )
      )}

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar eliminación"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            {rowsToDelete.length === 1
              ? `¿Estás seguro de que deseas eliminar el registro "${rowsToDelete[0]}" y sus archivos asociados?`
              : `¿Estás seguro de que deseas eliminar los ${rowsToDelete.length} registros seleccionados y sus archivos asociados?`}
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await handleDelete(rowsToDelete);
                setShowDeleteModal(false);
              }}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
