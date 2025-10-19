import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';

interface RapidFormField {
  etiquetaCampo: string;
  tipoDato: string;
  placeholder?: string;
  esRequerido?: boolean;
  promptIA?: string;
}

interface RapidFormDefinition {
  nombreFormulario: string;
  descripcion?: string;
  tipoTarget: string;
  empresaPropietaria?: string;
  campos: RapidFormField[];
}

// Convierte el valor del tipo de target desde el JSON al valor del enum de la base de datos
function mapTargetType(target: string): string {
  // normalizamos a minúsculas para comparar
  const t = target.toLowerCase();
  // La tabla forms usa el enum form_target_type con valores 'PERSONA' y 'EMPRESA'.
  if (t === 'persona') return 'PERSONA';
  if (t === 'empresa') return 'EMPRESA';
  // Si llega cualquier otro valor no contemplado, usamos PERSONA por defecto
  return 'PERSONA';
}

/**
 * Página para crear formularios rápidamente a partir de un fichero JSON.
 * Solo accesible para usuarios con rol SUPER_ADMIN.
 * Permite subir un archivo JSON con la definición del formulario y lo inserta
 * en las tablas `forms` y `form_fields` de Supabase.
 */
export default function RapidForms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fileError, setFileError] = useState<string | null>(null);
  const [definition, setDefinition] = useState<RapidFormDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Controla si el formulario base ya fue creado y guarda su ID
  const [formId, setFormId] = useState<string | null>(null);
  const [formCreated, setFormCreated] = useState(false);

  // Mapea el tipo de dato del JSON al tipo usado en la base
  function mapFieldType(tipo: string): string {
    // Convierte el tipo definido en el JSON al valor del enum field_type (en minúsculas)
    const t = tipo.toLowerCase();
    if (t === 'texto') return 'text';
    if (t === 'textarea') return 'textarea';
    if (t === 'número' || t === 'numero' || t === 'number') return 'number';
    if (t === 'fecha') return 'date';
    if (t === 'email') return 'email';
    if (t === 'phone' || t === 'teléfono' || t === 'telefono') return 'phone';
    if (t === 'archivo' || t === 'file') return 'file';
    if (t === 'select') return 'select';
    if (t === 'checkbox' || t === 'booleano' || t === 'bool') return 'checkbox';
    if (t === 'radio') return 'radio';
    // Valor por defecto
    return 'text';
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setFileError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      // Validar estructura mínima
      if (!json.nombreFormulario || !json.campos) {
        throw new Error('El JSON no tiene la estructura esperada');
      }
      setDefinition(json as RapidFormDefinition);
    } catch (err: any) {
      setFileError('No se pudo procesar el archivo. Asegúrate de subir un JSON válido.');
      setDefinition(null);
    }
  }

  // Busca el ID de la empresa por nombre. Si no se encuentra, devuelve null.
  async function getCompanyIdByName(name: string | undefined): Promise<string | null> {
    if (!name) return null;
    const { data, error } = await supabase
      .from('companies')
      .select('id')
      .ilike('name', name);
    if (error || !data || data.length === 0) return null;
    return data[0].id;
  }

  async function createFormFromDefinition() {
    if (!definition) return;
    setLoading(true);
    setMessage(null);
    try {
      // Obtener company_id opcional por nombre. Es obligatorio para la columna owner_company_id.
      const ownerCompanyId = await getCompanyIdByName(definition.empresaPropietaria);
      if (!ownerCompanyId) {
        throw new Error('No se encontró la empresa propietaria especificada en la definición');
      }

      // Insertar nuevo formulario
      // Utiliza la columna form_name en lugar de name, ya que forms no tiene un campo "name"
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .insert({
          form_name: definition.nombreFormulario,
          description: definition.descripcion ?? '',
          // Convertimos a mayúsculas según enum
          target_type: mapTargetType(definition.tipoTarget),
          owner_company_id: ownerCompanyId,
          // La columna version es un entero. Si no se especifica, se toma el default 1.
          version: 1,
        })
        // Seleccionamos solo el id para evitar problemas con columnas inexistentes en el esquema cache
        .select('id')
        .single();
      if (formError || !formData) throw formError;
      // Guardamos el ID del formulario para crear los campos posteriormente
      setFormId(formData.id);
      setFormCreated(true);
      setMessage('Formulario creado. Ahora puedes crear los campos asociados.');
    } catch (err: any) {
      console.error(err);
      setMessage('Ocurrió un error al crear el formulario. Revisa la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  }

  // Construye e inserta los campos para el formulario ya creado
  async function createFieldsForForm() {
    if (!definition || !formId) return;
    setLoading(true);
    setMessage(null);
    try {
      // Construir los campos respetando las columnas reales de form_fields
      const fieldsToInsert = definition.campos.map((field, index) => ({
        form_id: formId,
        label: field.etiquetaCampo,
        // Convertimos tipoDato a minúscula según enum field_type
        type: mapFieldType(field.tipoDato),
        field_order: index + 1,
        required: field.esRequerido ?? false,
        placeholder_text: field.placeholder ?? '',
        // El prompt de IA va en ai_validation_prompt
        ai_validation_prompt: field.promptIA ?? null,
      }));
      const { error: fieldsError } = await supabase
        .from('form_fields')
        .insert(fieldsToInsert);
      if (fieldsError) throw fieldsError;
      setMessage('Campos creados exitosamente. Serás redirigido a la gestión de formularios.');
      // Limpiamos el estado
      setDefinition(null);
      setFormId(null);
      setFormCreated(false);
      // Redirige a la vista de gestión de formularios para permitir ediciones
      navigate('/superadmin/forms');
    } catch (err: any) {
      console.error(err);
      setMessage('Ocurrió un error al crear los campos. Revisa la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <p className="p-6 text-red-600">Acceso denegado. Sólo los usuarios SUPER_ADMIN pueden acceder a esta página.</p>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb de navegación */}
      <nav className="text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-1">
          <li>
            <Link to="/" className="hover:text-gray-700">Inicio</Link>
          </li>
          <li>
            <ChevronRight className="w-4 h-4" />
          </li>
          <li>
            <Link to="/superadmin/dashboard" className="hover:text-gray-700">SuperAdmin</Link>
          </li>
          <li>
            <ChevronRight className="w-4 h-4" />
          </li>
          <li className="font-medium text-gray-700">Rapid Forms</li>
        </ol>
      </nav>
      <h1 className="text-3xl font-bold text-gray-800">Crear Formulario Rápido</h1>
      <p className="text-gray-600 max-w-2xl">
        Carga un archivo JSON con la definición de tu formulario para crearlo automáticamente. Podrás editarlo después si lo deseas.
      </p>
      <div className="mt-4">
        <input
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="block text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {fileError && <p className="mt-2 text-red-600">{fileError}</p>}
      </div>
      {definition && (
        <div className="border rounded-lg p-6 bg-white shadow-sm space-y-6">
          {/* Información básica del formulario */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Información del formulario</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <dt className="font-medium text-gray-600">Nombre</dt>
                <dd className="text-gray-800">{definition.nombreFormulario}</dd>
              </div>
              {definition.descripcion && (
                <div className="sm:col-span-2">
                  <dt className="font-medium text-gray-600">Descripción</dt>
                  <dd className="text-gray-800 whitespace-pre-line">{definition.descripcion}</dd>
                </div>
              )}
              <div>
                <dt className="font-medium text-gray-600">Tipo de Target</dt>
                <dd className="text-gray-800">{definition.tipoTarget}</dd>
              </div>
              {definition.empresaPropietaria && (
                <div>
                  <dt className="font-medium text-gray-600">Empresa Propietaria</dt>
                  <dd className="text-gray-800">{definition.empresaPropietaria}</dd>
                </div>
              )}
            </dl>
            {!formCreated && (
              <div className="mt-4">
                <Button onClick={createFormFromDefinition} loading={loading}>
                  Crear Formulario
                </Button>
              </div>
            )}
          </div>
          {/* Campos del formulario */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Campos del formulario</h2>
            <table className="min-w-full text-sm border border-gray-200 rounded-md overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Etiqueta</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Placeholder</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Requerido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {definition.campos.map((field, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="px-3 py-2 text-gray-800">{field.etiquetaCampo}</td>
                    <td className="px-3 py-2 text-gray-800">{field.tipoDato}</td>
                    <td className="px-3 py-2 text-gray-800">{field.placeholder ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-800">{field.esRequerido ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {formCreated && (
              <div className="mt-4">
                <Button onClick={createFieldsForForm} loading={loading}>
                  Crear Campos
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {message && <p className="text-green-600">{message}</p>}
    </div>
  );
}