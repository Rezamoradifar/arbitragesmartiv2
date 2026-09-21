/** Only publish authentic documents supplied by the company, after checking
 * the issuer's record. Images go in public/company-documents. Never generate
 * certificate artwork or describe source verification as a financial license. */
export type CompanyDocument = {
  title: string;
  category:
    | "Company registration"
    | "Financial authorization"
    | "Independent audit";
  issuer: string;
  reference: string;
  imagePath: string;
  verificationUrl: string;
};
export const COMPANY_DOCUMENTS: CompanyDocument[] = [];
