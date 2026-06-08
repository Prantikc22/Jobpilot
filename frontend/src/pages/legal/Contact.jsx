import { LegalShell, H2, P } from "./_LegalShell";

export default function Contact() {
  return (
    <LegalShell title="Contact Us" updated="July 2025" testid="page-contact">
      <P>
        We respond to every email within one business day. Pick the channel that fits.
      </P>

      <H2>Support</H2>
      <P>
        For product help, billing, or refunds: <a href="mailto:support@getapplyagent.com" className="underline">support@getapplyagent.com</a>
      </P>

      <H2>Privacy & data</H2>
      <P>
        For data access, deletion, or any privacy question: <a href="mailto:privacy@getapplyagent.com" className="underline">privacy@getapplyagent.com</a>
      </P>

      <H2>Press & partnerships</H2>
      <P>
        Reach the founders at <a href="mailto:hello@getapplyagent.com" className="underline">hello@getapplyagent.com</a>.
      </P>

      <H2>Business address</H2>
      <P>
        ApplyAgent<br />
        Indiranagar, Bengaluru, Karnataka 560038<br />
        India
      </P>
    </LegalShell>
  );
}
