import { LegalShell, H2, P } from "./_LegalShell";

export default function Shipping() {
  return (
    <LegalShell title="Shipping & Delivery Policy" updated="July 2025" testid="page-shipping">
      <H2>Digital product — no physical shipping</H2>
      <P>
        JobPilot is a 100% digital, web-based service. There is no physical product, and therefore there is no shipping, freight, or delivery charge of any kind.
      </P>

      <H2>Service activation</H2>
      <P>
        Access to your subscription is provisioned <strong>instantly</strong> upon successful payment confirmation by Razorpay. If you do not see your plan activated within 5 minutes of payment, please email <a href="mailto:support@jobpilot.ai" className="underline">support@jobpilot.ai</a> with your Razorpay payment ID and we will resolve it immediately.
      </P>

      <H2>Service area</H2>
      <P>
        JobPilot is available worldwide wherever Razorpay supports payment, with all billing currently in INR.
      </P>
    </LegalShell>
  );
}
