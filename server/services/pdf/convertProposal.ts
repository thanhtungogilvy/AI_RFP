import { execFile as execFileCallback, execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { getServerEnvironment } from '../../utils/environment'

const execFile = promisify(execFileCallback)
const PDF_TIMEOUT_MS = 120_000

export function getPdfConverterPath(): string | null {
  const { pdfConverter, pdfConverterPath } = getServerEnvironment()
  if (pdfConverter !== 'libreoffice') return null
  return pdfConverterPath || 'soffice'
}

export function canExportPdf(): boolean {
  const converter = getPdfConverterPath()
  if (!converter) return false
  if (converter.includes('/') && !existsSync(converter)) return false
  try {
    execFileSync(converter, ['--version'], { timeout: 3_000, stdio: 'ignore', windowsHide: true })
    return true
  } catch {
    return false
  }
}

export async function convertPptxToPdf(pptx: Buffer): Promise<Buffer> {
  const converter = getPdfConverterPath()
  if (!converter) throw new Error('PDF export is not configured')
  const directory = await mkdtemp(join(tmpdir(), 'ai-rfp-pdf-'))
  const source = join(directory, 'proposal.pptx')
  const output = join(directory, 'proposal.pdf')
  try {
    await writeFile(source, pptx)
    await execFile(converter, ['--headless', '--convert-to', 'pdf', '--outdir', directory, source], {
      timeout: PDF_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    })
    return await readFile(output)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
