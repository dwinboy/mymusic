import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Bullets } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms",
  description: "The agreement between you and Vibe Banger.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      intro={`The agreement between you and ${LEGAL.siteName}. Using the site means you accept it.`}
    >
      <Section title="Your account">
        <p>
          One person, one account, with an email address that reaches you. Keep your password to yourself — anything
          done from your account is treated as done by you.
        </p>
      </Section>

      <Section title="Listening">
        <p>
          The music here is for you to listen to, and to save on your own device to listen to offline. What you may not
          do is redistribute it: no re-uploading it elsewhere, no selling it, no putting it in something else you
          publish, and no using it in a video, a business or an advertisement without the rights holder agreeing first.
        </p>
      </Section>

      <Section title="Publishing your music">
        <p>By uploading, you tell us two things, and we rely on both:</p>
        <Bullets
          items={[
            "You wrote it or otherwise have the rights to it, including any samples, and you are allowed to distribute it here.",
            "The disclosure you gave about how it was made is accurate.",
          ]}
        />
        <p>
          You keep ownership of your music. You give us permission to store it, convert it into the formats we stream,
          make artwork and waveforms from it, and make it available to listeners on this site — that is all we need to
          run the service, and it lasts as long as your music is up here. Take it down and that permission ends, apart
          from copies a listener already saved to their own device.
        </p>
        <p>
          Do not upload anything you do not have the rights to, or anything illegal. If someone tells us your upload is
          theirs, we deal with it under the{" "}
          <Link href="/copyright" className="font-medium text-foreground underline">
            copyright policy
          </Link>
          .
        </p>
      </Section>

      <Section title="Commissioned songs">
        <p>
          Having a song made has its own terms, which cover quotes, payment, delivery and who may use the finished
          song. They are on the{" "}
          <Link href="/commission-terms" className="font-medium text-foreground underline">
            commissions page
          </Link>
          .
        </p>
      </Section>

      <Section title="When we remove things">
        <p>
          We may take down a track or close an account that breaks these terms, infringes someone&apos;s rights, or is
          being used to harass or deceive people. Where we reasonably can, we say why first — but a valid copyright
          complaint means the music comes down straight away.
        </p>
        <p>You can close your own account whenever you like. See the privacy page for how.</p>
      </Section>

      <Section title="What we do and don't promise">
        <p>
          We work to keep the site up and the music playing, but we cannot promise it is never down, never loses a
          file, or works on every device. It is provided as it is.
        </p>
        <p>
          We are not responsible for what creators upload. If something is wrong with a track, tell us and we will look
          at it.
        </p>
        <p>
          To the extent the law allows, we are not liable for indirect losses — lost income, lost data, or a missed
          occasion — arising from using the site. Nothing here limits liability that cannot legally be limited.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          These terms can change. The date at the top says when they last did, and we will say so on the site when the
          change matters. Continuing to use {LEGAL.siteName} means the new version applies.
        </p>
      </Section>

      <Section title="The law that applies">
        <p>
          {LEGAL.siteName} is operated from {LEGAL.jurisdiction}, and these terms are governed by the law there. If any
          part of them turns out to be unenforceable, the rest still stands.
        </p>
      </Section>

      <Section title="Getting in touch">
        <p>
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-medium text-foreground underline">
            {LEGAL.contactEmail}
          </a>{" "}
          reaches us, as does the{" "}
          <Link href="/contact" className="font-medium text-foreground underline">
            contact page
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
