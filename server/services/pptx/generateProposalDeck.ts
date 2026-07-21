import pptxgen from 'pptxgenjs'
import type { CaseStudy } from '~/types/case-study'
import type { RfpAnalysis, RfpDocument } from '~/types/rfp'

export interface ProposalDeckData {
  rfp: RfpDocument
  analysis?: RfpAnalysis
  caseStudies: CaseStudy[]
  title: string
  preparedBy?: string
}

// ─── Design tokens ───────────────────────────────────────────────────────────
const W = 10      // slide width  (inches, 16:9 widescreen)
const H = 5.625   // slide height (inches)
const ShapeType = { rect: 'rect', ellipse: 'ellipse', line: 'line' } as const

const C = {
  primary:      '1E293B', // slate-800
  accent:       '2563EB', // blue-600
  accentLight:  'DBEAFE', // blue-100
  white:        'FFFFFF',
  offWhite:     'F8FAFC', // slate-50
  bodyText:     '334155', // slate-700
  muted:        '64748B', // slate-500
  border:       'E2E8F0', // slate-200
  red:          'DC2626',
  amber:        'D97706',
  green:        '16A34A',
  gray:         '6B7280',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function header(slide: pptxgen.Slide, title: string) {
  slide.addShape(ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.6,
    fill: { color: C.primary },
    line: { color: C.primary, width: 0 },
  })
  slide.addShape(ShapeType.rect, {
    x: 0, y: 0, w: 0.06, h: 0.6,
    fill: { color: C.accent },
    line: { color: C.accent, width: 0 },
  })
  slide.addText(title.toUpperCase(), {
    x: 0.25, y: 0, w: W - 0.5, h: 0.6,
    fontSize: 11,
    bold: true,
    color: C.white,
    valign: 'middle',
    charSpacing: 1,
  })
}

function footer(slide: pptxgen.Slide, label = 'Confidential · AI RFP Generator') {
  slide.addShape(ShapeType.rect, {
    x: 0, y: H - 0.28, w: W, h: 0.28,
    fill: { color: C.border },
    line: { color: C.border, width: 0 },
  })
  slide.addText(label, {
    x: 0.3, y: H - 0.28, w: W - 0.6, h: 0.28,
    fontSize: 7,
    color: C.muted,
    valign: 'middle',
  })
}

function sectionLabel(slide: pptxgen.Slide, text: string, x: number, y: number, w: number) {
  slide.addText(text.toUpperCase(), {
    x, y, w, h: 0.2,
    fontSize: 7,
    bold: true,
    color: C.accent,
    charSpacing: 1.5,
  })
}

function priorityColor(p: string): string {
  if (p === 'high')   return C.red
  if (p === 'medium') return C.amber
  return C.gray
}

// ─── Slide builders ──────────────────────────────────────────────────────────

function addCoverSlide(prs: pptxgen, data: ProposalDeckData) {
  const slide = prs.addSlide()
  slide.background = { color: C.primary }

  // Left accent bar
  slide.addShape(ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: H,
    fill: { color: C.accent },
    line: { color: C.accent, width: 0 },
  })

  // Decorative circle
  slide.addShape(ShapeType.ellipse, {
    x: 7, y: -1.5, w: 5, h: 5,
    fill: { color: '243447' },
    line: { color: '243447', width: 0 },
  })

  // Label
  slide.addText('PROPOSAL', {
    x: 0.5, y: 1.1, w: 6, h: 0.3,
    fontSize: 9,
    bold: true,
    color: C.accent,
    charSpacing: 4,
  })

  // Title
  slide.addText(data.title, {
    x: 0.5, y: 1.5, w: 7.5, h: 1.6,
    fontSize: 32,
    bold: true,
    color: C.white,
    valign: 'top',
    wrap: true,
  })

  // Client
  slide.addText(`Prepared for: ${data.rfp.client}`, {
    x: 0.5, y: 3.2, w: 6, h: 0.35,
    fontSize: 13,
    color: 'CBD5E1',
  })

  // Industry
  slide.addText(data.rfp.industry, {
    x: 0.5, y: 3.55, w: 6, h: 0.28,
    fontSize: 11,
    color: C.muted,
  })

  // Date
  slide.addText(new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }), {
    x: 0.5, y: H - 0.65, w: 5, h: 0.28,
    fontSize: 9,
    color: '64748B',
  })

  if (data.preparedBy) {
    slide.addText(`Prepared by: ${data.preparedBy}`, {
      x: 0.5, y: H - 0.95, w: 5, h: 0.28,
      fontSize: 9,
      color: '64748B',
    })
  }
}

