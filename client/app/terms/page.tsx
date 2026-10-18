"use client"

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 border-b border-line pb-6">
        <p className="font-mono text-2xs tracking-label text-ink-3 uppercase">Legal · 02</p>
        <h1 className="mt-2 text-2xl text-ink">Terms of Service</h1>
        <p className="mt-1 font-mono text-xs text-ink-3">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </header>

        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-panel">
            <header className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">1. Agreement to Terms</h2>
            </header>
            <div className="space-y-4 px-5 py-4 text-sm text-ink-2">
              <p>
                By accessing and using Overwatch Account Share ("the Service"), you agree to be bound by these Terms of
                Service. If you disagree with any part of these terms, you may not access the Service.
              </p>
              <p>
                The Service is designed to facilitate secure sharing of Overwatch game account credentials within the
                gaming community. You must be at least 13 years old to use this Service.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel">
            <header className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">2. Account Responsibilities</h2>
            </header>
            <div className="space-y-4 px-5 py-4 text-sm text-ink-2">
              <p>When creating an account with us, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate, complete, and current information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access or security breach</li>
                <li>Comply with Blizzard Entertainment's Terms of Service and Battle.net End User License Agreement</li>
              </ul>
              <p>
                You are solely responsible for any activity that occurs under your account. We reserve the right to
                suspend or terminate accounts that violate these terms.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel">
            <header className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">3. Data Usage</h2>
            </header>
            <div className="space-y-4 px-5 py-4 text-sm text-ink-2">
              <p>By using our Service, you understand and agree that:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  We collect and process account information necessary to provide the Service, including Overwatch
                  account credentials and Battle.net email addresses
                </li>
                <li>
                  We use Google API Services to access your Gmail account solely for extracting One-Time Password (OTP)
                  codes from Battle.net emails
                </li>
                <li>
                  Email content accessed through Google API is used exclusively for OTP extraction and is not stored,
                  shared, or used for any other purpose
                </li>
                <li>
                  Your account credentials are encrypted and stored securely using industry-standard encryption methods
                </li>
                <li>
                  Usage data and statistics may be collected to improve Service performance and user experience
                </li>
                <li>
                  We will never sell, rent, or share your personal information with third parties for marketing purposes
                </li>
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel">
            <header className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">4. Acceptable Use</h2>
            </header>
            <div className="space-y-4 px-5 py-4 text-sm text-ink-2">
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Share accounts that you do not own or have permission to share</li>
                <li>Engage in any activity that violates Blizzard Entertainment's Terms of Service</li>
                <li>Use shared accounts for cheating, exploiting, or any form of unfair gameplay</li>
                <li>Attempt to access or modify other users' accounts without authorization</li>
                <li>Upload or transmit viruses, malware, or any harmful code</li>
                <li>Circumvent any security measures or authentication systems</li>
                <li>Use the Service for commercial purposes without explicit permission</li>
                <li>Harass, abuse, or harm other users of the Service</li>
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel">
            <header className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">5. Third-Party Services</h2>
            </header>
            <div className="space-y-4 px-5 py-4 text-sm text-ink-2">
              <p>Our Service integrates with third-party services including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Google API Services:</strong> Used for OAuth authentication and email OTP extraction
                </li>
                <li>
                  <strong>Battle.net/Blizzard Services:</strong> The gaming platform for which accounts are shared
                </li>
                <li>
                  <strong>Supabase:</strong> Database and authentication services
                </li>
              </ul>
              <p>
                Your use of these third-party services is subject to their respective terms of service and privacy
                policies. We are not responsible for the practices of these third-party services.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel">
            <header className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">6. Disclaimer</h2>
            </header>
            <div className="space-y-4 px-5 py-4 text-sm text-ink-2">
              <p>
                <strong>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</strong> We make no warranties,
                express or implied, regarding:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The availability, reliability, or accuracy of the Service</li>
                <li>The security or safety of shared accounts</li>
                <li>Protection against account bans or penalties from Blizzard Entertainment</li>
                <li>The behavior or actions of other users</li>
                <li>Uninterrupted or error-free operation of the Service</li>
              </ul>
              <p>
                <strong>Account Sharing Risks:</strong> You acknowledge that sharing game accounts may violate the terms
                of service of game publishers and could result in account suspension or termination. You assume all risks
                associated with account sharing.
              </p>
              <p>
                <strong>Not Affiliated with Blizzard:</strong> This Service is not affiliated with, endorsed by, or
                sponsored by Blizzard Entertainment, Inc. Overwatch is a trademark of Blizzard Entertainment, Inc.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel">
            <header className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">7. Limitation of Liability</h2>
            </header>
            <div className="space-y-4 px-5 py-4 text-sm text-ink-2">
              <p>
                To the maximum extent permitted by law, Overwatch Account Share and its operators shall not be liable
                for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Any indirect, incidental, special, or consequential damages</li>
                <li>Loss of data, profits, or business opportunities</li>
                <li>Account suspensions or bans by game publishers</li>
                <li>Unauthorized access to shared accounts</li>
                <li>Any damages resulting from use or inability to use the Service</li>
              </ul>
              <p>
                Our total liability shall not exceed the amount you have paid us in the past twelve months, or $100 if
                you have not made any payments.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel">
            <header className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">8. Termination</h2>
            </header>
            <div className="space-y-4 px-5 py-4 text-sm text-ink-2">
              <p>
                We reserve the right to terminate or suspend your account immediately, without prior notice, for any
                reason including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violation of these Terms of Service</li>
                <li>Fraudulent or illegal activities</li>
                <li>Behavior harmful to other users or the Service</li>
                <li>At our sole discretion for any reason</li>
              </ul>
              <p>
                Upon termination, your right to use the Service will cease immediately. All provisions of these Terms
                which should reasonably survive termination shall remain in effect.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel">
            <header className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">9. Changes to Terms</h2>
            </header>
            <div className="space-y-4 px-5 py-4 text-sm text-ink-2">
              <p>
                We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately
                upon posting to the Service. Your continued use of the Service following any changes constitutes
                acceptance of the new Terms.
              </p>
              <p>We will make reasonable efforts to notify users of significant changes through:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Email notifications to registered users</li>
                <li>Prominent notices on the Service dashboard</li>
                <li>Update notifications upon login</li>
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel">
            <header className="border-b border-line px-5 py-3">
              <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">10. Contact Information</h2>
            </header>
            <div className="space-y-4 px-5 py-4 text-sm text-ink-2">
              <p>For questions about these Terms of Service or the Service itself, please contact us:</p>
              <div className="rounded-md border border-line bg-ground p-3">
                <p>
                  <strong>Email:</strong> gameslayer.inc@gmail.com
                </p>
                <p>
                  <strong>Website:</strong> {process.env.NEXT_PUBLIC_WEBSITE_URL}
                </p>
                <p>
                  <strong>Response Time:</strong> We aim to respond to all inquiries within 48-72 hours
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
  )
}
