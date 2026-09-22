import { Logo } from "@/components/layout/logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-64px)] md:grid-cols-2">
      {/* The panel beside the form was a gradient and a headline with a lot of
          nothing above it. It holds a photograph now — someone listening,
          which is the whole point of the place — treated so it reads as part
          of the app rather than a picture pasted onto it: the frame's own
          yellow is close enough to the brand gold to leave alone, and three
          washes do the rest. One darkens the foot so the headline sits on
          something solid, one fades the right edge into the canvas so the
          seam with the form disappears, and a low warm glow ties the two
          columns together. */}
      <div className="auth-photo relative hidden overflow-hidden bg-canvas md:block">
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/55 to-transparent" />
        {/* The frame's yellow ran straight into the dark header above it.
            This eases one into the other. */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-canvas/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-canvas" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 85%, rgba(227,168,87,0.22), transparent 55%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-end p-12 pb-[calc(3rem+64px+env(safe-area-inset-bottom,0px))] lg:pb-12">
          <div className="max-w-sm">
            {/* Leads with what the music is about rather than how it is
                produced. The method is a fact about each track, stated on
                its own page; it was never the reason anyone presses play. */}
            <p className="text-3xl font-semibold leading-tight text-foreground">
              Songs with somebody&apos;s life in them.
            </p>
            <p className="mt-4 text-sm text-foreground-muted">
              Original music written from real experience — the words are ours, and the stories behind
              them are true. Stream it, keep it offline, or have a song made for someone you love.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Centred and large, at every width. This is the one screen where
              the mark is the whole of the brand a visitor has to go on, and
              it used to be a small one tucked into the top-left corner on a
              phone and absent altogether beside the form on a desktop. */}
          <div className="mb-8 flex justify-center">
            <Logo variant="hero" />
          </div>
          <h1 className="text-center text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-1.5 text-center text-sm text-foreground-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-foreground-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
