import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  currentImageUrl?: string;
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
  shape?: 'square' | 'circle';
  error?: string;
}

export function ImageUpload({
  label,
  currentImageUrl,
  onImageSelect,
  onImageRemove,
  shape = 'square',
  error,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  const imageUrl = preview || currentImageUrl;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError('');

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setValidationError('Formato no válido. Usa JPG, PNG o WEBP');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setValidationError('El archivo es muy grande. Máximo 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    onImageSelect(file);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (onImageRemove) {
      onImageRemove();
    }
  };

  const displayError = validationError || error;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      <div className="flex items-center gap-4">
        {imageUrl ? (
          <div className="relative group">
            <img
              src={imageUrl}
              alt="Preview"
              className={`w-20 h-20 object-cover border-2 border-gray-200 ${
                shape === 'circle' ? 'rounded-full' : 'rounded-lg'
              }`}
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
              <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Cambiar
              </span>
            </div>
          </div>
        ) : (
          <div
            className={`w-20 h-20 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors ${
              shape === 'circle' ? 'rounded-full' : 'rounded-lg'
            }`}
            onClick={handleClick}
          >
            <Upload className="w-6 h-6 text-gray-400" />
          </div>
        )}

        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleClick}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          <p className="text-xs text-gray-500 mt-1">
            JPG, PNG o WEBP. Máximo 5 MB
          </p>
        </div>
      </div>

      {displayError && (
        <p className="mt-2 text-sm text-red-600">{displayError}</p>
      )}
    </div>
  );
}
