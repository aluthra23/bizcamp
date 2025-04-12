'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { processAudioChunk, initializeCollection, restartCollection } from './actions';

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
    _id: string;
    teamId: string;
    title: string;
    description: string;
    meeting_date: string;
    // Extended details from sample data
    startTime?: string;
    endTime?: string;
    duration?: number;
    attendees?: Attendee[];
    agenda?: AgendaItem[];
    actions?: Action[];
    hasTranscription?: boolean;
}

interface DurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (durationMs: number) => void;
}

function DurationModal({ isOpen, onClose, onConfirm }: DurationModalProps) {
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(15);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const durationMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
    onConfirm(durationMs);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass-effect rounded-xl border border-white/10 p-6 w-full max-w-sm mx-auto">
        <h2 className="text-xl font-semibold text-white mb-4">Set Recording Duration</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Hours */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-secondary mb-1">Hours</label>
            <select 
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-light"
            >
              {[...Array(5)].map((_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          {/* Minutes */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-secondary mb-1">Minutes</label>
            <select 
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-light"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i} value={i*5}>{i*5}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface border border-white/10 rounded-full text-white hover:bg-surface-light transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-full hover:opacity-90 transition-opacity"
          >
            Start Recording
          </button>
        </div>
      </div>
    </div>
  );
}

// Sample data for parts not provided by the API
const sampleExtendedData = {
        startTime: '10:00',
        endTime: '11:00',
        duration: 60,
        attendees: [
            { id: 'user1', name: 'Sarah Chen', role: 'Product Manager', avatarColor: 'bg-gradient-to-br from-purple-500 to-indigo-500', speaking: 35 },
            { id: 'user2', name: 'Alex Johnson', role: 'Tech Lead', avatarColor: 'bg-gradient-to-br from-blue-500 to-cyan-500', speaking: 25 },
            { id: 'user3', name: 'Kai Ramirez', role: 'Frontend Dev', avatarColor: 'bg-gradient-to-br from-teal-500 to-emerald-500', speaking: 15 },
            { id: 'user4', name: 'Jamie Wu', role: 'UX Designer', avatarColor: 'bg-gradient-to-br from-amber-500 to-orange-500', speaking: 15 },
        ],
        agenda: [
            { id: 'ag1', title: 'Review previous sprint', isCompleted: true, duration: 10 },
            { id: 'ag2', title: 'Discuss new feature priorities', isCompleted: true, duration: 15 },
            { id: 'ag3', title: 'Estimate user stories', isCompleted: true, duration: 25 },
        ],
        actions: [
        { id: 'ac1', description: 'Create technical specs', assignee: 'Alex Johnson', dueDate: '2023-05-17', isCompleted: false },
        { id: 'ac2', description: 'Update UI mockups', assignee: 'Jamie Wu', dueDate: '2023-05-18', isCompleted: false },
    ],
    hasTranscription: false
};

export default function MeetingPage() {
    const router = useRouter();
    const params = useParams();
    const departmentId = params.department_id as string;
    const teamId = params.team_id as string;
    const meetingId = params.meeting_id as string;

    // Recording state
    const [transcriptionStarted, setTranscriptionStarted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const durationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Meeting state
    const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMeeting = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/backend/meetings/${meetingId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch meeting');
                }
                
                const meetingData = await response.json();
                
                // Combine API data with sample extended data for UI purposes
                // In a real app, all this data would come from the API
                setMeeting({
                    ...meetingData,
                    ...sampleExtendedData
                });
                
            } catch (err) {
                console.error('Error fetching meeting:', err);
                setError('Failed to load meeting');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchMeeting();

        return () => {
            handleStopTranscription();
            if (durationTimeoutRef.current) {
                clearTimeout(durationTimeoutRef.current);
            }
        };
    }, [meetingId]);

    const startNewRecordingInterval = async () => {
        if (!streamRef.current) return;

        // Stop current recording if exists
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // Clear previous chunks
        chunksRef.current = [];

        // Create new MediaRecorder with appropriate options
        const options = {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
        };

        try {
            mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                if (chunksRef.current.length > 0) {
                    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
                    try {
                        await processAudioChunk(audioBlob, meetingId);
                    } catch (error) {
                        console.error("Error processing audio chunk:", error);
                    }
                    chunksRef.current = []; // Clear chunks after processing
                }
            };

            // Start new recording
            mediaRecorderRef.current.start();
        } catch (error) {
            console.error("Error creating MediaRecorder:", error);
        }
    };

    const handleStartTranscription = async (durationMs?: number) => {
        try {
            await initializeCollection(meetingId);
            console.log("Starting transcription...");

            if (transcriptionStarted) return;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            // Start first interval
            await startNewRecordingInterval();

            // Set up interval to restart recording every 10 seconds
            intervalRef.current = setInterval(async () => {
                await startNewRecordingInterval();
            }, 10000);

            setTranscriptionStarted(true);

            // Set up auto-stop if duration is provided
            if (durationMs) {
                durationTimeoutRef.current = setTimeout(() => {
                    handleStopTranscription();
                }, durationMs);
            }

            // Update meeting to show it has transcription
            if (meeting) {
                setMeeting({
                    ...meeting,
                    hasTranscription: true
                });
                
                // Update the meeting in the backend to indicate it has a transcription
                try {
                    await fetch(`/api/backend/meetings/${meetingId}/transcription`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ hasTranscription: true }),
                    });
                } catch (error) {
                    console.error("Error updating meeting transcription status:", error);
                }
            }
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Failed to access the microphone. Please ensure your microphone is connected and you've granted permission to use it.");
        }
    };

    const handleStopTranscription = () => {
        try {
            // Clear the interval
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }

            // Stop current recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }

            // Stop media stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            mediaRecorderRef.current = null;
            chunksRef.current = [];
            console.log("Audio recording stopped.");
        } catch (error) {
            console.error("Error stopping transcription:", error);
        } finally {
            setTranscriptionStarted(false);
        }
    };

    const handleRestartCollection = async () => {
        try {
            await restartCollection(meetingId);
            console.log("Collection restarted successfully.");
        } catch (error) {
            console.error("Error restarting collection:", error);
            alert("Failed to restart the collection.");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !meeting) {
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
                    <span className="text-white">{meeting.title}</span>
                </div>

                {/* Meeting header */}
                <div className="glass-effect rounded-xl p-6 border border-white/10 mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
                            <p className="text-text-secondary mt-1">{meeting.description}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            {transcriptionStarted && (
                                <div className="flex items-center bg-primary/20 rounded-full px-3 py-1 text-primary-light gap-2">
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                                    </div>
                                    <span className="text-sm">Recording</span>
                                </div>
                            )}
                            
                            <button
                                onClick={transcriptionStarted ? handleStopTranscription : () => setIsModalOpen(true)}
                                className={`
                                    px-4 py-2 rounded-full transition-colors text-white
                                    ${transcriptionStarted 
                                    ? 'bg-red-500 hover:bg-red-600' 
                                    : 'bg-gradient-to-r from-green-500 to-teal-500 hover:opacity-90'}
                                `}
                            >
                                {transcriptionStarted ? 'Stop Recording' : 'Start Recording'}
                            </button>

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
                                {new Date(meeting.meeting_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
                            <span className="text-white">{meeting.attendees?.length || 0} Attendees</span>
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
                                {meeting.attendees && meeting.attendees.map((attendee) => (
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

                            {meeting.attendees && meeting.attendees.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <h3 className="text-lg font-medium text-white mb-3">Speaking Distribution</h3>
                                <div className="h-6 rounded-full flex overflow-hidden">
                                        {meeting.attendees.map((attendee) => (
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
                            )}
                        </div>
                    </div>

                    {/* Middle column - Agenda */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Agenda</h2>
                        <div className="glass-effect rounded-xl border border-white/10 p-6">
                            {meeting.agenda && meeting.agenda.length > 0 ? (
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
                            ) : (
                                <p className="text-text-secondary text-center">No agenda items available</p>
                            )}
                        </div>
                    </div>

                    {/* Right column - Action Items */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Action Items</h2>
                        <div className="glass-effect rounded-xl border border-white/10 p-6">
                            {meeting.actions && meeting.actions.length > 0 ? (
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
                            ) : (
                                <p className="text-text-secondary text-center">No action items available</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            
            {/* Duration Modal */}
            <DurationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={(durationMs) => {
                    handleStartTranscription(durationMs);
                }}
            />
        </div>
    );
}
