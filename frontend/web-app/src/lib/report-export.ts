import type { ScenarioResult } from './scenario-schema';
import { decisionFlowDefinition, mermaidThemeVariables } from './scenario-visuals';

const paper = 'F3F6FB', blue = '4D7FFF', moss = '6E9274', muted = 'AAB4C3';
type Pdf = import('jspdf').jsPDF;
export async function exportScenarioPdf(result: ScenarioResult) {
  (await buildScenarioPdf(result)).save(`${slug(result.briefTitle)}.pdf`);
}
export async function createScenarioPdfBlob(result: ScenarioResult) {
  return (await buildScenarioPdf(result)).output('blob');
}
export async function buildScenarioPdf(result: ScenarioResult) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const w = pdf.internal.pageSize.getWidth(), h = pdf.internal.pageSize.getHeight();
  const m = 50, cw = w - 2 * m, top = 82, bottom = h - 65;
  let y = top, tableNo = 0, figureNo = 0;
  const framed = new Set<number>();
  pdf.setProperties({ title: pdfSafe(result.briefTitle), subject: pdfSafe(result.request.focalQuestion), author: 'Scenario Development Process', creator: 'SDP', keywords: 'scenario planning, evidence, strategy' });
  const frame = () => {
    const page = pdf.getCurrentPageInfo().pageNumber;
    if (framed.has(page)) return;
    framed.add(page);
    pdf.setFillColor(0,0,0); pdf.setTextColor(0); pdf.setDrawColor(180); pdf.setLineWidth(0.4);
    drawSdpMark(pdf, m, 27, 0.72);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.text('SDP', m + 34, 38);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.text('Scenario Development Process', m + 34, 49);
    pdf.text(new Date(result.createdAt).toLocaleDateString('en-GB'), w - m, 39, { align: 'right' });
    pdf.line(m, 61, w - m, 61);
  };
  const next = () => { pdf.addPage(); frame(); y = top; };
  const ensure = (space: number) => { if (y + space > bottom) next(); };
  frame();
  // Baselines, not box guesses: split long paragraphs with at least three
  // continuation lines. The footer zone is never available to body content.
  function paragraph(text: string, size = 10, after = 10, bold = false) {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(0);
    const lines = pdf.splitTextToSize(pdfSafe(text), cw) as string[];
    const lh = size * 1.42;
    let position = 0;
    while (position < lines.length) {
      let fit = Math.floor((bottom - y - size * 0.35) / lh) + 1;
      const remaining = lines.length - position;
      if (fit < Math.min(3, remaining)) { next(); fit = Math.floor((bottom - y - size * 0.35) / lh) + 1; }
      fit = Math.min(fit, remaining);
      if (remaining > fit && remaining - fit < 3) fit -= 3 - (remaining - fit);
      if (fit <= 0) { next(); continue; }
      pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(0);
      pdf.text(lines.slice(position, position + fit), m, y, { lineHeightFactor: 1.42 });
      y += fit * lh; position += fit;
      if (position < lines.length) next();
    }
    y += after;
  }
  function heading(number: string, title: string) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15);
    const lines = pdf.splitTextToSize(pdfSafe(`${number}  ${title}`), cw) as string[];
    ensure(lines.length * 21 + 65);
    y += 10; pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.setTextColor(0);
    pdf.text(lines, m, y, {lineHeightFactor:1.4});
    y += (lines.length-1)*21+10;
    pdf.setDrawColor(150); pdf.setLineWidth(0.4); pdf.line(m, y, w - m, y); y += 20;
  }
  function label(title: string, text: string) {
    ensure(65); paragraph(title, 10, 3, true); paragraph(text);
  }
  function caption(type: 'Table' | 'Figure', title: string) {
    paragraph(`${type} ${type === 'Table' ? ++tableNo : ++figureNo}. ${title}`, 9, 7, true);
  }
  function table(title: string, head: string[], rows: string[][], widths: Record<number, number> = {}) {
    // Caption, header and first complete row stay together.
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
    const firstHeight = rows.length ? Math.max(...rows[0].map((cell, i) => (pdf.splitTextToSize(pdfSafe(cell), (widths[i] ?? cw / head.length) - 12) as string[]).length)) * 12.5 + 14 : 25;
    ensure(Math.min(140, firstHeight + 52));
    caption('Table', title);
    autoTable(pdf, {
      startY: y, head: [head.map(pdfSafe)], body: rows.map((r) => r.map(pdfSafe)), theme: 'plain',
      margin: { left: m, right: m, top, bottom: h - bottom }, showHead: 'everyPage', rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: 0, fillColor: false, lineColor: 190, lineWidth: { bottom: 0.25 }, overflow: 'linebreak', valign: 'top', minCellHeight: 25 },
      headStyles: { fillColor: false, textColor: 0, fontStyle: 'bold', lineColor: 0, lineWidth: { bottom: 0.6 } },
      bodyStyles: { fillColor: false }, alternateRowStyles: { fillColor: false },
      columnStyles: Object.fromEntries(Object.entries(widths).map(([key, cellWidth]) => [key, { cellWidth }])),
      didDrawPage: frame,
    });
    y = (pdf as Pdf & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  }
  const cite = (text: string, ids: number[]) => {
    const missing = ids.filter((id) => !new RegExp(`\\[${id}\\]`).test(text));
    return text + (missing.length ? ' ' + missing.map((id) => `[${id}]`).join('') : '');
  };
  paragraph('DECISION BRIEF', 9, 8, true);
  paragraph(result.briefTitle, 23, 13, true);
  paragraph(cite(result.executiveSummary, result.executiveSummarySourceIds), 11, 16);
  table('Decision frame — supplied by the client', ['Field', 'Definition'], [
    ['Organization', result.request.organization], ['Industry', result.request.industry], ['Geography', result.request.region],
    ['Horizon', String(result.request.horizonYear)], ['Decision question', result.request.focalQuestion],
  ], { 0: 112, 1: cw - 112 });
  label('Client context (not independently verified)', result.request.strategicContext);
  paragraph('Purpose: explore conditional decision environments, identify testable assumptions and choose robust actions. This is not a forecast or an assurance of future outcomes.', 9);

  heading('1', 'Architecture and scenario set');
  ensure(145); caption('Figure', 'Decision logic — framing, evidence and response');
  const flow = await renderMermaidPng();
  if (flow) {
    const fh = Math.min(104, cw * flow.height / flow.width);
    const fw = fh * flow.width / flow.height;
    pdf.addImage(flow.data, 'PNG', m + (cw - fw) / 2, y, fw, fh); y += fh + 15;
  } else { drawDecisionFlow(pdf, m, y, cw); y += 85; }
  table('Scenario overview (conditional alternatives)', ['No.', 'Scenario and thesis', 'Weight / sensitivity'], result.scenarios.map((s, i) => [String(i + 1), `${s.title}\n${cite(s.thesis, s.sourceIds)}`, weightLabel(s)]), { 0: 30, 1: cw - 140, 2: 110 });

  heading('2', 'Drivers and strategic field');
  table('Driver assessment', ['Driver', 'Assessment and evidence', 'Impact / uncertainty'], result.drivers.map((d) => [d.name, cite(d.assessment, d.sourceIds), `${d.impact} / ${d.uncertainty}\nDirection: ${d.direction}`]), { 0: 100, 1: cw - 195, 2: 95 });
  ensure(285); caption('Figure', 'Strategic field — qualitative relative positions');
  drawStrategicField(pdf, result, m, y, cw, 205); y += 228;
  paragraph('Numbers identify the scenarios in Table 2. Coordinates represent analytical judgments, not measured observations.', 9);
  ensure(190); caption('Figure', 'Conditional scenario weights and sensitivity');
  drawPlanningWeights(pdf, result, m, y, cw); y += 124;
  paragraph(result.probabilityMethod ?? 'Legacy planning weights: these estimates were not calculated from a verified evidence matrix and must not be interpreted as statistical probabilities.', 9);

  result.scenarios.forEach((s, i) => {
    heading(`3.${i + 1}`, `Scenario ${i + 1}: ${s.title}`);
    label('Conditional planning weight', weightLabel(s));
    paragraph(cite(s.thesis, s.sourceIds), 10, 10, true);
    label('Conditional narrative', cite(s.narrative, s.sourceIds));
    table('Assumptions, monitoring and response options', ['Category', 'Item'], [
      ...s.keyDrivers.map((t) => ['Driver premise', cite(t, s.sourceIds)]),
      ...s.signposts.map((t) => ['Monitoring proposal', t]),
      ...s.strategicMoves.map((t) => ['Proposed response', t]),
    ], { 0: 113, 1: cw - 113 });
    label('Avoid', s.avoid);
  });

  heading('4', 'Robust action plan');
  table('Actions and their supporting premises', ['No. / timing', 'Action', 'Rationale'], result.robustActions.map((a,i) => [`A${i+1}\n${a.timing}`, a.action, cite(a.rationale, a.sourceIds)]), { 0: 76, 1: 153, 2: cw - 229 });
  ensure(130); caption('Figure', 'Action sequence — references to action numbers in the preceding table');
  drawActionTimeline(pdf, result, m, y, cw); y += 70;
  paragraph('Before execution, assign an accountable owner, review date and observable completion criterion to each selected action.', 9);

  heading('5', 'Unknowns and alternative interpretation');
  table('Research and monitoring gaps', ['No.', 'Question'], result.criticalUnknowns.map((t, i) => [String(i + 1), t]), { 0: 32, 1: cw - 32 });
  label('Alternative interpretation', cite(result.dissent, result.dissentSourceIds));
  heading('6', 'Evidence and assessment method');
  paragraph(result.evidence?.methodology ?? 'This saved analysis predates live source verification. Its factual assertions have not been independently checked and no external references have been invented for it.', 9);
  if (result.evidence) {
    table('Accepted evidence ledger', ['Claim', 'Supported assertion', 'References'], result.evidence.claims.filter((c) => c.verdict === 'accepted').map((c) => [String(c.id), c.text, c.sourceIds.map((id) => `[${id}]`).join(' ')]), { 0: 38, 1: cw - 105, 2: 67 });
    const commonFactors = result.scenarios[0].evidenceFactors;
    if (commonFactors.length) {
      table('Conditional likelihood inputs (judgments, not measured frequencies)', ['Claim', ...result.scenarios.map((_, i) => `S${i + 1}`)], commonFactors.map((f) => [`Claim ${f.claimId}`, ...result.scenarios.map((s) => String(s.evidenceFactors.find((v) => v.claimId === f.claimId)?.likelihood ?? '—'))]), { 0: 95, 1: (cw - 95) / 4, 2: (cw - 95) / 4, 3: (cw - 95) / 4, 4: (cw - 95) / 4 });
      result.scenarios.forEach((s, i) => label(`Scenario ${i + 1}: likelihood reasoning`, s.evidenceFactors.map((f) => `Claim ${f.claimId}: ${f.rationale}`).join(' ')));
    }
    const disputed = result.evidence.claims.filter((c) => c.verdict !== 'accepted');
    if (disputed.length) table('Excluded claims — not relied on as facts', ['Claim / status', 'Reason for exclusion'], disputed.map((c) => [`${c.id} / ${c.verdict}`, c.reason]), { 0: 110, 1: cw - 110 });
  }
  paragraph('Limitations: source verification and independent challenge reduce error but cannot guarantee correctness. Evidence may be incomplete or become outdated. Conditional likelihoods are analyst judgments; sensitivity ranges are not empirical confidence intervals. Re-run research when material evidence or the decision changes.', 9);
  if (result.evidence?.references.length) { heading('7', 'References'); result.evidence.references.forEach((r) => {
    ensure(70);
    paragraph(`[${r.id}] ${r.title}. ${r.publisher}. Accessed ${new Date(r.accessedAt).toLocaleDateString('en-GB')}.`, 9, 3);
    paragraph(r.url, 8.5, 13);
  }); }
  // Add footers once all content is paginated, including table continuation pages.
  const count = pdf.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    pdf.setPage(page); frame();
    pdf.setDrawColor(180); pdf.setLineWidth(0.4); pdf.line(m, h - 43, w - m, h - 43);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(0);
    const name = pdf.splitTextToSize(pdfSafe(result.request.organization), cw - 100)[0] as string;
    pdf.text(`${name} | SDP`, m, h - 27);
    pdf.text(`${page} / ${count}`, w - m, h - 27, { align: 'right' });
  }
  return pdf;
}
function weightLabel(s: ScenarioResult['scenarios'][number]) {
  return `${s.probability.toFixed(1)}%${s.probabilityRange ? `\nSensitivity: ${s.probabilityRange[0].toFixed(1)}–${s.probabilityRange[1].toFixed(1)}%` : '\nUncalibrated legacy weight'}`;
}
function drawSdpMark(pdf: Pdf, x: number, y: number, scale: number) {
  // Exact shared 38x34 brand geometry; three separate bars, one baseline.
  const polygons = [[[2,30],[7.2,17],[13.2,17],[8,30]], [[11.2,30],[19.6,9],[25.6,9],[17.2,30]], [[20.4,30],[31.6,2],[37.6,2],[26.4,30]]];
  pdf.setFillColor(0,0,0);
  polygons.forEach((p) => pdf.lines(p.slice(1).map((v,i) => [v[0]-p[i][0],v[1]-p[i][1]]), x+p[0][0]*scale, y+p[0][1]*scale, [scale,scale], 'F', true));
}
function drawDecisionFlow(pdf: Pdf, x: number, y: number, width: number) {
  const labels = ['Decision frame', 'Verified evidence', 'Challenge facts', 'Four scenarios', 'Robust actions'];
  const gap = 11, bw = (width - gap * 4) / 5;
  pdf.setDrawColor(0); pdf.setTextColor(0); pdf.setFont('helvetica','normal'); pdf.setFontSize(8); pdf.setLineWidth(0.6);
  labels.forEach((text,i) => {
    const px=x+i*(bw+gap); pdf.rect(px,y+9,bw,46);
    pdf.text(pdf.splitTextToSize(text,bw-12),px+bw/2,y+28,{align:'center',lineHeightFactor:1.3});
    if(i<4) { pdf.line(px+bw,y+32,px+bw+gap-2,y+32); pdf.line(px+bw+gap-5,y+29,px+bw+gap-2,y+32); pdf.line(px+bw+gap-5,y+35,px+bw+gap-2,y+32); }
  });
}
function drawStrategicField(pdf: Pdf, result: ScenarioResult, x: number, y: number, width: number, height: number) {
  const axes=result.strategicAxes; const px=x+58, py=y+29, pw=width-116, ph=height-61;
  pdf.setDrawColor(170); pdf.setLineWidth(0.4); pdf.rect(px,py,pw,ph);
  pdf.line(px+pw/2,py,px+pw/2,py+ph); pdf.line(px,py+ph/2,px+pw,py+ph/2);
  pdf.setTextColor(0); pdf.setFont('helvetica','normal'); pdf.setFontSize(8);
  pdf.text(pdf.splitTextToSize(pdfSafe(axes.yHigh),width),x+width/2,y+10,{align:'center'});
  pdf.text(pdf.splitTextToSize(pdfSafe(axes.yLow),width),x+width/2,y+height+10,{align:'center'});
  pdf.text(pdf.splitTextToSize(pdfSafe(axes.xLow),pw/2-8),px,py+ph+14);
  pdf.text(pdf.splitTextToSize(pdfSafe(axes.xHigh),pw/2-8),px+pw,py+ph+14,{align:'right'});
  result.scenarios.forEach((s,i) => {
    const cx=px+pw*s.coordinates.x/100,cy=py+ph*(1-s.coordinates.y/100);
    pdf.setDrawColor(0); pdf.setFillColor(255,255,255); pdf.circle(cx,cy,9,'FD');
    pdf.setFont('helvetica','bold'); pdf.text(String(i+1),cx,cy+3,{align:'center'});
  });
}
function drawPlanningWeights(pdf: Pdf,result: ScenarioResult,x:number,y:number,width:number) {
  const left=x+32,track=width-112;
  pdf.setDrawColor(140); pdf.setLineWidth(0.4); pdf.setTextColor(0); pdf.setFont('helvetica','normal'); pdf.setFontSize(8);
  [0,25,50,75,100].forEach((v) => { const px=left+track*v/100; pdf.line(px,y,px,y+99); pdf.text(String(v),px,y+112,{align:'center'}); });
  result.scenarios.forEach((s,i) => {
    const cy=y+12+i*24; pdf.text(`S${i+1}`,x,cy+3);
    pdf.setFillColor(220,220,220); pdf.setDrawColor(0); pdf.rect(left,cy-4,track*s.probability/100,8,'FD');
    if(s.probabilityRange) { const a=left+track*s.probabilityRange[0]/100,b=left+track*s.probabilityRange[1]/100; pdf.line(a,cy,b,cy); pdf.line(a,cy-7,a,cy+7); pdf.line(b,cy-7,b,cy+7); }
    pdf.text(`${s.probability.toFixed(1)}%`,x+width,cy+3,{align:'right'});
  });
}
function drawActionTimeline(pdf: Pdf,result:ScenarioResult,x:number,y:number,width:number) {
  const timings=['now','next 90 days','this year'] as const, gap=18,bw=(width-gap*2)/3;
  pdf.setTextColor(0); pdf.setDrawColor(0); pdf.setLineWidth(0.6); pdf.setFontSize(9);
  timings.forEach((timing,i) => {
    const px=x+i*(bw+gap); pdf.rect(px,y,bw,50);
    pdf.setFont('helvetica','bold'); pdf.text(timing.toUpperCase(),px+8,y+16);
    pdf.setFont('helvetica','normal');
    const ids=result.robustActions.flatMap((a,j)=>a.timing===timing?[`A${j+1}`]:[]);
    pdf.text(ids.length?ids.join(', '):'No action assigned',px+8,y+35);
    if(i<2) pdf.line(px+bw,y+25,px+bw+gap,y+25);
  });
}
async function renderMermaidPng() {
  if(typeof window==='undefined'||typeof document==='undefined') return null;
  try {
    const {default:mermaid}=await import('mermaid');
    mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'base',themeVariables:mermaidThemeVariables,flowchart:{htmlLabels:false,curve:'linear',nodeSpacing:24,rankSpacing:32}});
    const rendered=await mermaid.render(`pdf-flow-${crypto.randomUUID()}`,decisionFlowDefinition);
    const svg=new DOMParser().parseFromString(rendered.svg,'image/svg+xml').documentElement;
    const vb=(svg.getAttribute('viewBox')??'0 0 1000 200').split(/\s+/).map(Number);
    const width=vb[2],height=vb[3];
    svg.setAttribute('width',String(width)); svg.setAttribute('height',String(height));
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
    try {
      const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});
      const canvas=document.createElement('canvas'); canvas.width=Math.ceil(width*2); canvas.height=Math.ceil(height*2);
      const ctx=canvas.getContext('2d');if(!ctx)return null;
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      return {data:canvas.toDataURL('image/png'),width,height};
    }finally{URL.revokeObjectURL(url);}
  } catch { return null; }
}
function pdfSafe(value:string) {
  return value.replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-').replace(/[\u2022\u00b7]/g,'-').replace(/\u2026/g,'...').replace(/[^\S\n]+/g,' ').trim();
}

