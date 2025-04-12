'use client';

import { useState } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepartmentAdded: (newDepartment: any) => void;
}

export default function DepartmentModal({ 
  isOpen, 
  onClose,
  onDepartmentAdded
}: DepartmentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = { name: '', description: '' };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'Department name is required';
      isValid = false;
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Use the backend API directly through the Next.js rewrite proxy
      const response = await fetch('/api/backend/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          company_id: '67fa9eb53d8faa5288cf5a43',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create department');
      }

      const newDepartment = await response.json();
      
      // Pass the department with the MongoDB _id to the parent component
      onDepartmentAdded({
        ...newDepartment,
        id: newDepartment.name.toLowerCase().replace(/\s+/g, '-'),
        teamCount: 0 // New departments start with 0 teams
      });
      
      // Reset form
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error creating department:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Department"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Department Name"
          placeholder="Engineering, Marketing, etc."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
        />
        
        <div className="w-full space-y-2 mb-4">
          <label className="block text-sm font-medium text-text-secondary">
            Description
          </label>
          <textarea
            placeholder="Brief description of this department"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full py-3 px-4 bg-surface border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent ${
              errors.description ? 'border-red-500' : ''
            }`}
            rows={3}
            required
          />
          {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
          >
            Create Department
          </Button>
        </div>
      </form>
    </Modal>
  );
} 