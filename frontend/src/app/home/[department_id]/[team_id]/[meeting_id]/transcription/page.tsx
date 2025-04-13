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

// Sample transcript data
const transcriptData: Record<string, TranscriptData> = {
    'sprint-1': {
        meetingId: 'sprint-1',
        meetingName: 'Sprint Planning',
        date: '2023-05-15',
        duration: '01:00:00',
        speakers: [
            { id: 'user1', name: 'Sarah Chen', role: 'Product Manager', avatarColor: 'bg-gradient-to-br from-purple-500 to-indigo-500' },
            { id: 'user2', name: 'Alex Johnson', role: 'Tech Lead', avatarColor: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
            { id: 'user3', name: 'Kai Ramirez', role: 'Frontend Dev', avatarColor: 'bg-gradient-to-br from-teal-500 to-emerald-500' },
            { id: 'user4', name: 'Jamie Wu', role: 'UX Designer', avatarColor: 'bg-gradient-to-br from-amber-500 to-orange-500' },
            { id: 'user5', name: 'Morgan Lee', role: 'QA Engineer', avatarColor: 'bg-gradient-to-br from-red-500 to-rose-500' },
            { id: 'user6', name: 'Taylor Kim', role: 'Backend Dev', avatarColor: 'bg-gradient-to-br from-pink-500 to-fuchsia-500' },
        ],
        segments: [
            { id: 'seg1', speakerId: 'user1', timestamp: '00:00:15', text: "Good morning everyone. Let's get started with our sprint planning. First, I'd like to do a quick review of our last sprint and then discuss priorities for the upcoming one.", sentiment: 'positive' },
            { id: 'seg2', speakerId: 'user1', timestamp: '00:01:20', text: "Overall, we completed 85% of our planned story points. There were a few items that got pushed due to unforeseen technical challenges.", sentiment: 'neutral' },
            { id: 'seg3', speakerId: 'user2', timestamp: '00:02:05', text: "Yeah, we had some issues with the third-party API integration. We spent almost two days troubleshooting, but we've resolved it now.", sentiment: 'negative' },
            { id: 'seg4', speakerId: 'user1', timestamp: '00:03:30', text: "Thanks for the update, Alex. For this sprint, our top priority is launching the new authentication flow. The design team has finalized all the screens.", sentiment: 'positive' },
            { id: 'seg5', speakerId: 'user4', timestamp: '00:04:45', text: "That's right. I've put together a comprehensive UI spec with all the different states. I'll share the link in the chat.", sentiment: 'positive' },
            { id: 'seg6', speakerId: 'user3', timestamp: '00:05:40', text: "I've looked at the designs, and I think we should be able to implement them within the sprint. Though we might need to optimize some of the animations.", sentiment: 'neutral' },
            { id: 'seg7', speakerId: 'user6', timestamp: '00:07:15', text: "On the backend side, we already have the auth APIs ready. We just need to add the new password policies and multi-factor authentication endpoints.", sentiment: 'positive' },
            { id: 'seg8', speakerId: 'user5', timestamp: '00:08:30', text: "I'll need to update our test plans to cover all the new authentication scenarios. Do we have a list of all the edge cases we need to handle?", sentiment: 'neutral' },
            { id: 'seg9', speakerId: 'user2', timestamp: '00:09:45', text: "Good point, Morgan. I think we should allocate some time to brainstorm all possible edge cases. I can lead that session tomorrow.", isHighlighted: true, sentiment: 'positive' },
            { id: 'seg10', speakerId: 'user1', timestamp: '00:11:00', text: "Perfect. Let's set that up for tomorrow morning. Now, let's start estimating the user stories for this sprint.", sentiment: 'positive' },
            // More segments would go here...
        ],
        summary: "The team conducted their bi-weekly sprint planning session. They reviewed the previous sprint's performance (85% completion rate) and discussed priorities for the upcoming sprint. The main focus will be implementing a new authentication flow with updated security features. The team discussed technical challenges, design requirements, and testing needs for this feature.",
        keyPoints: [
            "Previous sprint achieved 85% completion rate",
            "Main priority for new sprint is the authentication flow update",
            "Backend APIs are already prepared, need to add password policies and MFA",
            "Design team has completed all UI screens",
            "A session to identify edge cases will be held tomorrow",
            "Some animation optimizations may be needed for performance"
        ],
        actionItems: [
            "Alex to lead edge case identification session tomorrow",
            "Jamie to share UI spec documentation",
            "Morgan to update test plans for new authentication flow",
            "Kai to evaluate animation performance",
            "Taylor to implement new password policies and MFA endpoints"
        ]
    },
    // Default transcript for demo
    '_default': {
        meetingId: '_default',
        meetingName: 'Meeting',
        date: '2023-05-20',
        duration: '01:00:00',
        speakers: [
            { id: 'user1', name: 'Jane Doe', role: 'Manager', avatarColor: 'bg-gradient-to-br from-purple-500 to-indigo-500' },
            { id: 'user2', name: 'John Smith', role: 'Developer', avatarColor: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
            { id: 'user3', name: 'Alice Brown', role: 'Designer', avatarColor: 'bg-gradient-to-br from-teal-500 to-emerald-500' }
        ],
        segments: [
            { id: 'seg1', speakerId: 'user1', timestamp: '00:00:10', text: "Let's get started with our weekly meeting. We have a few things to discuss today.", sentiment: 'positive' },
            { id: 'seg2', speakerId: 'user2', timestamp: '00:01:00', text: "I've completed the implementation of the feature we discussed last week.", sentiment: 'positive' },
            { id: 'seg3', speakerId: 'user3', timestamp: '00:02:15', text: "Great! I've prepared the designs for the next feature. Would you like to review them now?", sentiment: 'positive' },
            { id: 'seg4', speakerId: 'user1', timestamp: '00:03:30', text: "Yes, let's take a look at those designs.", sentiment: 'neutral' },
        ],
        summary: "The team discussed progress on current features and reviewed designs for upcoming work.",
        keyPoints: [
            "Feature implementation completed",
            "New designs ready for review",
            "Team aligned on next steps"
        ],
        actionItems: [
            "John to continue with backend implementation",
            "Alice to finalize designs based on feedback",
            "Jane to update project timeline"
        ]
    }
};

export default function TranscriptionPage() {
    const router = useRouter();
    const params = useParams();
    const departmentId = params.department_id as string;
    const teamId = params.team_id as string;
    const meetingId = params.meeting_id as string;

    // State for meeting data
    const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Try to get the transcript data, or use default if not found
    const [transcript, setTranscript] = useState<TranscriptData | null>(
        transcriptData[meetingId] || transcriptData['_default'] || null
    );

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
                
                // Update transcript with actual meeting data
                if (transcript) {
                    // Format the date from ISO string to locale date string
                    const meetingDate = new Date(meetingData.meeting_date);
                    
                    setTranscript({
                        ...transcript,
                        meetingName: meetingData.title,
                        date: meetingData.meeting_date,
                    });
                }

                // Fetch transcriptions from API
                await fetchTranscriptions(meetingId);
                
            } catch (err) {
                console.error('Error fetching meeting:', err);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchMeeting();
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
        setTranscriptError(null);
        try {
            const response = await fetch(`/api/backend/meetings/${meetingId}/transcriptions`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch transcriptions');
            }
            
            const data = await response.json();
            const transcriptions = data.transcriptions || [];
            
            // Map API transcriptions to our TranscriptSegment format
            // Assign random speakers for demo purposes
            const speakerIds = transcript?.speakers.map(s => s.id) || [];
            
            const formattedTranscriptions = transcriptions.map((t: any, index: number) => {
                // Randomly assign a speaker from our sample speakers
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

    if (!transcript || !meeting) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">Transcript not found</h2>
                    <p className="text-text-secondary mb-6">The meeting transcript you're looking for doesn't exist or has been removed.</p>
                    <Link
                        href={`/home/${departmentId}/${teamId}/${meetingId}`}
                        className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                    >
                        Back to Meeting
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
                                {' • '}{transcript.duration} duration
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
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left sidebar - speakers */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8">
                            <h2 className="text-xl font-semibold text-white mb-4">Speakers</h2>
                            <div className="glass-effect rounded-xl border border-white/10 p-4">
                                <div className="space-y-3">
                                    {transcript.speakers.map((speaker) => (
                                        <div
                                            key={speaker.id}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${selectedSpeakers.includes(speaker.id) || selectedSpeakers.length === 0
                                                ? 'bg-white/5'
                                                : 'opacity-50'
                                                }`}
                                            onClick={() => toggleSpeaker(speaker.id)}
                                        >
                                            <div className={`w-8 h-8 rounded-full ${speaker.avatarColor} flex items-center justify-center text-white font-medium`}>
                                                {speaker.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{speaker.name}</p>
                                                <p className="text-xs text-text-secondary">{speaker.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main content area */}
                    <div className="lg:col-span-3">
                        {activeTab === 'transcript' ? (
                            <div className="space-y-6">
                                {filteredSegments.map((segment) => {
                                    const speaker = getSpeaker(segment.speakerId);
                                    if (!speaker) return null;

                                    return (
                                        <div 
                                            key={segment.id} 
                                            className={`flex gap-4 p-4 rounded-lg transition ${segment.isHighlighted ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-full ${speaker.avatarColor} flex-shrink-0 flex items-center justify-center text-white font-medium mt-1`}>
                                                {speaker.name.charAt(0)}
                                            </div>
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium text-white">{speaker.name}</p>
                                                    <span className="text-xs text-text-secondary">{segment.timestamp}</span>
                                                    {segment.sentiment === 'positive' && (
                                                        <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Positive</span>
                                                    )}
                                                    {segment.sentiment === 'negative' && (
                                                        <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">Negative</span>
                                                    )}
                                                </div>
                                                <p className="text-text-primary">{segment.text}</p>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                    <div>
                                        <div className="mb-6">
                                            <h3 className="text-lg font-semibold text-white mb-3">Meeting Summary</h3>
                                            <p className="text-text-primary">{transcript.summary}</p>
                                        </div>

                                        <div className="mb-6">
                                            <h3 className="text-lg font-semibold text-white mb-3">Key Points</h3>
                                            <ul className="space-y-2">
                                                {transcript.keyPoints.map((point, index) => (
                                                    <li key={index} className="flex items-start gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary-light flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="20 6 9 17 4 12"></polyline>
                                                            </svg>
                                                        </div>
                                                        <span className="text-text-primary">{point}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-3">Action Items</h3>
                                            <ul className="space-y-2">
                                                {transcript.actionItems.map((item, index) => (
                                                    <li key={index} className="flex items-start gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-accent/20 text-accent-light flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M3 10h18M7 15h10M12 3v6M14.5 13.5l-5-3M9.5 13.5l5-3"/>
                                                            </svg>
                                                        </div>
                                                        <span className="text-text-primary">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
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
