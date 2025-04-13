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
      {/* Background gradients */}
      <div className="absolute top-20 right-[10%] w-96 h-96 rounded-full bg-purple-600/20 filter blur-[80px] z-0" />
      <div className="absolute bottom-20 left-[10%] w-72 h-72 rounded-full bg-fuchsia-600/20 filter blur-[60px] z-0" />
      
      <main className="max-w-7xl mx-auto py-8 px-4 relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="gradient-text">Departments</span>
          </h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-primary to-accent text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transform hover:scale-105 transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Department
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, index) => (
              <div key={dept._id} className="relative" style={{
                animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
              }}>
                <Link
                  href={`/home/${dept._id}`}
                  className="block group"
                >
                  <div className="glass-effect rounded-xl p-6 border border-white/10 transition-all duration-300 hover:border-primary/50 hover:bg-white/5 hover:shadow-lg hover:shadow-primary/10 group-hover:transform group-hover:translate-y-[-4px]">
                    <div className="absolute top-4 right-4">
                      <button 
                        onClick={(e) => toggleMenu(e, dept._id)}
                        className="text-white/60 hover:text-white p-1 rounded-full transition-colors focus:outline-none"
                        aria-label="Options"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      
                      {menuOpenId === dept._id && (
                        <div 
                          className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-gray-900 border border-white/10 z-20 animate-fadeIn"
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
                      <span className="text-white/60 text-sm flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-primary-light" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                        {dept.teamCount} teams
                      </span>
                      <div className="flex items-center text-primary-light transition-transform duration-300 group-hover:translate-x-1">
                        <span className="text-sm mr-1">View</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

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
