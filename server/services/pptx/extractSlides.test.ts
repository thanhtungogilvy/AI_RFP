import JSZip from 'jszip'
import pptxgen from 'pptxgenjs'
import { describe, expect, it, vi } from 'vitest'
import { expandControlXml, extractSlidesFromPptx, validateSlideResourceLimits } from './extractSlides'

function addPresentation(zip: JSZip, slideTargets: string[]) {
  zip.file('ppt/presentation.xml', `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>${slideTargets.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 1}"/>`).join('')}</p:sldIdLst></p:presentation>`)
  zip.file('ppt/_rels/presentation.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${slideTargets.map((target, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="${target}"/>`).join('')}</Relationships>`)
}

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
    addPresentation(zip, ['slides/slide1.xml'])
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

  it('uses presentation relationship order rather than slide filenames', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
    addPresentation(zip, ['slides/slide5.xml', 'slides/slide0.xml'])
    const slideXml = (text: string) => `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
      </p:sld>
    `
    zip.file('ppt/slides/slide5.xml', slideXml('Later'))
    zip.file('ppt/slides/slide0.xml', slideXml('Earlier'))

    const slides = await extractSlidesFromPptx(await zip.generateAsync({ type: 'nodebuffer' }))

    expect(slides.map(slide => slide.slideNumber)).toEqual([1, 2])
    expect(slides.map(slide => slide.content)).toEqual(['Later', 'Earlier'])
  })

  it('extracts table-only text in cell and run order', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
    addPresentation(zip, ['slides/slide1.xml'])
    zip.file('ppt/slides/slide1.xml', `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:graphicFrame><a:graphic><a:graphicData><a:tbl><a:tr><a:tc><a:txBody><a:p><a:r><a:t>Client</a:t></a:r><a:r><a:t> Name</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>Acme</a:t></a:r></a:p></a:txBody></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame></p:spTree></p:cSld></p:sld>`)
    await expect(extractSlidesFromPptx(await zip.generateAsync({ type: 'nodebuffer' }))).resolves.toEqual([
      { slideNumber: 1, title: 'Client Name Acme', content: 'Client Name Acme' },
    ])
  })

  it('rejects slide counts and expanded sizes over parser limits', () => {
    expect(() => validateSlideResourceLimits(Array.from({ length: 501 }, () => 1))).toThrow('Invalid PPTX package')
    expect(() => validateSlideResourceLimits([5 * 1024 * 1024 + 1])).toThrow('Invalid PPTX package')
    expect(() => validateSlideResourceLimits(Array.from({ length: 11 }, () => 5 * 1024 * 1024))).toThrow('Invalid PPTX package')
  })

  it.each(['ppt/presentation.xml', 'ppt/_rels/presentation.xml.rels'])('rejects compressed oversized control XML metadata for %s', async (path) => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types/>')
    addPresentation(zip, ['slides/slide1.xml'])
    zip.file('ppt/slides/slide1.xml', '<p:sld/>')
    zip.file(path, 'a'.repeat(1024 * 1024 + 1))
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    await expect(extractSlidesFromPptx(buffer)).rejects.toThrow('Invalid PPTX package')
  })

  it('rejects oversized control metadata before expansion', async () => {
    const async = vi.fn()
    await expect(expandControlXml({ _data: { uncompressedSize: 1024 * 1024 + 1 }, async } as any)).rejects.toThrow('Invalid PPTX package')
    expect(async).not.toHaveBeenCalled()
  })

  it('rejects actual expanded control XML over the metadata limit', async () => {
    const entry = { _data: { uncompressedSize: 1 }, async: vi.fn().mockResolvedValue('a'.repeat(1024 * 1024 + 1)) }
    await expect(expandControlXml(entry as any)).rejects.toThrow('Invalid PPTX package')
  })

  it.each([
    ['missing', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'],
    ['external', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="https://example.com/slide.xml" TargetMode="External"/></Relationships>'],
  ])('rejects %s presentation slide relationships', async (_, relationships) => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types/>')
    zip.file('ppt/presentation.xml', '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId r:id="rId1"/></p:sldIdLst></p:presentation>')
    zip.file('ppt/_rels/presentation.xml.rels', relationships)
    zip.file('ppt/slides/slide1.xml', '<p:sld/>')
    await expect(extractSlidesFromPptx(await zip.generateAsync({ type: 'nodebuffer' }))).rejects.toThrow('Invalid PPTX package')
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
