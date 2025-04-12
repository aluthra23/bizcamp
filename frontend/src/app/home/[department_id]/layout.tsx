'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// Layout component for the department page
export default function DepartmentLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const params = useParams();
    const departmentId = params.department_id as string;
    
    const [department, setDepartment] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchDepartment = async () => {
            try {
                const response = await fetch('/api/backend/departments');
                if (!response.ok) {
                    throw new Error('Failed to fetch departments');
                }
                
                const departments = await response.json();
                const currentDepartment = departments.find((dept: any) => dept._id === departmentId);
                
                if (currentDepartment) {
                    setDepartment(currentDepartment);
                }
            } catch (error) {
                console.error('Error fetching department:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchDepartment();
    }, [departmentId]);
    
    return (
        <div className="min-h-screen bg-background">
            {children}
        </div>
    );
} 