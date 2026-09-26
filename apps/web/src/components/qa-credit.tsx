const PORTFOLIO_URL = "https://quantum-amplitude.tech";

/**
 * Copy of the portfolio's docs/brand/qa-mark.svg; the letters take the text color. Its units are
 * font units (1000 per em) with the baseline at y 0, so height and offset in em set it on the text
 * baseline at the text's size.
 */
function QaMark() {
  return (
    <svg
      viewBox="38 -719 2253 853"
      role="img"
      className="ml-2 inline h-[0.853em] w-auto align-[-0.134em]"
    >
      <title>Quantum Amplitude</title>
      <path
        d="M695 69 388 -135V-269L695 -65ZM375 10Q272 10 197 -36Q121 -81 80 -162Q38 -243 38 -350Q38 -457 80 -538Q121 -619 197 -664Q272 -710 375 -710Q477 -710 552 -664Q627 -619 669 -538Q710 -457 710 -350Q710 -243 669 -162Q627 -81 552 -36Q477 10 375 10ZM375 -101Q437 -101 480 -131Q524 -161 546 -217Q569 -272 569 -350Q569 -427 546 -483Q524 -539 480 -569Q437 -599 375 -599Q312 -599 269 -569Q225 -539 202 -483Q179 -427 179 -350Q179 -272 202 -217Q225 -161 269 -131Q312 -101 375 -101Z M1616 0 1871 -700H2037L2291 0H2151L1939 -618H1960L1744 0ZM1742 -188 1780 -290H2131L2165 -188Z"
        fill="currentColor"
      />
      <path d="M1122 134V-719H1240V134Z" fill="#7AA5D2" />
    </svg>
  );
}

export function QaCredit({ label }: { label: string }) {
  return (
    <a
      href={PORTFOLIO_URL}
      target="_blank"
      rel="noopener"
      className="transition-colors hover:text-foreground"
    >
      {label}
      <QaMark />
    </a>
  );
}
