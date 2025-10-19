import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Building2, Loader2, Plus, Pencil, Trash2, AlertCircle, CheckCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { companiesRepository } from '../../repositories/companies.repository';
import { storageRepository } from '../../repositories/storage.repository';
import { Company } from '../../types/database.types';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { ImageUpload } from '../../components/ImageUpload';

export function CompaniesManagement() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rut: '',
    company_type: '',
  });
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      const data = await companiesRepository.getAll();
      setCompanies(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCompany(null);
    setFormData({ name: '', rut: '', company_type: '' });
    setSelectedLogo(null);
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  }

  function openEditModal(company: Company) {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      rut: company.rut || '',
      company_type: company.company_type,
    });
    setSelectedLogo(null);
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const rutExists = await companiesRepository.checkRutExists(
        formData.rut,
        editingCompany?.id
      );

      if (rutExists) {
        setError('Ya existe una empresa con ese RUT');
        setSubmitting(false);
        return;
      }

      let companyId: string;

      if (editingCompany) {
        await companiesRepository.updateCompany(editingCompany.id, {
          name: formData.name,
          rut: formData.rut,
          company_type: formData.company_type as any,
        });
        companyId = editingCompany.id;
        setSuccess('Empresa actualizada exitosamente');
      } else {
        const newCompany = await companiesRepository.createCompany(
          formData.name,
          formData.rut,
          formData.company_type,
          user.id
        );
        companyId = newCompany.id;
        setSuccess('Empresa creada exitosamente');
      }

      if (selectedLogo) {
        const { url } = await storageRepository.uploadCompanyLogo(companyId, selectedLogo);
        await companiesRepository.updateCompanyLogo(companyId, url);
      }

      await loadCompanies();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar empresa');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(company: Company) {
    if (!confirm(`¿Estás seguro de eliminar la empresa "${company.name}"?`)) {
      return;
    }

    try {
      await companiesRepository.deleteCompany(company.id);
      setSuccess('Empresa eliminada exitosamente');
      await loadCompanies();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar empresa');
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCompanyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
    CLIENT: 'Cliente',
    PROVIDER: 'Proveedor',
    MIXED: 'Mixto',
    };
    return labels[type] || type;
  };

const companyTypeOptions = [
  { value: 'CLIENT', label: 'Cliente' },
  { value: 'PROVIDER', label: 'Proveedor' },
  { value: 'MIXED', label: 'Mixto' },
];

  return (
    <DashboardLayout title="Gestión de Empresas">
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link to="/superadmin/dashboard" className="hover:text-gray-700 transition-colors">
            Inicio
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/superadmin/dashboard" className="hover:text-gray-700 transition-colors">
            SuperAdmin
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Empresas</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <Link
              to="/superadmin/dashboard"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 gap-1 mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Panel
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Gestión de Empresas
            </h2>
            <p className="text-gray-600">
              Administra todas las empresas del sistema
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button onClick={openCreateModal}>
              <Plus className="w-5 h-5" />
              Nueva Empresa
            </Button>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600">Cargando empresas...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay empresas registradas
            </h3>
            <p className="text-gray-600 mb-4">
              Crea tu primera empresa para comenzar
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="w-5 h-5" />
              Crear empresa
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RUT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha creación
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {company.logo_url ? (
                            <img
                              src={company.logo_url}
                              alt={company.name}
                              className="w-10 h-10 rounded-lg object-cover mr-3"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {company.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {company.rut || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {getCompanyTypeLabel(company.company_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(company.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(company)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(company)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Ingresa el nombre de la empresa"
          />

          <Input
            label="RUT"
            type="text"
            value={formData.rut}
            onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
            required
            placeholder="Ej: 12.345.678-9"
          />

          <Select
            label="Tipo de Empresa"
            value={formData.company_type}
            onChange={(e) =>
              setFormData({ ...formData, company_type: e.target.value })
            }
            options={companyTypeOptions}
            required
          />

          <ImageUpload
            label="Logo de la Empresa"
            currentImageUrl={editingCompany?.logo_url}
            onImageSelect={setSelectedLogo}
            shape="square"
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              {editingCompany ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
