import { LegalShell, H2, P, UL } from "./_LegalShell";

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="July 2025" testid="page-terms">
      <P>
        These Terms govern your use of JobPilot (the “Service”). By creating an account or using the Service you agree to these Terms. If you do not agree, please do not use the Service.
      </P>

      <H2>1. The service</H2>
      <P>
        JobPilot is an autonomous job-search agent. After you upload your resume and confirm your preferences, our software identifies matching openings and may submit applications on your behalf, subject to the limits of your subscription plan.
      </P>

      <H2>2. Eligibility</H2>
      <P>
        You must be at least 18 years old and legally able to enter into a binding contract in your country of residence to use JobPilot.
      </P>

      <H2>3. Your account</H2>
      <UL>
        <li>You are responsible for keeping your credentials secure and for all activity under your account.</li>
        <li>The information you provide (resume, contact details, preferences, optional job-search email password) must be accurate and your own.</li>
        <li>You authorise JobPilot to use that information to submit job applications on your behalf.</li>
      </UL>

      <H2>4. Subscription, billing & cancellation</H2>
      <P>
        Paid plans are billed monthly in advance via Razorpay. You can cancel at any time; access continues until the end of the paid cycle. See our <a href="/refund-policy" className="underline">Refund Policy</a> for refund eligibility.
      </P>

      <H2>5. Acceptable use</H2>
      <UL>
        <li>No fraudulent applications, impersonation, or misrepresentation of your experience.</li>
        <li>No automated scraping, reverse engineering, or abuse of the Service.</li>
        <li>No attempts to bypass quota or payment systems.</li>
      </UL>
      <P>We may suspend or terminate accounts that violate these rules.</P>

      <H2>6. AI-generated content</H2>
      <P>
        The Service uses LLMs to draft resumes, cover letters, and recommendations. You are responsible for reviewing all AI-generated content before it is sent on your behalf where applicable. JobPilot makes no warranty as to interview outcomes or job offers.
      </P>

      <H2>7. Intellectual property</H2>
      <P>
        The Service, including all software, design, and branding, is owned by JobPilot. You retain ownership of your resume and personal data.
      </P>

      <H2>8. Disclaimer & limitation of liability</H2>
      <P>
        The Service is provided “as is” without warranties of any kind. To the maximum extent permitted by law, JobPilot’s aggregate liability shall not exceed the amount you paid us in the 3 months preceding the claim.
      </P>

      <H2>9. Governing law</H2>
      <P>
        These Terms are governed by the laws of India, with exclusive jurisdiction of the courts at Bengaluru, Karnataka.
      </P>

      <H2>10. Changes</H2>
      <P>
        We may update these Terms from time to time. Material changes will be notified via email at least 14 days in advance.
      </P>

      <H2>11. Contact</H2>
      <P>
        Questions? Write to <a href="mailto:support@jobpilot.ai" className="underline">support@jobpilot.ai</a>.
      </P>
    </LegalShell>
  );
}