function addExecutiveSummarySlide(prs: pptxgen, data: ProposalDeckData) {
  const slide = prs.addSlide()
  slide.background = { color: C.white }
  header(slide, 'Executive Summary')
  footer(slide)

  const summary = data.analysis?.summary
    ?? `We are pleased to present this proposal in response to the ${data.rfp.title} issued by ${data.rfp.client}. Our approach draws on proven delivery experience and directly addresses the stated requirements.`

  slide.addText(summary, {
    x: 0.4, y: 0.85, w: W - 0.8, h: 1.4,
    fontSize: 13,
    color: C.bodyText,
    wrap: true,
    valign: 'top',
    lineSpacingMultiple: 1.35,
  })

  // Three value proposition boxes
  const boxes = [
    { icon: '✓', label: 'Proven Track Record', body: 'Delivered successful transformations across banking, retail, and enterprise sectors.' },
    { icon: '⚙', label: 'Technical Excellence', body: 'Cloud-native, AI-powered solutions built for scale, security, and compliance.' },
    { icon: '→', label: 'End-to-End Delivery', body: 'Strategy, design, build, and operate — a single accountable partner.' },
  ]

  const bw = (W - 0.8 - 0.3) / 3
  boxes.forEach((b, i) => {
    const bx = 0.4 + i * (bw + 0.15)
    const by = 2.5

    slide.addShape(ShapeType.rect, {
      x: bx, y: by, w: bw, h: 1.95,
      fill: { color: C.offWhite },
      line: { color: C.border, width: 0.75 },
      rectRadius: 0.06,
    })
    slide.addText(b.icon, {
      x: bx + 0.15, y: by + 0.18, w: 0.4, h: 0.35,
      fontSize: 16,
      color: C.accent,
      bold: true,
    })
    slide.addText(b.label, {
      x: bx + 0.15, y: by + 0.55, w: bw - 0.3, h: 0.28,
      fontSize: 9,
      bold: true,
      color: C.primary,
    })
    slide.addText(b.body, {
      x: bx + 0.15, y: by + 0.85, w: bw - 0.3, h: 0.95,
      fontSize: 8.5,
      color: C.bodyText,
      wrap: true,
      lineSpacingMultiple: 1.3,
    })
  })
}

function addRfpRequirementsSlide(prs: pptxgen, data: ProposalDeckData) {
  const slide = prs.addSlide()
  slide.background = { color: C.white }
  header(slide, 'Key RFP Requirements')
  footer(slide)

  const requirements: Array<{ category: string; description: string; priority: 'high' | 'medium' | 'low' }> =
    (data.analysis?.technicalRequirements ?? []).map(description => ({ category: 'Technical', description, priority: 'high' }))

  if (!requirements.length) {
    slide.addText('Requirements will be detailed following RFP analysis.', {
      x: 0.4, y: 1.5, w: W - 0.8, h: 0.5,
      fontSize: 12,
      color: C.muted,
    })
    return
  }

  // Group by priority
  const high   = requirements.filter(r => r.priority === 'high')
  const medium = requirements.filter(r => r.priority === 'medium')
  const low    = requirements.filter(r => r.priority === 'low')
  const ordered = [...high, ...medium, ...low]

  const startY = 0.75
  const rowH = 0.44
  const maxRows = 8

  ordered.slice(0, maxRows).forEach((req, i) => {
    const ry = startY + i * rowH
    const isEven = i % 2 === 0

    if (isEven) {
      slide.addShape(ShapeType.rect, {
        x: 0.3, y: ry, w: W - 0.6, h: rowH,
        fill: { color: C.offWhite },
        line: { color: C.offWhite, width: 0 },
      })
    }

    // Priority pill
    slide.addShape(ShapeType.rect, {
      x: 0.35, y: ry + 0.1, w: 0.72, h: 0.24,
      fill: { color: req.priority === 'high' ? 'FEE2E2' : req.priority === 'medium' ? 'FEF3C7' : 'F3F4F6' },
      line: { color: req.priority === 'high' ? 'FEE2E2' : req.priority === 'medium' ? 'FEF3C7' : 'F3F4F6', width: 0 },
      rectRadius: 0.05,
    })
    slide.addText(req.priority.toUpperCase(), {
      x: 0.35, y: ry + 0.1, w: 0.72, h: 0.24,
      fontSize: 6.5,
      bold: true,
      color: priorityColor(req.priority),
      align: 'center',
      valign: 'middle',
    })

    // Category
    slide.addText(req.category, {
      x: 1.15, y: ry + 0.08, w: 1.3, h: 0.28,
      fontSize: 8.5,
      bold: true,
      color: C.primary,
      valign: 'middle',
    })

    // Description
    slide.addText(req.description, {
      x: 2.5, y: ry + 0.06, w: W - 2.85, h: 0.32,
      fontSize: 8.5,
      color: C.bodyText,
      valign: 'middle',
      wrap: true,
    })
  })
}

