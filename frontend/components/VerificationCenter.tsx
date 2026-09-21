import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/Icon";
import { COMPANY_DOCUMENTS } from "@/lib/company-documents";
import { CONTRACT_ADDRESS, EXPLORER } from "@/lib/contract";

export function VerificationCenter() {
  const configured =
    CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
  return (
    <section className="container-page py-16 scroll-mt-24" id="verification">
      <div className="section-label">
        <span>04 / VERIFICATION & DOCUMENTS</span>
        <span>CHECK THE SOURCE</span>
      </div>
      <div className="market-section-heading">
        <div>
          <h2>Trust starts with something you can check.</h2>
          <p>
            Explore the contract, its public activity and the documents behind
            the company.
          </p>
        </div>
      </div>
      <div className="verification-grid">
        <article className="verification-card glass">
          <Icon name="layers" className="h-6 w-6 text-gold-300" />
          <span className="document-type">TECHNICAL RECORD</span>
          <h3>Published contract source</h3>
          <p>
            Inspect the source and deployed bytecode on the public verification
            service.
          </p>
          {configured ? (
            <a
              href={`https://repo.sourcify.dev/137/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              Open Sourcify <Icon name="external" className="h-3.5 w-3.5" />
            </a>
          ) : (
            <Link href="/security">
              Read the security model{" "}
              <Icon name="external" className="h-3.5 w-3.5" />
            </Link>
          )}
        </article>
        <article className="verification-card glass">
          <Icon name="activity" className="h-6 w-6 text-gold-300" />
          <span className="document-type">PUBLIC LEDGER</span>
          <h3>On-chain activity</h3>
          <p>
            Follow transactions and balances independently through the Polygon
            explorer.
          </p>
          {configured ? (
            <a
              href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              Open PolygonScan <Icon name="external" className="h-3.5 w-3.5" />
            </a>
          ) : (
            <Link href="/activity">
              View activity <Icon name="external" className="h-3.5 w-3.5" />
            </Link>
          )}
        </article>
        <article className="verification-card glass">
          <Icon name="shield" className="h-6 w-6 text-gold-300" />
          <span className="document-type">COMPANY DOCUMENTS</span>
          <h3>Registration & authorization</h3>
          <p>
            {COMPANY_DOCUMENTS.length
              ? "Published documents are listed below with their issuer and verification link."
              : "Company registration and financial authorization documents have not been published here."}
          </p>
          <span className="document-status">
            {COMPANY_DOCUMENTS.length
              ? `${COMPANY_DOCUMENTS.length} document(s) published`
              : "Documents not supplied"}
          </span>
        </article>
        <article className="verification-card glass">
          <Icon name="globe" className="h-6 w-6 text-gold-300" />
          <span className="document-type">DOMAIN RECORD LOOKUP</span>
          <h3>Arbhub.com</h3>
          <p>
            Look up public registration data through ICANN. A domain record does
            not verify a financial license or this project’s ownership of the
            domain.
          </p>
          <a
            href="https://lookup.icann.org/en/lookup?name=arbhub.com"
            target="_blank"
            rel="noreferrer"
          >
            Check domain record <Icon name="external" className="h-3.5 w-3.5" />
          </a>
        </article>
      </div>
      {!!COMPANY_DOCUMENTS.length && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMPANY_DOCUMENTS.map((d) => (
            <a
              key={d.reference}
              href={d.verificationUrl}
              target="_blank"
              rel="noreferrer"
              className="glass overflow-hidden"
            >
              <Image
                src={d.imagePath}
                alt={`${d.title} — ${d.issuer}, reference ${d.reference}`}
                width={800}
                height={1100}
                className="h-64 w-full object-contain bg-white"
              />
              <div className="p-5">
                <span className="document-type">{d.category}</span>
                <h3 className="mt-2 font-semibold">{d.title}</h3>
                <p className="mt-2 text-sm text-graphite-300">
                  {d.issuer} · {d.reference}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm text-gold-300">
                  Check with issuer{" "}
                  <Icon name="external" className="h-3.5 w-3.5" />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
      <p className="market-footnote">
        Source-code verification is a technical check. It is not a financial
        license, independent security audit or guarantee of returns.
      </p>
    </section>
  );
}
