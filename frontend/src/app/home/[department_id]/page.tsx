'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// Define types
interface Team {
    _id: string;
    name: string;
    description: string;
    departmentId: string;
}

interface Department {
    _id: string;
    name: string;
    description: string;
    company_id?: string;
}

export default function DepartmentPage() {
    const router = useRouter();
    const params = useParams();
    const departmentId = params.department_id as string;
    
    const [department, setDepartment] = useState<Department | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddTeamModal, setShowAddTeamModal] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', description: '' });
    
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
                const currentDepartment = departments.find((dept: Department) => dept._id === departmentId);
                
                if (currentDepartment) {
                    setDepartment(currentDepartment);
                    
                    // Now fetch teams for this department
                    await fetchTeams(departmentId);
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
    
    const fetchTeams = async (departmentId: string) => {
        try {
            const response = await fetch(`/api/backend/departments/${departmentId}/teams`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch teams');
            }
            
            const teamsData = await response.json();
            setTeams(teamsData);
        } catch (err) {
            console.error('Error fetching teams:', err);
            setError('Failed to load teams');
        }
    };
    
    const handleAddTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newTeam.name.trim()) return;
        
        try {
            const response = await fetch(`/api/backend/departments/${departmentId}/teams`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newTeam),
            });
            
            if (!response.ok) {
                throw new Error('Failed to add team');
            }
            
            // Refresh the teams list
            await fetchTeams(departmentId);
            
            // Reset the form and close the modal
            setNewTeam({ name: '', description: '' });
            setShowAddTeamModal(false);
        } catch (err) {
            console.error('Error adding team:', err);
            alert('Failed to add team. Please try again.');
        }
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
                        <button 
                            onClick={() => setShowAddTeamModal(true)}
                            className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                        >
                            + Add Team
                        </button>
                    </div>
                </div>

                {teams.length === 0 ? (
                    <div className="glass-effect rounded-xl p-8 border border-white/10 text-center">
                        <p className="text-text-secondary mb-4">No teams found for this department.</p>
                        <button
                            onClick={() => setShowAddTeamModal(true)}
                            className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                        >
                            Create your first team
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map((team) => (
                            <Link
                                href={`/home/${departmentId}/${team._id}`}
                                key={team._id}
                                className="block"
                            >
                                <div className="glass-effect rounded-xl p-6 border border-white/10 transition hover:border-primary/50 hover:bg-white/5">
                                    <h3 className="text-xl font-semibold gradient-text mb-2">{team.name}</h3>
                                    <p className="text-text-secondary mb-4">{team.description}</p>
                                    <div className="flex justify-end">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                                            <path d="M5 12h14M12 5l7 7-7 7"></path>
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
            
            {/* Add Team Modal */}
            {showAddTeamModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="glass-effect rounded-xl border border-white/10 p-6 w-full max-w-md mx-auto">
                        <h2 className="text-xl font-semibold text-white mb-4">Add New Team</h2>
                        
                        <form onSubmit={handleAddTeam}>
                            <div className="mb-4">
                                <label className="block text-text-secondary text-sm font-medium mb-2">
                                    Team Name
                                </label>
                                <input
                                    type="text"
                                    value={newTeam.name}
                                    onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                                    className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-text-secondary text-sm font-medium mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={newTeam.description}
                                    onChange={(e) => setNewTeam({...newTeam, description: e.target.value})}
                                    className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    rows={3}
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddTeamModal(false)}
                                    className="px-4 py-2 border border-white/10 rounded-full text-white hover:bg-surface-light"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-full"
                                >
                                    Create Team
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