function addProposedApproachSlide(prs: pptxgen) {
  const slide = prs.addSlide()
  slide.background = { color: C.white }
  header(slide, 'Our Proposed Approach')
  footer(slide)

  const phases = [
    {
      num: '01',
      label: 'Discover & Assess',
      duration: 'Weeks 1–2',
      points: ['Stakeholder workshops', 'Current state assessment', 'Gap analysis', 'Risk identification'],
    },
    {
      num: '02',
      label: 'Design & Plan',
      duration: 'Weeks 3–5',
      points: ['Solution architecture', 'Delivery roadmap', 'Resource planning', 'Proof of concept'],
    },
    {
      num: '03',
      label: 'Build & Integrate',
      duration: 'Weeks 6–16',
      points: ['Agile sprint delivery', 'Integration testing', 'Security review', 'UAT support'],
    },
    {
      num: '04',
      label: 'Deploy & Operate',
      duration: 'Week 17+',
      points: ['Go-live & cutover', 'Hypercare support', 'Knowledge transfer', 'Continuous improvement'],
    },
  ]

  const pw = (W - 0.6 - 0.3) / 4
  const py = 0.8

  phases.forEach((p, i) => {
    const px = 0.3 + i * (pw + 0.1)

    // Card
    slide.addShape(ShapeType.rect, {
      x: px, y: py, w: pw, h: 4.55,
      fill: { color: i === 0 ? C.primary : C.offWhite },
      line: { color: i === 0 ? C.primary : C.border, width: 0.75 },
      rectRadius: 0.08,
    })

    // Phase number
    slide.addText(p.num, {
      x: px + 0.12, y: py + 0.15, w: pw - 0.24, h: 0.55,
      fontSize: 26,
      bold: true,
      color: i === 0 ? C.accent : C.border,
    })

    // Phase label
    slide.addText(p.label, {
      x: px + 0.12, y: py + 0.72, w: pw - 0.24, h: 0.45,
      fontSize: 10,
      bold: true,
      color: i === 0 ? C.white : C.primary,
      wrap: true,
    })

    // Duration
    slide.addText(p.duration, {
      x: px + 0.12, y: py + 1.2, w: pw - 0.24, h: 0.25,
      fontSize: 8,
      color: i === 0 ? '93C5FD' : C.accent,
    })

    // Divider
    slide.addShape(ShapeType.line, {
      x: px + 0.12, y: py + 1.55, w: pw - 0.24, h: 0,
      line: { color: i === 0 ? '334155' : C.border, width: 0.5 },
    })

    // Bullets
    p.points.forEach((pt, j) => {
      slide.addText(`• ${pt}`, {
        x: px + 0.12, y: py + 1.7 + j * 0.48, w: pw - 0.24, h: 0.42,
        fontSize: 8.5,
        color: i === 0 ? 'CBD5E1' : C.bodyText,
        wrap: true,
        lineSpacingMultiple: 1.2,
      })
    })
  })
}

