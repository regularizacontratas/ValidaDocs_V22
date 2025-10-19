import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Users, Loader2, Plus, Pencil, Trash2, AlertCircle, CheckCircle, ArrowLeft, ChevronRight, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usersRepository } from '../../repositories/users.repository';
import { companiesRepository } from '../../repositories/companies.repository';
import { authRepository } from '../../repositories/auth.repository';
import { storageRepository } from '../../repositories/storage.repository';
import { User, Company } from '../../types/database.types';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { ImageUpload } from '../../components/ImageUpload';

export function UsersManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    company_id: '',
  });
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [usersData, companiesData] = await Promise.all([
        usersRepository.getAll(),
        companiesRepository.getAll(),
      ]);
      setUsers(usersData);
      setCompanies(companiesData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: '', company_id: '' });
    setSelectedAvatar(null);
    setRemoveAvatar(false);
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email,
      password: '',
      role: user.role,
      company_id: user.company_id || '',
    });
    setSelectedAvatar(null);
    setRemoveAvatar(false);
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
      let userId: string;

      if (editingUser) {
        await usersRepository.updateUserRole(
          editingUser.id,
          formData.role,
          formData.company_id || undefined
        );
        userId = editingUser.id;
        setSuccess('Usuario actualizado exitosamente');
      } else {
        if (!formData.password) {
          setError('La contraseña es requerida');
          setSubmitting(false);
          return;
        }

        const emailExists = await usersRepository.checkEmailExists(formData.email);
        if (emailExists) {
          setError('Ya existe un usuario con ese email');
          setSubmitting(false);
          return;
        }

        const newUser = await authRepository.createUserWithRole(
          formData.name,
          formData.email,
          formData.password,
          formData.role,
          formData.company_id || null,
          user.id
        );
        userId = newUser.id;
        setSuccess('Usuario creado exitosamente');
      }

      if (removeAvatar) {
        await usersRepository.updateUserAvatar(userId, null);
      } else if (selectedAvatar) {
        const { url } = await storageRepository.uploadUserAvatar(userId, selectedAvatar);
        await usersRepository.updateUserAvatar(userId, url);
      }

      await loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar usuario');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${user.name || user.email}"?`)) {
      return;
    }

    try {
      await usersRepository.deleteUser(user.id);
      setSuccess('Usuario eliminado exitosamente');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario');
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

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Administrador',
      USER: 'Usuario',
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: 'bg-red-100 text-red-800',
      ADMIN: 'bg-blue-100 text-blue-800',
      USER: 'bg-green-100 text-green-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return '-';
    const company = companies.find((c) => c.id === companyId);
    return company?.name || '-';
  };

  const roleOptions = [
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'USER', label: 'Usuario' },
  ];

  const companyOptions = companies.map((company) => ({
    value: company.id,
    label: company.name,
  }));

  return (
    <DashboardLayout title="Gestión de Usuarios">
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
          <span className="text-gray-900 font-medium">Usuarios</span>
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
              Gestión de Usuarios
            </h2>
            <p className="text-gray-600">
              Administra todos los usuarios del sistema
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button onClick={openCreateModal}>
              <Plus className="w-5 h-5" />
              Nuevo Usuario
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
            <p className="text-gray-600">Cargando usuarios...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay usuarios registrados
            </h3>
            <p className="text-gray-600 mb-4">
              Crea tu primer usuario para comenzar
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="w-5 h-5" />
              Crear usuario
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último acceso
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((usr) => (
                    <tr key={usr.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {usr.avatar_url ? (
                            <img
                              src={usr.avatar_url}
                              alt={usr.name || usr.email}
                              className="w-10 h-10 rounded-full object-cover mr-3"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                              <UserIcon className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {usr.name || '-'}
                            </p>
                            <p className="text-xs text-gray-500">{usr.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(usr.role)}`}>
                          {getRoleLabel(usr.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {getCompanyName(usr.company_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(usr.last_login_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {usr.role !== 'SUPER_ADMIN' && (
                          <>
                            <button
                              onClick={() => openEditModal(usr)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(usr)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Ingresa el nombre completo"
            disabled={!!editingUser}
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="usuario@ejemplo.com"
            disabled={!!editingUser}
          />

          {!editingUser && (
            <Input
              label="Contraseña"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="Mínimo 6 caracteres"
            />
          )}

          <Select
            label="Rol"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={roleOptions}
            required
          />

          <Select
            label="Empresa"
            value={formData.company_id}
            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
            options={companyOptions}
            placeholder="Selecciona una empresa (opcional)"
          />

          <ImageUpload
            label="Avatar del Usuario"
            currentImageUrl={editingUser?.avatar_url}
            onImageSelect={(file) => {
              setSelectedAvatar(file);
              setRemoveAvatar(false);
            }}
            onImageRemove={() => {
              setSelectedAvatar(null);
              setRemoveAvatar(true);
            }}
            shape="circle"
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
              {editingUser ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
