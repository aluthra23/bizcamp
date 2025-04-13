'use client';

import { useState } from 'react';
import Button from './ui/Button';
import Modal from './ui/Modal';
import SignUpForm from './auth/SignUpForm';
import Link from 'next/link';

export default function Hero() {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-900/40 to-black z-0" />

      {/* Circular purple gradients */}
      <div className="absolute top-20 right-[10%] w-96 h-96 rounded-full bg-purple-600/30 filter blur-[80px] z-0" />
      <div className="absolute bottom-20 left-[10%] w-72 h-72 rounded-full bg-fuchsia-600/20 filter blur-[60px] z-0" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            <span className="gradient-text">Smart Meeting Insights</span>
            <br />
            <span className="text-white">for Business Growth</span>
          </h1>

          <p className="text-lg text-text-secondary max-w-2xl mb-8">
            Transform your team meetings with AI-powered transcription, summaries, and actionable insights to make better business decisions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/home">
              <Button size="lg">
                Start Now
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </a>
          </div>

          <div className="flex items-center justify-center space-x-4">
            <div className="flex -space-x-2">

            </div>
            <p className="text-sm text-text-secondary">
              <span className="text-white font-medium"></span>
            </p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isSignUpModalOpen}
        onClose={() => setIsSignUpModalOpen(false)}
        title="Sign Up"
      >
        <SignUpForm
          onSuccess={() => setIsSignUpModalOpen(false)}
        />
      </Modal>
    </div>
  );
} 