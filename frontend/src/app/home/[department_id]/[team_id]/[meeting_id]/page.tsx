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
    pdf_documents?: string[]; // IDs of associated PDF documents
}

interface PdfDocument {
    _id: string;
    meeting_id: string;
    filename: string;
    content_type: string;
    uploaded_at: string;
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-effect rounded-2xl border border-white/20 p-8 w-full max-w-md mx-auto shadow-2xl animate-fadeIn">
                <h2 className="text-2xl font-bold gradient-text mb-6 text-center">Set Recording Duration</h2>

                <div className="flex flex-col sm:flex-row gap-6 mb-8">
          {/* Hours */}
          <div className="flex-1">
                        <label className="block text-sm font-medium text-white mb-2">Hours</label>
            <select 
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-surface/70 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-inner transition-all"
            >
              {[...Array(5)].map((_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          {/* Minutes */}
          <div className="flex-1">
                        <label className="block text-sm font-medium text-white mb-2">Minutes</label>
            <select 
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-surface/70 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-inner transition-all"
            >
              {[...Array(12)].map((_, i) => (
                                <option key={i} value={i * 5}>{i * 5}</option>
              ))}
            </select>
          </div>
        </div>

                <div className="flex flex-col-reverse sm:flex-row justify-center gap-4">
          <button
            onClick={onClose}
                        className="w-full sm:w-auto px-6 py-3 bg-surface/80 border border-white/10 rounded-xl text-white hover:bg-surface-light transition-all hover:shadow-md"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl hover:opacity-90 transition-all shadow-md hover:shadow-lg"
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
            { id: 'user2', name: 'Alex Johnson', role: 'Tech Lead', avatarColor: 'bg-gradient-to-br from-blue-500 to-cyan-500', speaking: 30 },
            { id: 'user3', name: 'Kai Havertz', role: 'Frontend Dev', avatarColor: 'bg-gradient-to-br from-teal-500 to-emerald-500', speaking: 20 },
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

    // PDF-related state
    const [uploadedPdfs, setUploadedPdfs] = useState<PdfDocument[]>([]);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchMeeting = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/backend/meetings/${meetingId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch meeting');
                }
                
                const meetingData = await response.json();
                
                // Extract time from the ISO date string
                const meetingDate = new Date(meetingData.meeting_date);
                const startTime = meetingDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                
                // Calculate end time (60 min after start time)
                const endTime = new Date(meetingDate);
                endTime.setMinutes(endTime.getMinutes() + 60);
                const endTimeString = endTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                
                // Combine API data with sample extended data for UI purposes
                // But preserve the start and end time from the actual meeting data
                setMeeting({
                    ...meetingData,
                    ...sampleExtendedData,
                    startTime,
                    endTime: endTimeString
                });
                
                // After successfully fetching the meeting, fetch associated PDFs
                await fetchPdfDocuments(meetingId);

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

            // Update meeting state locally to show it has transcription
            if (meeting) {
                setMeeting({
                    ...meeting,
                    hasTranscription: true
                });
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

    // Fetch PDF documents associated with this meeting
    const fetchPdfDocuments = async (meetingId: string) => {
        try {
            const response = await fetch(`/api/backend/meetings/${meetingId}/pdf-documents`);

            if (!response.ok) {
                throw new Error('Failed to fetch PDF documents');
            }

            const documents = await response.json();
            setUploadedPdfs(documents);
        } catch (err) {
            console.error('Error fetching PDF documents:', err);
            setPdfUploadError('Failed to load PDF documents');
        }
    };

    // Handle PDF file selection and upload
    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // Validate file is a PDF
        if (file.type !== 'application/pdf') {
            setPdfUploadError('Only PDF files are allowed');
            return;
        }

        setIsUploadingPdf(true);
        setPdfUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`/api/backend/meetings/${meetingId}/upload-pdf`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to upload PDF');
            }

            // Refresh the list of PDFs
            await fetchPdfDocuments(meetingId);

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            console.error('Error uploading PDF:', err);
        } finally {
            setIsUploadingPdf(false);
        }
    };

    // Function to open a PDF in a new tab
    const openPdf = async (documentId: string) => {
        try {
            const response = await fetch(`/api/backend/pdf-documents/${documentId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch PDF document');
            }

            const document = await response.json();

            // Create a blob from the base64 data
            const binaryString = atob(document.file_content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });

            // Create a URL for the blob and open it in a new tab
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error('Error opening PDF:', err);
            alert('Failed to open PDF. Please try again.');
        }
    };

    // First, add the deleteDocument function to handle document deletion
    const deleteDocument = async (documentId: string) => {
        try {
            const response = await fetch(`/api/backend/pdf-documents/${documentId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete document');
            }

            // Refresh the list of PDFs
            await fetchPdfDocuments(meetingId);
        } catch (err) {
            console.error('Error deleting document:', err);
            alert('Failed to delete the document. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="h-16 w-16 rounded-full border-4 border-primary-light border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent"></div>
                        </div>
                    </div>
                    <p className="text-lg text-white animate-pulse">Loading meeting details...</p>
                </div>
            </div>
        );
    }

    if (error || !meeting) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center p-8 max-w-md glass-effect rounded-2xl border border-white/20 shadow-xl">
                    <div className="bg-red-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold gradient-text mb-4">Meeting Not Found</h2>
                    <p className="text-text-secondary mb-8">The meeting you're looking for doesn't exist or has been removed.</p>
                    <Link
                        href={`/home/${departmentId}/${teamId}`}
                        className="bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back to Meetings
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto py-8 px-4 space-y-8">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-2">
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
                <div className="glass-effect rounded-2xl p-8 border border-white/20 mb-8 shadow-xl">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-6">
                        <div>
                            <h1 className="text-3xl font-bold gradient-text mb-2">{meeting.title}</h1>
                            <p className="text-text-secondary text-lg">{meeting.description}</p>
                        </div>

                            {transcriptionStarted && (
                            <div className="flex items-center bg-primary/20 rounded-full px-4 py-2 text-primary-light gap-2 border border-primary/30 shadow-md">
                                    <div className="relative">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                                    </div>
                                <span className="text-sm font-medium">Recording in Progress</span>
                                </div>
                            )}
                    </div>

                    {/* Meeting info cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="glass-effect bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-3 shadow-md">
                            <div className="p-2 rounded-lg bg-primary/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </div>
                            <div>
                                <p className="text-text-secondary text-xs">Date</p>
                                <p className="text-white font-medium">
                                    {new Date(meeting.meeting_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        <div className="glass-effect bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-3 shadow-md">
                            <div className="p-2 rounded-lg bg-primary/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                            </div>
                            <div>
                                <p className="text-text-secondary text-xs">Time</p>
                                <p className="text-white font-medium">{meeting.startTime} - {meeting.endTime} ({meeting.duration} min)</p>
                            </div>
                        </div>

                        <div className="glass-effect bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-3 shadow-md">
                            <div className="p-2 rounded-lg bg-primary/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <div>
                                <p className="text-text-secondary text-xs">Participants</p>
                                <p className="text-white font-medium">{meeting.attendees?.length || 0} Attendees</p>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            <button
                                onClick={transcriptionStarted ? handleStopTranscription : () => setIsModalOpen(true)}
                                className={`
                                px-4 py-3 rounded-xl transition-all text-white font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg
                                    ${transcriptionStarted 
                                    ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600'
                                    : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700'}
                            `}
                        >
                            {transcriptionStarted ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="6" y="4" width="4" height="16"></rect>
                                        <rect x="14" y="4" width="4" height="16"></rect>
                                    </svg>
                                    Stop Recording
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    Start Recording
                                </>
                            )}
                            </button>

                            <Link
                                href={`/home/${departmentId}/${teamId}/${meetingId}/transcription`}
                            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                    <path d="M19.07 5.93a10 10 0 0 1 0 12.14"></path>
                                </svg>
                                View Transcription
                            </Link>

                        <div className="relative">
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={handlePdfUpload}
                                className="hidden"
                                id="pdf-upload"
                                ref={fileInputRef}
                                disabled={isUploadingPdf}
                            />
                            <label
                                htmlFor="pdf-upload"
                                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all w-full"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="12" y1="18" x2="12" y2="12" />
                                    <line x1="9" y1="15" x2="15" y2="15" />
                                </svg>
                                {isUploadingPdf ? 'Uploading...' : 'Upload PDF'}
                            </label>
                            {pdfUploadError && (
                                <p className="absolute text-xs text-red-500 mt-1">{pdfUploadError}</p>
                            )}
                        </div>

                        <Link
                            href={`/home/${departmentId}/${teamId}/${meetingId}/chat`}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            Chat with Assistant
                        </Link>
                        <Link
                            href={`/home/${departmentId}/${teamId}/${meetingId}/conceptgraph`}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                            Concept Graph
                        </Link>
                    </div>
                </div>

                {/* Main content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left column - Attendees and Speaking Time */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-1 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                            <h2 className="text-xl font-bold text-white">Attendees</h2>
                        </div>
                        <div className="glass-effect rounded-2xl border border-white/20 p-6 shadow-lg">
                            {meeting.attendees && meeting.attendees.length > 0 ? (
                                <div className="space-y-5">
                                    {meeting.attendees.map((attendee) => (
                                        <div key={attendee.id} className="flex items-center gap-4 group transition-all hover:bg-white/5 p-2 rounded-xl cursor-pointer">
                                            <div className={`w-12 h-12 rounded-full ${attendee.avatarColor} flex items-center justify-center text-white font-medium text-lg shadow-md group-hover:scale-105 transition-transform`}>
                                            {attendee.name.charAt(0)}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-white font-medium">{attendee.name}</p>
                                            <p className="text-sm text-text-secondary">{attendee.role}</p>
                                        </div>
                                            <div className="text-right flex flex-col items-center justify-center bg-white/5 rounded-lg p-2 shadow-inner">
                                                <p className="text-white font-bold text-lg">{attendee.speaking}%</p>
                                                <p className="text-xs text-text-secondary">speaking</p>
                                            </div>
                                    </div>
                                ))}

                            <div className="mt-6 pt-6 border-t border-white/10">
                                <h3 className="text-lg font-medium text-white mb-3">Speaking Distribution</h3>
                                        <div className="h-8 rounded-full flex overflow-hidden shadow-md">
                                    {meeting.attendees.map((attendee) => (
                                        <div
                                            key={attendee.id}
                                                    className={`${attendee.avatarColor} h-full relative group`}
                                            style={{ width: `${attendee.speaking}%` }}
                                                >
                                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap transition-opacity">
                                                        {attendee.name}: {attendee.speaking}%
                                                    </div>
                                                </div>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-2">
                                            <p className="text-sm text-text-secondary">0:00</p>
                                            <p className="text-sm text-text-secondary">{meeting.duration}:00</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            <path d="M21 21v-2a4 4 0 0 0-3-3.87"></path>
                                        </svg>
                                    </div>
                                    <p className="text-text-secondary">No attendees available</p>
                            </div>
                            )}
                        </div>
                    </div>

                    {/* Middle column - Agenda */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-1 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                            <h2 className="text-xl font-bold text-white">Agenda</h2>
                        </div>
                        <div className="glass-effect rounded-2xl border border-white/20 p-6 shadow-lg min-h-[400px]">
                            {meeting.agenda && meeting.agenda.length > 0 ? (
                                <div className="space-y-5">
                                {meeting.agenda.map((item, index) => (
                                        <div key={item.id} className="flex items-start gap-4 group hover:bg-white/5 p-3 rounded-xl transition-all">
                                            <div className="min-w-8 mt-1">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-md ${item.isCompleted ? 'bg-primary/30 text-primary-light' : 'bg-white/10 text-white/60'}`}>
                                                {item.isCompleted ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                ) : (
                                                    <span>{index + 1}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-grow">
                                                <p className={`font-medium text-lg ${item.isCompleted ? 'text-white/60' : 'text-white'}`}>
                                                {item.title}
                                            </p>
                                                <div className="flex items-center mt-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light mr-1">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <polyline points="12 6 12 12 16 14"></polyline>
                                                    </svg>
                                            <p className="text-sm text-text-secondary">{item.duration} minutes</p>
                                                </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full py-8">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                    </div>
                                    <p className="text-text-secondary">No agenda items available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right column - Action Items */}
                    <div>
                        <div className="flex flex-col gap-8">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-8 w-1 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                                    <h2 className="text-xl font-bold text-white">Action Items</h2>
                                </div>
                                <div className="glass-effect rounded-2xl border border-white/20 p-6 shadow-lg">
                            {meeting.actions && meeting.actions.length > 0 ? (
                                        <div className="space-y-5">
                                {meeting.actions.map((action) => (
                                                <div key={action.id} className="flex items-start gap-4 group hover:bg-white/5 p-3 rounded-xl transition-all">
                                                    <div className="min-w-8 mt-1">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-md ${action.isCompleted ? 'bg-primary/30 text-primary-light' : 'bg-white/10 text-white/60'}`}>
                                                {action.isCompleted ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-grow">
                                                        <p className={`font-medium text-lg ${action.isCompleted ? 'text-white/60' : 'text-white'}`}>
                                                {action.description}
                                            </p>
                                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 mt-2">
                                                            <div className="flex items-center">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light mr-1">
                                                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                                    <circle cx="9" cy="7" r="4"></circle>
                                                                </svg>
                                                                <p className="text-sm text-text-secondary"><span className="text-primary-light">{action.assignee}</span></p>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light mr-1">
                                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                                                </svg>
                                                                <p className="text-sm text-text-secondary">Due: {new Date(action.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                                            </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            ) : (
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                                                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                                    <polyline points="14 2 14 8 20 8"></polyline>
                                                </svg>
                                            </div>
                                            <p className="text-text-secondary">No action items available</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* PDF Documents Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-8 w-1 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
                                    <h2 className="text-xl font-bold text-white">Documents</h2>
                                </div>
                                <div className="glass-effect rounded-2xl border border-white/20 p-6 shadow-lg">
                                    {uploadedPdfs.length > 0 ? (
                                        <div className="space-y-5">
                                            {uploadedPdfs.map((pdf) => (
                                                <div key={pdf._id} className="flex items-start gap-4 group hover:bg-white/5 p-3 rounded-xl transition-all">
                                                    <div className="min-w-8 mt-1">
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20 text-amber-400 shadow-md group-hover:scale-105 transition-transform">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                <polyline points="14 2 14 8 20 8" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <button
                                                            onClick={() => openPdf(pdf._id)}
                                                            className="font-medium text-lg text-white hover:text-amber-400 transition group-hover:underline"
                                                        >
                                                            {pdf.filename}
                                                        </button>
                                                        <div className="flex items-center mt-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 mr-1">
                                                                <circle cx="12" cy="12" r="10"></circle>
                                                                <polyline points="12 6 12 12 16 14"></polyline>
                                                            </svg>
                                                            <p className="text-sm text-text-secondary">
                                                                {new Date(pdf.uploaded_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                        <button
                                                            onClick={() => openPdf(pdf._id)}
                                                            className="p-2 rounded-full hover:bg-amber-500/20 text-white hover:text-amber-400 transition-colors"
                                                            title="Open PDF"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                                <line x1="10" y1="14" x2="21" y2="3"></line>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => deleteDocument(pdf._id)}
                                                            className="p-2 rounded-full hover:bg-red-500/20 text-white hover:text-red-400 transition-colors"
                                                            title="Delete PDF"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M3 6h18"></path>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                </svg>
                                            </div>
                                            <p className="text-text-secondary">No documents uploaded</p>
                                        </div>
                                    )}
                                </div>
                            </div>
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
