'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// Define types
interface Attendee {
    id: string;
    name: string;
    role: string;
    avatarColor: string;
    speaking: number; // percentage of total meeting
}

interface AgendaItem {
    id: string;
    title: string;
    isCompleted: boolean;
    duration: number; // in minutes
}

interface Action {
    id: string;
    description: string;
    assignee: string;
    dueDate: string;
    isCompleted: boolean;
}

interface MeetingDetails {
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    description: string;
    attendees: Attendee[];
    agenda: AgendaItem[];
    actions: Action[];
    hasTranscription: boolean;
}

// Sample meeting data
const meetingData: Record<string, MeetingDetails> = {
    'sprint-1': {
        id: 'sprint-1',
        name: 'Sprint Planning',
        date: '2023-05-15',
        startTime: '10:00',
        endTime: '11:00',
        duration: 60,
        description: 'Bi-weekly sprint planning session to define goals and tasks for the upcoming sprint.',
        attendees: [
            { id: 'user1', name: 'Sarah Chen', role: 'Product Manager', avatarColor: 'bg-gradient-to-br from-purple-500 to-indigo-500', speaking: 35 },
            { id: 'user2', name: 'Alex Johnson', role: 'Tech Lead', avatarColor: 'bg-gradient-to-br from-blue-500 to-cyan-500', speaking: 25 },
            { id: 'user3', name: 'Kai Ramirez', role: 'Frontend Dev', avatarColor: 'bg-gradient-to-br from-teal-500 to-emerald-500', speaking: 15 },
            { id: 'user4', name: 'Jamie Wu', role: 'UX Designer', avatarColor: 'bg-gradient-to-br from-amber-500 to-orange-500', speaking: 15 },
            { id: 'user5', name: 'Morgan Lee', role: 'QA Engineer', avatarColor: 'bg-gradient-to-br from-red-500 to-rose-500', speaking: 5 },
            { id: 'user6', name: 'Taylor Kim', role: 'Backend Dev', avatarColor: 'bg-gradient-to-br from-pink-500 to-fuchsia-500', speaking: 5 },
        ],
        agenda: [
            { id: 'ag1', title: 'Review previous sprint', isCompleted: true, duration: 10 },
            { id: 'ag2', title: 'Discuss new feature priorities', isCompleted: true, duration: 15 },
            { id: 'ag3', title: 'Estimate user stories', isCompleted: true, duration: 25 },
            { id: 'ag4', title: 'Finalize sprint goals', isCompleted: true, duration: 10 },
        ],
        actions: [
            { id: 'ac1', description: 'Create technical specs for user authentication flow', assignee: 'Alex Johnson', dueDate: '2023-05-17', isCompleted: true },
            { id: 'ac2', description: 'Update UI mockups for dashboard', assignee: 'Jamie Wu', dueDate: '2023-05-18', isCompleted: false },
            { id: 'ac3', description: 'Set up CI/CD pipeline for new microservice', assignee: 'Kai Ramirez', dueDate: '2023-05-19', isCompleted: false },
            { id: 'ac4', description: 'Review API documentation', assignee: 'Taylor Kim', dueDate: '2023-05-20', isCompleted: false },
        ],
        hasTranscription: true
    },
    // Default meeting for demo
    '_default': {
        id: '_default',
        name: 'Meeting',
        date: '2023-05-20',
        startTime: '14:00',
        endTime: '15:00',
        duration: 60,
        description: 'Team sync-up meeting.',
        attendees: [
            { id: 'user1', name: 'Jane Doe', role: 'Manager', avatarColor: 'bg-gradient-to-br from-purple-500 to-indigo-500', speaking: 40 },
            { id: 'user2', name: 'John Smith', role: 'Developer', avatarColor: 'bg-gradient-to-br from-blue-500 to-cyan-500', speaking: 30 },
            { id: 'user3', name: 'Alice Brown', role: 'Designer', avatarColor: 'bg-gradient-to-br from-teal-500 to-emerald-500', speaking: 30 },
        ],
        agenda: [
            { id: 'ag1', title: 'Project updates', isCompleted: true, duration: 20 },
            { id: 'ag2', title: 'Roadmap discussion', isCompleted: true, duration: 20 },
            { id: 'ag3', title: 'Open questions', isCompleted: true, duration: 20 },
        ],
        actions: [
            { id: 'ac1', description: 'Follow up on project timeline', assignee: 'Jane Doe', dueDate: '2023-05-22', isCompleted: false },
            { id: 'ac2', description: 'Create design assets', assignee: 'Alice Brown', dueDate: '2023-05-23', isCompleted: false },
        ],
        hasTranscription: true
    }
};

