import { LegalShell, H2, P } from "./_LegalShell";

export default function About() {
  return (
    <LegalShell title="About JobPilot" updated="July 2025" testid="page-about">
      <P>
        JobPilot is the autonomous job-search agent. Upload your resume once, set your preferences, and our AI quietly applies on your behalf to roles that actually fit — while you keep doing whatever matters more.
      </P>

      <H2>Our mission</H2>
      <P>
        Job hunting is exhausting busywork. We believe nobody should have to retype their experience into 200 different forms. JobPilot’s mission is to delete that friction entirely — so that humans can spend their time interviewing, learning, and choosing, instead of clicking “Apply”.
      </P>

      <H2>How it works</H2>
      <P>
        We pull openings from LinkedIn, Indeed, Wellfound, Greenhouse, Workday and direct company career pages, score each one against your profile, tailor your resume to the role, and submit the application. You see every submission in your dashboard.
      </P>

      <H2>The team</H2>
      <P>
        We are a small, focused team based in Bengaluru, India, building the product we wished existed during our own job hunts.
      </P>
    </LegalShell>
  );
}
