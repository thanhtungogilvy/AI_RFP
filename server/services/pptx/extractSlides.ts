import JSZip, { type JSZipObject } from 'jszip'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

export interface ExtractedSlide {
  slideNumber: number
  title: string
  content: string
}

type OrderedNode = Record<string, unknown>

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: false,
  processEntities: { enabled: true, maxEntityCount: 50, maxExpandedLength: 50_000 },
  maxNestedTags: 200,
})

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function slideNumber(entry: JSZipObject): number | null {
  const match = /^ppt\/slides\/slide(\d+)\.xml$/.exec(entry.name)
  return match ? Number(match[1]) : null
}

function textFromNode(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(textFromNode)
  if (!node || typeof node !== 'object') return []
  return Object.entries(node as OrderedNode).flatMap(([key, value]) => {
    if (key === 'a:t') return textFromNode(value)
    if (key === '#text' && typeof value === 'string') {
      const text = normalizeText(value)
      return text ? [text] : []
    }
    return textFromNode(value)
  })
}

function collectShapeNodes(node: unknown): unknown[] {
  if (Array.isArray(node)) return node.flatMap(collectShapeNodes)
  if (!node || typeof node !== 'object') return []

  return Object.entries(node as OrderedNode).flatMap(([key, value]) =>
    key === 'p:sp' ? [value] : collectShapeNodes(value),
  )
}

function isTitlePlaceholder(node: unknown): boolean {
  if (Array.isArray(node)) return node.some(isTitlePlaceholder)
  if (!node || typeof node !== 'object') return false

  const orderedNode = node as OrderedNode
  if ('p:ph' in orderedNode) {
    const attributes = orderedNode[':@']
    if (attributes && typeof attributes === 'object') {
      const type = (attributes as OrderedNode)['@_type']
      if (type === 'title' || type === 'ctrTitle') return true
    }
  }

  return Object.values(orderedNode).some(isTitlePlaceholder)
}

function parseSlide(xml: string, number: number): ExtractedSlide {
  const validation = XMLValidator.validate(xml)
  if (validation !== true) throw new Error(`Invalid slide XML at slide ${number}`)
  const ordered = parser.parse(xml) as OrderedNode[]
  const shapes = collectShapeNodes(ordered)
  const blocks = shapes.map(shape => textFromNode(shape).join(' ')).filter(Boolean)
  const titleShape = shapes.find(isTitlePlaceholder)
  return {
    slideNumber: number,
    title: titleShape ? textFromNode(titleShape).join(' ') : (blocks[0] ?? ''),
    content: blocks.join('\n'),
  }
}

export async function extractSlidesFromPptx(buffer: Buffer): Promise<ExtractedSlide[]> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    throw new Error('Invalid PPTX file')
  }

  const entries = Object.values(zip.files)
  const slideEntries = entries
    .map(entry => ({ entry, number: slideNumber(entry) }))
    .filter((item): item is { entry: JSZipObject; number: number } => item.number !== null)
    .sort((left, right) => left.number - right.number)

  if (!zip.file('[Content_Types].xml') || !zip.file('ppt/presentation.xml') || slideEntries.length === 0) {
    throw new Error('Invalid PPTX package')
  }

  const slides = await Promise.all(
    slideEntries.map(async ({ entry, number }) => parseSlide(await entry.async('string'), number)),
  )

  if (slides.every(slide => !slide.content)) throw new Error('PPTX contains no extractable text')
  return slides
}