function addCaseStudiesIntroSlide(prs: pptxgen, caseStudies: CaseStudy[]) {
  const slide = prs.addSlide()
  slide.background = { color: C.offWhite }
  header(slide, 'Relevant Case Studies')
  footer(slide)

  slide.addText('We recommend the following case studies based on alignment with your RFP requirements:', {
    x: 0.4, y: 0.75, w: W - 0.8, h: 0.5,
    fontSize: 11,
    color: C.bodyText,
    wrap: true,
  })

  caseStudies.forEach((cs, i) => {
    const ry = 1.4 + i * 0.8

    slide.addShape(ShapeType.rect, {
      x: 0.4, y: ry, w: W - 0.8, h: 0.68,
      fill: { color: C.white },
      line: { color: C.border, width: 0.75 },
      rectRadius: 0.06,
    })

    // Index
    slide.addShape(ShapeType.rect, {
      x: 0.4, y: ry, w: 0.55, h: 0.68,
      fill: { color: C.accent },
      line: { color: C.accent, width: 0 },
      rectRadius: 0.06,
    })
    slide.addText(String(i + 1).padStart(2, '0'), {
      x: 0.4, y: ry, w: 0.55, h: 0.68,
      fontSize: 13,
      bold: true,
      color: C.white,
      align: 'center',
      valign: 'middle',
    })

    // Title
    slide.addText(cs.title, {
      x: 1.1, y: ry + 0.1, w: W - 2.0, h: 0.28,
      fontSize: 10,
      bold: true,
      color: C.primary,
    })

    // Meta
    slide.addText(`${cs.client} · ${cs.industry}`, {
      x: 1.1, y: ry + 0.38, w: W - 2.0, h: 0.22,
      fontSize: 8.5,
      color: C.muted,
    })

    // Tags
    cs.tags.slice(0, 4).forEach((tag, ti) => {
      slide.addShape(ShapeType.rect, {
        x: W - 0.6 - ti * 1.15, y: ry + 0.2, w: 1.05, h: 0.22,
        fill: { color: C.accentLight },
        line: { color: C.accentLight, width: 0 },
        rectRadius: 0.05,
      })
      slide.addText(tag, {
        x: W - 0.6 - ti * 1.15, y: ry + 0.2, w: 1.05, h: 0.22,
        fontSize: 6.5,
        color: C.accent,
        align: 'center',
        valign: 'middle',
      })
    })
  })
}

function addCaseStudySlide(prs: pptxgen, cs: CaseStudy, index: number) {
  const slide = prs.addSlide()
  slide.background = { color: C.white }
  header(slide, `Case Study ${String(index + 1).padStart(2, '0')} — ${cs.client}`)
  footer(slide)

  // Title
  slide.addText(cs.title, {
    x: 0.4, y: 0.72, w: W - 0.8, h: 0.5,
    fontSize: 16,
    bold: true,
    color: C.primary,
    wrap: true,
  })

  // Meta pills
  slide.addShape(ShapeType.rect, {
    x: 0.4, y: 1.28, w: 1.6, h: 0.26,
    fill: { color: C.accentLight },
    line: { color: C.accentLight, width: 0 },
    rectRadius: 0.05,
  })
  slide.addText(cs.industry, {
    x: 0.4, y: 1.28, w: 1.6, h: 0.26,
    fontSize: 7.5,
    color: C.accent,
    align: 'center',
    valign: 'middle',
    bold: true,
  })

  // Summary
  slide.addText(cs.summary, {
    x: 0.4, y: 1.65, w: W - 0.8, h: 0.55,
    fontSize: 9.5,
    color: C.muted,
    wrap: true,
    lineSpacingMultiple: 1.3,
  })

  // Slides / key content in 3 columns (Challenge / Solution / Results)
  const findSlide = (keywords: string[]) =>
    cs.slides.find(s =>
      keywords.some(k => s.title.toLowerCase().includes(k) || s.tags.includes(k))
    )

  const challenge = findSlide(['challenge', 'problem', 'background'])
  const solution  = findSlide(['solution', 'approach', 'architecture', 'technology'])
  const results   = findSlide(['result', 'outcome', 'impact'])

  const cols = [
    { label: 'Challenge', data: challenge, color: C.red },
    { label: 'Solution',  data: solution,  color: C.accent },
    { label: 'Results',   data: results,   color: C.green },
  ]

  const cw = (W - 0.8 - 0.4) / 3
  cols.forEach((col, i) => {
    const cx = 0.4 + i * (cw + 0.2)
    const cy = 2.38

    // Label bar
    slide.addShape(ShapeType.rect, {
      x: cx, y: cy, w: cw, h: 0.32,
      fill: { color: col.color },
      line: { color: col.color, width: 0 },
      rectRadius: 0.05,
    })
    slide.addText(col.label.toUpperCase(), {
      x: cx, y: cy, w: cw, h: 0.32,
      fontSize: 8,
      bold: true,
      color: C.white,
      align: 'center',
      valign: 'middle',
      charSpacing: 1,
    })

    // Content box
    slide.addShape(ShapeType.rect, {
      x: cx, y: cy + 0.32, w: cw, h: 2.65,
      fill: { color: C.offWhite },
      line: { color: C.border, width: 0.5 },
    })

    slide.addText(col.data?.content ?? 'Information available upon request.', {
      x: cx + 0.12, y: cy + 0.45, w: cw - 0.24, h: 2.4,
      fontSize: 9,
      color: C.bodyText,
      wrap: true,
      valign: 'top',
      lineSpacingMultiple: 1.35,
    })
  })
}

