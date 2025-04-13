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
                    {/* Removed notification bell and user avatar */}
                </div>
            </header>

            {/* Main content with padding for fixed header */}
            <div className="pt-16">
                {children}
            </div>
        </div>
    );
} 