# Institutional logo

The official XLRI logo lives here. Any of these filenames is picked up
automatically, tried in this order:

    xlri-logo.webp   <- currently in use (676 x 290)
    xlri-logo.png
    xlri-logo.svg
    xlri-logo.jpg

Guidance:

- Transparent background; the horizontal lockup (crest + wordmark) works best
- Roughly 480-700 px wide is plenty; it renders 28-44 px tall
- On dark surfaces the portal places the logo on a small white chip rather than
  flattening it to white, so the crest blue and the green on the "i" survive

If none of those files exist, the portal renders a typographic `XLRi` wordmark
in the brand colours instead - nothing breaks, and no approximation of the
crest is invented.

## Email logo

Email clients lag far behind browsers on image formats - Outlook renders with
the Word engine and handles neither WebP nor SVG - so emails use a separate
PNG at `xlri-logo-email.png`, embedded in the message itself rather than
linked (most clients block remote images by default, which would leave a grey
box exactly when the recipient is deciding whether to trust the mail).

Regenerate it whenever the source logo changes:

    npm run email:logo

If that PNG is missing, emails fall back to a text masthead - never a broken
image icon.

Names, campus and tagline are configured in `src/lib/brand.ts`.
