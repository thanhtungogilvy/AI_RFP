import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'
import { PDFParse } from 'pdf-parse'

const xmlParser = new XMLParser({ ignoreAttributes: false })

function values(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  if (Array.isArray(node)) return node.flatMap(values)
  if (!node || typeof node !== 'object') return []
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => key === 'w:t' ? values(value) : values(value))
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const document = zip.file('word/document.xml')
  if (!document) throw new Error('Invalid DOCX file')
  return values(xmlParser.parse(await document.async('string'))).join(' ').replace(/\s+/g, ' ').trim()
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  try {
    return (await parser.getText()).text.replace(/\s+/g, ' ').trim()
  } finally {
    await parser.destroy()
  }
}

export async function extractRfpText(buffer: Buffer, fileName: string): Promise<string> {
  const name = fileName.toLowerCase()
  const text = name.endsWith('.pdf') ? await extractPdf(buffer)
    : name.endsWith('.docx') ? await extractDocx(buffer)
      : ''
  if (!text) throw new Error('The RFP document contains no extractable text')
  return text
}
