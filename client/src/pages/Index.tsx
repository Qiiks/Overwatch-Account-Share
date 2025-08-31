import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Lock, Zap } from 'lucide-react';
import DotGrid from '../components/DotGrid';
import OverwatchTitle from '../components/OverwatchTitle';
import Navigation from '../components/Navigation';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../components/ui/glass-card';
import { GlassButton } from '../components/ui/glass-button';

const Index = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData.data);
          } else {
            // Token might be invalid, remove it
            localStorage.removeItem('jwt_token');
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          localStorage.removeItem('jwt_token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="min-h-screen relative">
      <DotGrid />
      <Navigation user={user} />
      
      <main className="relative z-10 pt-20">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-4xl mx-auto">
            <OverwatchTitle className="mb-8" />
            
            <h2 className="text-2xl md:text-3xl font-bebas tracking-wide text-glass-foreground mb-6">
              ACCOUNT SHARING PLATFORM
            </h2>
            
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Securely share and manage Overwatch account credentials with your team. 
              Built with enterprise-grade security and a sleek glassmorphism interface.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <>
                  <Link to="/dashboard">
                    <GlassButton variant="primary" size="lg">
                      Go to Dashboard
                    </GlassButton>
                  </Link>
                  {user.isAdmin && (
                    <Link to="/admin">
                      <GlassButton variant="default" size="lg">
                        Admin Panel
                      </GlassButton>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link to="/login">
                    <GlassButton variant="primary" size="lg">
                      Get Started
                    </GlassButton>
                  </Link>
                  <Link to="/register">
                    <GlassButton variant="default" size="lg">
                      Create Account
                    </GlassButton>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bebas tracking-wide text-center mb-16 text-glass-foreground">
              PLATFORM FEATURES
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <GlassCard className="text-center p-6">
                <GlassCardHeader>
                  <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                  <GlassCardTitle>Secure Storage</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-muted-foreground">
                    Military-grade encryption protects all account credentials and user data.
                  </p>
                </GlassCardContent>
              </GlassCard>

              <GlassCard className="text-center p-6">
                <GlassCardHeader>
                  <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                  <GlassCardTitle>Team Sharing</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-muted-foreground">
                    Easily share account access with team members and manage permissions.
                  </p>
                </GlassCardContent>
              </GlassCard>

              <GlassCard className="text-center p-6">
                <GlassCardHeader>
                  <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
                  <GlassCardTitle>Access Control</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-muted-foreground">
                    Granular permissions and access controls for maximum security.
                  </p>
                </GlassCardContent>
              </GlassCard>

              <GlassCard className="text-center p-6">
                <GlassCardHeader>
                  <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                  <GlassCardTitle>Real-time OTP</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-muted-foreground">
                    Instant OTP notifications and real-time account status updates.
                  </p>
                </GlassCardContent>
              </GlassCard>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
