'use client';

import { useState } from 'react';
import Link from 'next/link';
import Modal from './ui/Modal';
import SignInForm from './auth/SignInForm';
import SignUpForm from './auth/SignUpForm';
import Button from './ui/Button';

export default function Navbar() {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);

  return (
    <nav className="w-full py-4 px-4 md:px-8 fixed top-0 z-10 glass-effect backdrop-blur-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="text-xl font-bold gradient-text">BizCamp</span>
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          <Link href="#features" className="text-white/80 hover:text-white transition">
            Features
          </Link>
          <Link href="#pricing" className="text-white/80 hover:text-white transition">
            Pricing
          </Link>
          <Link href="#about" className="text-white/80 hover:text-white transition">
            About
          </Link>
          <Link href="/home" className="text-primary-light hover:text-white transition">
            Demo App
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsSignInModalOpen(true);
              setIsSignUpModalOpen(false);
            }}
          >
            Sign In
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setIsSignUpModalOpen(true);
              setIsSignInModalOpen(false);
            }}
          >
            Sign Up
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        title="Sign In"
      >
        <SignInForm
          onSuccess={() => setIsSignInModalOpen(false)}
          onSignUpClick={() => {
            setIsSignInModalOpen(false);
            setIsSignUpModalOpen(true);
          }}
        />
      </Modal>

      <Modal
        isOpen={isSignUpModalOpen}
        onClose={() => setIsSignUpModalOpen(false)}
        title="Sign Up"
      >
        <SignUpForm
          onSuccess={() => setIsSignUpModalOpen(false)}
          onSignInClick={() => {
            setIsSignUpModalOpen(false);
            setIsSignInModalOpen(true);
          }}
        />
      </Modal>
    </nav>
  );
} 