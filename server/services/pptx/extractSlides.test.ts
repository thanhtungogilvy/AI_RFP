import JSZip from 'jszip'
import pptxgen from 'pptxgenjs'
import { describe, expect, it } from 'vitest'
import { extractSlidesFromPptx } from './extractSlides'

async function makeDeck(slides: Array<Array<{ text: string; options?: Record<string, unknown> }>>) {
  const pptx = new pptxgen()
  for (const shapes of slides) {
    const slide = pptx.addSlide()
    for (const shape of shapes) slide.addText(shape.text, shape.options ?? {})
  }
  return Buffer.from(await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer)
}

describe('extractSlidesFromPptx', () => {
  it('extracts text in one-based slide order and detects a fallback title', async () => {
    const buffer = await makeDeck([
      [{ text: 'Overview', options: { x: 1, y: 1, w: 8, h: 1 } }, { text: 'First result', options: { x: 1, y: 2, w: 8, h: 1 } }],
      [{ text: 'Impact', options: { x: 1, y: 1, w: 8, h: 1 } }, { text: '42% faster', options: { x: 1, y: 2, w: 8, h: 1 } }],
    ])

    await expect(extractSlidesFromPptx(buffer)).resolves.toEqual([
      { slideNumber: 1, title: 'Overview', content: 'Overview\nFirst result' },
      { slideNumber: 2, title: 'Impact', content: 'Impact\n42% faster' },
    ])
  })

  it('retains a text-empty slide when another slide has text', async () => {
    const buffer = await makeDeck([[], [{ text: 'Evidence' }]])
    const slides = await extractSlidesFromPptx(buffer)
    expect(slides).toHaveLength(2)
    expect(slides[0]).toEqual({ slideNumber: 1, title: '', content: '' })
  })

  it('uses a title placeholder instead of the first body shape', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
    zip.file('ppt/presentation.xml', '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>')
    zip.file('ppt/slides/slide1.xml', `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree>
          <p:sp><p:nvSpPr><p:nvPr/></p:nvSpPr><p:txBody><a:p><a:r><a:t>Body first</a:t></a:r></a:p></p:txBody></p:sp>
          <p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Declared title</a:t></a:r></a:p></p:txBody></p:sp>
        </p:spTree></p:cSld>
      </p:sld>
    `)

    await expect(extractSlidesFromPptx(await zip.generateAsync({ type: 'nodebuffer' }))).resolves.toEqual([
      { slideNumber: 1, title: 'Declared title', content: 'Body first\nDeclared title' },
    ])
  })

  it('rejects corrupt zip data', async () => {
    await expect(extractSlidesFromPptx(Buffer.from('not-a-zip'))).rejects.toThrow('Invalid PPTX file')
  })

  it('rejects a zip that is not an OOXML presentation', async () => {
    const zip = new JSZip()
    zip.file('readme.txt', 'hello')
    await expect(extractSlidesFromPptx(await zip.generateAsync({ type: 'nodebuffer' }))).rejects.toThrow('Invalid PPTX package')
  })

  it('rejects a deck with no extractable text', async () => {
    await expect(extractSlidesFromPptx(await makeDeck([[]]))).rejects.toThrow('PPTX contains no extractable text')
  })
})
