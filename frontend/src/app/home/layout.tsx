'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // In a real app, we would check if the user is authenticated here
    // For demo purposes, we'll just assume they are
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const router = useRouter();

    // Navigate to home page if not authenticated
    // In a real app, we would redirect to login page
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    // Simulate user data
    const user = {
        name: 'Demo User',
        initial: 'D'
    };

    return (
        <div className="min-h-screen bg-background">
            {/* App Header - This will be shared across all pages */}
            <header className="glass-effect backdrop-blur-lg px-6 py-4 flex justify-between items-center border-b border-white/10 fixed top-0 left-0 right-0 z-50">
                <div className="flex items-center">
                    <Link href="/home">
                        <span className="text-xl font-bold gradient-text">BizCamp</span>
                    </Link>
                </div>

                <div className="flex items-center space-x-4">
                    <button className="text-white/80 hover:text-white transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white font-medium">
                        {user.initial}
                    </div>
                </div>
            </header>

            {/* Main content with padding for fixed header */}
            <div className="pt-16">
                {children}
            </div>
        </div>
    );
} 