function addNextStepsSlide(prs: pptxgen, data: ProposalDeckData) {
  const slide = prs.addSlide()
  slide.background = { color: C.primary }
  footer(slide)

  // Accent bar top
  slide.addShape(ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.08,
    fill: { color: C.accent },
    line: { color: C.accent, width: 0 },
  })

  slide.addText('Thank You', {
    x: 0.5, y: 0.7, w: 9, h: 0.8,
    fontSize: 36,
    bold: true,
    color: C.white,
  })

  slide.addText(`We look forward to partnering with ${data.rfp.client}.`, {
    x: 0.5, y: 1.55, w: 7, h: 0.4,
    fontSize: 13,
    color: 'CBD5E1',
  })

  sectionLabel(slide, 'Proposed Next Steps', 0.5, 2.15, 4)

  const steps = [
    'Schedule a presentation session with your stakeholders',
    'Provide a detailed technical Q&A document',
    'Arrange reference calls with clients from comparable engagements',
    'Submit a refined commercial proposal',
  ]

  steps.forEach((step, i) => {
    slide.addShape(ShapeType.rect, {
      x: 0.5, y: 2.45 + i * 0.62, w: 0.32, h: 0.32,
      fill: { color: C.accent },
      line: { color: C.accent, width: 0 },
      rectRadius: 0.04,
    })
    slide.addText(String(i + 1), {
      x: 0.5, y: 2.45 + i * 0.62, w: 0.32, h: 0.32,
      fontSize: 9,
      bold: true,
      color: C.white,
      align: 'center',
      valign: 'middle',
    })
    slide.addText(step, {
      x: 0.95, y: 2.45 + i * 0.62, w: 5.5, h: 0.32,
      fontSize: 10,
      color: 'CBD5E1',
      valign: 'middle',
    })
  })

  // Right panel: deadline if present
  if (data.rfp.deadline) {
    slide.addShape(ShapeType.rect, {
      x: 7, y: 1.9, w: 2.7, h: 1.7,
      fill: { color: '243447' },
      line: { color: '334155', width: 0.5 },
      rectRadius: 0.08,
    })
    slide.addText('RFP DEADLINE', {
      x: 7, y: 2.0, w: 2.7, h: 0.28,
      fontSize: 7.5,
      bold: true,
      color: C.accent,
      align: 'center',
      charSpacing: 1.5,
    })
    slide.addText(new Date(data.rfp.deadline).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }), {
      x: 7, y: 2.32, w: 2.7, h: 0.95,
      fontSize: 14,
      bold: true,
      color: C.white,
      align: 'center',
      valign: 'middle',
      wrap: true,
    })
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a PPTX proposal deck and return it as a Node.js Buffer.
 */
export async function generateProposalDeck(data: ProposalDeckData): Promise<Buffer> {
  const prs = new pptxgen()

  prs.layout = 'LAYOUT_WIDE'
  prs.author = data.preparedBy ?? 'AI RFP Generator'
  prs.title  = data.title
  prs.subject = `Proposal — ${data.rfp.client}`

  addCoverSlide(prs, data)
  addExecutiveSummarySlide(prs, data)
  addRfpRequirementsSlide(prs, data)
  addProposedApproachSlide(prs)

  if (data.caseStudies.length) {
    addCaseStudiesIntroSlide(prs, data.caseStudies)
    data.caseStudies.forEach((cs, i) => addCaseStudySlide(prs, cs, i))
  }

  addNextStepsSlide(prs, data)

  const buffer = await prs.write({ outputType: 'nodebuffer' }) as Buffer
  return buffer
}