export default function MeetingPage() {
    const router = useRouter();
    const params = useParams();
    const departmentId = params.department_id as string;
    const teamId = params.team_id as string;
    const meetingId = params.meeting_id as string;

    // Try to get the meeting data, or use default if not found
    const [meeting, setMeeting] = useState<MeetingDetails | null>(
        meetingData[meetingId] || meetingData['_default'] || null
    );

    if (!meeting) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">Meeting not found</h2>
                    <p className="text-text-secondary mb-6">The meeting you're looking for doesn't exist or has been removed.</p>
                    <Link
                        href={`/home/${departmentId}/${teamId}`}
                        className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                    >
                        Back to Meetings
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto py-8 px-4">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-6">
                    <Link href="/home" className="text-white/60 hover:text-white transition">
                        Departments
                    </Link>
                    <span className="text-white/40">→</span>
                    <Link href={`/home/${departmentId}`} className="text-white/60 hover:text-white transition">
                        Teams
                    </Link>
                    <span className="text-white/40">→</span>
                    <Link href={`/home/${departmentId}/${teamId}`} className="text-white/60 hover:text-white transition">
                        Meetings
                    </Link>
                    <span className="text-white/40">→</span>
                    <span className="text-white">{meeting.name}</span>
                </div>

                {/* Meeting header */}
                <div className="glass-effect rounded-xl p-6 border border-white/10 mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{meeting.name}</h1>
                            <p className="text-text-secondary mt-1">{meeting.description}</p>
                        </div>

                        {meeting.hasTranscription && (
                            <Link
                                href={`/home/${departmentId}/${teamId}/${meetingId}/transcription`}
                                className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                    <path d="M19.07 5.93a10 10 0 0 1 0 12.14"></path>
                                </svg>
                                View Transcription
                            </Link>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span className="text-white">
                                {new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span className="text-white">{meeting.startTime} - {meeting.endTime} ({meeting.duration} min)</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span className="text-white">{meeting.attendees.length} Attendees</span>
                        </div>
                    </div>
                </div>

                {/* Main content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left column - Attendees and Speaking Time */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Attendees</h2>
                        <div className="glass-effect rounded-xl border border-white/10 p-6">
                            <div className="space-y-4">
                                {meeting.attendees.map((attendee) => (
                                    <div key={attendee.id} className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full ${attendee.avatarColor} flex items-center justify-center text-white font-medium`}>
                                            {attendee.name.charAt(0)}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-white font-medium">{attendee.name}</p>
                                            <p className="text-sm text-text-secondary">{attendee.role}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-medium">{attendee.speaking}%</p>
                                            <p className="text-xs text-text-secondary">speaking time</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/10">
                                <h3 className="text-lg font-medium text-white mb-3">Speaking Distribution</h3>
                                <div className="h-6 rounded-full flex overflow-hidden">
                                    {meeting.attendees.map((attendee, index) => (
                                        <div
                                            key={attendee.id}
                                            className={`${attendee.avatarColor} h-full`}
                                            style={{ width: `${attendee.speaking}%` }}
                                            title={`${attendee.name}: ${attendee.speaking}%`}
                                        />
                                    ))}
                                </div>
                                <div className="flex justify-between mt-2">
                                    <p className="text-xs text-text-secondary">0:00</p>
                                    <p className="text-xs text-text-secondary">{meeting.duration}:00</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle column - Agenda */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Agenda</h2>
                        <div className="glass-effect rounded-xl border border-white/10 p-6">
                            <div className="space-y-4">
                                {meeting.agenda.map((item, index) => (
                                    <div key={item.id} className="flex items-start gap-3">
                                        <div className="min-w-6 mt-1">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${item.isCompleted ? 'bg-primary/20 text-primary-light' : 'bg-white/10 text-white/60'}`}>
                                                {item.isCompleted ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                ) : (
                                                    <span>{index + 1}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-grow">
                                            <p className={`font-medium ${item.isCompleted ? 'text-white/60' : 'text-white'}`}>
                                                {item.title}
                                            </p>
                                            <p className="text-sm text-text-secondary">{item.duration} minutes</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right column - Action Items */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Action Items</h2>
                        <div className="glass-effect rounded-xl border border-white/10 p-6">
                            <div className="space-y-4">
                                {meeting.actions.map((action) => (
                                    <div key={action.id} className="flex items-start gap-3">
                                        <div className="min-w-6 mt-1">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${action.isCompleted ? 'bg-primary/20 text-primary-light' : 'bg-white/10 text-white/60'}`}>
                                                {action.isCompleted ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-grow">
                                            <p className={`font-medium ${action.isCompleted ? 'text-white/60' : 'text-white'}`}>
                                                {action.description}
                                            </p>
                                            <div className="flex justify-between text-sm mt-1">
                                                <p className="text-text-secondary">Assigned to: <span className="text-primary-light">{action.assignee}</span></p>
                                                <p className="text-text-secondary">Due: {new Date(action.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
