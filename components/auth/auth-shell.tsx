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
      <div className="relative hidden overflow-hidden md:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#241a0c] via-canvas to-canvas" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(227,168,87,0.18), transparent 45%), radial-gradient(circle at 80% 80%, rgba(227,168,87,0.1), transparent 40%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-end p-12">
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
