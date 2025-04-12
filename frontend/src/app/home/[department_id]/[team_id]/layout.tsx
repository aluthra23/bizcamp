'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Layout component for the team page
export default function TeamLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const teamId = params.team_id as string;
    const departmentId = params.department_id as string;
    
    const [team, setTeam] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const response = await fetch(`/api/backend/teams/${teamId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch team');
                }
                
                const teamData = await response.json();
                setTeam(teamData);
            } catch (error) {
                console.error('Error fetching team:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchTeam();
    }, [teamId]);
    
    return (
        <div className="min-h-screen bg-background">
            {children}
        </div>
    );
} 