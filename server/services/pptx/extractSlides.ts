import JSZip, { type JSZipObject } from 'jszip'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

export interface ExtractedSlide {
  slideNumber: number
  title: string
  content: string
}

type OrderedNode = Record<string, unknown>
type SizedZipObject = JSZipObject & { _data?: { uncompressedSize?: number } }

const MAX_SLIDES = 500
const MAX_SLIDE_XML_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_SLIDE_XML_BYTES = 50 * 1024 * 1024
const MAX_CONTROL_XML_BYTES = 1024 * 1024

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: false,
  processEntities: { enabled: true, maxEntityCount: 50, maxExpandedLength: 50_000 },
  maxNestedTags: 200,
})

function invalidPackage(): never {
  throw new Error('Invalid PPTX package')
}

export function validateSlideResourceLimits(sizes: number[]): void {
  if (sizes.length > MAX_SLIDES) invalidPackage()
  let total = 0
  for (const size of sizes) {
    if (!Number.isFinite(size) || size < 0 || size > MAX_SLIDE_XML_BYTES) invalidPackage()
    total += size
    if (total > MAX_TOTAL_SLIDE_XML_BYTES) invalidPackage()
  }
}

export async function expandControlXml(entry: SizedZipObject): Promise<string> {
  const metadataSize = entry._data?.uncompressedSize
  if (!Number.isFinite(metadataSize) || (metadataSize as number) < 0 || (metadataSize as number) > MAX_CONTROL_XML_BYTES) invalidPackage()
  const xml = await entry.async('string')
  if (Buffer.byteLength(xml) > MAX_CONTROL_XML_BYTES) invalidPackage()
  return xml
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
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

function containsKey(node: unknown, wanted: string): boolean {
  if (Array.isArray(node)) return node.some(item => containsKey(item, wanted))
  if (!node || typeof node !== 'object') return false
  return Object.entries(node as OrderedNode).some(([key, value]) => key === wanted || containsKey(value, wanted))
}

function collectTextContainers(node: unknown): unknown[] {
  if (Array.isArray(node)) return node.flatMap(collectTextContainers)
  if (!node || typeof node !== 'object') return []
  const result: unknown[] = []
  for (const [key, value] of Object.entries(node as OrderedNode)) {
    if (key === 'p:sp' || (key === 'p:graphicFrame' && containsKey(value, 'a:tbl'))) result.push(value)
    else result.push(...collectTextContainers(value))
  }
  return result
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

function parseOrderedXml(xml: string): OrderedNode[] {
  if (XMLValidator.validate(xml) !== true) invalidPackage()
  return parser.parse(xml) as OrderedNode[]
}

function recordsWithKey(node: unknown, key: string): OrderedNode[] {
  if (Array.isArray(node)) return node.flatMap(item => recordsWithKey(item, key))
  if (!node || typeof node !== 'object') return []
  const record = node as OrderedNode
  return [
    ...(key in record ? [record] : []),
    ...Object.values(record).flatMap(value => recordsWithKey(value, key)),
  ]
}

function attributes(record: OrderedNode): OrderedNode {
  const value = record[':@']
  return value && typeof value === 'object' ? value as OrderedNode : {}
}

function presentationSlidePaths(presentationXml: string, relationshipsXml: string): string[] {
  const ids = recordsWithKey(parseOrderedXml(presentationXml), 'p:sldId')
    .map(record => attributes(record)['@_r:id'])
  if (!ids.length || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) invalidPackage()

  const relationships = new Map<string, string>()
  for (const record of recordsWithKey(parseOrderedXml(relationshipsXml), 'Relationship')) {
    const attrs = attributes(record)
    if (attrs['@_Type'] !== 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide') continue
    const id = attrs['@_Id']
    const target = attrs['@_Target']
    if (typeof id !== 'string' || typeof target !== 'string' || attrs['@_TargetMode'] === 'External'
      || !/^slides\/slide\d+\.xml$/.test(target) || relationships.has(id)) invalidPackage()
    relationships.set(id, `ppt/${target}`)
  }
  const paths = ids.map(id => relationships.get(id as string))
  if (paths.some(path => !path) || new Set(paths).size !== paths.length) invalidPackage()
  return paths as string[]
}

function parseSlide(xml: string, number: number): ExtractedSlide {
  const validation = XMLValidator.validate(xml)
  if (validation !== true) throw new Error(`Invalid slide XML at slide ${number}`)
  const containers = collectTextContainers(parser.parse(xml) as OrderedNode[])
  const blocks = containers.map(container => textFromNode(container).join(' ')).filter(Boolean)
  const titleShape = containers.find(isTitlePlaceholder)
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

  const contentTypes = zip.file('[Content_Types].xml')
  const presentation = zip.file('ppt/presentation.xml')
  const presentationRels = zip.file('ppt/_rels/presentation.xml.rels')
  if (!contentTypes || !presentation || !presentationRels) invalidPackage()

  const paths = presentationSlidePaths(
    await expandControlXml(presentation as SizedZipObject),
    await expandControlXml(presentationRels as SizedZipObject),
  )
  const entries = paths.map(path => zip.file(path))
  if (entries.some(entry => !entry)) invalidPackage()
  validateSlideResourceLimits(entries.map(entry => (entry as SizedZipObject)._data?.uncompressedSize ?? Number.NaN))

  const slides: ExtractedSlide[] = []
  let actualTotal = 0
  for (const [index, entry] of entries.entries()) {
    const xml = await (entry as JSZipObject).async('string')
    const size = Buffer.byteLength(xml)
    validateSlideResourceLimits([size])
    actualTotal += size
    if (actualTotal > MAX_TOTAL_SLIDE_XML_BYTES) invalidPackage()
    slides.push(parseSlide(xml, index + 1))
  }

  if (slides.every(slide => !slide.content)) throw new Error('PPTX contains no extractable text')
  return slides
}
