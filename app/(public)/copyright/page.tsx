import type { Metadata } from "next";
import { LegalPage, Section, Bullets } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Copyright",
  description: "How to report music on Vibe Banger that belongs to you, and what happens next.",
};

export default function CopyrightPage() {
  return (
    <LegalPage
      title="Copyright"
      intro="If music here is yours and shouldn't be, tell us and we'll take it down. This page explains exactly how, and what happens after."
    >
      <Section title="Reporting something that's yours">
        <p>
          Email{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-medium text-foreground underline">
            {LEGAL.contactEmail}
          </a>{" "}
          with the subject <strong className="text-foreground">Copyright</strong>, and include:
        </p>
        <Bullets
          items={[
            "A link to the page on this site where the music appears — the address of the song page is enough.",
            "What the work is, and how you know it's yours: a release, a registration, a distributor, wherever it is published.",
            "Your name and an email address we can reply to.",
            "A statement that you believe in good faith the use is not authorised by you, your agent, or the law.",
            "A statement that the information you've given is accurate, and that you are the rights holder or are authorised to act for them.",
          ]}
        />
        <p>
          We need all of it. Without a specific link and a way to reach you, we cannot act on a report, and a vague
          complaint only slows down the ones that are real.
        </p>
      </Section>

      <Section title="What we do">
        <p>
          We read every report. Where it is clear enough to act on, the track comes down first and we look into it
          afterwards — leaving music up while a dispute is discussed is not fair to whoever made it.
        </p>
        <p>
          We tell the person who uploaded it what was reported and who reported it, so they can respond. We keep a
          record of what was taken down and why.
        </p>
      </Section>

      <Section title="If you uploaded it and the report is wrong">
        <p>
          Reply to us and say so. Tell us why the music is yours or why you are allowed to distribute it — you wrote it,
          you licensed it, the sample is cleared, it is out of copyright. Include a way to contact you.
        </p>
        <p>
          If what you tell us resolves it, the track goes back up. We may pass your response, including your contact
          details, to whoever reported it, because that is usually the only way the two of you can settle it.
        </p>
      </Section>

      <Section title="People who keep doing it">
        <p>
          Accounts that repeatedly upload music belonging to other people are closed, and their uploads removed. This
          is not a numbers game — one deliberate attempt to pass off someone else&apos;s work is enough.
        </p>
      </Section>

      <Section title="A note on how music here is made">
        <p>
          Much of this catalogue is produced with AI tools, which is stated on each song&apos;s own page. That is not a
          reason a track can escape this policy: if a piece of music reproduces something you made, report it exactly as
          you would anything else, and we will deal with it the same way.
        </p>
      </Section>
    </LegalPage>
  );
}
