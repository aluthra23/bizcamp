'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// Define types
interface Team {
    id: string;
    name: string;
    meetingCount: number;
    members: number;
}

interface Department {
    _id: string;
    name: string;
    description: string;
    teams: Team[];
    company_id?: string;
}

// Sample teams data (we'll use this for now since we don't have a teams API yet)
const sampleTeams: { [key: string]: Team[] } = {
    'eng': [
        { id: 'frontend', name: 'Frontend', meetingCount: 8, members: 6 },
        { id: 'backend', name: 'Backend', meetingCount: 12, members: 7 },
        { id: 'mobile', name: 'Mobile', meetingCount: 5, members: 4 },
        { id: 'devops', name: 'DevOps', meetingCount: 6, members: 3 },
        { id: 'qa', name: 'QA', meetingCount: 10, members: 5 },
    ],
    'product': [
        { id: 'design', name: 'Design', meetingCount: 7, members: 4 },
        { id: 'pm', name: 'Product Management', meetingCount: 15, members: 5 },
        { id: 'research', name: 'User Research', meetingCount: 9, members: 3 },
    ],
    'marketing': [
        { id: 'brand', name: 'Brand', meetingCount: 6, members: 4 },
        { id: 'growth', name: 'Growth', meetingCount: 8, members: 5 },
    ],
    'sales': [
        { id: 'americas', name: 'Americas', meetingCount: 12, members: 8 },
        { id: 'emea', name: 'EMEA', meetingCount: 10, members: 6 },
        { id: 'apac', name: 'APAC', meetingCount: 8, members: 5 },
        { id: 'enterprise', name: 'Enterprise', meetingCount: 14, members: 7 },
    ],
    'hr': [
        { id: 'people-ops', name: 'People Operations', meetingCount: 7, members: 4 },
        { id: 'recruiting', name: 'Recruiting', meetingCount: 9, members: 6 },
    ],
    'default': [
        { id: 'team-1', name: 'Team 1', meetingCount: 0, members: 0 },
        { id: 'team-2', name: 'Team 2', meetingCount: 0, members: 0 },
    ]
};

export default function DepartmentPage() {
    const router = useRouter();
    const params = useParams();
    const departmentId = params.department_id as string;
    
    const [department, setDepartment] = useState<Department | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        const fetchDepartmentData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                // First, fetch all departments to find the one we need
                const response = await fetch('/api/backend/departments');
                
                if (!response.ok) {
                    throw new Error('Failed to fetch departments');
                }
                
                const departments = await response.json();
                const currentDepartment = departments.find((dept: any) => dept._id === departmentId);
                
                if (currentDepartment) {
                    // If there's a matching department, use its data
                    const departmentWithTeams = {
                        ...currentDepartment,
                        // Determine which sample teams to use based on the department name
                        teams: getTeamsForDepartment(currentDepartment.name)
                    };
                    
                    setDepartment(departmentWithTeams);
                } else {
                    setError('Department not found');
                }
            } catch (err) {
                console.error('Error fetching department data:', err);
                setError('Failed to load department data');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchDepartmentData();
    }, [departmentId]);
    
    // Function to get teams for a department based on its name
    const getTeamsForDepartment = (departmentName: string) => {
        const key = departmentName.toLowerCase().replace(/\s+/g, '-');
        return sampleTeams[key] || sampleTeams['default'];
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !department) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">Department not found</h2>
                    <p className="text-text-secondary mb-6">The department you're looking for doesn't exist or has been removed.</p>
                    <Link
                        href="/home"
                        className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                    >
                        Back to Departments
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-6">
                        <Link href="/home" className="text-white/60 hover:text-white transition">
                            Departments
                        </Link>
                        <span className="text-white/40">→</span>
                        <span className="text-white">{department.name}</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{department.name}</h1>
                            <p className="text-text-secondary mt-1">{department.description}</p>
                        </div>
                        <button className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium">
                            + Add Team
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {department.teams.map((team) => (
                        <Link
                            href={`/home/${departmentId}/${team.id}`}
                            key={team.id}
                            className="block"
                        >
                            <div className="glass-effect rounded-xl p-6 border border-white/10 transition hover:border-primary/50 hover:bg-white/5">
                                <h3 className="text-xl font-semibold gradient-text mb-2">{team.name}</h3>

                                <div className="flex gap-4 mb-4">
                                    <div className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                        <span className="text-text-secondary text-sm">{team.members} members</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                        <span className="text-text-secondary text-sm">{team.meetingCount} meetings</span>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                                        <path d="M5 12h14M12 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
