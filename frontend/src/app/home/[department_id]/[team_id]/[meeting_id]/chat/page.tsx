'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Components } from 'react-markdown';
import type { CodeComponent } from 'react-markdown/lib/ast-to-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

interface MeetingDetails {
  _id: string;
  teamId: string;
  title: string;
  description: string;
  meeting_date: string;
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const departmentId = params.department_id as string;
  const teamId = params.team_id as string;
  const meetingId = params.meeting_id as string;
  
  const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your meeting assistant. You can ask me questions about this meeting.',
      sender: 'bot',
      timestamp: new Date().toISOString()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
      } catch (err) {
        console.error('Error fetching meeting:', err);
        setError('Failed to load meeting');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMeeting();
  }, [meetingId]);
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isSending) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);
    
    try {
      // Call the backend API
      const response = await fetch(`/api/backend/meetings/${meetingId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      // Add bot response
      const botMessage: Message = {
        id: Date.now().toString(),
        content: data.message,
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Sorry, I couldn\'t process your request at the moment.',
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };
  
  // Custom renderer for code blocks
  const renderers: Components = {
    code({node, inline, className, children, ...props}: CodeComponent) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={atomDark as any}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
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
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 flex flex-col">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
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
          <span className="text-white">Chat</span>
        </div>
        
        {/* Meeting header */}
        <div className="glass-effect rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{meeting.title} - Assistant</h1>
              <p className="text-text-secondary mt-1">
                Ask questions about this meeting or get information about topics discussed
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
        
        {/* Chat container - Fill remaining space */}
        <div className="glass-effect rounded-xl border border-white/10 overflow-hidden flex-1 flex flex-col">
          {/* Messages area - Make scrollable but contained */}
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] rounded-xl p-4 ${
                    message.sender === 'user' 
                      ? 'bg-primary/20 text-white' 
                      : 'bg-surface border border-white/10 text-white'
                  }`}>
                    {message.sender === 'user' ? (
                      <p className="break-words">{message.content}</p>
                    ) : (
                      <div className="markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({node, inline, className, children, ...props}: CodeComponent) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={atomDark as any}
                                  language={match[1]}
                                  PreTag="div"
                                  className="rounded-md"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className="bg-gray-800/50 px-1 py-0.5 rounded text-pink-200" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            p({children}) {
                              return <p className="mb-2 last:mb-0">{children}</p>;
                            },
                            ul({children}) {
                              return <ul className="list-disc pl-5 mb-2 last:mb-0">{children}</ul>;
                            },
                            ol({children}) {
                              return <ol className="list-decimal pl-5 mb-2 last:mb-0">{children}</ol>;
                            },
                            li({children}) {
                              return <li className="mb-1 last:mb-0">{children}</li>;
                            },
                            a({href, children}) {
                              return <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
                            },
                            blockquote({children}) {
                              return <blockquote className="border-l-4 border-primary/50 pl-3 italic text-white/80 my-2">{children}</blockquote>;
                            },
                            h1({children}) {
                              return <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>;
                            },
                            h2({children}) {
                              return <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>;
                            },
                            h3({children}) {
                              return <h3 className="text-md font-bold mt-2 mb-1">{children}</h3>;
                            },
                            table({children}) {
                              return <div className="overflow-x-auto"><table className="border-collapse border border-white/20 my-2 w-full">{children}</table></div>;
                            },
                            th({children}) {
                              return <th className="border border-white/20 px-4 py-2 bg-white/5">{children}</th>;
                            },
                            td({children}) {
                              return <td className="border border-white/20 px-4 py-2">{children}</td>;
                            },
                            hr() {
                              return <hr className="border-white/20 my-4" />;
                            }
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    <p className="text-xs text-white/50 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Input area - Fixed at bottom */}
          <div className="border-t border-white/10 p-4 bg-surface-light">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask a question about this meeting..."
                className="flex-grow bg-surface border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={isSending}
                className="whitespace-nowrap bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
              >
                {isSending ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    Send
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
} 