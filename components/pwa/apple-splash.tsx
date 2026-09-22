import splashSizes from "@/lib/apple-splash.json";

/**
 * Launch images for an installed app on iOS, which shows a blank screen while
 * starting unless a tag matches the device exactly. Android needs none — it
 * composes its own splash from the manifest's icon, name and background.
 *
 * Next's Metadata API has no field for these, so they are rendered as plain
 * link tags and React hoists them into the head. The sizes come from
 * lib/apple-splash.json, which scripts/brand-icons.mjs generates the images
 * from, so a tag can never point at a file that was never made.
 */
export function AppleSplash() {
  return (
    <>
      {/* Next emits only the newer `mobile-web-app-capable`. iOS before 16.4
          reads nothing but the Apple-prefixed one, and without it an
          installed icon opens inside Safari's chrome instead of standalone.
          Harmless on versions that no longer need it. */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      {splashSizes.map(({ w, h, r }) => (
        <link
          key={`${w}x${h}@${r}`}
          rel="apple-touch-startup-image"
          media={`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`}
          href={`/splash/${w * r}x${h * r}.png`}
        />
      ))}
    </>
  );
}
