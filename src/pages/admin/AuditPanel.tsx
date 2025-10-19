import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  ArrowLeft,
  Brain,
  CheckCircle,
  Eye,
  Loader2,
  Paperclip,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "../../components/Button";
import { useAuth } from "../../hooks/useAuth";

type AnyObj = Record<string, any>;

interface RowBase {
  id: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  submitted_at: string | null;
  form_id: string;
  ai_validation_id?: string | null;
  /**
   * Puntaje general de la IA (0..1) asociado a la submission. Se mostrará en la lista
   * para que el auditor lo identifique rápidamente. Puede ser null si aún no
   * existe una validación IA.
   */
  ai_score?: number | null;

  /**
   * Fecha en la que se actualizó el registro. Se usa para calcular el
   * tiempo transcurrido desde el envío hasta que cambió de estado. Si
   * `status` sigue siendo SUBMITTED, se calculará el tiempo hasta el
   * momento actual.
   */
  updated_at?: string | null;
}

interface TableRow extends RowBase {
  /** Nombre del formulario al que corresponde la submission */
  form_name: string;
  /**
   * Los primeros campos del formulario. Se calculan a partir de los valores
   * almacenados en `values_json` o `raw_values_json` y la definición de
   * `form_fields`. Incluye el label y el valor para poder mostrar un
   * resumen en la lista. Pueden ser menos de cuatro si no hay tantos campos.
   */
  firstFields: { label: string; value: any }[];

  /**
   * Número de días transcurridos desde que se envió el formulario hasta
   * ahora o hasta la fecha en que cambió de estado. Si no se puede
   * calcular, es null.
   */
  daysElapsed: number | null;
}

interface SelectedDetail extends RowBase {
  form_name: string;
  values: AnyObj | null;
  files: { file_url: string; file_name?: string | null }[];
  detalle_ia?: any;
  fecha_procesado?: string | null;
}

/**
 * Información de la validación con IA obtenida desde la tabla `ai_validations`.
 * Se amplió respecto a la versión anterior para incluir la puntuación general,
 * la recomendación, la fecha de procesamiento, un listado de validaciones
 * por campo y una lista de observaciones. Estos datos son los mismos que
 * se muestran en la página de detalle para el rol USER y permiten al
 * auditor humano revisar el análisis de la IA.
 */
interface AIValidation {
  /**
   * Puntuación general de la validación (0..1). Se mostrará como porcentaje.
   */
  overall_score?: number | null;
  /**
   * Recomendación sugerida por la IA: 'APPROVE', 'REVIEW' o 'REJECT'.
   */
  recommendation?: string | null;
  /**
   * Fecha en que se procesó la validación. Puede ser null si aún no ha
   * terminado.
   */
  processed_at?: string | null;
  /**
   * Resultados en detalle. Incluye un arreglo de validaciones por campo.
   */
  ai_results?: {
    field_validations?: {
      /** Etiqueta del campo validado */
      label: string;
      /** Si el campo fue considerado válido por la IA */
      is_valid: boolean;
      /** Confianza del modelo (0..1) */
      confidence?: number;
      /** Observaciones o notas de la IA */
      notes?: string;
    }[];
  } | null;
  /**
   * Lista de observaciones generales detectadas por la IA (si las hay).
   */
  issues_found?: string[] | null;
}

const STATUS_UI: Record<
  TableRow["status"],
  { label: string; pill: string; icon: JSX.Element }
