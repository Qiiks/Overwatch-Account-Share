import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Lock, Shield, Database, Cookie } from 'lucide-react';
import DotGrid from '../components/DotGrid';
import Navigation from '../components/Navigation';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '../components/ui/glass-card';
import { GlassButton } from '../components/ui/glass-button';

const Privacy = () => {
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
              PRIVACY POLICY
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
                  <Eye className="h-6 w-6 text-primary" />
                  OVERVIEW
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  At Overwatch Share, we take your privacy seriously. This Privacy Policy explains how we collect, 
                  use, and protect your personal information when you use our gaming account sharing platform. 
                  We are committed to transparency and giving you control over your data.
                </p>
              </section>

              {/* Information We Collect */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4 flex items-center gap-2">
                  <Database className="h-6 w-6 text-primary" />
                  INFORMATION WE COLLECT
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-glass-foreground mb-2">Personal Information:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Email address and username for account creation</li>
                      <li>Profile information you choose to provide</li>
                      <li>Communication preferences and settings</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-glass-foreground mb-2">Gaming Account Data:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Gaming platform usernames and credentials (encrypted)</li>
                      <li>Account sharing preferences and permissions</li>
                      <li>Usage statistics and access logs</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-glass-foreground mb-2">Technical Information:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>IP addresses and device information</li>
                      <li>Browser type and operating system</li>
                      <li>Login times and activity patterns</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* How We Use Information */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-primary" />
                  HOW WE USE YOUR INFORMATION
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <div>
                    <h3 className="font-semibold text-glass-foreground mb-2">Service Provision:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Facilitate secure account sharing between trusted users</li>
                      <li>Maintain and improve platform functionality</li>
                      <li>Provide customer support and technical assistance</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-glass-foreground mb-2">Security & Safety:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Monitor for suspicious activities and prevent fraud</li>
                      <li>Enforce our terms of service and community guidelines</li>
                      <li>Protect against unauthorized access and security threats</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-glass-foreground mb-2">Communication:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Send important security notifications and alerts</li>
                      <li>Provide updates about service changes or improvements</li>
                      <li>Respond to your inquiries and support requests</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Data Protection */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4 flex items-center gap-2">
                  <Lock className="h-6 w-6 text-primary" />
                  DATA PROTECTION MEASURES
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p><strong>Encryption:</strong> All sensitive data, including gaming credentials, is encrypted using AES-256 encryption both in transit and at rest.</p>
                  
                  <p><strong>Access Controls:</strong> Strict access controls ensure only authorized personnel can access user data, and all access is logged and monitored.</p>
                  
                  <p><strong>Regular Audits:</strong> We conduct regular security audits and penetration testing to identify and address potential vulnerabilities.</p>
                  
                  <p><strong>Data Minimization:</strong> We collect only the minimum data necessary to provide our services and delete data that is no longer needed.</p>
                  
                  <p><strong>Secure Infrastructure:</strong> Our servers are hosted in secure data centers with physical security measures and 24/7 monitoring.</p>
                </div>
              </section>

              {/* Information Sharing */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  INFORMATION SHARING
                </h2>
                <div className="text-muted-foreground space-y-4">
                  <p><strong>We do not sell your personal information to third parties.</strong></p>
                  
                  <p>We may share information only in the following limited circumstances:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>With your consent:</strong> When you explicitly authorize us to share specific information</li>
                    <li><strong>Legal requirements:</strong> When required by law, court order, or government request</li>
                    <li><strong>Security purposes:</strong> To protect against fraud, abuse, or threats to user safety</li>
                    <li><strong>Service providers:</strong> With trusted partners who help us operate our platform (under strict confidentiality agreements)</li>
                  </ul>
                </div>
              </section>

              {/* Cookies and Tracking */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4 flex items-center gap-2">
                  <Cookie className="h-6 w-6 text-primary" />
                  COOKIES AND TRACKING
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>We use cookies and similar technologies to:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Keep you logged in and remember your preferences</li>
                    <li>Analyze usage patterns to improve our service</li>
                    <li>Provide a personalized user experience</li>
                    <li>Ensure platform security and prevent fraud</li>
                  </ul>
                  
                  <p>You can control cookie settings through your browser, but some features may not work properly if cookies are disabled.</p>
                </div>
              </section>

              {/* Your Rights */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  YOUR PRIVACY RIGHTS
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>You have the following rights regarding your personal information:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                    <li><strong>Correction:</strong> Update or correct inaccurate personal information</li>
                    <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
                    <li><strong>Portability:</strong> Request a copy of your data in a machine-readable format</li>
                    <li><strong>Restriction:</strong> Request that we limit how we use your information</li>
                    <li><strong>Objection:</strong> Object to certain uses of your personal information</li>
                  </ul>
                  
                  <p>To exercise these rights, please contact us at privacy@overwatchshare.com.</p>
                </div>
              </section>

              {/* Data Retention */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  DATA RETENTION
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your personal information only as long as necessary to provide our services and comply 
                  with legal obligations. Account credentials are deleted immediately upon account termination or 
                  when sharing arrangements are ended. Activity logs are retained for security purposes for up to 
                  12 months, then automatically deleted.
                </p>
              </section>

              {/* International Transfers */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  INTERNATIONAL DATA TRANSFERS
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your information may be transferred to and processed in countries other than your own. We ensure 
                  that all international transfers are protected by appropriate safeguards, including standard 
                  contractual clauses and adequacy decisions by relevant authorities.
                </p>
              </section>

              {/* Children's Privacy */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  CHILDREN'S PRIVACY
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our service is not intended for users under the age of 13. We do not knowingly collect personal 
                  information from children under 13. If we become aware that we have collected such information, 
                  we will take steps to delete it promptly.
                </p>
              </section>

              {/* Policy Updates */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  POLICY UPDATES
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of significant changes 
                  by email and through platform notifications. The updated policy will be effective immediately 
                  upon posting, and your continued use of the service constitutes acceptance of the changes.
                </p>
              </section>

              {/* Contact Information */}
              <section>
                <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-4">
                  CONTACT US
                </h2>
                <div className="text-muted-foreground leading-relaxed">
                  <p className="mb-4">
                    If you have any questions about this Privacy Policy or our data practices, please contact us:
                  </p>
                  <p>
                    <strong>Email:</strong> privacy@overwatchshare.com<br />
                    <strong>Data Protection Officer:</strong> dpo@overwatchshare.com<br />
                    <strong>Address:</strong> 123 Gaming Street, Digital City, DC 12345<br />
                    <strong>Phone:</strong> +1 (555) 123-4567
                  </p>
                </div>
              </section>
            </GlassCardContent>
          </GlassCard>
        </div>
      </main>
    </div>
  );
};

export default Privacy;