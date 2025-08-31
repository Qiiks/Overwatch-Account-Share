import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Users, Database, AlertTriangle } from 'lucide-react';
import DotGrid from '../components/DotGrid';
import Navigation from '../components/Navigation';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../components/ui/glass-card';
import { GlassButton } from '../components/ui/glass-button';

const Terms = () => {
  return (
    <div className="min-h-screen relative">
      <DotGrid />
      <Navigation />
      
      <main className="relative z-10 pt-20 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link to="/register">
              <GlassButton variant="default" className="mb-6 flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Registration
              </GlassButton>
            </Link>
            
            <h1 className="text-4xl font-bebas tracking-wide text-glass-foreground mb-4">
              TERMS OF SERVICE
            </h1>
            <p className="text-muted-foreground">
              Last updated: August 29, 2024
            </p>
          </div>

          <GlassCard>
            <GlassCardContent className="p-8 space-y-8">
              {/* Introduction */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  INTRODUCTION
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Welcome to Overwatch Share, a platform designed for secure sharing of gaming account credentials. 
                  By accessing or using our service, you agree to be bound by these Terms of Service and all applicable 
                  laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.
                </p>
              </section>

              {/* Account Sharing Rules */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4 flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  ACCOUNT SHARING GUIDELINES
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p><strong>Permitted Use:</strong> You may share your gaming accounts only with trusted individuals and must maintain responsibility for all activities performed using your credentials.</p>
                  
                  <p><strong>Security Requirements:</strong> All shared accounts must use strong, unique passwords and enable two-factor authentication where available.</p>
                  
                  <p><strong>Liability:</strong> You remain fully responsible for any actions taken using your shared gaming accounts, including violations of game terms of service.</p>
                  
                  <p><strong>Prohibited Activities:</strong> Account sharing for commercial purposes, selling access, or sharing with unknown parties is strictly forbidden.</p>
                </div>
              </section>

              {/* Data Protection */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4 flex items-center gap-2">
                  <Database className="h-6 w-6 text-primary" />
                  DATA PROTECTION & SECURITY
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p><strong>Encryption:</strong> All account credentials are encrypted using military-grade AES-256 encryption both in transit and at rest.</p>
                  
                  <p><strong>Access Control:</strong> Only authorized users with proper permissions can access shared account information.</p>
                  
                  <p><strong>Data Retention:</strong> Account credentials are retained only as long as necessary for the sharing arrangement and are securely deleted upon request.</p>
                  
                  <p><strong>Breach Notification:</strong> In the unlikely event of a security breach, all affected users will be notified within 72 hours.</p>
                </div>
              </section>

              {/* User Responsibilities */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                  USER RESPONSIBILITIES
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-glass-foreground mb-2">Account Owners Must:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Verify the identity and trustworthiness of individuals they share accounts with</li>
                      <li>Regularly update passwords and security settings</li>
                      <li>Monitor account activity for unauthorized use</li>
                      <li>Immediately report suspicious activities or security concerns</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-glass-foreground mb-2">Account Users Must:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Use shared accounts responsibly and according to game terms of service</li>
                      <li>Not change passwords or account settings without permission</li>
                      <li>Respect the account owner's preferences and limitations</li>
                      <li>Report any security issues or concerns immediately</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Service Availability */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  SERVICE AVAILABILITY
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  While we strive to maintain 99.9% uptime, we cannot guarantee uninterrupted service availability. 
                  Scheduled maintenance will be announced at least 24 hours in advance. We are not liable for any 
                  inconvenience or losses resulting from temporary service interruptions.
                </p>
              </section>

              {/* Prohibited Conduct */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  PROHIBITED CONDUCT
                </h2>
                <div className="text-muted-foreground">
                  <p className="mb-4">The following activities are strictly prohibited:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Attempting to hack, compromise, or gain unauthorized access to other users' accounts</li>
                    <li>Sharing or selling access to your platform account</li>
                    <li>Using the service for any illegal activities</li>
                    <li>Harassing, threatening, or abusing other users</li>
                    <li>Uploading malicious software or attempting to disrupt the service</li>
                    <li>Creating multiple accounts to circumvent restrictions</li>
                    <li>Violating the terms of service of shared gaming platforms</li>
                  </ul>
                </div>
              </section>

              {/* Termination */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  TERMINATION
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to terminate or suspend your account at any time for violations of these terms 
                  or suspected fraudulent activity. Upon termination, your access to shared accounts will be immediately 
                  revoked, and any stored credentials will be securely deleted within 30 days.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  LIMITATION OF LIABILITY
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Overwatch Share is provided "as is" without warranties of any kind. We are not liable for any 
                  damages resulting from the use or inability to use our service, including but not limited to 
                  account bans, loss of game progress, or security breaches of third-party gaming platforms.
                </p>
              </section>

              {/* Changes to Terms */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  CHANGES TO TERMS
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these terms at any time. Users will be notified of significant 
                  changes via email and through platform notifications. Continued use of the service after 
                  changes constitutes acceptance of the new terms.
                </p>
              </section>

              {/* Contact Information */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  CONTACT INFORMATION
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms of Service, please contact us at:
                  <br />
                  Email: legal@overwatchshare.com
                  <br />
                  Address: 123 Gaming Street, Digital City, DC 12345
                </p>
              </section>
            </GlassCardContent>
          </GlassCard>
        </div>
      </main>
    </div>
  );
};

export default Terms;