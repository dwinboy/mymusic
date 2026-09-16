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
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo />
          <div className="max-w-sm">
            <p className="text-3xl font-semibold leading-tight text-foreground">
              An independent catalogue of AI-composed sound.
            </p>
            <p className="mt-4 text-sm text-foreground-muted">
              Stream, download, and organize an evolving library of original music — crafted end to end
              by artificial intelligence.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 md:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm text-foreground-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-foreground-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
