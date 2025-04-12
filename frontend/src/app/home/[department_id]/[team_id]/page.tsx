'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// Define types
interface Meeting {
    id: string;
    name: string;
    date: string;
    duration: number;
    attendees: number;
    hasTranscription: boolean;
}

interface Team {
    name: string;
    description: string;
    meetings: Meeting[];
}

interface TeamData {
    [deptId: string]: {
        [teamId: string]: Team;
    };
}

// Sample team data
const teamData: TeamData = {
    'eng': {
        'frontend': {
            name: 'Frontend',
            description: 'Web UI development team',
            meetings: [
                { id: 'sprint-1', name: 'Sprint Planning', date: '2023-05-15', duration: 60, attendees: 6, hasTranscription: true },
                { id: 'retro-1', name: 'Sprint Retrospective', date: '2023-05-20', duration: 45, attendees: 5, hasTranscription: true },
                { id: 'design-1', name: 'Design Review', date: '2023-05-22', duration: 30, attendees: 4, hasTranscription: false },
                { id: 'standup-1', name: 'Daily Standup', date: '2023-05-23', duration: 15, attendees: 6, hasTranscription: true },
                { id: 'sprint-2', name: 'Sprint Planning', date: '2023-05-29', duration: 60, attendees: 6, hasTranscription: true },
                { id: 'demo-1', name: 'Product Demo', date: '2023-05-30', duration: 45, attendees: 8, hasTranscription: true },
                { id: 'retro-2', name: 'Sprint Retrospective', date: '2023-06-03', duration: 45, attendees: 5, hasTranscription: false },
                { id: 'standup-2', name: 'Daily Standup', date: '2023-06-05', duration: 15, attendees: 5, hasTranscription: true },
            ]
        },
        'backend': {
            name: 'Backend',
            description: 'API and server development team',
            meetings: [
                { id: 'sprint-1', name: 'Sprint Planning', date: '2023-05-15', duration: 60, attendees: 7, hasTranscription: true },
                { id: 'arch-1', name: 'Architecture Review', date: '2023-05-18', duration: 90, attendees: 5, hasTranscription: true },
                { id: 'retro-1', name: 'Sprint Retrospective', date: '2023-05-20', duration: 45, attendees: 6, hasTranscription: false },
                { id: 'standup-1', name: 'Daily Standup', date: '2023-05-23', duration: 15, attendees: 6, hasTranscription: true },
                { id: 'sprint-2', name: 'Sprint Planning', date: '2023-05-29', duration: 60, attendees: 7, hasTranscription: true },
                { id: 'demo-1', name: 'Product Demo', date: '2023-05-30', duration: 45, attendees: 7, hasTranscription: true },
            ]
        },
    }
};

// Add some sample data for other departments/teams to avoid "not found" errors in demo
for (const deptId of ['product', 'marketing', 'sales', 'hr']) {
    teamData[deptId] = {};

    // Add a sample team with meetings for any team ID
    teamData[deptId]['_default'] = {
        name: 'Team',
        description: 'Sample team description',
        meetings: [
            { id: 'meeting-1', name: 'Weekly Sync', date: '2023-05-20', duration: 60, attendees: 5, hasTranscription: true },
            { id: 'meeting-2', name: 'Planning', date: '2023-05-27', duration: 45, attendees: 4, hasTranscription: false },
        ]
    };
}

export default function TeamPage() {
    const router = useRouter();
    const params = useParams();
    const departmentId = params.department_id as string;
    const teamId = params.team_id as string;

    // Try to find exact match, otherwise use default
    const [team, setTeam] = useState<Team | null>(
        (teamData[departmentId] && teamData[departmentId][teamId]) ||
        (teamData[departmentId] && teamData[departmentId]['_default']) ||
        null
    );

    // Sort meetings by date (newest first)
    const sortedMeetings = team?.meetings.slice().sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }) || [];

    if (!team) {
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
                        <button className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium">
                            + Schedule Meeting
                        </button>
                    </div>
                </div>

                <h2 className="text-xl font-semibold text-white mb-4">Meetings</h2>

                <div className="glass-effect rounded-xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="py-3 px-4 text-left text-white/70 font-medium">Meeting</th>
                                    <th className="py-3 px-4 text-left text-white/70 font-medium">Date</th>
                                    <th className="py-3 px-4 text-left text-white/70 font-medium">Duration</th>
                                    <th className="py-3 px-4 text-left text-white/70 font-medium">Attendees</th>
                                    <th className="py-3 px-4 text-left text-white/70 font-medium">Transcription</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedMeetings.map((meeting) => (
                                    <tr key={meeting.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                        <td className="py-3 px-4">
                                            <Link href={`/home/${departmentId}/${teamId}/${meeting.id}`} className="text-white hover:text-primary-light transition">
                                                {meeting.name}
                                            </Link>
                                        </td>
                                        <td className="py-3 px-4 text-text-secondary">
                                            {new Date(meeting.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="py-3 px-4 text-text-secondary">
                                            {meeting.duration} min
                                        </td>
                                        <td className="py-3 px-4 text-text-secondary">
                                            {meeting.attendees}
                                        </td>
                                        <td className="py-3 px-4">
                                            {meeting.hasTranscription ? (
                                                <Link
                                                    href={`/home/${departmentId}/${teamId}/${meeting.id}/transcription`}
                                                    className="text-primary-light hover:underline flex items-center gap-1"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                                        <path d="M19.07 5.93a10 10 0 0 1 0 12.14"></path>
                                                    </svg>
                                                    View
                                                </Link>
                                            ) : (
                                                <span className="text-white/40">Not available</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
