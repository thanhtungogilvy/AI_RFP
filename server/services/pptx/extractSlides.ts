import type { CaseStudySlide } from '~/types/case-study'

export interface ExtractedSlide extends CaseStudySlide {}

/**
 * Extract slides from a PPTX file buffer.
 * TODO: Integrate a PPTX parsing library (e.g., pptx2json or python-pptx via subprocess)
 */
export async function extractSlidesFromPptx(_buffer: Buffer): Promise<ExtractedSlide[]> {
  // TODO: Parse the PPTX binary format
  // TODO: For each slide, extract title text, body text, and image data
  // TODO: Return structured slide objects ready for indexing
  throw new Error('PPTX extraction not yet implemented')
}
