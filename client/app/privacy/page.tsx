"use client"

import { Navigation } from "@/components/Navigation"
import { DotGrid } from "@/components/DotGrid"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-[#EAEAEA] relative overflow-hidden">
      <Navigation />
      <DotGrid />

      <div className="relative z-10 container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#8A2BE2] mb-4">Privacy Policy</h1>
          <p className="text-[#EAEAEA]/70 text-lg">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-6">
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">1. Introduction</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>
                Overwatch Account Share ("we," "our," or "the Service") is committed to protecting your privacy. This
                Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our
                service for sharing Overwatch game account credentials.
              </p>
              <p>
                By using our Service, you consent to the data practices described in this policy. If you do not agree
                with the terms of this Privacy Policy, please do not access the Service.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">2. Information We Collect</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>We collect information that you provide directly to us and information automatically collected:</p>
              
              <h4 className="font-semibold text-[#DA70D6] mt-4">Account Information:</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Username and email address for account registration</li>
                <li>Encrypted password for authentication</li>
                <li>Profile information you choose to provide</li>
              </ul>

              <h4 className="font-semibold text-[#DA70D6] mt-4">Overwatch Account Data:</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Battle.net account tags (Battletags)</li>
                <li>Battle.net email addresses associated with game accounts</li>
                <li>Encrypted account passwords</li>
                <li>Account rank and hero preferences</li>
                <li>Account sharing permissions and access logs</li>
              </ul>

              <h4 className="font-semibold text-[#DA70D6] mt-4">Google Account Integration:</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Google account email addresses you link for OTP retrieval</li>
                <li>OAuth refresh tokens for maintaining access</li>
                <li>Limited email access scope for reading Battle.net emails only</li>
              </ul>

              <h4 className="font-semibold text-[#DA70D6] mt-4">Technical Data:</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>IP addresses and browser information</li>
                <li>Device identifiers and operating system</li>
                <li>Usage patterns and interaction data</li>
                <li>Login timestamps and session information</li>
              </ul>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">3. Google API Services - Email OTP Extraction</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p className="font-semibold">
                IMPORTANT: Our use of Google API Services is strictly limited to extracting One-Time Password (OTP) codes
                from Battle.net emails.
              </p>
              
              <h4 className="font-semibold text-[#DA70D6] mt-4">What We Access:</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  We request read-only access to your Gmail messages with the scope limited to searching for Battle.net
                  OTP emails
                </li>
                <li>
                  We specifically search for emails from "noreply@battle.net" containing verification codes
                </li>
                <li>
                  We extract only the 6-digit OTP code from these emails
                </li>
              </ul>

              <h4 className="font-semibold text-[#DA70D6] mt-4">What We DON'T Do:</h4>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>We DO NOT store the content of your emails</li>
                <li>We DO NOT read, access, or process any emails other than Battle.net OTP messages</li>
                <li>We DO NOT share your email content with any third parties</li>
                <li>We DO NOT use your email data for advertising, marketing, or any purpose other than OTP extraction</li>
                <li>We DO NOT modify, delete, or send emails from your account</li>
              </ul>

              <h4 className="font-semibold text-[#DA70D6] mt-4">Data Retention:</h4>
              <p>
                OTP codes are temporarily held in memory only during the authentication process and are immediately
                discarded after use. No email content is permanently stored in our systems.
              </p>

              <h4 className="font-semibold text-[#DA70D6] mt-4">Google API Compliance:</h4>
              <p>
                Our use of Google API Services complies with the Google API Services User Data Policy, including the
                Limited Use requirements. We undergo regular reviews to ensure continued compliance with Google's policies.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">4. How We Use Your Information</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>We use the collected information for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>To provide and maintain our Service</li>
                <li>To authenticate users and manage accounts</li>
                <li>To enable secure sharing of Overwatch accounts between users</li>
                <li>To extract OTP codes from Battle.net emails for account verification</li>
                <li>To detect and prevent fraudulent or unauthorized activities</li>
                <li>To communicate with you about service updates and security alerts</li>
                <li>To improve and optimize our Service based on usage patterns</li>
                <li>To comply with legal obligations and enforce our Terms of Service</li>
              </ul>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">5. Data Security</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>We implement appropriate technical and organizational security measures including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Encryption:</strong> All sensitive data including passwords are encrypted using industry-standard
                  encryption algorithms
                </li>
                <li>
                  <strong>Secure Transmission:</strong> All data transmitted between your device and our servers uses
                  HTTPS/TLS encryption
                </li>
                <li>
                  <strong>Access Controls:</strong> Strict access controls and authentication mechanisms to prevent
                  unauthorized access
                </li>
                <li>
                  <strong>Regular Security Audits:</strong> Periodic security assessments and vulnerability testing
                </li>
                <li>
                  <strong>Secure Infrastructure:</strong> Use of Supabase's secure cloud infrastructure with built-in
                  security features
                </li>
              </ul>
              <p>
                While we strive to protect your information, no method of electronic storage or transmission is 100%
                secure. We cannot guarantee absolute security.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">6. Information Sharing and Disclosure</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>
                We do not sell, trade, or rent your personal information to third parties. We may share your information
                only in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>With Your Consent:</strong> When you explicitly authorize sharing account access with other users
                </li>
                <li>
                  <strong>Service Providers:</strong> With trusted third-party services (like Supabase) that help us
                  operate our Service under strict confidentiality agreements
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law, court order, or governmental regulation
                </li>
                <li>
                  <strong>Protection of Rights:</strong> To protect our rights, property, safety, or that of our users
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (users
                  will be notified)
                </li>
              </ul>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">7. Data Retention</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>We retain your information for as long as necessary to fulfill the purposes outlined in this policy:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Account Data:</strong> Retained as long as your account is active or as needed to provide
                  services
                </li>
                <li>
                  <strong>Overwatch Account Credentials:</strong> Until you explicitly delete them or close your account
                </li>
                <li>
                  <strong>Google OAuth Tokens:</strong> Refreshed as needed and revoked upon unlinking the account
                </li>
                <li>
                  <strong>OTP Codes:</strong> Temporarily stored in memory only, never persisted to database
                </li>
                <li>
                  <strong>Usage Logs:</strong> Retained for 90 days for security and performance monitoring
                </li>
                <li>
                  <strong>Legal Compliance:</strong> Some data may be retained longer if required by law
                </li>
              </ul>
              <p>Upon account deletion, we will delete or anonymize your personal information within 30 days.</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">8. Your Rights and Choices</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>You have the following rights regarding your personal information:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Access:</strong> Request access to the personal information we hold about you
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate or incomplete information
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your account and associated data
                </li>
                <li>
                  <strong>Data Portability:</strong> Request a copy of your data in a structured format
                </li>
                <li>
                  <strong>Withdraw Consent:</strong> Revoke Google account access at any time through your account settings
                </li>
                <li>
                  <strong>Opt-out:</strong> Opt-out of non-essential communications
                </li>
              </ul>
              <p>
                To exercise these rights, please contact us at gameslayer.inc@gmail.com. We will respond to your
                request within 30 days.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">9. Cookies and Tracking Technologies</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>We use cookies and similar tracking technologies to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintain user sessions and authentication status</li>
                <li>Remember user preferences and settings</li>
                <li>Analyze usage patterns to improve our Service</li>
                <li>Detect and prevent security threats</li>
              </ul>
              <p>
                You can control cookies through your browser settings. Disabling cookies may limit your ability to use
                certain features of our Service.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">10. Children's Privacy</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal
                information from children under 13. If we become aware that we have collected personal information from a
                child under 13, we will take steps to delete such information promptly.
              </p>
              <p>
                If you are a parent or guardian and believe your child has provided us with personal information, please
                contact us at gameslayer.inc@gmail.com.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">11. International Data Transfers</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>
                Your information may be transferred to and processed in countries other than your country of residence.
                These countries may have different data protection laws than your country.
              </p>
              <p>
                By using our Service, you consent to the transfer of your information to these countries. We will take
                appropriate steps to ensure your information receives an adequate level of protection.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">12. Changes to This Privacy Policy</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Posting the new Privacy Policy on this page</li>
                <li>Updating the "Last updated" date at the top of this policy</li>
                <li>Sending an email notification to registered users for significant changes</li>
              </ul>
              <p>
                Your continued use of the Service after any changes indicates your acceptance of the updated Privacy
                Policy.
              </p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="text-[#DA70D6]">13. Contact Information</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 text-[#EAEAEA]/80">
              <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us:</p>
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <p>
                  <strong>Email:</strong> gameslayer.inc@gmail.com
                </p>
                <p>
                  <strong>Support:</strong> gameslayer.inc@gmail.com
                </p>
                <p>
                  <strong>Website:</strong> https://overwatchaccountshare.com
                </p>
                <p>
                  <strong>Data Protection Officer:</strong> gameslayer.inc@gmail.com
                </p>
              </div>
              <p className="mt-4">
                We are committed to working with you to obtain a fair resolution of any complaint or concern about
                privacy.
              </p>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
