'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// Define types
interface Meeting {
    _id: string;
    teamId: string;
    title: string;
    description: string;
    meeting_date: string;
    hasTranscription?: boolean;
}

interface Team {
    _id: string;
    name: string;
    description: string;
    departmentId: string;
}

interface CalendarEvent {
    id: string;
    title: string;
    start: string; // ISO date string with time
    end: string; // ISO date string with time (60 min later)
    extendedProps: {
        description: string;
        teamId: string;
        _id: string;
    };
}

type MeetingFormData = {
    title: string;
    description: string;
    meeting_date: string;
    meeting_time: string;
};

export default function TeamPage() {
    const router = useRouter();
    const params = useParams();
    const departmentId = params.department_id as string;
    const teamId = params.team_id as string;
    const calendarRef = useRef<any>(null);

    const [team, setTeam] = useState<Team | null>(null);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
    const [showMeetingDetailsModal, setShowMeetingDetailsModal] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formErrors, setFormErrors] = useState({
        title: '',
        description: '',
        meeting_date: '',
        meeting_time: ''
    });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeEvent, setActiveEvent] = useState<string | null>(null);
    const [isFetchingMeetings, setIsFetchingMeetings] = useState(false);
    const [addMeetingError, setAddMeetingError] = useState<string | null>(null);
    const [isAddingMeeting, setIsAddingMeeting] = useState(false);

    // Helper functions for date and time
    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0]; // Returns YYYY-MM-DD
    };

    const getCurrentTime = () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Meeting form state
    const [newMeeting, setNewMeeting] = useState<MeetingFormData>({
        title: '',
        description: '',
        meeting_date: getTodayDate(),
        meeting_time: getCurrentTime()
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
            setIsFetchingMeetings(true);
            const res = await fetch(`/api/backend/teams/${teamId}/meetings`);
            
            if (!res.ok) {
                throw new Error('Failed to fetch meetings');
            }
            
            const data = await res.json();
            setMeetings(data);
            
            // Create calendar events from meetings
            const events = data.map((meeting: Meeting) => ({
                id: meeting._id,
                title: meeting.title,
                start: new Date(meeting.meeting_date).toISOString(),
                end: new Date(new Date(meeting.meeting_date).getTime() + 60 * 60 * 1000).toISOString(), // Add 1 hour
                extendedProps: {
                    description: meeting.description,
                    teamId: meeting.teamId,
                    _id: meeting._id
                }
            }));
            
            setCalendarEvents(events);
        } catch (error) {
            console.error('Error fetching meetings:', error);
        } finally {
            setIsFetchingMeetings(false);
        }
    };

    const validateForm = () => {
        const errors = {
            title: '',
            description: '',
            meeting_date: '',
            meeting_time: ''
        };
        let isValid = true;

        if (!newMeeting.title.trim()) {
            errors.title = 'Meeting title is required';
            isValid = false;
        }

        if (!newMeeting.description.trim()) {
            errors.description = 'Description is required';
            isValid = false;
        }

        if (!newMeeting.meeting_date) {
            errors.meeting_date = 'Date is required';
            isValid = false;
        }

        if (!newMeeting.meeting_time) {
            errors.meeting_time = 'Time is required';
            isValid = false;
        }

        setFormErrors(errors);
        return isValid;
    };

    const resetMeetingForm = () => {
        setNewMeeting({
            title: '',
            description: '',
            meeting_date: getTodayDate(),
            meeting_time: getCurrentTime()
        });
        setFormErrors({
            title: '',
            description: '',
            meeting_date: '',
            meeting_time: ''
        });
        setAddMeetingError(null);
    };

    const handleAddMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setIsAddingMeeting(true);
        setAddMeetingError(null);
        
        try {
            // Combine date and time into a single ISO string
            const combinedDateTime = `${newMeeting.meeting_date}T${newMeeting.meeting_time}:00`;

            const response = await fetch(`/api/backend/teams/${teamId}/meetings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: newMeeting.title,
                    description: newMeeting.description,
                    meeting_date: combinedDateTime,
                    teamId: teamId
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add meeting');
            }

            // Refresh the meetings list
            await fetchMeetings(teamId);

            // Reset the form and close the modal
            resetMeetingForm();
            setShowAddMeetingModal(false);
        } catch (err) {
            console.error('Error adding meeting:', err);
            setAddMeetingError('Failed to add meeting. Please try again.');
        } finally {
            setIsAddingMeeting(false);
        }
    };

    const handleEventClick = (info: any) => {
        // Set the active event for animation
        setActiveEvent(info.event.id);
        
        // Find the clicked meeting
        const meeting = meetings.find((m) => m._id === info.event.id);
        if (meeting) {
            setSelectedMeeting(meeting);
            setShowMeetingDetailsModal(true);
        }
        
        // Reset active event after animation completes
        setTimeout(() => {
            setActiveEvent(null);
        }, 500);
    };

    const handleDeleteMeeting = async () => {
        if (!selectedMeeting) return;

        try {
            const response = await fetch(`/api/backend/meetings/${selectedMeeting._id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete meeting');
            }

            // Refresh meetings after deletion
            await fetchMeetings(teamId);
            setShowMeetingDetailsModal(false);
        } catch (err) {
            console.error('Error deleting meeting:', err);
            alert('Failed to delete meeting. Please try again.');
        }
    };

    const handleBeginMeeting = () => {
        if (!selectedMeeting) return;
        router.push(`/home/${departmentId}/${teamId}/${selectedMeeting._id}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

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
            <main className="container mx-auto px-4 md:px-6 pb-12 pt-8">
                {/* Team Header */}
                <div className="mb-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <Link
                                    href={`/home/${departmentId}`}
                                    className="text-white/60 hover:text-white flex items-center gap-1 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="19" y1="12" x2="5" y2="12"></line>
                                        <polyline points="12 19 5 12 12 5"></polyline>
                                    </svg>
                                    <span>Back to Department</span>
                                </Link>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white mb-2">{team?.name}</h1>
                                    <p className="text-text-secondary max-w-2xl">{team?.description}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAddMeetingModal(true)}
                                className="bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-primary text-white px-4 py-3 rounded-xl font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] transform active:scale-[0.98]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="16"></line>
                                    <line x1="8" y1="12" x2="16" y2="12"></line>
                                </svg>
                                Schedule Meeting
                            </button>
                        </div>
                    </div>
                    
                    {/* Team Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                        <div className="glass-effect rounded-xl border border-white/10 p-5 flex items-center gap-4 transform transition-all hover:border-white/20 hover:shadow-lg group">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </div>
                            <div>
                                <p className="text-white font-bold text-2xl">{meetings.length}</p>
                                <p className="text-text-secondary text-sm">Scheduled Meetings</p>
                            </div>
                        </div>
                        
                        <div className="glass-effect rounded-xl border border-white/10 p-5 flex items-center gap-4 transform transition-all hover:border-white/20 hover:shadow-lg group">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                                    <polyline points="9 11 12 14 22 4"></polyline>
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                </svg>
                            </div>
                            <div>
                                <p className="text-white font-bold text-2xl">{meetings.filter(m => new Date(m.meeting_date) < new Date()).length}</p>
                                <p className="text-text-secondary text-sm">Completed</p>
                            </div>
                        </div>
                        
                        <div className="glass-effect rounded-xl border border-white/10 p-5 flex items-center gap-4 transform transition-all hover:border-white/20 hover:shadow-lg group">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                            </div>
                            <div>
                                <p className="text-white font-bold text-2xl">{meetings.filter(m => new Date(m.meeting_date) > new Date()).length}</p>
                                <p className="text-text-secondary text-sm">Upcoming</p>
                            </div>
                        </div>
                        
                        <div className="glass-effect rounded-xl border border-white/10 p-5 flex items-center gap-4 transform transition-all hover:border-white/20 hover:shadow-lg group">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </div>
                            <div>
                                <p className="text-white font-bold text-2xl">
                                    {meetings.length > 0 
                                        ? Math.round(meetings.filter(m => 
                                            m.hasTranscription === true
                                        ).length / meetings.length * 100)
                                        : 0}%
                                </p>
                                <p className="text-text-secondary text-sm">With Transcription</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Calendar Header */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-1 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                    <h2 className="text-2xl font-bold text-white">Meeting Schedule</h2>
                </div>

                {/* Calendar display */}
                <div className="glass-effect rounded-xl border border-white/10 p-6 mb-8 relative">
                    {isFetchingMeetings && (
                        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm z-10 flex items-center justify-center">
                            <div className="flex flex-col items-center">
                                <svg className="animate-spin h-12 w-12 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-white font-medium text-lg">Loading calendar...</p>
                            </div>
                        </div>
                    )}
                    
                    <style jsx global>{`
                        /* Main calendar container */
                        .calendar-container {
                            border-radius: 16px;
                            overflow: hidden;
                            background: rgba(255, 255, 255, 0.03);
                            backdrop-filter: blur(8px);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                        }
                        
                        /* Header toolbar */
                        .fc .fc-toolbar {
                            padding: 1.25rem;
                            background: linear-gradient(to bottom, rgba(30, 30, 30, 0.9), rgba(20, 20, 20, 0.8));
                            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                            flex-wrap: wrap;
                            gap: 0.75rem;
                            justify-content: space-between !important;
                        }
                        
                        /* Month/day/week title */
                        .fc .fc-toolbar-title {
                            font-size: 1.5rem !important;
                            font-weight: 700;
                            background: linear-gradient(to right, var(--primary-light), var(--accent));
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            text-shadow: 0 0 20px rgba(147, 51, 234, 0.2);
                        }
                        
                        /* Buttons in toolbar */
                        .fc .fc-button-primary {
                            background: rgba(255, 255, 255, 0.06) !important;
                            border-color: rgba(255, 255, 255, 0.1) !important;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            color: white !important;
                            font-weight: 500;
                            transition: all 0.2s ease;
                            text-transform: capitalize;
                            padding: 0.5rem 1rem;
                        }
                        
                        .fc .fc-button-primary:hover {
                            background: rgba(255, 255, 255, 0.1) !important;
                            border-color: rgba(255, 255, 255, 0.15) !important;
                            transform: translateY(-1px);
                        }
                        
                        .fc .fc-button-primary:not(:disabled):active,
                        .fc .fc-button-primary.fc-button-active {
                            background: linear-gradient(135deg, var(--primary-dark), var(--primary)) !important;
                            border-color: transparent !important;
                            box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3) !important;
                        }
                        
                        /* Today button special styling */
                        .fc .fc-button-primary.fc-today-button {
                            background: linear-gradient(135deg, rgba(147, 51, 234, 0.6), rgba(217, 70, 239, 0.6)) !important;
                            border-color: transparent !important;
                        }
                        
                        .fc .fc-button-primary.fc-today-button:hover {
                            background: linear-gradient(135deg, rgba(147, 51, 234, 0.8), rgba(217, 70, 239, 0.8)) !important;
                        }
                        
                        /* Table borders and colors */
                        .fc .fc-scrollgrid {
                            border-color: rgba(255, 255, 255, 0.08) !important;
                        }
                        
                        .fc .fc-scrollgrid-section > * {
                            border-color: rgba(255, 255, 255, 0.08) !important;
                        }
                        
                        /* Day header cells */
                        .fc .fc-col-header-cell {
                            background: rgba(30, 30, 30, 0.7);
                            padding: 0.75rem 0;
                            border-color: rgba(255, 255, 255, 0.08) !important;
                        }
                        
                        .fc .fc-col-header-cell-cushion {
                            color: rgba(255, 255, 255, 0.9);
                            font-weight: 600;
                            text-transform: uppercase;
                            font-size: 0.875rem;
                            letter-spacing: 0.05em;
                            padding: 0.5rem;
                        }
                        
                        /* Day cells */
                        .fc .fc-daygrid-day {
                            background-color: rgba(20, 20, 20, 0.6);
                            transition: background-color 0.2s ease;
                            border-color: rgba(255, 255, 255, 0.08) !important;
                        }
                        
                        .fc .fc-daygrid-day:hover {
                            background-color: rgba(30, 30, 30, 0.8);
                        }
                        
                        .fc .fc-daygrid-day.fc-day-today {
                            background-color: rgba(147, 51, 234, 0.15) !important;
                        }
                        
                        /* Day numbers */
                        .fc .fc-daygrid-day-top {
                            padding: 0.5rem;
                        }
                        
                        .fc .fc-daygrid-day-top a {
                            color: rgba(255, 255, 255, 0.9);
                            font-weight: 500;
                            font-size: 0.875rem;
                            text-decoration: none;
                        }
                        
                        .fc .fc-day-other .fc-daygrid-day-top a {
                            color: rgba(255, 255, 255, 0.5);
                        }
                        
                        /* Event styling */
                        .fc-event {
                            background: linear-gradient(to right, var(--primary), var(--accent)) !important;
                            border: none !important;
                            border-radius: 6px !important;
                            padding: 0.25rem 0.5rem !important;
                            box-shadow: 0 2px 12px rgba(147, 51, 234, 0.2);
                            transition: transform 0.2s ease, box-shadow 0.2s ease;
                            overflow: hidden;
                        }
                        
                        .fc-event:hover {
                            transform: translateY(-1px) scale(1.02);
                            box-shadow: 0 3px 16px rgba(147, 51, 234, 0.3);
                        }
                        
                        .fc-event:before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 4px;
                            height: 100%;
                            background: rgba(255, 255, 255, 0.4);
                        }
                        
                        /* Security event styling */
                        .fc-event.security-event {
                            background: linear-gradient(to right, #7c3aed, #a855f7) !important;
                        }
                        
                        /* Sprint event styling */
                        .fc-event.sprint-event {
                            background: linear-gradient(to right, #0ea5e9, #22d3ee) !important;
                        }
                        
                        /* Meeting event styling */
                        .fc-event.meeting-event {
                            background: linear-gradient(to right, #f59e0b, #fbbf24) !important;
                        }
                        
                        /* Other event styling */
                        .fc-event.other-event {
                            background: linear-gradient(to right, #ec4899, #f472b6) !important;
                        }
                        
                        .fc-event-title, .fc-event-time {
                            font-weight: 600 !important;
                            font-size: 0.8rem !important;
                            color: white !important;
                            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                        }
                        
                        /* Time grid styling */
                        .fc .fc-timegrid-slot-label-cushion {
                            color: rgba(255, 255, 255, 0.8);
                            font-size: 0.875rem;
                        }
                        
                        .fc .fc-timegrid-axis-cushion {
                            color: rgba(255, 255, 255, 0.8);
                            font-size: 0.875rem;
                        }
                        
                        /* Week numbers */
                        .fc .fc-daygrid-week-number {
                            background-color: rgba(147, 51, 234, 0.15);
                            color: rgba(255, 255, 255, 0.8);
                            border-radius: 4px;
                            padding: 0.1rem 0.5rem;
                            font-size: 0.75rem;
                        }
                        
                        /* Animations for events being added */
                        @keyframes eventAppear {
                            from {
                                opacity: 0;
                                transform: translateY(10px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                        
                        .fc-event-new {
                            animation: eventAppear 0.3s ease-out forwards;
                        }
                        
                        /* Responsive tweaks */
                        @media (max-width: 640px) {
                            .fc .fc-toolbar {
                                flex-direction: column;
                                align-items: center;
                                padding: 1rem;
                            }
                            
                            .fc .fc-toolbar-title {
                                margin-bottom: 0.5rem;
                                font-size: 1.25rem !important;
                            }
                        }
                        
                        /* Animation for active events */
                        @keyframes pulseEvent {
                            0% {
                                transform: scale(1);
                                box-shadow: 0 2px 12px rgba(147, 51, 234, 0.2);
                            }
                            50% {
                                transform: scale(1.05);
                                box-shadow: 0 4px 20px rgba(147, 51, 234, 0.4);
                            }
                            100% {
                                transform: scale(1);
                                box-shadow: 0 2px 12px rgba(147, 51, 234, 0.2);
                            }
                        }
                        
                        .fc-event.active-event {
                            animation: pulseEvent 0.5s ease-in-out;
                            z-index: 5;
                        }
                    `}</style>
                    
                    <div className="calendar-container">
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay',
                            }}
                            events={calendarEvents}
                            eventClick={handleEventClick}
                            height="auto"
                            aspectRatio={1.8}
                            eventClassNames={(eventInfo) => {
                                // Add different class based on event title/description
                                let classes = [];
                                
                                if (eventInfo.event.title.toLowerCase().includes('security')) {
                                    classes.push('security-event');
                                } else if (eventInfo.event.title.toLowerCase().includes('sprint')) {
                                    classes.push('sprint-event');
                                } else if (eventInfo.event.title.toLowerCase().includes('meeting')) {
                                    classes.push('meeting-event');
                                } else {
                                    classes.push('other-event');
                                }
                                
                                classes.push('fc-event-new');
                                
                                // Add active class if this is the active event
                                if (activeEvent === eventInfo.event.id) {
                                    classes.push('active-event');
                                }
                                
                                return classes;
                            }}
                            eventContent={(eventInfo) => {
                                return (
                                    <>
                                        <div className="fc-event-time">{eventInfo.timeText}</div>
                                        <div className="fc-event-title">{eventInfo.event.title}</div>
                                    </>
                                )
                            }}
                            dayMaxEvents={3}
                            moreLinkContent={({num}) => (
                                <div className="text-xs font-medium px-1 py-0.5 bg-white/10 rounded-full">
                                    +{num} more
                                </div>
                            )}
                        />
                    </div>
                </div>
            </main>

            {/* Add Meeting Modal */}
            <Modal
                isOpen={showAddMeetingModal}
                onClose={() => {
                    setShowAddMeetingModal(false);
                    resetMeetingForm();
                }}
                title="Schedule Meeting"
            >
                <div className="p-6 space-y-4">
                    <form onSubmit={handleAddMeeting} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="w-full md:col-span-2 space-y-2 group">
                            <label className="block text-sm font-medium text-text-secondary group-focus-within:text-primary-light transition-colors">
                                Meeting Title <span className="text-primary-light">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={newMeeting.title}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                                    placeholder="Weekly Standup, Project Review, etc."
                                    className={`w-full py-3 px-4 pl-10 bg-surface border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all ${
                                        formErrors.title ? 'border-red-500' : 'focus:shadow-[0_0_20px_rgba(147,51,234,0.15)]'
                                    }`}
                                    required
                                />
                                <div className="absolute left-3 top-3.5 text-white/40 group-focus-within:text-primary-light transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </div>
                            </div>
                            {formErrors.title && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {formErrors.title}
                                </p>
                            )}
                        </div>

                        <div className="w-full space-y-2 group">
                            <label className="block text-sm font-medium text-text-secondary group-focus-within:text-primary-light transition-colors">
                                Date <span className="text-primary-light">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={newMeeting.meeting_date}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, meeting_date: e.target.value })}
                                    className={`w-full py-3 px-4 pl-10 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all ${
                                        formErrors.meeting_date ? 'border-red-500' : 'focus:shadow-[0_0_20px_rgba(147,51,234,0.15)]'
                                    }`}
                                    required
                                />
                                <div className="absolute left-3 top-3.5 text-primary-light opacity-70 group-focus-within:opacity-100 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                </div>
                            </div>
                            {formErrors.meeting_date && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {formErrors.meeting_date}
                                </p>
                            )}
                        </div>

                        <div className="w-full space-y-2 group">
                            <label className="block text-sm font-medium text-text-secondary group-focus-within:text-primary-light transition-colors">
                                Time <span className="text-primary-light">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="time"
                                    value={newMeeting.meeting_time}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, meeting_time: e.target.value })}
                                    className={`w-full py-3 px-4 pl-10 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all ${
                                        formErrors.meeting_time ? 'border-red-500' : 'focus:shadow-[0_0_20px_rgba(147,51,234,0.15)]'
                                    }`}
                                    required
                                />
                                <div className="absolute left-3 top-3.5 text-primary-light opacity-70 group-focus-within:opacity-100 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                </div>
                            </div>
                            {formErrors.meeting_time && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {formErrors.meeting_time}
                                </p>
                            )}
                        </div>

                        <div className="w-full md:col-span-2 space-y-2 group">
                            <label className="block text-sm font-medium text-text-secondary group-focus-within:text-primary-light transition-colors">
                                Description <span className="text-primary-light">*</span>
                            </label>
                            <div className="relative">
                                <textarea
                                    value={newMeeting.description}
                                    onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                                    placeholder="Enter meeting details..."
                                    className={`w-full h-24 py-3 px-4 pl-10 bg-surface border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all ${
                                        formErrors.description ? 'border-red-500' : 'focus:shadow-[0_0_20px_rgba(147,51,234,0.15)]'
                                    }`}
                                    required
                                />
                                <div className="absolute left-3 top-3.5 text-white/40 group-focus-within:text-primary-light transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="21" y1="6" x2="3" y2="6"></line>
                                        <line x1="15" y1="12" x2="3" y2="12"></line>
                                        <line x1="17" y1="18" x2="3" y2="18"></line>
                                    </svg>
                                </div>
                            </div>
                            {formErrors.description && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {formErrors.description}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2 flex justify-end mt-2">
                            <button
                                type="submit"
                                className="bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 text-white py-3 px-6 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                                disabled={isAddingMeeting}
                            >
                                {isAddingMeeting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 5v14"></path>
                                            <path d="M5 12h14"></path>
                                        </svg>
                                        Schedule Meeting
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {addMeetingError && (
                    <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-xl flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-red-400 text-sm">{addMeetingError}</p>
                    </div>
                )}
            </Modal>

            {/* Meeting Detail Modal */}
            <Modal
                isOpen={showMeetingDetailsModal}
                onClose={() => setShowMeetingDetailsModal(false)}
                title={selectedMeeting?.title || 'Meeting Details'}
            >
                {selectedMeeting && (
                    <div className="space-y-6">
                        <div className="glass-effect rounded-xl p-5 border border-white/10">
                            <h3 className="text-lg font-medium text-white mb-1">Description</h3>
                            <p className="text-text-secondary">{selectedMeeting.description}</p>
                        </div>
                        
                        <div className="glass-effect rounded-xl p-5 border border-white/10">
                            <h3 className="text-lg font-medium text-white mb-1">Date & Time</h3>
                            <p className="text-text-secondary">
                                {new Date(selectedMeeting.meeting_date).toLocaleString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                        
                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => {
                                    setShowMeetingDetailsModal(false);
                                    setIsDeleteModalOpen(true);
                                }}
                                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-500 rounded-xl transition-colors"
                            >
                                Delete
                            </button>
                            
                            <button
                                onClick={handleBeginMeeting}
                                className="bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-primary text-white px-6 py-2 rounded-xl font-medium flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                                Begin Meeting
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            
            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Meeting"
            >
                <div className="text-center space-y-4">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/20 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <p className="text-white text-lg font-medium">Are you sure you want to delete this meeting?</p>
                    <p className="text-text-secondary">
                        This action cannot be undone. The meeting and all associated data will be permanently removed.
                    </p>
                </div>
                
                <div className="flex justify-end gap-3 mt-8">
                    <button
                        onClick={() => setIsDeleteModalOpen(false)}
                        className="px-4 py-2 bg-surface hover:bg-surface-light border border-white/10 text-white rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDeleteMeeting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors flex items-center gap-2"
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Deleting...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                            </>
                        )}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
