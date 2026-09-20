import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Bullets } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Commission terms",
  description: "How commissioned songs work: quotes, payment, delivery, and what you may do with the finished song.",
};

export default function CommissionTermsPage() {
  return (
    <LegalPage
      title="Commission terms"
      intro="What happens when you ask us to write a song: how the price is agreed, when you pay, what you get, and what you may do with it."
    >
      <Section title="How it goes">
        <Bullets
          items={[
            "You send a brief. It costs nothing and commits you to nothing.",
            "We read it and either quote a price and a date, or tell you we can't take it on.",
            "You accept the quote. Nothing is made before you do.",
            "You pay, by whatever method we agree. Payment is arranged directly between us, not through this site.",
            "We make the song and put it on your request page, where you can play it and download it.",
          ]}
        />
      </Section>

      <Section title="The price">
        <p>
          The quote is for the song described in the brief. Changing what you asked for after we have started — a
          different occasion, a different person, a different language — is a new quote, and we will say so before doing
          any of it.
        </p>
        <p>
          We do not take payment through this site. Nothing is charged automatically and no card details are stored
          here.
        </p>
      </Section>

      <Section title="Dates">
        <p>
          Tell us when you need it and we will tell you honestly whether we can make that date before you pay. If we
          agree a date and then miss it through our own fault, you can have your money back.
        </p>
        <p>A brief that arrives incomplete may move the date. We will tell you if it does, rather than let it quietly slip.</p>
      </Section>

      <Section title="Changes once it's made">
        <p>
          One round of changes is included: wrong name, a line that misses, a mood that isn&apos;t right. Tell us on the
          request page and we will fix it. Rewriting it into a different song is a new commission.
        </p>
      </Section>

      <Section title="Cancelling, and money back">
        <Bullets
          items={[
            "Before you accept a quote, there is nothing to cancel.",
            "After you have paid but before we have started, you get a full refund.",
            "Once we have started writing or producing, a refund depends on how far along we are, and we will be straight with you about it.",
            "If we miss an agreed date through our own fault, or we can't deliver at all, you get a full refund.",
          ]}
        />
      </Section>

      <Section title="What you may do with the song">
        <p>
          The finished song is yours to keep, play, download, and share with the person it was written for. You may play
          it at the occasion you commissioned it for — the party, the wedding, the funeral — and give copies to family
          and friends.
        </p>
        <p>
          We keep ownership of the recording and the composition. That means it is not yours to sell, to release on a
          streaming service, or to use in advertising or anything else commercial. If you want to do any of that, ask
          us — it is usually possible, and it is a separate arrangement.
        </p>
      </Section>

      <Section title="Whether anyone else hears it">
        <p>
          Your song is private to your account unless you ticked the box saying we may publish it. We do not put a
          commissioned song in the public catalogue, use it to promote {LEGAL.siteName}, or play it to anyone else
          without that permission. You can change your mind either way by telling us.
        </p>
        <p>
          What you wrote in the brief stays between us. See the{" "}
          <Link href="/privacy" className="font-medium text-foreground underline">
            privacy page
          </Link>{" "}
          for how we handle it, particularly when it is about someone else.
        </p>
      </Section>

      <Section title="What we won't write">
        <p>
          We can decline a brief, and we will say why. We will not write a song that harasses or humiliates someone,
          that is built to deceive people about who made it, or that we would be ashamed to have made. If we decline
          after you have paid, you get your money back.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          Ask on the request itself, or email{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-medium text-foreground underline">
            {LEGAL.contactEmail}
          </a>
          . Quote your reference — it looks like VB-7K2Q — and we will find it.
        </p>
      </Section>
    </LegalPage>
  );
}
