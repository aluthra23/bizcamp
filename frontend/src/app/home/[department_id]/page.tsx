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
            {/* Background gradients */}
            <div className="absolute top-20 right-[10%] w-96 h-96 rounded-full bg-purple-600/20 filter blur-[80px] z-0" />
            <div className="absolute bottom-20 left-[10%] w-72 h-72 rounded-full bg-fuchsia-600/20 filter blur-[60px] z-0" />
            
            <main className="max-w-7xl mx-auto py-8 px-4 relative z-10">
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-6">
                        <Link 
                            href="/home" 
                            className="text-white/60 hover:text-white transition-colors group flex items-center"
                        >
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform duration-200" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            >
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Departments
                        </Link>
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold gradient-text mb-1">{department.name}</h1>
                            <p className="text-text-secondary">{department.description}</p>
                        </div>
                        <button 
                            onClick={() => setShowAddTeamModal(true)}
                            className="bg-gradient-to-r from-primary to-accent text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transform hover:scale-105 transition-all duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Add Team
                        </button>
                    </div>
                </div>

                {teams.length === 0 ? (
                    <div className="glass-effect rounded-xl p-8 border border-white/10 text-center transform transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 duration-300">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-light" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                        </div>
                        <p className="text-text-secondary mb-4">No teams found for this department.</p>
                        <button
                            onClick={() => setShowAddTeamModal(true)}
                            className="bg-gradient-to-r from-primary to-accent text-white px-5 py-2.5 rounded-full font-medium inline-flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transform hover:scale-105 transition-all duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Create your first team
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map((team, index) => (
                            <Link
                                href={`/home/${departmentId}/${team._id}`}
                                key={team._id}
                                className="block group"
                                style={{
                                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                                }}
                            >
                                <div className="glass-effect rounded-xl p-6 border border-white/10 transition-all duration-300 hover:border-primary/50 hover:bg-white/5 hover:shadow-lg hover:shadow-primary/10 group-hover:transform group-hover:translate-y-[-4px]">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-light" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold gradient-text mb-2">{team.name}</h3>
                                    <p className="text-text-secondary mb-4">{team.description}</p>
                                    <div className="flex justify-end items-center text-primary-light transition-transform duration-300 group-hover:translate-x-1">
                                        <span className="text-sm mr-1">View Team</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="glass-effect rounded-xl border border-white/10 p-6 w-full max-w-md mx-auto shadow-xl shadow-primary/20 transform transition-all">
                        <h2 className="text-xl font-semibold gradient-text mb-4">Add New Team</h2>
                        
                        <form onSubmit={handleAddTeam}>
                            <div className="mb-4">
                                <label className="block text-text-secondary text-sm font-medium mb-2">
                                    Team Name <span className="text-primary-light">*</span>
                                </label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={newTeam.name}
                                        onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                                        className="w-full bg-surface border border-white/10 rounded-lg p-2 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_0_20px_rgba(147,51,234,0.15)] transition-all"
                                        required
                                    />
                                    <div className="absolute left-3 top-2.5 text-primary-light opacity-70 group-focus-within:opacity-100 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-text-secondary text-sm font-medium mb-2">
                                    Description <span className="text-primary-light">*</span>
                                </label>
                                <div className="relative group">
                                    <textarea
                                        value={newTeam.description}
                                        onChange={(e) => setNewTeam({...newTeam, description: e.target.value})}
                                        className="w-full bg-surface border border-white/10 rounded-lg p-2 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_0_20px_rgba(147,51,234,0.15)] transition-all"
                                        rows={3}
                                        required
                                    />
                                    <div className="absolute left-3 top-2.5 text-primary-light opacity-70 group-focus-within:opacity-100 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="21" y1="6" x2="3" y2="6"></line>
                                            <line x1="15" y1="12" x2="3" y2="12"></line>
                                            <line x1="17" y1="18" x2="3" y2="18"></line>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddTeamModal(false)}
                                    className="px-4 py-2 border border-white/10 rounded-full text-white hover:bg-surface-light transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-full flex items-center gap-2 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    Create Team
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
        </div>
    );
}
