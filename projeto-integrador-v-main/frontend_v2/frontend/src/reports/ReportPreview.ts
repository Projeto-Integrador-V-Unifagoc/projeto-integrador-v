export function previewPdf(doc: any) {
  const blobUrl = doc.output('bloburl')
  window.open(blobUrl, '_blank')
}
