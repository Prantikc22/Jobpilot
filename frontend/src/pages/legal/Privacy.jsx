import { LegalShell, H2, P, UL } from "./_LegalShell";

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2025" testid="page-privacy">
      <P>
        Your privacy is fundamental to ApplyAgent. This policy explains what we collect, how we use it, and the controls you have.
      </P>

      <H2>1. Data we collect</H2>
      <UL>
        <li><strong>Account data</strong>: email, name, phone, LinkedIn URL.</li>
        <li><strong>Resume</strong>: the PDF/DOCX you upload and the text we extract from it (used by the AI tools and the autopilot).</li>
        <li><strong>Job preferences</strong>: target roles, countries, salary, preferences.</li>
        <li><strong>Optional job-search email credentials</strong>: encrypted at rest, never exposed via API, used only to submit applications on your behalf.</li>
        <li><strong>Payments</strong>: handled by Razorpay; we store only the order ID, status, and last 4 digits of the card (provided by Razorpay).</li>
        <li><strong>Telemetry</strong>: minimal usage metrics (page views, error logs) to keep the product reliable.</li>
      </UL>

      <H2>2. How we use it</H2>
      <UL>
        <li>To operate the autopilot (matching, tailoring, submitting applications).</li>
        <li>To run the AI tools (resume optimizer, ATS check, LinkedIn rewrite, parsing).</li>
        <li>To bill you and prevent payment fraud.</li>
        <li>To send transactional emails (sign-up, billing, application confirmations).</li>
      </UL>

      <H2>3. Third-party processors</H2>
      <UL>
        <li><strong>Supabase</strong> — authentication and resume file storage (EU/US regions).</li>
        <li><strong>MongoDB</strong> — primary application database.</li>
        <li><strong>Razorpay</strong> — payment processing (PCI-DSS).</li>
        <li><strong>OpenRouter</strong> — LLM inference for the AI tools. Resume text is sent to the model only while a request is in flight; no training on your data.</li>
      </UL>

      <H2>4. Retention</H2>
      <P>
        We retain your account data while your account is active. If you delete your account, we permanently delete or anonymise your resume, applications, and personal data within 30 days, except where retention is required by law (e.g. tax records).
      </P>

      <H2>5. Your rights</H2>
      <UL>
        <li>Access, correct, or export your data at any time.</li>
        <li>Delete your account from the dashboard or by emailing us.</li>
        <li>Withdraw consent for non-essential processing.</li>
      </UL>

      <H2>6. Security</H2>
      <P>
        We use TLS in transit, encrypted storage at rest, and the principle of least privilege internally. No system is 100% secure, but we treat your data as we would treat our own.
      </P>

      <H2>7. Children</H2>
      <P>ApplyAgent is not directed at users under 18 and we do not knowingly collect data from minors.</P>

      <H2>8. Changes</H2>
      <P>If we make material changes we will notify you via email and update this page.</P>

      <H2>9. Contact</H2>
      <P>Email <a href="mailto:privacy@getapplyagent.com" className="underline">privacy@getapplyagent.com</a> for any privacy question or data request.</P>
    </LegalShell>
  );
}
