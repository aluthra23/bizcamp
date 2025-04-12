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
    const [showMeetingDetailModal, setShowMeetingDetailModal] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [newMeeting, setNewMeeting] = useState({
        title: '',
        description: '',
        meeting_date: new Date().toISOString().split('T')[0],
        meeting_time: '09:00'
    });
    const [formErrors, setFormErrors] = useState({
        title: '',
        description: '',
        meeting_date: '',
        meeting_time: ''
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

            // Transform meetings into calendar events with proper date/time handling
            const events = meetingsData.map((meeting: Meeting) => {
                // Create start date from the meeting_date ISO string
                const startDate = new Date(meeting.meeting_date);

                // Create end date (60 minutes after start time)
                const endDate = new Date(startDate);
                endDate.setMinutes(endDate.getMinutes() + 60);

                return {
                    id: meeting._id,
                    title: meeting.title,
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    extendedProps: {
                        description: meeting.description,
                        teamId: meeting.teamId,
                        _id: meeting._id
                    }
                };
            });
            setCalendarEvents(events);
        } catch (err) {
            console.error('Error fetching meetings:', err);
            setError('Failed to load meetings');
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

    const handleAddMeeting = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

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
            setNewMeeting({
                title: '',
                description: '',
                meeting_date: new Date().toISOString().split('T')[0],
                meeting_time: '09:00'
            });
            setShowAddMeetingModal(false);
        } catch (err) {
            console.error('Error adding meeting:', err);
            alert('Failed to add meeting. Please try again.');
        }
    };

    const handleEventClick = (info: any) => {
        const eventId = info.event.id;
        const meeting = meetings.find(m => m._id === eventId);
        if (meeting) {
            setSelectedMeeting(meeting);
            setShowMeetingDetailModal(true);
        }
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
            setShowMeetingDetailModal(false);
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
                        <Button
                            onClick={() => setShowAddMeetingModal(true)}
                            className="bg-gradient-to-r from-primary to-accent"
                        >
                            + Schedule Meeting
                        </Button>
                    </div>
                </div>

                <div className="glass-effect rounded-xl border border-white/10 p-6 mb-8">
                    <style jsx global>{`
                        .fc-theme-standard {
                            font-family: var(--font-sans, sans-serif);
                        }
                        .fc-theme-standard .fc-scrollgrid {
                            border-color: rgba(255, 255, 255, 0.1);
                        }
                        .fc-theme-standard td, .fc-theme-standard th {
                            border-color: rgba(255, 255, 255, 0.1);
                        }
                        .fc-theme-standard .fc-toolbar-title {
                            color: white;
                            font-weight: bold;
                        }
                        .fc-theme-standard .fc-col-header-cell-cushion {
                            color: rgba(255, 255, 255, 0.7);
                            font-weight: 500;
                        }
                        .fc-theme-standard .fc-daygrid-day-number {
                            color: rgba(255, 255, 255, 0.7);
                        }
                        .fc .fc-button-primary {
                            background-color: #1f1f1f;
                            border-color: rgba(255, 255, 255, 0.1);
                            color: white;
                        }
                        .fc .fc-button-primary:hover {
                            background-color: #2d2d2d;
                        }
                        .fc .fc-button-primary:disabled {
                            background-color: #1f1f1f;
                            opacity: 0.5;
                        }
                        .fc .fc-event {
                            background: linear-gradient(135deg, #9333ea, #d946ef);
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                        }
                        .fc .fc-daygrid-day.fc-day-today {
                            background-color: rgba(147, 51, 234, 0.1);
                        }
                        .fc-view-harness {
                            background-color: rgba(31, 31, 31, 0.3);
                            border-radius: 8px;
                        }
                        /* Fix for day headers */
                        .fc .fc-col-header-cell {
                            background-color: rgba(50, 50, 50, 0.5);
                        }
                        /* Fix for day cells */
                        .fc .fc-daygrid-day {
                            background-color: rgba(30, 30, 30, 0.7);
                        }
                        /* Ensure text colors */
                        .fc .fc-daygrid-day-top a {
                            color: rgba(255, 255, 255, 0.8);
                        }
                        /* Fix for week numbers if visible */
                        .fc .fc-daygrid-week-number {
                            color: rgba(255, 255, 255, 0.6);
                        }
                        /* Fix for time slots in week/day views */
                        .fc .fc-timegrid-slot-label-cushion {
                            color: rgba(255, 255, 255, 0.7);
                        }
                        .fc .fc-timegrid-axis-cushion {
                            color: rgba(255, 255, 255, 0.7);
                        }
                        /* Fix for color of text in month names on buttons */
                        .fc .fc-button-primary span {
                            color: white;
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
                            slotDuration="00:30:00"
                            slotLabelInterval="01:00"
                            slotLabelFormat={{
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            }}
                            eventTimeFormat={{
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            }}
                            allDaySlot={false}
                            nowIndicator={true}
                        />
                    </div>
                </div>
            </main>

            {/* Add Meeting Modal */}
            <Modal
                isOpen={showAddMeetingModal}
                onClose={() => setShowAddMeetingModal(false)}
                title="Schedule Meeting"
            >
                <form onSubmit={handleAddMeeting} className="space-y-4">
                    <div className="mb-4">
                        <label className="block text-text-secondary text-sm font-medium mb-2">
                            Meeting Title *
                        </label>
                        <input
                            type="text"
                            value={newMeeting.title}
                            onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                            className={`w-full bg-surface border ${formErrors.title ? 'border-red-500' : 'border-white/10'} rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-primary`}
                            required
                        />
                        {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">
                                Date *
                            </label>
                            <input
                                type="date"
                                value={newMeeting.meeting_date}
                                onChange={(e) => setNewMeeting({ ...newMeeting, meeting_date: e.target.value })}
                                className={`w-full bg-surface border ${formErrors.meeting_date ? 'border-red-500' : 'border-white/10'} rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-primary`}
                                required
                            />
                            {formErrors.meeting_date && <p className="text-red-500 text-xs mt-1">{formErrors.meeting_date}</p>}
                        </div>

                        <div>
                            <label className="block text-text-secondary text-sm font-medium mb-2">
                                Time *
                            </label>
                            <input
                                type="time"
                                value={newMeeting.meeting_time}
                                onChange={(e) => setNewMeeting({ ...newMeeting, meeting_time: e.target.value })}
                                className={`w-full bg-surface border ${formErrors.meeting_time ? 'border-red-500' : 'border-white/10'} rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-primary`}
                                required
                            />
                            {formErrors.meeting_time && <p className="text-red-500 text-xs mt-1">{formErrors.meeting_time}</p>}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-text-secondary text-sm font-medium mb-2">
                            Description *
                        </label>
                        <textarea
                            value={newMeeting.description}
                            onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                            className={`w-full bg-surface border ${formErrors.description ? 'border-red-500' : 'border-white/10'} rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-primary`}
                            rows={3}
                            required
                        />
                        {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => setShowAddMeetingModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-gradient-to-r from-primary to-accent"
                        >
                            Create Meeting
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Meeting Detail Modal */}
            <Modal
                isOpen={showMeetingDetailModal}
                onClose={() => setShowMeetingDetailModal(false)}
                title={selectedMeeting?.title || 'Meeting Details'}
            >
                <div className="space-y-4">
                    <div>
                        <h3 className="text-text-secondary text-sm font-medium mb-1">Date & Time</h3>
                        <p className="text-white">
                            {selectedMeeting && new Date(selectedMeeting.meeting_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                            {selectedMeeting && ' at '}
                            {selectedMeeting && new Date(selectedMeeting.meeting_date).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                        <p className="text-text-secondary text-xs mt-1">60 minute duration</p>
                    </div>

                    <div>
                        <h3 className="text-text-secondary text-sm font-medium mb-1">Description</h3>
                        <p className="text-white">{selectedMeeting?.description}</p>
                    </div>

                    <div className="flex justify-between items-center pt-4 mt-6 border-t border-white/10">
                        <Button
                            variant="outline"
                            onClick={handleDeleteMeeting}
                            className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Delete
                        </Button>
                        <Button
                            onClick={handleBeginMeeting}
                            className="bg-gradient-to-r from-primary to-accent"
                        >
                            Next
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