export async function exportScenarioPptx(result: ScenarioResult) {
  const pptxModule = await import('pptxgenjs');
  const PptxGenJS = pptxModule.default;
  const deck = new PptxGenJS();
  deck.layout = 'LAYOUT_WIDE';
  deck.author = 'SDP';
  deck.subject = result.request.focalQuestion;
  deck.title = result.briefTitle;
  deck.company = result.request.organization;
  deck.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos',
  };

  const addFrame = (slide: ReturnType<typeof deck.addSlide>) => {
    slide.background = { color: '000000' };
    slide.addText('SDP', { x: 0.55, y: 0.28, w: 0.6, h: 0.2, fontFace: 'Aptos', fontSize: 9, bold: true, color: paper, margin: 0 });
  };

  let slide = deck.addSlide();
  addFrame(slide);
  slide.addText(result.briefTitle, { x: 0.7, y: 1.4, w: 11.4, h: 1.3, fontSize: 31, bold: true, color: paper, breakLine: false, margin: 0 });
  slide.addText(result.executiveSummary, { x: 0.72, y: 3.0, w: 9.9, h: 1.5, fontSize: 15, color: muted, breakLine: false, margin: 0.02 });
  slide.addText(`${result.request.organization}  •  ${result.request.region}  •  ${result.request.horizonYear}`, { x: 0.72, y: 6.45, w: 8, h: 0.3, fontSize: 10, color: blue, margin: 0 });

  result.scenarios.forEach((scenario, index) => {
    slide = deck.addSlide();
    addFrame(slide);
    slide.addText(`Scenario ${index + 1}`, { x: 0.55, y: 0.65, w: 1.5, h: 0.3, fontSize: 10, bold: true, color: index % 2 === 0 ? blue : moss, margin: 0 });
    slide.addText(scenario.title, { x: 0.55, y: 1.05, w: 9.7, h: 0.65, fontSize: 27, bold: true, color: paper, margin: 0 });
    slide.addText(`${scenario.probability}%`, { x: 11.2, y: 1.02, w: 1.1, h: 0.6, fontSize: 24, bold: true, color: paper, align: 'right', margin: 0 });
    slide.addText(scenario.thesis, { x: 0.58, y: 1.95, w: 11.7, h: 0.6, fontSize: 14, color: 'DCE3ED', margin: 0 });
    slide.addText(scenario.narrative, { x: 0.58, y: 2.75, w: 7.35, h: 2.8, fontSize: 12, color: muted, breakLine: false, valign: 'top', margin: 0.02 });
    slide.addText('Signals', { x: 8.35, y: 2.75, w: 1.2, h: 0.3, fontSize: 11, bold: true, color: paper, margin: 0 });
    slide.addText(scenario.signposts.map((text) => ({ text, options: { bullet: true, breakLine: true } })), { x: 8.35, y: 3.15, w: 4.25, h: 1.35, fontSize: 10, color: muted, margin: 0.04 });
    slide.addText('Strategic moves', { x: 8.35, y: 4.85, w: 2, h: 0.3, fontSize: 11, bold: true, color: paper, margin: 0 });
    slide.addText(scenario.strategicMoves.map((text) => ({ text, options: { bullet: true, breakLine: true } })), { x: 8.35, y: 5.22, w: 4.25, h: 1.25, fontSize: 10, color: muted, margin: 0.04 });
  });

  slide = deck.addSlide();
  addFrame(slide);
  slide.addText('Actions across the scenario set', { x: 0.55, y: 0.95, w: 11.4, h: 0.6, fontSize: 27, bold: true, color: paper, margin: 0 });
  result.robustActions.forEach((action, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 0.6 + column * 6.15;
    const y = 1.9 + row * 1.55;
    slide.addText(action.timing, { x, y, w: 1.25, h: 0.25, fontSize: 9, bold: true, color: column ? moss : blue, margin: 0 });
    slide.addText(action.action, { x, y: y + 0.32, w: 5.45, h: 0.42, fontSize: 13, bold: true, color: paper, margin: 0 });
    slide.addText(action.rationale, { x, y: y + 0.78, w: 5.45, h: 0.55, fontSize: 10, color: muted, margin: 0 });
  });

  await deck.writeFile({ fileName: `${slug(result.briefTitle)}.pptx` });
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70) || 'scenario-brief';
}
