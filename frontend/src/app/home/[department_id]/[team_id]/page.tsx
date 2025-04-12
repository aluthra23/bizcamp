'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// Define types
interface Meeting {
    _id: string;
    teamId: string;
    title: string;
    description: string;
    meeting_date: string;
}

interface Team {
    _id: string;
    name: string;
    description: string;
    departmentId: string;
}

export default function TeamPage() {
    const router = useRouter();
    const params = useParams();
    const departmentId = params.department_id as string;
    const teamId = params.team_id as string;

    const [team, setTeam] = useState<Team | null>(null);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
    const [newMeeting, setNewMeeting] = useState({ 
        title: '', 
        description: '', 
        meeting_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const fetchTeamData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                // Fetch the specific team directly by its ID
                const teamResponse = await fetch(`/api/backend/teams/${teamId}`);
                
                if (!teamResponse.ok) {
                    throw new Error('Failed to fetch team');
                }
                
                const teamData = await teamResponse.json();
                setTeam(teamData);
                
                // Now fetch meetings for this team
                await fetchMeetings(teamId);
            } catch (err) {
                console.error('Error fetching team data:', err);
                setError('Failed to load team data');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchTeamData();
    }, [departmentId, teamId]);
    
    const fetchMeetings = async (teamId: string) => {
        try {
            const response = await fetch(`/api/backend/teams/${teamId}/meetings`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch meetings');
            }
            
            const meetingsData = await response.json();
            setMeetings(meetingsData);
        } catch (err) {
            console.error('Error fetching meetings:', err);
            setError('Failed to load meetings');
        }
    };
    
    const handleAddMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newMeeting.title.trim()) return;
        
        try {
            const response = await fetch(`/api/backend/teams/${teamId}/meetings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...newMeeting,
                    teamId: teamId
                }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to add meeting');
            }
            
            // Refresh the meetings list
            await fetchMeetings(teamId);
            
            // Reset the form and close the modal
            setNewMeeting({ 
                title: '', 
                description: '', 
                meeting_date: new Date().toISOString().split('T')[0]
            });
            setShowAddMeetingModal(false);
        } catch (err) {
            console.error('Error adding meeting:', err);
            alert('Failed to add meeting. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    console.log(error)

    if (error || !team) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">Team not found</h2>
                    <p className="text-text-secondary mb-6">The team you're looking for doesn't exist or has been removed.</p>
                    <Link
                        href={`/home/${departmentId}`}
                        className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                    >
                        Back to Teams
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
                        <Link href={`/home/${departmentId}`} className="text-white/60 hover:text-white transition">
                            Teams
                        </Link>
                        <span className="text-white/40">→</span>
                        <span className="text-white">{team.name}</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{team.name}</h1>
                            <p className="text-text-secondary mt-1">{team.description}</p>
                        </div>
                        <button 
                            onClick={() => setShowAddMeetingModal(true)} 
                            className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                        >
                            + Schedule Meeting
                        </button>
                    </div>
                </div>

                <h2 className="text-xl font-semibold text-white mb-4">Meetings</h2>

                {meetings.length === 0 ? (
                    <div className="glass-effect rounded-xl p-8 border border-white/10 text-center">
                        <p className="text-text-secondary mb-4">No meetings found for this team.</p>
                        <button
                            onClick={() => setShowAddMeetingModal(true)}
                            className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                        >
                            Schedule your first meeting
                        </button>
                    </div>
                ) : (
                    <div className="glass-effect rounded-xl border border-white/10 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-3 px-4 text-left text-white/70 font-medium">Meeting</th>
                                        <th className="py-3 px-4 text-left text-white/70 font-medium">Date</th>
                                        <th className="py-3 px-4 text-left text-white/70 font-medium">Description</th>
                                        <th className="py-3 px-4 text-left text-white/70 font-medium">Transcription</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {meetings.map((meeting) => (
                                        <tr key={meeting._id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                            <td className="py-3 px-4">
                                                <Link href={`/home/${departmentId}/${teamId}/${meeting._id}`} className="text-white hover:text-primary-light transition">
                                                    {meeting.title}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-text-secondary">
                                                {new Date(meeting.meeting_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="py-3 px-4 text-text-secondary">
                                                {meeting.description}
                                            </td>
                                            <td className="py-3 px-4">
                                                <Link
                                                    href={`/home/${departmentId}/${teamId}/${meeting._id}/transcription`}
                                                    className="text-primary-light hover:underline flex items-center gap-1"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                                        <path d="M19.07 5.93a10 10 0 0 1 0 12.14"></path>
                                                    </svg>
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
            
            {/* Add Meeting Modal */}
            {showAddMeetingModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="glass-effect rounded-xl border border-white/10 p-6 w-full max-w-md mx-auto">
                        <h2 className="text-xl font-semibold text-white mb-4">Schedule Meeting</h2>
                        
                        <form onSubmit={handleAddMeeting}>
                            <div className="mb-4">
                                <label className="block text-text-secondary text-sm font-medium mb-2">
                                    Meeting Title
                                </label>
                                <input
                                    type="text"
                                    value={newMeeting.title}
                                    onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
                                    className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-text-secondary text-sm font-medium mb-2">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={newMeeting.meeting_date}
                                    onChange={(e) => setNewMeeting({...newMeeting, meeting_date: e.target.value})}
                                    className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-text-secondary text-sm font-medium mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={newMeeting.description}
                                    onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
                                    className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    rows={3}
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddMeetingModal(false)}
                                    className="px-4 py-2 border border-white/10 rounded-full text-white hover:bg-surface-light"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-full"
                                >
                                    Schedule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
