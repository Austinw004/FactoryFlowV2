export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-ink text-bone font-sans px-6">
      <div className="max-w-lg w-full text-center">
        <div className="text-xs tracking-[0.2em] uppercase text-soft mb-6">
          Error 404
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-4">
          This page doesn't exist.
        </h1>
        <p className="text-soft leading-relaxed mb-8">
          The link you followed may be broken, or the page may have moved. If
          you believe this is a mistake, reach us at{" "}
          <a
            href="mailto:info@prescient-labs.com"
            className="underline hover:text-bone transition"
          >
            info@prescient-labs.com
          </a>
          .
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="/"
            className="inline-flex items-center px-5 py-2.5 bg-bone text-ink text-sm font-medium hover:opacity-90 transition"
          >
            Back to home
          </a>
          <a
            href="/contact"
            className="inline-flex items-center px-5 py-2.5 border border-line text-sm font-medium hover:bg-line/40 transition"
          >
            Contact us
          </a>
        </div>
      </div>
    </div>
  );
}
