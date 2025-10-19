import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter, RefreshCw, ArrowRight, ArrowLeft, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

interface VisibleForm {
  form_id: string;
  form_name: string;
  emitter_company_id: string;
  receiver_company_id: string;
  emitter_company_name: string;
  receiver_company_name: string;
  source_type: 'assignment' | 'request';
}

export default function ReportsPage() {
  const { userProfile } = useAuth();
  const [forms, setForms] = useState<VisibleForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      const { data: companyData } = await supabase.from('companies').select('id, name').order('name');
      setCompanies(companyData || []);

      let { data: visibleForms, error } = await supabase.from('visible_forms').select('*');
      if (error) throw error;

      if (userProfile?.role === 'ADMIN' || userProfile?.role === 'USER') {
        const companyId = userProfile.company_id;
        visibleForms = visibleForms?.filter(
          (f) =>
            f.emitter_company_id === companyId ||
            f.receiver_company_id === companyId
        );
      }

      setForms(visibleForms || []);
    } catch (err) {
      console.error('Error al cargar los datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredForms =
    selectedCompany === 'all'
      ? forms
      : forms.filter(
          (f) =>
            f.emitter_company_id === selectedCompany ||
            f.receiver_company_id === selectedCompany
        );

  const groupedByCompany = () => {
    const grouped: Record<string, VisibleForm[]> = {};

    filteredForms.forEach((form) => {
      // Si el usuario es SUPER_ADMIN, agrupa por emisor
      // Si es ADMIN o USER, agrupa por la empresa "contraparte"
      const groupKey =
        userProfile?.role === 'SUPER_ADMIN'
          ? form.emitter_company_name
          : form.emitter_company_id === userProfile?.company_id
          ? form.receiver_company_name
          : form.emitter_company_name;

      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(form);
    });

    return grouped;
  };

  const handleExportCSV = () => {
    const headers = ['Formulario', 'Emisor', 'Receptor', 'Dirección', 'Tipo'];
    const rows = filteredForms.map((f) => [
      f.form_name,
      f.emitter_company_name,
      f.receiver_company_name,
      f.emitter_company_id === userProfile?.company_id ? '→ Emitido' : '← Recibido',
      f.source_type,
    ]);
    const csvContent =
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_empresas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const grouped = groupedByCompany();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Informes de Formularios</h1>
          <p className="mt-1 text-sm text-gray-600">
            Formularios emitidos y recibidos entre empresas
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={filteredForms.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empresa:
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla agrupada */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {filteredForms.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No hay formularios visibles</p>
          </div>
        ) : (
          Object.entries(grouped).map(([groupName, groupForms]) => (
            <div key={groupName} className="border-t first:border-t-0">
              <div className="bg-gray-100 px-6 py-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-600" />
                <h3 className="text-md font-semibold text-gray-800">
                  {groupName}
                </h3>
                <span className="ml-2 text-xs text-gray-500">
                  ({groupForms.length} formularios)
                </span>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Formulario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Emisor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receptor
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dirección
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupForms.map((f) => {
                    const isEmittedByUser =
                      f.emitter_company_id === userProfile?.company_id;
                    return (
                      <tr key={f.form_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {f.form_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {f.emitter_company_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {f.receiver_company_name}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isEmittedByUser ? (
                            <ArrowRight className="w-5 h-5 text-green-600 inline" />
                          ) : (
                            <ArrowLeft className="w-5 h-5 text-blue-600 inline" />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {f.source_type === 'assignment' ? 'Asignado' : 'Solicitado'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
