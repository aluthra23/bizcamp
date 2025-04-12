'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DepartmentModal from '@/components/DepartmentModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

// Type definition for a department
interface Department {
  id: string;
  _id: string;
  name: string;
  description: string;
  teamCount: number;
}

export default function HomePage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState<Department | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setMenuOpenId(null);
    };

    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      // Use the backend API directly through the Next.js rewrite proxy
      const response = await fetch('/api/backend/departments');
      
      if (response.ok) {
        const data = await response.json();
        // Map the API data to match our Department interface
        const formattedDepartments = data.map((dept: any) => ({
          id: dept.name.toLowerCase().replace(/\s+/g, '-'),
          _id: dept._id,
          name: dept.name,
          description: dept.description,
          teamCount: dept.teamCount || 0,
        }));
        setDepartments(formattedDepartments);
      } else {
        // Fallback to sample data if API fails
        setDepartments([
          { id: 'eng', _id: '1', name: 'Engineering', teamCount: 5, description: 'Software development and infrastructure' },
          { id: 'product', _id: '2', name: 'Product', teamCount: 3, description: 'Product management and design' },
          { id: 'marketing', _id: '3', name: 'Marketing', teamCount: 2, description: 'Brand, growth, and communications' },
          { id: 'sales', _id: '4', name: 'Sales', teamCount: 4, description: 'Sales and business development' },
          { id: 'hr', _id: '5', name: 'HR', teamCount: 2, description: 'People operations and talent acquisition' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Fallback to sample data on error
      setDepartments([
        { id: 'eng', _id: '1', name: 'Engineering', teamCount: 5, description: 'Software development and infrastructure' },
        { id: 'product', _id: '2', name: 'Product', teamCount: 3, description: 'Product management and design' },
        { id: 'marketing', _id: '3', name: 'Marketing', teamCount: 2, description: 'Brand, growth, and communications' },
        { id: 'sales', _id: '4', name: 'Sales', teamCount: 4, description: 'Sales and business development' },
        { id: 'hr', _id: '5', name: 'HR', teamCount: 2, description: 'People operations and talent acquisition' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepartmentAdded = (newDepartment: Department) => {
    setDepartments([...departments, newDepartment]);
  };

  const toggleMenu = (e: React.MouseEvent, deptId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpenId(menuOpenId === deptId ? null : deptId);
  };

  const handleDeleteClick = (e: React.MouseEvent, dept: Department) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveDepartment(dept);
    setIsDeleteModalOpen(true);
    setMenuOpenId(null);
  };

  const handleDelete = async () => {
    if (!activeDepartment) return;
    
    setIsDeleting(true);
    try {
      // Use the backend API directly through the Next.js rewrite proxy
      const response = await fetch(`/api/backend/departments/${activeDepartment._id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove the department from the list
        setDepartments(departments.filter(d => d._id !== activeDepartment._id));
        setIsDeleteModalOpen(false);
      } else {
        console.error('Failed to delete department');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Departments</h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
          >
            + Add Department
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <div key={dept.id} className="relative">
                <Link
                  href={`/home/${dept.id}`}
                  className="block"
                >
                  <div className="glass-effect rounded-xl p-6 border border-white/10 transition hover:border-primary/50 hover:bg-white/5">
                    <div className="absolute top-4 right-4">
                      <button 
                        onClick={(e) => toggleMenu(e, dept.id)}
                        className="text-white/60 hover:text-white p-1 rounded-full transition-colors focus:outline-none"
                        aria-label="Options"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      
                      {menuOpenId === dept.id && (
                        <div 
                          className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-gray-900 border border-white/10 z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="py-1">
                            <button
                              onClick={(e) => handleDeleteClick(e, dept)}
                              className="block w-full text-left px-4 py-2 text-sm text-red-400 bg-gray-900 hover:bg-gray-800 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-semibold gradient-text mb-2">{dept.name}</h3>
                    <p className="text-text-secondary text-sm mb-4">{dept.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">{dept.teamCount} teams</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                        <path d="M5 12h14M12 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      <DepartmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDepartmentAdded={handleDepartmentAdded}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        itemName={activeDepartment?.name || ''}
      />
    </div>
  );
}
