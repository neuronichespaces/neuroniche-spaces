// F8 — Evidence library (BUILD-SPEC-v1 §4.2 F8). Static, curated, cited
// sources. Every entry carries a real citation and URL — no AI summarisation
// here; this is reference data other features (audit, templates) cite from.

export type Framework = "aspectss" | "coga" | "wcag" | "bda" | "standard";

export interface EvidenceSource {
  id: string;
  citation: string;
  url: string;
  framework: Framework;
  summary: string; // one plain-language sentence on what it says
}

export const EVIDENCE_LIBRARY: EvidenceSource[] = [
  {
    id: "mostafa2014",
    citation:
      "Mostafa, M. (2014). Architecture for autism: Autism ASPECTSS in school design. ArchNet-IJAR, 8(1), 143-158.",
    url: "https://doi.org/10.26687/archnet-ijar.v8i1.314",
    framework: "aspectss",
    summary: "Introduces the seven ASPECTSS design criteria used in the audit wizard.",
  },
  {
    id: "wcag22",
    citation: "W3C (2023). Web Content Accessibility Guidelines (WCAG) 2.2. W3C Recommendation.",
    url: "https://www.w3.org/TR/WCAG22/",
    framework: "wcag",
    summary: "The accessibility standard this product is built to meet.",
  },
  {
    id: "aspect2021",
    citation: "Autism Spectrum Australia (Aspect). Autism-friendly design principles for built environments.",
    url: "https://www.autismspectrum.org.au/",
    framework: "aspectss",
    summary: "Australian practical guidance on autism-friendly built environments.",
  },
  {
    id: "w3c-coga",
    citation:
      "W3C (2021). Making Content Usable for People with Cognitive and Learning Disabilities. W3C Working Group Note.",
    url: "https://www.w3.org/TR/coga-usable/",
    framework: "coga",
    summary: "The cognitive-accessibility objectives behind the plain-language and one-thing-at-a-time design in this app.",
  },
  {
    id: "bda-style-guide",
    citation: "British Dyslexia Association. Dyslexia Style Guide.",
    url: "https://www.bdadyslexia.org.uk/advice/employers/creating-a-dyslexia-friendly-workplace/dyslexia-friendly-style-guide",
    framework: "bda",
    summary: "Typography and formatting guidance (sans-serif, spacing, left-aligned text) applied across this app.",
  },
  {
    id: "premises-standards",
    citation:
      "Disability (Access to Premises — Buildings) Standards 2010 (Cth), made under the Disability Discrimination Act 1992.",
    url: "https://www.legislation.gov.au/Details/F2010L00668",
    framework: "standard",
    summary: "The access standard referenced by the circulation/doorway compliance check.",
  },
];

export function evidenceByFramework(framework: Framework): EvidenceSource[] {
  return EVIDENCE_LIBRARY.filter((e) => e.framework === framework);
}
