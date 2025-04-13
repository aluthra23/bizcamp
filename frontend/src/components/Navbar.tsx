'use client';

import { useState } from 'react';
import Link from 'next/link';
import Modal from './ui/Modal';
import SignInForm from './auth/SignInForm';
import Button from './ui/Button';

export default function Navbar() {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  return (
    <nav className="w-full py-4 px-4 md:px-8 fixed top-0 z-10 glass-effect backdrop-blur-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="text-xl font-bold gradient-text">BizCamp</span>
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          <a href="#features" className="text-white/80 hover:text-white transition">
            Features
          </a>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsSignInModalOpen(true);
            }}
          >
            Sign In
          </Button>
          <Link href="/home">
            <Button
              variant="primary"
              size="sm"
            >
              Start Now
            </Button>
          </Link>
        </div>
      </div>

      <Modal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        title="Sign In"
      >
        <SignInForm
          onSuccess={() => setIsSignInModalOpen(false)}
        />
      </Modal>
    </nav>
  );
} 