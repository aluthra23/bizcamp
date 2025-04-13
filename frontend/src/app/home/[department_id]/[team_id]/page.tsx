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
import '@/styles/calendar.css'; // Import the calendar styles

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
            {/* Background gradients */}
            <div className="absolute top-20 right-[10%] w-96 h-96 rounded-full bg-purple-600/20 filter blur-[80px] z-0" />
            <div className="absolute bottom-20 left-[10%] w-72 h-72 rounded-full bg-fuchsia-600/20 filter blur-[60px] z-0" />
            
            <main className="max-w-7xl mx-auto py-8 px-4 relative z-10">
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-6">
                        <Link 
                            href={`/home/${departmentId}`}
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
                            Back to Teams
                        </Link>
                        <span className="text-white/40">→</span>
                        <span className="gradient-text">{team ? team.name : 'Loading...'}</span>
                    </div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">
                                {team ? team.name : 'Loading...'}
                            </h1>
                        </div>
                        <button
                            onClick={() => setShowAddMeetingModal(true)}
                            className="bg-gradient-to-r from-primary to-accent text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transform hover:scale-105 transition-all duration-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Schedule Meeting
                        </button>
                    </div>
                </div>
                
                <div className="glass-effect rounded-xl border border-white/10 p-6 mb-6 shadow-lg transition-all duration-300 hover:border-primary/20 hover:shadow-primary/10">
                    {/* Calendar Header with Stats */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
                        <div className="flex items-center mb-4 md:mb-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center mr-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-light" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold gradient-text">Team Calendar</h2>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Statistics Boxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="glass-effect rounded-xl p-4 border border-white/10 hover:border-primary/20 transition-all">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-light" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-text-secondary text-sm">Scheduled</div>
                                    <div className="text-2xl font-bold gradient-text">{meetings.length}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="glass-effect rounded-xl p-4 border border-white/10 hover:border-primary/20 transition-all">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-text-secondary text-sm">Completed</div>
                                    <div className="text-2xl font-bold text-green-400">
                                        {meetings.filter(m => new Date(m.meeting_date) < new Date()).length}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="glass-effect rounded-xl p-4 border border-white/10 hover:border-primary/20 transition-all">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-text-secondary text-sm">Upcoming</div>
                                    <div className="text-2xl font-bold text-blue-400">
                                        {meetings.filter(m => new Date(m.meeting_date) > new Date()).length}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="glass-effect rounded-xl p-4 border border-white/10 hover:border-primary/20 transition-all">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-text-secondary text-sm">Transcribed</div>
                                    <div className="text-2xl font-bold text-accent">
                                        {meetings.filter(m => m.hasTranscription).length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isLoading || isFetchingMeetings ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <>
                            <div className="calendar-container">
                                <FullCalendar
                                    ref={calendarRef}
                                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                    initialView="dayGridMonth"
                                    headerToolbar={{
                                        left: 'prev,next',
                                        center: 'title',
                                        right: 'dayGridMonth,timeGridWeek,timeGridDay',
                                    }}
                                    events={calendarEvents}
                                    eventClick={handleEventClick}
                                    height="auto"
                                    contentHeight="auto"
                                    aspectRatio={1.8}
                                    expandRows={true}
                                    dayMaxEventRows={3}
                                    eventClassNames={(eventInfo) => {
                                        // Add different class based on event title/description
                                        let classes = [];
                                        
                                        // Add class for events with transcription
                                        const meeting = meetings.find((m) => m._id === eventInfo.event.id);
                                        if (meeting?.hasTranscription) {
                                            classes.push('has-transcription');
                                        }
                                        
                                        // Add active class when clicked
                                        if (activeEvent === eventInfo.event.id) {
                                            classes.push('active-event');
                                        }
                                        
                                        return classes;
                                    }}
                                    dayCellClassNames={(arg) => {
                                        const today = new Date();
                                        today.setHours(0,0,0,0);
                                        const cellDate = arg.date;
                                        cellDate.setHours(0,0,0,0);
                                        
                                        // Add animation class to future dates
                                        if (cellDate >= today) {
                                            const diffInDays = Math.round((cellDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                            if (diffInDays < 14) { // only animate near-future dates
                                                return `future-date delay-${diffInDays}`;
                                            }
                                        }
                                        return '';
                                    }}
                                    eventTimeFormat={{
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        meridiem: true,
                                        hour12: true
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Add Meeting Modal */}
                {showAddMeetingModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                        <div onClick={(e) => e.stopPropagation()} className="glass-effect rounded-xl border border-white/10 w-full max-w-md relative overflow-hidden shadow-xl shadow-primary/20">
                            {/* Modal Header with Gradient Line */}
                            <div className="h-1 w-full bg-gradient-to-r from-primary to-accent"></div>
                            
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold gradient-text">Schedule Meeting</h2>
                                    <button
                                        onClick={() => {
                                            resetMeetingForm();
                                            setShowAddMeetingModal(false);
                                        }}
                                        className="text-white/60 hover:text-white transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

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
                                            <div className="absolute left-3 top-3.5 text-primary-light opacity-70 group-focus-within:opacity-100 transition-colors">
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
                                            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white py-3 px-6 rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
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
                        </div>
                    </div>
                )}

                {/* Meeting Details Modal */}
                {showMeetingDetailsModal && selectedMeeting && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                        <div className="glass-effect rounded-xl border border-white/10 w-full max-w-md shadow-xl shadow-primary/20 relative overflow-hidden">
                            {/* Modal Header with Gradient Line */}
                            <div className="h-1 w-full bg-gradient-to-r from-primary to-accent"></div>
                            
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-white">{selectedMeeting.title}</h2>
                                    <button 
                                        onClick={() => setShowMeetingDetailsModal(false)}
                                        className="text-white/60 hover:text-white transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="text-text-secondary mb-4">
                                    {selectedMeeting.description}
                                </div>
                                
                                <div className="bg-white/5 rounded-lg p-4 mb-6">
                                    <div className="flex items-center mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-light" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-white">
                                            {new Date(selectedMeeting.meeting_date).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-light" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-white">
                                            {new Date(selectedMeeting.meeting_date).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center mt-6">
                                    <button
                                        onClick={() => {
                                            setShowMeetingDetailsModal(false);
                                            handleDeleteMeeting();
                                        }}
                                        className="px-4 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                                    >
                                        Delete
                                    </button>
                                    
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowMeetingDetailsModal(false)}
                                            className="px-4 py-2 border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors"
                                        >
                                            Close
                                        </button>
                                        
                                        <button
                                            onClick={handleBeginMeeting}
                                            className="px-5 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg flex items-center gap-2 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                            </svg>
                                            Begin Meeting
                                        </button>
                                    </div>
                                </div>
                            </div>
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
                    
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    .animate-fadeIn {
                        animation: fadeIn 0.3s ease-out;
                    }
                `}</style>
            </main>
        </div>
    );
}
