
import React, { useState, useEffect } from 'react';
import { NAPData } from '../../types';
import { Input } from './Input';
import { Label } from './Label';
import { Button } from './Button';

interface NAPFormProps {
  initialData?: Partial<NAPData>;
  onSave: (data: NAPData) => Promise<void> | void;
  onCancel?: () => void;
  isLoading?: boolean;
  showCancelButton?: boolean;
  compactMode?: boolean;
}

export const NAPForm: React.FC<NAPFormProps> = ({
  initialData,
  onSave,
  onCancel,
  isLoading = false,
  showCancelButton = false,
  compactMode = false
}) => {
  const [formData, setFormData] = useState<NAPData>({
    company_name: initialData?.company_name || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    founded_year: initialData?.founded_year || ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof NAPData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [initialData]);

  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional
    // Allow various phone formats
    const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;
    return phoneRegex.test(phone);
  };

  const handleChange = (field: keyof NAPData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<Record<keyof NAPData, string>> = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.founded_year && !/^\d{4}$/.test(formData.founded_year)) {
      newErrors.founded_year = 'Please enter a valid year (e.g., 2020)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSave(formData);
  };

  const gridClass = compactMode
    ? 'grid grid-cols-1 gap-4'
    : 'grid grid-cols-1 md:grid-cols-2 gap-4';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={gridClass}>
        {/* Company Name */}
        <div className={compactMode ? '' : 'md:col-span-2'}>
          <Label htmlFor="company_name">
            Company Name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="company_name"
            type="text"
            value={formData.company_name}
            onChange={(e) => handleChange('company_name', e.target.value)}
            placeholder="Your Company Name"
            className={errors.company_name ? 'border-red-500' : ''}
          />
          {errors.company_name && (
            <p className="mt-1 text-sm text-red-400">{errors.company_name}</p>
          )}
        </div>

        {/* Address */}
        <div className={compactMode ? '' : 'md:col-span-2'}>
          <Label htmlFor="address">
            Business Address
          </Label>
          <Input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="123 Main St, City, Country"
          />
          <p className="mt-1 text-xs text-gray-500">
            Full address for NAP consistency (E-A-T)
          </p>
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone">
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-400">{errors.phone}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">
            Contact Email
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="info@yourcompany.com"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-400">{errors.email}</p>
          )}
        </div>

        {/* Founded Year */}
        <div>
          <Label htmlFor="founded_year">
            Founded Year <span className="text-gray-500">(Optional)</span>
          </Label>
          <Input
            id="founded_year"
            type="text"
            value={formData.founded_year || ''}
            onChange={(e) => handleChange('founded_year', e.target.value)}
            placeholder="2020"
            maxLength={4}
            className={errors.founded_year ? 'border-red-500' : ''}
          />
          {errors.founded_year && (
            <p className="mt-1 text-sm text-red-400">{errors.founded_year}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {showCancelButton && onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </span>
          ) : (
            'Save NAP Data'
          )}
        </Button>
      </div>
    </form>
  );
};