> = {
  SUBMITTED: {
    label: "Enviado",
    pill:
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800",
    icon: <Send className="w-3.5 h-3.5" />,
  },
  APPROVED: {
    label: "Aprobado",
    pill:
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  REJECTED: {
    label: "Rechazado",
    pill:
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

export default function AuditPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<TableRow["status"]>("SUBMITTED");
  const [formFilter, setFormFilter] = useState<string>("Todos");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedDetail | null>(null);
  const [ai, setAI] = useState<AIValidation | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  // ---------------------- CARGA LISTA ----------------------
  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: subs, error: errSubs } = await supabase
        .from("form_submissions")
        .select(
          "id, status, submitted_at, updated_at, form_id, ai_validation_id, values_json, raw_values_json"
        )
        .in("status", ["SUBMITTED", "APPROVED", "REJECTED"])
        .order("submitted_at", { ascending: false });

      if (errSubs || !subs) {
        console.error("Error form_submissions", errSubs);
        setRows([]);
        setLoading(false);
        return;
      }

      const formIds = [...new Set(subs.map((s) => s.form_id))];
      // Mapear nombre de formulario
      const { data: forms } = await supabase
        .from("forms")
        .select("id, form_name")
        .in("id", formIds);
      const nameMap = new Map<string, string>(
        (forms || []).map((f: any) => [f.id, f.form_name || "Sin título"])
      );

      // Obtener los campos de cada formulario (id, etiqueta y orden) para determinar
      // el orden de los campos dinámicos y sus etiquetas
      let fieldsByForm: Record<
        string,
        { id: string; label: string; order: number }[]
      > = {};
      if (formIds.length > 0) {
        const { data: allFields, error: errFields } = await supabase
          .from("form_fields")
          .select("id, form_id, label, field_order")
          .in("form_id", formIds);
        if (errFields) {
          console.error("Error cargando form_fields", errFields);
        }
        if (allFields) {
          allFields.forEach((f: any) => {
            if (!fieldsByForm[f.form_id]) fieldsByForm[f.form_id] = [];
            fieldsByForm[f.form_id].push({
              id: f.id,
              label: f.label,
              order: f.field_order ?? 0,
            });
          });
          // Ordenar por field_order
          Object.keys(fieldsByForm).forEach((key) => {
            fieldsByForm[key].sort((a, b) => a.order - b.order);
          });
        }
      }

      // Obtener los IDs de submissions para consultar las validaciones IA
      const submissionIds = subs.map((s) => s.id);
      let scoreMap = new Map<string, number | null>();
      if (submissionIds.length > 0) {
        const { data: aiData, error: aiError } = await supabase
          .from("ai_validations")
          .select("submission_id, overall_score")
          .in("submission_id", submissionIds);
        if (aiError) {
          console.error("Error cargando ai_validations", aiError);
        }
        if (aiData) {
          scoreMap = new Map(
            aiData.map((d: any) => [d.submission_id, d.overall_score])
          );
        }
      }

      // Construir filas con nombre de formulario, puntaje IA y primeros cuatro campos
      const newRows: TableRow[] = subs.map((s: any) => {
        // Determinar el mejor objeto de valores (values_json, raw_values_json o null)
        let values: any = s.values_json ?? s.raw_values_json ?? null;
        if (typeof values === "string") {
          try {
            values = JSON.parse(values);
          } catch {
            values = null;
          }
        }
        // Buscar los campos ordenados de este formulario
        const orderedFields = fieldsByForm[s.form_id] || [];
        const firstFields: { label: string; value: any }[] = [];
        if (values && typeof values === "object") {
          // Recorrer campos según el orden definido en form_fields
          for (const f of orderedFields) {
            if (Object.prototype.hasOwnProperty.call(values, f.id)) {
              firstFields.push({ label: f.label, value: values[f.id] });
              if (firstFields.length >= 4) break;
            }
          }
          // Si no había definición de orden, usar los primeros cuatro pares
          if (firstFields.length === 0) {
            for (const [id, val] of Object.entries(values)) {
              // Obtener etiqueta o fallback al id
              const fLabel = orderedFields.find((ff) => ff.id === id)?.label || id;
              firstFields.push({ label: fLabel, value: val });
              if (firstFields.length >= 4) break;
            }
          }
        }
        // Calcular días transcurridos. Si no existe submitted_at, no se calcula.
        let daysElapsed: number | null = null;
        if (s.submitted_at) {
          try {
            const start = new Date(s.submitted_at as string).getTime();
            let end: number;
            // Para estados aprobados o rechazados usamos updated_at si existe; de lo contrario, usamos la fecha actual
            if (s.status !== "SUBMITTED" && s.updated_at) {
              end = new Date(s.updated_at as string).getTime();
            } else {
              end = Date.now();
            }
            const diffMs = end - start;
            if (!isNaN(diffMs) && diffMs >= 0) {
              daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            }
          } catch {
            daysElapsed = null;
          }
        }
        return {
          id: s.id,
          status: s.status,
          submitted_at: s.submitted_at,
          updated_at: s.updated_at,
          form_id: s.form_id,
          ai_validation_id: s.ai_validation_id,
          form_name: nameMap.get(s.form_id) || "Sin título",
          ai_score: scoreMap.get(s.id) ?? null,
          firstFields,
          daysElapsed,
        } as TableRow;
      });

      setRows(newRows);
      setLoading(false);
    })();
  }, []);

  const availableForms = useMemo(
    () => ["Todos", ...Array.from(new Set(rows.map((r) => r.form_name)))],
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.status === statusFilter &&
          (formFilter === "Todos" || r.form_name === formFilter) &&
          r.form_name.toLowerCase().includes(q.toLowerCase())
      ),
    [rows, statusFilter, formFilter, q]
  );

  // ---------------------- CARGA DETALLE ----------------------
  async function openDetail(r: TableRow) {
    setOpen(true);
    setSelected(null);
    setAI(null);

    const { data: sub, error: errDetail } = await supabase
      .from("form_submissions")
      .select("*")
      .eq("id", r.id)
      .single();

    if (errDetail || !sub) {
      console.error("Error detalle submission", errDetail);
      return;
    }

    let values: AnyObj | null = null;
    if (sub.values_json) values = sub.values_json;
    else if (sub.raw_values_json) values = sub.raw_values_json;
    else if (sub.form_data) values = sub.form_data;

    if (typeof values === "string") {
      try {
        values = JSON.parse(values);
      } catch {
        values = null;
      }
    }

    if (values && typeof values === "object") {
      const fieldIds = Object.keys(values);
      const { data: fields } = await supabase
        .from("form_fields")
        .select("id, label")
        .in("id", fieldIds);

      if (fields && fields.length > 0) {
        const labelMap = new Map(fields.map((f: any) => [f.id, f.label]));
        values = Object.fromEntries(
          Object.entries(values).map(([id, val]) => [
            id,
            { label: labelMap.get(id) || id, value: val },
          ])
        );
      }
    }

    // Adjuntos
    let files: { file_url: string; file_name?: string | null }[] = [];
    if (sub.files_json) {
      let fj = sub.files_json;
      if (typeof fj === "string") {
        try {
          fj = JSON.parse(fj);
        } catch {
          fj = null;
        }
      }

      if (fj && typeof fj === "object" && !Array.isArray(fj)) {
        files = Object.values(fj)
          .map((x: any) => ({
            file_url: x.file_url || x.url || x.path || "",
            file_name:
              x.file_name || x.name || (x.url || "").split("/").pop() || null,
          }))
          .filter((x) => x.file_url);
      } else if (Array.isArray(fj)) {
        files = fj
          .map((x: any) => ({
            file_url: x.file_url || x.url || x.path || "",
            file_name:
              x.file_name || x.name || (x.url || "").split("/").pop() || null,
          }))
          .filter((x) => x.file_url);
      }
    }

    if (files.length === 0) {
      const { data: atts } = await supabase
        .from("file_attachments")
        .select("id, file_url, file_name")
        .eq("submission_id", r.id);
      if (atts && atts.length > 0) {
        files = atts.map((a: any) => ({
          file_url: a.file_url,
          file_name: a.file_name,
        }));
      }
    }

    let detalleIA = null;
    if (sub.detalle_ia) {
      try {
        detalleIA =
          typeof sub.detalle_ia === "string"
            ? JSON.parse(sub.detalle_ia)
            : sub.detalle_ia;
      } catch {
        detalleIA = null;
      }
    }

    setSelected({
      id: sub.id,
      status: sub.status,
      submitted_at: sub.submitted_at,
      form_id: sub.form_id,
      ai_validation_id: sub.ai_validation_id ?? null,
      form_name: r.form_name,
      values: values || null,
      files,
      detalle_ia: detalleIA,
      fecha_procesado: sub.fecha_procesado ?? null,
    });

    // Cargar los resultados de IA asociados a este envío. Se consulta la tabla
    // `ai_validations` filtrando por `submission_id` y ordenando por la fecha
    // de creación descendente para obtener la última validación disponible.
    const { data: aiVal, error: aiErr } = await supabase
      .from("ai_validations")
      .select(
        "overall_score, recommendation, processed_at, ai_results, issues_found"
      )
      .eq("submission_id", r.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (aiErr) {
      console.error("Error cargando AI validation", aiErr);
    }

    if (aiVal) {
      // La respuesta puede contener campos como strings; aseguramos los tipos.
      setAI(aiVal as AIValidation);
    }
  }

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (!selected || !user) return;
    setSaving(true);

    const { error: e1 } = await supabase
      .from("form_submissions")
      .update({ status: decision })
      .eq("id", selected.id);

    const { error: e2 } = await supabase
      .from("submission_review_events")
      .insert({
        submission_id: selected.id,
        reviewer_id: user.id,
        reviewer_name: user.email,
        decision,
        comment: comment || null,
      });

    setSaving(false);
    if (e1 || e2) {
      console.error(e1 || e2);
      alert("Ocurrió un error al guardar la decisión");
      return;
    }

    setOpen(false);
    setComment("");
    setRows((prev) =>
      prev.map((r) => (r.id === selected.id ? { ...r, status: decision } : r))
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between sticky top-0 bg-white z-20 pb-2">
        <Button
          variant="secondary"
          onClick={() => navigate("/admin/dashboard")}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Volver al Dashboard
        </Button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Send className="text-blue-600 w-6 h-6" />
          Panel de Auditoría Humana
        </h1>
      </div>

      {/* FILTROS */}
      <div className="sticky top-12 bg-white z-10 flex flex-wrap items-center gap-3 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Search className="text-gray-500 w-5 h-5" />
          <input
            className="border rounded-lg px-3 py-2 w-72"
            placeholder="Buscar por nombre de formulario…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className="border rounded-lg px-3 py-2"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as TableRow["status"])
          }
        >
          <option value="SUBMITTED">Enviados</option>
          <option value="APPROVED">Aprobados</option>
          <option value="REJECTED">Rechazados</option>
        </select>

        <select
          className="border rounded-lg px-3 py-2"
          value={formFilter}
          onChange={(e) => setFormFilter(e.target.value)}
        >
          {availableForms.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* TABLA */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="overflow-auto border rounded-lg shadow-sm bg-white max-h-[70vh]">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-800 sticky top-0 z-10">
              <tr>
                <th className="p-3 text-left w-24">Formulario</th>
                {/* Resumen de los primeros campos capturados en la submission */}
                <th className="p-3 text-left w-1/3 lg:w-1/4">Campos</th>
                <th className="p-3 text-left whitespace-nowrap w-32">Fecha de envío</th>
                {/* Nueva columna que muestra los días transcurridos desde el envío */}
                <th className="p-3 text-left w-20">Días</th>
                {/* La columna de estado tiene un ancho mayor para que el texto y el pill que se muestran no se recorten */}
                <th className="p-3 text-left w-32">Estado</th>
                <th className="p-3 text-left w-20">Audit IA</th>
                {/* Se incrementa el ancho de la columna de acción aproximadamente un 30 % */}
                <th className="p-3 text-right w-20">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium w-24">{r.form_name}</td>
                {/* Mostrar un resumen de los primeros campos capturados. Cada
                    elemento se presenta en una línea con su etiqueta y valor. */}
                <td className="p-3 w-1/3 lg:w-1/4">
                  {r.firstFields && r.firstFields.length > 0 ? (
                    <div className="space-y-1">
                      {r.firstFields.map((f, idx) => (
                        <p
                          key={idx}
                          className="text-xs text-gray-700 truncate"
                          title={`${f.label}: ${
                            typeof f.value === "object"
                              ? JSON.stringify(f.value)
                              : String(f.value ?? "—")
                          }`}
                        >
                          <span className="font-semibold">
                            {f.label}
                          </span>
                          {": "}
                          {typeof f.value === "object"
                            ? JSON.stringify(f.value)
                            : String(f.value ?? "—")}
                        </p>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 whitespace-nowrap w-32">
                  {r.submitted_at
                    ? new Date(r.submitted_at).toLocaleString()
                    : "—"}
                </td>
                {/* Días transcurridos */}
                <td className="p-3 w-20">
                  {r.daysElapsed != null ? `${r.daysElapsed}d` : "—"}
                </td>
                <td className="p-3 w-32">
                  <span className={STATUS_UI[r.status].pill}>
                    {STATUS_UI[r.status].icon}
                    {STATUS_UI[r.status].label}
                  </span>
                </td>
                <td className="p-3 w-20">
                  {r.ai_score != null
                    ? `${Math.round((r.ai_score as number) * 100)}%`
                    : "—"}
                </td>
                <td className="p-3 text-right w-20">
                  <button
                    onClick={() => openDetail(r)}
                    className="text-gray-600 hover:text-indigo-600"
                    title="Ver detalle"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No hay resultados para los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DETALLE */}
      {open && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl p-6 overflow-y-auto max-h-[90vh]">
            {/* HEADER */}
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-lg font-semibold">
                Detalle del formulario: {selected.form_name}
              </h2>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>

            {/* DATOS */}
            {selected.values && Object.keys(selected.values).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Datos ingresados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(selected.values).map(([key, raw]) => {
                    const label =
                      typeof raw === "object" && raw !== null && "label" in raw
                        ? (raw as any).label
                        : key;
                    const value =
                      typeof raw === "object" && raw !== null && "value" in raw
                        ? (raw as any).value
                        : raw;
                    return (
                      <div
                        key={key}
                        className="rounded-lg border p-3 bg-gray-50 leading-tight"
                      >
                        <p className="text-xs font-medium text-gray-500 mb-0.5 break-all">
                          {label}
                        </p>
                        <p className="text-gray-800 break-words whitespace-pre-wrap">
                          {typeof value === "object"
                            ? JSON.stringify(value, null, 2)
                            : String(value ?? "—")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ADJUNTOS */}
            {selected.files.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Archivos adjuntos
                </h3>
                <ul className="space-y-2">
                  {selected.files.map((a, i) => (
                    <li key={i}>
                      <a
                        href={a.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {a.file_name ||
                          a.file_url.split("/").pop() ||
                          "adjunto"}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* EVALUACIÓN IA */}
            {selected.detalle_ia && (
              <div className="mb-6 bg-gray-50 border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Resultados de Auditoría con IA
                </h3>

                {/* RESUMEN GENERAL */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Recomendación</p>
                    <p
                      className={`font-semibold ${
                        selected.detalle_ia.recommendation === "APPROVE"
                          ? "text-green-600"
                          : selected.detalle_ia.recommendation === "REVIEW"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {selected.detalle_ia.recommendation || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Puntaje general</p>
                    <p className="text-gray-800 font-semibold">
                      {selected.detalle_ia?.overall_score !== undefined &&
                      selected.detalle_ia?.overall_score !== null
                        ? `${Math.round(
                            selected.detalle_ia.overall_score * 100
                          )}%`
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Fecha de análisis</p>
                    <p className="text-gray-800">
                      {selected.fecha_procesado
                        ? new Date(selected.fecha_procesado).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* RESUMEN TEXTO */}
                {selected.detalle_ia.summary && (
                  <div className="mb-4 text-gray-700 text-sm bg-white p-3 rounded border">
                    {selected.detalle_ia.summary}
                  </div>
                )}

                {/* VALIDACIONES POR CAMPO */}
                {Array.isArray(selected.detalle_ia.field_validations) &&
                  selected.detalle_ia.field_validations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                        Validaciones por campo
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border">
                          <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                            <tr>
                              <th className="p-2 text-left">Campo</th>
                              <th className="p-2 text-left">Notas</th>
                              <th className="p-2 text-center">Confianza</th>
                              <th className="p-2 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.detalle_ia.field_validations.map(
                              (f: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className="border-t hover:bg-gray-50 transition-colors"
                                >
                                  <td className="p-2 text-gray-800">
                                    {f.label}
                                  </td>
                                  <td className="p-2 text-gray-600">
                                    {f.notes || "—"}
                                  </td>
                                  <td className="p-2 text-center text-gray-700">
                                    {f.confidence !== undefined &&
                                    f.confidence !== null
                                      ? `${Math.round(f.confidence * 100)}%`
                                      : "—"}
                                  </td>
                                  <td className="p-2 text-center">
                                    {f.is_valid ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                        <CheckCircle className="w-3 h-3" />
                                        Válido
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                        <XCircle className="w-3 h-3" />
                                        Error
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {ai && (
              <div className="mb-6 bg-blue-50 border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Resultados de Validación IA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Score General</p>
                    <p className="text-gray-800 font-semibold">
                      {ai.overall_score != null
                        ? `${Math.round((ai.overall_score as number) * 100)}%`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Recomendación</p>
                    <p
                      className={`font-semibold ${
                        ai.recommendation === "APPROVE"
                          ? "text-green-600"
                          : ai.recommendation === "REVIEW"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {ai.recommendation || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Procesado</p>
                    <p className="text-gray-800">
                      {ai.processed_at
                        ? new Date(ai.processed_at).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </div>
                {Array.isArray(ai.ai_results?.field_validations) &&
                  (ai.ai_results.field_validations?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">
                        Validación de Campos
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm border">
                          <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                            <tr>
                              <th className="p-2 text-left">Campo</th>
                              <th className="p-2 text-left">Notas</th>
                              <th className="p-2 text-center">Confianza</th>
                              <th className="p-2 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ai.ai_results.field_validations!.map((f: any, idx: number) => (
                              <tr
                                key={idx}
                                className="border-t hover:bg-gray-50 transition-colors"
                              >
                                <td className="p-2 text-gray-800">{f.label}</td>
                                <td className="p-2 text-gray-600">{f.notes || "—"}</td>
                                <td className="p-2 text-center text-gray-700">
                                  {f.confidence !== undefined && f.confidence !== null
                                    ? `${Math.round((f.confidence as number) * 100)}%`
                                    : "—"}
                                </td>
                                <td className="p-2 text-center">
                                  {f.is_valid ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                      <CheckCircle className="w-3 h-3" />
                                      Válido
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                      <XCircle className="w-3 h-3" />
                                      Error
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                {Array.isArray(ai.issues_found) && ai.issues_found.length > 0 && (
                  <div className="mt-4 bg-yellow-50 rounded-lg p-4">
                    <h4 className="text-xs font-semibold text-yellow-800 mb-2">
                      Observaciones
                    </h4>
                    <ul className="list-disc list-inside text-sm text-yellow-700">
                      {ai.issues_found.map((issue: string, idx: number) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* COMENTARIO */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comentario (opcional en caso de rechazo)
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {/* BOTONES */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => decide("APPROVED")}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aprobar
              </Button>
              <Button
                onClick={() => decide("REJECTED")}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rechazar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
