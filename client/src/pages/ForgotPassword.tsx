import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import DotGrid from '../components/DotGrid';
import Navigation from '../components/Navigation';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '../components/ui/glass-card';
import { GlassButton } from '../components/ui/glass-button';
import { GlassInput } from '../components/ui/glass-input';
import { useToast } from '../hooks/use-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email address is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // API call would go here
      // For demo purposes, we'll simulate sending a reset email
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setEmailSent(true);
      toast({
        title: 'Reset Email Sent',
        description: 'Check your email for password reset instructions.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send reset email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  return (
    <div className="min-h-screen relative">
      <DotGrid />
      <Navigation />
      
      <main className="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20">
        <GlassCard className="w-full max-w-md">
          <GlassCardHeader className="text-center">
            <GlassCardTitle className="text-3xl mb-2">
              {emailSent ? 'Check Your Email' : 'Reset Password'}
            </GlassCardTitle>
            <GlassCardDescription>
              {emailSent 
                ? 'We\'ve sent password reset instructions to your email address.'
                : 'Enter your email address and we\'ll send you a link to reset your password.'
              }
            </GlassCardDescription>
          </GlassCardHeader>
          
          <GlassCardContent>
            {emailSent ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    If an account with the email <strong>{email}</strong> exists, you will receive a password reset link shortly.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Didn't receive the email? Check your spam folder or try again in a few minutes.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <GlassButton
                    onClick={() => {
                      setEmailSent(false);
                      setEmail('');
                    }}
                    variant="primary"
                    className="w-full"
                  >
                    Try Different Email
                  </GlassButton>
                  
                  <Link to="/login">
                    <GlassButton variant="default" className="w-full flex items-center justify-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back to Login
                    </GlassButton>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-glass-foreground">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <GlassInput
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={handleChange}
                      className="pl-10"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>

                <GlassButton
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending Reset Email...' : 'Send Reset Email'}
                </GlassButton>
                
                <div className="text-center">
                  <Link to="/login" className="text-sm text-primary hover:text-primary-glow transition-colors flex items-center justify-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </GlassCardContent>
        </GlassCard>
      </main>
    </div>
  );
};

export default ForgotPassword;