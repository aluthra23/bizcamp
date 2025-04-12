'use client';

import { useState } from 'react';
import Image from 'next/image';
import Button from './ui/Button';
import Modal from './ui/Modal';
import SignUpForm from './auth/SignUpForm';

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
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left side content */}
          <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="gradient-text">Elevate Your Business</span>
              <br />
              <span className="text-white">with BizCamp</span>
            </h1>
            
            <p className="text-lg text-text-secondary max-w-xl mx-auto lg:mx-0">
              Join our community of entrepreneurs and learn how to scale your business with our expert-led courses and resources.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" onClick={() => setIsSignUpModalOpen(true)}>
                Get Started Free
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>

            <div className="flex items-center justify-center lg:justify-start space-x-4 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-surface overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-text-secondary">
                <span className="text-white font-medium">2,000+</span> entrepreneurs already joined
              </p>
            </div>
          </div>
          
          {/* Right side image */}
          <div className="lg:w-1/2 relative">
            <div className="relative w-full max-w-md mx-auto h-[500px]">
              <div className="absolute inset-0 glass-effect rounded-2xl overflow-hidden border border-white/10">
                <div className="w-full h-full relative">
                  {/* Replace with your dashboard mockup image */}
                  <div className="absolute inset-0 flex items-center justify-center text-white p-8">
                    <div className="w-full space-y-6">
                      <div className="h-8 w-24 rounded-full bg-white/10"></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-32 rounded-xl bg-white/5 p-4">
                          <div className="h-5 w-14 mb-2 rounded bg-white/10"></div>
                          <div className="h-8 w-16 rounded bg-gradient-to-r from-primary-light to-accent"></div>
                        </div>
                        <div className="h-32 rounded-xl bg-white/5 p-4">
                          <div className="h-5 w-14 mb-2 rounded bg-white/10"></div>
                          <div className="h-8 w-16 rounded bg-gradient-to-r from-primary-light to-accent"></div>
                        </div>
                        <div className="h-32 rounded-xl bg-white/5 p-4">
                          <div className="h-5 w-14 mb-2 rounded bg-white/10"></div>
                          <div className="h-8 w-16 rounded bg-gradient-to-r from-primary-light to-accent"></div>
                        </div>
                        <div className="h-32 rounded-xl bg-white/5 p-4">
                          <div className="h-5 w-14 mb-2 rounded bg-white/10"></div>
                          <div className="h-8 w-16 rounded bg-gradient-to-r from-primary-light to-accent"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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