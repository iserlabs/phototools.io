import './globals.css'

// Synchronously sets `data-theme` on <html> from localStorage before React
// paints, so the saved theme persists across navigations (including locale
// switches that remount layouts) without a flash of the default theme.
const themeInitScript = `(function(){try{var t=localStorage.getItem('phototools-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`

// Sets `<html lang>` from the URL's locale segment before paint so screen
// readers and crawlers see the correct language without forcing this layout
// to read request headers (which would opt every route out of static
// rendering). Mirrors the locale list in src/lib/i18n/routing.ts.
const langInitScript = `(function(){try{var p=location.pathname.split('/').filter(Boolean)[0];var L=['en','es','ja','de','fr','nl','ko','pt','it','hi','zh','tr','pl','id','vi','th','ru','bn','zh-TW','uk','sv','da','nb','fi','cs','ro','hu','el','ms','fil','ca'];if(L.indexOf(p)>-1){document.documentElement.setAttribute('lang',p)}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The lang attribute is rewritten by the inline langInitScript above so
  // the URL's locale segment becomes the document language before first
  // paint. We can't set it server-side here because reading request data in
  // the root layout would force every page out of static generation.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="facebook-domain-verification" content="ggwy69tbq5cn3pvypxdvay1xl6ykjs" />
        {/* suppressHydrationWarning: AdSense / ad-blocker browser extensions
            rewrite inline <script> tags in <head> before React hydrates
            (seen in the wild: pagead2.googlesyndication.com replacing the
            attributes). The `suppressHydrationWarning` on <html> does not
            cascade to descendant mismatches, so we mark this tag explicitly. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: langInitScript }}
        />
      </head>
      <body style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
