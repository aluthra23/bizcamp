'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

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
        duration: '00:45:00',
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

    // Try to get the transcript data, or use default if not found
    const [transcript, setTranscript] = useState<TranscriptData | null>(
        transcriptData[meetingId] || transcriptData['_default'] || null
    );

    // State for active tab
    const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('transcript');

    // State for speaker filter
    const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);

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

    if (!transcript) {
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
                        {transcript.meetingName}
                    </Link>
                    <span className="text-white/40">→</span>
                    <span className="text-white">Transcription</span>
                </div>

                {/* Meeting header */}
                <div className="glass-effect rounded-xl p-6 border border-white/10 mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{transcript.meetingName} - Transcription</h1>
                            <p className="text-text-secondary mt-1">
                                {new Date(transcript.date).toLocaleDateString('en-US', {
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

                    {/* Main content - transcript or summary */}
                    <div className="lg:col-span-3">
                        {activeTab === 'transcript' ? (
                            <div className="space-y-6">
                                {filteredSegments.map((segment) => {
                                    const speaker = getSpeaker(segment.speakerId);
                                    return (
                                        <div
                                            key={segment.id}
                                            className={`flex gap-4 ${segment.isHighlighted ? 'bg-primary/10 p-4 rounded-lg border border-primary/20' : ''}`}
                                        >
                                            <div className="flex-shrink-0 mt-1">
                                                <div className={`w-8 h-8 rounded-full ${speaker?.avatarColor} flex items-center justify-center text-white font-medium`}>
                                                    {speaker?.name.charAt(0)}
                                                </div>
                                            </div>

                                            <div className="flex-grow">
                                                <div className="flex justify-between mb-1">
                                                    <p className="text-white font-medium">{speaker?.name}</p>
                                                    <p className="text-white/60 text-sm">{segment.timestamp}</p>
                                                </div>

                                                <p className={`text-white/90 ${segment.sentiment === 'positive' ? 'border-l-2 border-green-500 pl-3' :
                                                    segment.sentiment === 'negative' ? 'border-l-2 border-red-500 pl-3' : ''
                                                    }`}>
                                                    {segment.text}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="glass-effect rounded-xl border border-white/10 p-6">
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-white mb-2">AI-Generated Summary</h3>
                                    <p className="text-white/90">{transcript.summary}</p>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-white mb-2">Key Points</h3>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {transcript.keyPoints.map((point, index) => (
                                            <li key={index} className="text-white/90">{point}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Action Items</h3>
                                    <ul className="space-y-2">
                                        {transcript.actionItems.map((item, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <div className="bg-primary/20 text-primary-light rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="9 11 12 14 22 4"></polyline>
                                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                                    </svg>
                                                </div>
                                                <span className="text-white/90">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
