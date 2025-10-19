import { ChangeEvent } from 'react';
import { FormField } from '../types/database.types';
import { Input } from './Input';

interface DynamicFieldProps {
  field: FormField;
  value: any;
  onChange: (fieldId: string, value: any) => void;
  onFileChange?: (fieldId: string, file: File) => void;
  error?: string;
}

export function DynamicField({ field, value, onChange, onFileChange, error }: DynamicFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = field.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    onChange(field.id, newValue);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileChange) {
      onFileChange(field.id, file);
    }
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            type={field.type}
            value={value || ''}
            onChange={handleChange}
            required={field.required}
            label={field.label}
            error={error}
            placeholder={`Ingresa ${field.label.toLowerCase()}`}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={handleChange}
            required={field.required}
            label={field.label}
            error={error}
            placeholder={`Ingresa ${field.label.toLowerCase()}`}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={handleChange}
            required={field.required}
            label={field.label}
            error={error}
          />
        );

      case 'textarea':
        return (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value || ''}
              onChange={handleChange}
              required={field.required}
              rows={4}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={`Ingresa ${field.label.toLowerCase()}`}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value || ''}
              onChange={handleChange}
              required={field.required}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Selecciona una opción</option>
              {field.options?.options?.map((option: string, index: number) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={field.id}
              checked={value || false}
              onChange={handleChange}
              required={field.required}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={field.id} className="text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'radio':
        return (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.options?.map((option: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="radio"
                    id={`${field.id}-${index}`}
                    name={field.id}
                    value={option}
                    checked={value === option}
                    onChange={handleChange}
                    required={field.required}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor={`${field.id}-${index}`} className="text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      case 'file':
        return (
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              required={field.required}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {value && (
              <p className="mt-2 text-sm text-gray-600">
                Archivo seleccionado: {value.name || value}
              </p>
            )}
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={handleChange}
            required={field.required}
            label={field.label}
            error={error}
          />
        );
    }
  };

  return <div className="mb-6">{renderField()}</div>;
}
