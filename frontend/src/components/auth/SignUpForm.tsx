'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface SignUpFormProps {
  onSuccess?: () => void;
  onSignInClick?: () => void;
}

export default function SignUpForm({ onSuccess, onSignInClick }: SignUpFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Here you would add your registration logic
      console.log('Signing up with:', { email, password });
      
      // Simulate API call
      await new Promise(r => setTimeout(r, 1000));
      
      // On success
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <p className="text-text-secondary text-sm mb-6">
        Access to 120+ hours of courses, tutorials and livestreams
      </p>
      
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-100 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 6C12 6 2 6 2 6L12 16L22 6Z" fill="none" />
              <path d="M2 6V18C2 18.5304 2.21071 19.0391 2.58579 19.4142C2.96086 19.7893 3.46957 20 4 20H20C20.5304 20 21.0391 19.7893 21.4142 19.4142C21.7893 19.0391 22 18.5304 22 18V6" fill="none" />
            </svg>
          }
        />
        
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          }
        />
        
        <Button type="submit" fullWidth disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
        
        <p className="text-xs text-gray-400 mt-4">
          By clicking on Sign up, you agree to our Terms of service and Privacy policy.
        </p>
        
        <div className="text-center mt-4">
          <p className="text-gray-400 text-sm">
            Already have an account?{' '}
            <button
              type="button"
              className="text-primary-light hover:underline"
              onClick={onSignInClick}
            >
              Sign in
            </button>
          </p>
        </div>
      </form>
    </div>
  );
} 