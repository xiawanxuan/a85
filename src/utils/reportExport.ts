export function exportAsHTML(): void {
  const reportEl = document.getElementById('report-content')
  if (!reportEl) return

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>XRF溯源分析报告</title>
<style>
body{font-family:'Noto Serif SC',serif;background:#F5F0E8;color:#2C2C2C;max-width:960px;margin:0 auto;padding:24px}
h1{color:#8B7355;border-bottom:2px solid #D4C9B8;padding-bottom:8px}
table{width:100%;border-collapse:collapse;margin:16px 0}
th,td{border:1px solid #D4C9B8;padding:8px 12px;text-align:left}
th{background:#EDE6D8;color:#6B5B4E}
tr:nth-child(even){background:#FAF7F0}
</style>
</head>
<body>
${reportEl.innerHTML}
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `XRF报告_${new Date().toISOString().slice(0, 10)}.html`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportAsPNG(svgElement: SVGSVGElement | null): void {
  if (!svgElement) return

  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svgElement)
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const scale = 2
    canvas.width = svgElement.clientWidth * scale
    canvas.height = svgElement.clientHeight * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(scale, scale)
    ctx.fillStyle = '#F5F0E8'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    canvas.toBlob(blob => {
      if (!blob) return
      const pngUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `PCA散点图_${new Date().toISOString().slice(0, 10)}.png`
      a.click()
      URL.revokeObjectURL(pngUrl)
    })
    URL.revokeObjectURL(url)
  }
  img.src = url
}
