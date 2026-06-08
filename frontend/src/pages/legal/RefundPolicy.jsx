import { LegalShell, H2, P, UL } from "./_LegalShell";

export default function RefundPolicy() {
  return (
    <LegalShell title="Refund & Cancellation Policy" updated="July 2025" testid="page-refund">
      <P>
        JobPilot is a digital SaaS product billed via Razorpay. We want you to be entirely satisfied. This policy explains when and how you can request a refund or cancel your subscription.
      </P>

      <H2>1. Subscription cancellation</H2>
      <P>
        You can cancel your Starter or Pro subscription at any time from your dashboard or by emailing <a href="mailto:support@jobpilot.ai" className="underline">support@jobpilot.ai</a>. Cancellation takes effect at the end of the current billing cycle and you continue to have access to paid features until then. You will not be charged again.
      </P>

      <H2>2. Refunds — 7-day money-back guarantee</H2>
      <P>
        If you are unhappy with JobPilot for any reason, contact us within <strong>7 days</strong> of your initial purchase and we will refund 100% of that payment, no questions asked.
      </P>
      <UL>
        <li>Eligibility: applies to the very first paid invoice on your account.</li>
        <li>Process: email support@jobpilot.ai from the address used at sign-up; refunds are issued to the original payment method within 5–10 business days.</li>
        <li>Auto-applications already submitted on your behalf cannot be “un-sent”, but they do not affect your refund eligibility.</li>
      </UL>

      <H2>3. Pro-rata refunds for renewals</H2>
      <P>
        After the first 7 days, monthly renewals are non-refundable except as required by law. If you forget to cancel and are charged for a new month, write to us within 48 hours of the charge and we will review the request and may issue a pro-rated refund at our discretion.
      </P>

      <H2>4. Failed / duplicate payments</H2>
      <P>
        Razorpay occasionally processes a payment twice due to a network retry. We auto-detect duplicates within 24 hours and refund them automatically. If you spot a duplicate that we missed, email us with the Razorpay payment IDs and we will refund within 2 business days.
      </P>

      <H2>5. Free plan</H2>
      <P>
        The Free plan involves no payment and therefore is not eligible for a refund.
      </P>

      <H2>6. How to request a refund</H2>
      <P>
        Email <a href="mailto:support@jobpilot.ai" className="underline">support@jobpilot.ai</a> with subject “Refund request” and include your account email and Razorpay payment ID. We respond within one business day.
      </P>
    </LegalShell>
  );
}
