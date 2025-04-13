'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

// Define types
interface Speaker {
    id: string;
    name: string;
    role: string;
    avatarColor: string;
}

interface TranscriptSegment {
    id: string;
    speakerId: string;
    timestamp: string; // in format "00:00:00"
    text: string;
    isHighlighted?: boolean;
    sentiment?: 'positive' | 'neutral' | 'negative';
    start_time?: number; // from API, in seconds
    end_time?: number; // from API, in seconds
}

interface TranscriptData {
    meetingId: string;
    meetingName: string;
    date: string;
    duration: string; // in format "00:00:00"
    speakers: Speaker[];
    segments: TranscriptSegment[];
    summary: string;
    keyPoints: string[];
    actionItems: string[];
}

interface MeetingDetails {
    _id: string;
    teamId: string;
    title: string;
    description: string;
    meeting_date: string;
}

// Sample transcript data for speakers
const sampleSpeakers: Speaker[] = [
    { id: 'user1', name: 'Sarah Chen', role: 'Product Manager', avatarColor: 'bg-gradient-to-br from-purple-500 to-indigo-500' },
    { id: 'user2', name: 'Alex Johnson', role: 'Tech Lead', avatarColor: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
    { id: 'user3', name: 'Kai Ramirez', role: 'Frontend Dev', avatarColor: 'bg-gradient-to-br from-teal-500 to-emerald-500' },
    { id: 'user4', name: 'Jamie Wu', role: 'UX Designer', avatarColor: 'bg-gradient-to-br from-amber-500 to-orange-500' },
    { id: 'user5', name: 'Morgan Lee', role: 'QA Engineer', avatarColor: 'bg-gradient-to-br from-red-500 to-rose-500' },
    { id: 'user6', name: 'Taylor Kim', role: 'Backend Dev', avatarColor: 'bg-gradient-to-br from-pink-500 to-fuchsia-500' },
];

export default function TranscriptionPage() {
    const router = useRouter();
    const params = useParams();
    const departmentId = params.department_id as string;
    const teamId = params.team_id as string;
    const meetingId = params.meeting_id as string;

    // State for meeting data
    const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize with empty transcript
    const [transcript, setTranscript] = useState<TranscriptData | null>(null);

    // State for active tab
    const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('transcript');

    // State for speaker filter
    const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
    
    // State for API transcriptions
    const [apiTranscriptions, setApiTranscriptions] = useState<TranscriptSegment[]>([]);
    const [isLoadingTranscriptions, setIsLoadingTranscriptions] = useState(false);
    const [transcriptError, setTranscriptError] = useState<string | null>(null);

    // State for AI summary
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    // Helper function to format seconds to "HH:MM:SS" format
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    };

    // Fetch AI Summary from the API
    const fetchAiSummary = async () => {
        setIsLoadingSummary(true);
        setSummaryError(null);
        try {
            const response = await fetch(`/api/backend/summaries/${meetingId}/fetch_summary`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch AI summary');
            }
            
            const data = await response.json();
            if (data.summary) {
                setAiSummary(data.summary);
            } else {
                setSummaryError('Transcription is going on and we will generate after. If your transcription is over, we are generating summaries right now, ask again in 30 seconds');
            }
        } catch (err) {
            console.error('Error fetching AI summary:', err);
            setSummaryError('Transcription is going on and we will generate after. If your transcription is over, we are generating summaries right now, ask again in 30 seconds');
        } finally {
            setIsLoadingSummary(false);
        }
    };

    useEffect(() => {
        const fetchMeeting = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/backend/meetings/${meetingId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch meeting');
                }
                
                const meetingData = await response.json();
                setMeeting(meetingData);
                
                // Initialize a basic transcript structure
                setTranscript({
                    meetingId: meetingId,
                    meetingName: meetingData.title,
                    date: meetingData.meeting_date,
                    duration: '00:00:00', // Will be updated based on transcription
                    speakers: sampleSpeakers,
                    segments: [],
                    summary: '',
                    keyPoints: [],
                    actionItems: []
                });

                // Fetch transcriptions from API
                await fetchTranscriptions(meetingId);
                
            } catch (err) {
                console.error('Error fetching meeting:', err);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchMeeting();

        // Set up polling every 5 seconds
        const intervalId = setInterval(() => {
            fetchTranscriptions(meetingId);
        }, 5000);

        // Clean up the interval on component unmount
        return () => clearInterval(intervalId);
    }, [meetingId]);

    // Effect to fetch AI summary when user switches to summary tab
    useEffect(() => {
        if (activeTab === 'summary' && !aiSummary && !isLoadingSummary) {
            fetchAiSummary();
        }
    }, [activeTab]);

    // Fetch transcriptions from API
    const fetchTranscriptions = async (meetingId: string) => {
        setIsLoadingTranscriptions(true);
        try {
            const response = await fetch(`/api/backend/meetings/${meetingId}/transcriptions`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch transcriptions');
            }
            
            const data = await response.json();
            const transcriptions = data.transcriptions || [];
            
            // Map API transcriptions to our TranscriptSegment format
            // Assign random speakers for tracking
            const speakerIds = sampleSpeakers.map(s => s.id) || [];
            
            const formattedTranscriptions = transcriptions.map((t: any, index: number) => {
                // Randomly assign a speaker for internal tracking
                const randomSpeakerId = speakerIds[index % speakerIds.length];
                
                return {
                    id: `api-seg-${index}`,
                    speakerId: randomSpeakerId,
                    timestamp: formatTime(t.start_time),
                    text: t.text,
                    start_time: t.start_time,
                    end_time: t.end_time,
                    sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
                };
            });
            
            setApiTranscriptions(formattedTranscriptions);
            
            // If we have API transcriptions, update the transcript object
            if (formattedTranscriptions.length > 0) {
                setTranscript(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        segments: formattedTranscriptions,
                    };
                });
            }
            
            setTranscriptError(null);
        } catch (err) {
            console.error('Error fetching transcriptions:', err);
            setTranscriptError('Failed to load transcriptions from API');
        } finally {
            setIsLoadingTranscriptions(false);
        }
    };

    // Filter segments by selected speakers or show all if none selected
    const filteredSegments = transcript?.segments.filter(segment =>
        selectedSpeakers.length === 0 || selectedSpeakers.includes(segment.speakerId)
    ) || [];

    // Handle speaker selection/deselection
    const toggleSpeaker = (speakerId: string) => {
        if (selectedSpeakers.includes(speakerId)) {
            setSelectedSpeakers(selectedSpeakers.filter(id => id !== speakerId));
        } else {
            setSelectedSpeakers([...selectedSpeakers, speakerId]);
        }
    };

    // Function to get speaker info
    const getSpeaker = (speakerId: string) => {
        return transcript?.speakers.find(speaker => speaker.id === speakerId);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

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
                    <Link href={`/home/${departmentId}/${teamId}/${meetingId}`} className="text-white/60 hover:text-white transition">
                        {meeting.title}
                    </Link>
                    <span className="text-white/40">→</span>
                    <span className="text-white">Transcription</span>
                </div>

                {/* Meeting header */}
                <div className="glass-effect rounded-xl p-6 border border-white/10 mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{meeting.title} - Transcription</h1>
                            <p className="text-text-secondary mt-1">
                                {new Date(meeting.meeting_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                                {transcript && transcript.segments.length > 0 && ` • ${transcript.segments.length} segments`}
                            </p>
                        </div>

                        <Link
                            href={`/home/${departmentId}/${teamId}/${meetingId}`}
                            className="text-white hover:text-primary-light flex items-center gap-2 transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Back to Meeting
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 mb-6">
                    <button
                        className={`px-6 py-3 font-medium text-sm ${activeTab === 'transcript' ? 'text-white border-b-2 border-primary' : 'text-white/60 hover:text-white'}`}
                        onClick={() => setActiveTab('transcript')}
                    >
                        Transcript
                    </button>
                    <button
                        className={`px-6 py-3 font-medium text-sm ${activeTab === 'summary' ? 'text-white border-b-2 border-primary' : 'text-white/60 hover:text-white'}`}
                        onClick={() => setActiveTab('summary')}
                    >
                        AI Summary
                    </button>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1">
                    {/* Main content area */}
                    <div>
                        {activeTab === 'transcript' ? (
                            <div className="glass-effect rounded-xl border border-white/10 p-6">
                                {isLoadingTranscriptions && transcript?.segments.length === 0 ? (
                                    <div className="flex justify-center items-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                                    </div>
                                ) : transcript?.segments && transcript.segments.length > 0 ? (
                                    <div className="space-y-4">
                                        {transcript.segments.map((segment) => (
                                            <div 
                                                key={segment.id} 
                                                className={`p-4 rounded-lg transition ${segment.isHighlighted ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm font-medium text-primary-light">{segment.timestamp}</span>
                                                </div>
                                                <p className="text-text-primary">{segment.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                                <path d="M19.07 5.93a10 10 0 0 1 0 12.14"></path>
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-medium text-white mb-2">No Transcription Available</h3>
                                        <p className="text-text-secondary max-w-md mx-auto">
                                            Transcription hasn't started for this meeting. Start recording from the meeting page to begin transcription.
                                        </p>
                                        <Link 
                                            href={`/home/${departmentId}/${teamId}/${meetingId}`}
                                            className="mt-6 inline-block bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                                        >
                                            Back to Meeting
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="glass-effect rounded-xl border border-white/10 p-6">
                                {isLoadingSummary ? (
                                    <div className="flex justify-center items-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                                    </div>
                                ) : summaryError ? (
                                    <div className="text-center py-8">
                                        <p className="text-text-secondary mb-4">{summaryError}</p>
                                        <button
                                            onClick={fetchAiSummary}
                                            className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                ) : aiSummary ? (
                                    <div className="prose prose-invert max-w-none">
                                        <h3 className="text-lg font-semibold text-white mb-4">AI-Generated Summary</h3>
                                        <div className="markdown-content">
                                            <ReactMarkdown
                                                components={{
                                                    // Add specific styling for list items
                                                    ul: ({node, ...props}) => (
                                                        <ul className="space-y-2 my-4 list-disc pl-5" {...props} />
                                                    ),
                                                    ol: ({node, ...props}) => (
                                                        <ol className="space-y-2 my-4 list-decimal pl-5" {...props} />
                                                    ),
                                                    li: ({node, ...props}) => (
                                                        <li className="text-text-primary" {...props} />
                                                    ),
                                                    // Style headings
                                                    h1: ({node, ...props}) => (
                                                        <h1 className="text-xl font-bold text-white mt-6 mb-4" {...props} />
                                                    ),
                                                    h2: ({node, ...props}) => (
                                                        <h2 className="text-lg font-semibold text-white mt-5 mb-3" {...props} />
                                                    ),
                                                    h3: ({node, ...props}) => (
                                                        <h3 className="text-md font-medium text-white mt-4 mb-2" {...props} />
                                                    ),
                                                    // Style paragraphs and emphasis
                                                    p: ({node, ...props}) => (
                                                        <p className="text-text-primary mb-4" {...props} />
                                                    ),
                                                    strong: ({node, ...props}) => (
                                                        <strong className="font-bold text-white" {...props} />
                                                    ),
                                                    em: ({node, ...props}) => (
                                                        <em className="italic text-white/90" {...props} />
                                                    ),
                                                    // Style code blocks
                                                    code: ({node, ...props}) => (
                                                        <code className="bg-white/10 px-1 py-0.5 rounded text-white/90" {...props} />
                                                    )
                                                }}
                                            >
                                                {aiSummary}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-medium text-white mb-2">No Summary Available</h3>
                                        <p className="text-text-secondary max-w-md mx-auto">
                                            A summary hasn't been generated for this meeting yet. Summaries are automatically generated after transcription is complete.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
