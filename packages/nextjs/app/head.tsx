export default function Head() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bugchan.xyz";
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BugChan",
    url: siteUrl,
    logo: `${siteUrl}/logo.svg`,
    sameAs: ["https://x.com", "https://github.com", "https://linkedin.com"],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
    </>
  );
}
