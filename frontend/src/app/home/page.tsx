'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Sample department data
const sampleDepartments = [
    { id: 'eng', name: 'Engineering', teamCount: 5, description: 'Software development and infrastructure' },
    { id: 'product', name: 'Product', teamCount: 3, description: 'Product management and design' },
    { id: 'marketing', name: 'Marketing', teamCount: 2, description: 'Brand, growth, and communications' },
    { id: 'sales', name: 'Sales', teamCount: 4, description: 'Sales and business development' },
    { id: 'hr', name: 'HR', teamCount: 2, description: 'People operations and talent acquisition' },
];

export default function HomePage() {
    const router = useRouter();
    const [departments, setDepartments] = useState(sampleDepartments);

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto py-8 px-4">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Departments</h1>
                    <button className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium">
                        + Add Department
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {departments.map((dept) => (
                        <Link
                            href={`/home/${dept.id}`}
                            key={dept.id}
                            className="block"
                        >
                            <div className="glass-effect rounded-xl p-6 border border-white/10 transition hover:border-primary/50 hover:bg-white/5">
                                <h3 className="text-xl font-semibold gradient-text mb-2">{dept.name}</h3>
                                <p className="text-text-secondary text-sm mb-4">{dept.description}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-sm">{dept.teamCount} teams</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                                        <path d="M5 12h14M12 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
