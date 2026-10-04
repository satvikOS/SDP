import type { ScenarioResult } from './scenario-schema';
import { decisionFlowDefinition, mermaidThemeVariables } from './scenario-visuals';

const paper = 'F3F6FB';
const blue = '4D7FFF';
const moss = '6E9274';
const muted = 'AAB4C3';

export async function exportScenarioPdf(result: ScenarioResult) {
  const document = await buildScenarioPdf(result);
  document.save(`${slug(result.briefTitle)}.pdf`);
}

export async function createScenarioPdfBlob(result: ScenarioResult) {
  const document = await buildScenarioPdf(result);
  return document.output('blob');
}

export async function buildScenarioPdf(result: ScenarioResult) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const document = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  const width = document.internal.pageSize.getWidth();
  const height = document.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = width - margin * 2;
  const contentTop = 86;
  const contentBottom = height - 62;
  const ink: [number, number, number] = [18, 18, 18];
  const gray: [number, number, number] = [87, 87, 87];
  const rule: [number, number, number] = [205, 205, 205];
  const wash: [number, number, number] = [246, 247, 248];
  const analyticalBlue: [number, number, number] = [31, 75, 115];
  let y = contentTop;
  let tableNumber = 0;
  let figureNumber = 0;
  const framedPages = new Set<number>();

  document.setProperties({
    title: pdfSafe(result.briefTitle),
    subject: pdfSafe(result.request.focalQuestion),
    author: 'Scenario Development Process',
    creator: 'SDP',
    keywords: 'scenario planning, decision brief, strategy',
  });

  const drawPageFrame = (pageNumber: number) => {
    if (framedPages.has(pageNumber)) return;
    framedPages.add(pageNumber);
    drawLetterheadAndFooter(document, result, width, height, margin, pageNumber, ink, gray, rule);
  };

  drawPageFrame(1);

  const newPage = () => {
    document.addPage();
    drawPageFrame(document.getCurrentPageInfo().pageNumber);
    y = contentTop;
  };

  const ensure = (space: number) => {
    if (y + space <= contentBottom) return;
    newPage();
  };

  const sectionHeading = (number: string, title: string, note?: string) => {
    ensure(note ? 72 : 52);
    document.setTextColor(...gray);
    document.setFont('helvetica', 'bold');
    document.setFontSize(8);
    document.text(number.toUpperCase(), margin, y);
    y += 17;
    document.setTextColor(...ink);
    document.setFontSize(17);
    document.text(pdfSafe(title), margin, y);
    y += 9;
    document.setDrawColor(...ink);
    document.setLineWidth(0.8);
    document.line(margin, y, width - margin, y);
    y += 15;
    if (note) addParagraph(note, { size: 9, color: gray, after: 8 });
  };

  const subheading = (title: string) => {
    ensure(34);
    document.setTextColor(...ink);
    document.setFont('helvetica', 'bold');
    document.setFontSize(11);
    document.text(pdfSafe(title), margin, y);
    y += 17;
  };

  function addParagraph(
    text: string,
    options: { size?: number; color?: [number, number, number]; bold?: boolean; after?: number; width?: number } = {},
  ) {
    const size = options.size ?? 9.5;
    const lineHeight = size * 1.42;
    const availableWidth = options.width ?? contentWidth;
    document.setFont('helvetica', options.bold ? 'bold' : 'normal');
    document.setFontSize(size);
    document.setTextColor(...(options.color ?? ink));
    const lines = document.splitTextToSize(pdfSafe(text), availableWidth);
    ensure(lines.length * lineHeight + (options.after ?? 8));
    document.text(lines, margin, y, { lineHeightFactor: 1.42 });
    y += lines.length * lineHeight + (options.after ?? 8);
  }

  const addLabel = (label: string, text: string) => {
    ensure(34);
    document.setFont('helvetica', 'bold');
    document.setFontSize(8);
    document.setTextColor(...gray);
    document.text(pdfSafe(label.toUpperCase()), margin, y);
    y += 13;
    addParagraph(text, { size: 9.5, after: 10 });
  };

  const addCaption = (label: string, text: string) => {
    document.setFont('helvetica', 'bold');
    document.setFontSize(8);
    document.setTextColor(...ink);
    document.text(pdfSafe(label), margin, y);
    const labelWidth = document.getTextWidth(pdfSafe(label));
    document.setFont('helvetica', 'normal');
    document.setTextColor(...gray);
    document.text(` ${pdfSafe(text)}`, margin + labelWidth, y);
    y += 15;
  };

  const addTable = (title: string, head: string[], body: string[][], widths?: Record<number, number>) => {
    ensure(78);
    tableNumber += 1;
    addCaption(`Table ${tableNumber}.`, title);
    autoTable(document, {
      startY: y,
      head: [head.map(pdfSafe)],
      body: body.map((row) => row.map(pdfSafe)),
      theme: 'grid',
      margin: { left: margin, right: margin, top: contentTop, bottom: height - contentBottom },
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
        lineColor: rule,
        lineWidth: 0.4,
        textColor: ink,
        overflow: 'linebreak',
        valign: 'top',
      },
      headStyles: { fillColor: ink, textColor: [255, 255, 255], fontStyle: 'bold', lineColor: ink },
      alternateRowStyles: { fillColor: wash },
      columnStyles: Object.fromEntries(Object.entries(widths ?? {}).map(([key, cellWidth]) => [key, { cellWidth }])),
      didDrawPage: () => drawPageFrame(document.getCurrentPageInfo().pageNumber),
    });
    y = (document as typeof document & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  };

  // 1. Executive decision brief
  document.setFont('helvetica', 'bold');
  document.setFontSize(8);
  document.setTextColor(...gray);
  document.text('DECISION BRIEF', margin, y);
  y += 25;
  document.setTextColor(...ink);
  document.setFontSize(24);
  const titleLines = document.splitTextToSize(pdfSafe(result.briefTitle), contentWidth);
  document.text(titleLines, margin, y, { lineHeightFactor: 1.08 });
  y += titleLines.length * 26 + 13;
  addParagraph(result.executiveSummary, { size: 11, after: 17 });
  addTable('Decision frame', ['Field', 'Definition'], [
    ['Organization', result.request.organization],
    ['Industry', result.request.industry],
    ['Geography', result.request.region],
    ['Planning horizon', String(result.request.horizonYear)],
    ['Focal question', result.request.focalQuestion],
  ], { 0: 112, 1: contentWidth - 112 });
  addLabel('Strategic context', result.request.strategicContext);
  addParagraph('Purpose: support structured discussion, expose assumptions, and identify actions that remain useful across materially different futures. Planning weights are not forecasts.', { size: 8.5, color: gray, after: 0 });

  // 2. Scenario architecture
  newPage();
  sectionHeading('02', 'Scenario architecture', 'The analysis moves from a defined decision to drivers, plausible environments, robust actions, and observable signposts.');
  figureNumber += 1;
  addCaption(`Figure ${figureNumber}.`, 'Decision logic');
  const mermaidImage = await renderMermaidPng();
  if (mermaidImage) {
    document.addImage(mermaidImage, 'PNG', margin, y, contentWidth, 142, undefined, 'FAST');
  } else {
    drawDecisionFlow(document, margin, y, contentWidth, analyticalBlue, ink, gray, rule, wash);
  }
  y += 158;
  addTable('Scenario overview', ['No.', 'Scenario', 'Thesis', 'Planning weight'], result.scenarios.map((scenario, index) => [
    String(index + 1),
    scenario.title,
    scenario.thesis,
    `${scenario.probability}%`,
  ]), { 0: 30, 1: 104, 2: contentWidth - 204, 3: 70 });

  // 3. Driver assessment and strategic field
  newPage();
  sectionHeading('03', 'Driver assessment', 'Drivers are classified by impact, uncertainty, and current direction.');
  addTable('Critical driver assessment', ['Driver', 'Assessment', 'Impact', 'Uncertainty', 'Direction'], result.drivers.map((driver) => [
    driver.name,
    driver.assessment,
    driver.impact,
    driver.uncertainty,
    driver.direction,
  ]), { 0: 85, 1: contentWidth - 257, 2: 45, 3: 62, 4: 65 });
  ensure(244);
  figureNumber += 1;
  addCaption(`Figure ${figureNumber}.`, 'Strategic field - relative scenario positions');
  drawStrategicField(document, result, margin, y, contentWidth, 176, analyticalBlue, ink, gray, rule, wash);
  y += 195;
  figureNumber += 1;
  addCaption(`Figure ${figureNumber}.`, 'Relative planning weights');
  drawPlanningWeights(document, result, margin, y, contentWidth, analyticalBlue, ink, gray, rule);
  y += 112;
  addParagraph('Interpretation note: coordinates and weights support portfolio discussion; they do not express statistical confidence or predicted outcomes.', { size: 8, color: gray, after: 0 });

  // 4. Scenario profiles
  result.scenarios.forEach((scenario, index) => {
    newPage();
    sectionHeading(`04.${index + 1}`, `Scenario ${index + 1}: ${scenario.title}`);
    document.setFillColor(...wash);
    document.setDrawColor(...rule);
    document.roundedRect(margin, y, contentWidth, 66, 3, 3, 'FD');
    document.setFont('helvetica', 'bold');
    document.setFontSize(8);
    document.setTextColor(...gray);
    document.text('PLANNING WEIGHT', margin + 13, y + 18);
    document.setFontSize(18);
    document.setTextColor(...analyticalBlue);
    document.text(`${scenario.probability}%`, margin + 13, y + 43);
    document.setFont('helvetica', 'bold');
    document.setFontSize(10);
    document.setTextColor(...ink);
    const thesis = document.splitTextToSize(pdfSafe(scenario.thesis), contentWidth - 112);
    document.text(thesis, margin + 100, y + 22, { lineHeightFactor: 1.3 });
    y += 84;
    subheading('Narrative');
    addParagraph(scenario.narrative, { size: 9.5, after: 14 });
    addTable('Scenario evidence and response', ['Type', 'Item'], [
      ...scenario.keyDrivers.map((item) => ['Key driver', item]),
      ...scenario.signposts.map((item) => ['Leading indicator', item]),
      ...scenario.strategicMoves.map((item) => ['Response option', item]),
    ], { 0: 102, 1: contentWidth - 102 });
    ensure(65);
    document.setDrawColor(...ink);
    document.setLineWidth(1);
    document.line(margin, y, margin, y + 45);
    document.setFont('helvetica', 'bold');
    document.setFontSize(8);
    document.setTextColor(...ink);
    document.text('AVOID', margin + 11, y + 10);
    const avoid = document.splitTextToSize(pdfSafe(scenario.avoid), contentWidth - 22);
    document.setFont('helvetica', 'normal');
    document.setFontSize(9);
    document.text(avoid, margin + 11, y + 25, { lineHeightFactor: 1.35 });
  });

  // 5. Robust action plan
  newPage();
  sectionHeading('05', 'Robust action plan', 'Actions below are intended to remain useful across the full scenario set.');
  addTable('Cross-scenario actions', ['Timing', 'Action', 'Rationale'], result.robustActions.map((action) => [
    action.timing,
    action.action,
    action.rationale,
  ]), { 0: 78, 1: 150, 2: contentWidth - 228 });
  ensure(180);
  figureNumber += 1;
  addCaption(`Figure ${figureNumber}.`, 'Action timing sequence');
  drawActionTimeline(document, result, margin, y, contentWidth, analyticalBlue, ink, gray, rule, wash);
  y += 155;
  addParagraph('Governance note: assign one accountable owner, one review date, and one observable completion criterion to each selected action before execution.', { size: 8.5, color: gray, after: 0 });

  // 6. Unknowns, dissent, and method
  newPage();
  sectionHeading('06', 'Critical unknowns and challenge', 'Unresolved questions should be translated into research, monitoring, or explicit decision assumptions.');
  addTable('Critical unknowns', ['No.', 'Question or evidence gap'], result.criticalUnknowns.map((item, index) => [String(index + 1), item]), { 0: 34, 1: contentWidth - 34 });
  subheading('Alternative interpretation');
  addParagraph(result.dissent, { size: 9.5, after: 18 });
  subheading('Method and use');
  addParagraph('The Scenario Development Process separates framing, driver assessment, scenario construction, signpost design, and robust-action testing. The scenarios are internally coherent decision environments rather than forecasts. They should be reviewed when material evidence changes, when an agreed signpost is observed, or at the next scheduled strategy review.', { size: 9.5, after: 12 });
  addParagraph('Limitations: the document is generated from the supplied brief and analytical model outputs. It does not independently verify external facts, replace specialist advice, or quantify probability from empirical data.', { size: 8.5, color: gray, after: 0 });

  return document;
}

function drawLetterheadAndFooter(
  document: import('jspdf').jsPDF,
  result: ScenarioResult,
  width: number,
  height: number,
  margin: number,
  pageNumber: number,
  ink: [number, number, number],
  gray: [number, number, number],
  rule: [number, number, number],
) {
  const issueDate = new Date(result.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  document.setFillColor(...ink);
  drawSdpMark(document, margin, 39);
  document.setFont('helvetica', 'bold');
  document.setFontSize(10);
  document.setTextColor(...ink);
  document.text('SDP', margin + 31, 36);
  document.setFont('helvetica', 'normal');
  document.setFontSize(6.8);
  document.setTextColor(...gray);
  document.text('Scenario Development Process', margin + 31, 46);
  document.setFontSize(7);
  document.text(`Decision brief  |  ${issueDate}`, width - margin, 39, { align: 'right' });
  document.setDrawColor(...rule);
  document.setLineWidth(0.5);
  document.line(margin, 60, width - margin, 60);
  document.line(margin, height - 43, width - margin, height - 43);
  document.setFontSize(7);
  document.setTextColor(...gray);
  document.text(pdfSafe(`${result.request.organization} | Scenario Development Process`), margin, height - 26);
  document.text(`Page ${pageNumber}`, width - margin, height - 26, { align: 'right' });
}

function drawSdpMark(document: import('jspdf').jsPDF, x: number, baseline: number) {
  const bar = (offset: number, top: number, barHeight: number) => {
    document.lines([[7, 0], [5, -barHeight], [-7, 0], [-5, barHeight]], x + offset, baseline - top, [1, 1], 'F', true);
  };
  bar(0, 0, 8);
  bar(8, 2, 11);
  bar(16, 4, 14);
}

function drawDecisionFlow(
  document: import('jspdf').jsPDF,
  x: number,
  y: number,
  width: number,
  blue: [number, number, number],
  ink: [number, number, number],
  gray: [number, number, number],
  rule: [number, number, number],
  wash: [number, number, number],
) {
  const labels = ['Decision frame', 'Critical drivers', 'Four scenarios', 'Robust actions', 'Signposts'];
  const gap = 10;
  const boxWidth = (width - gap * 4) / 5;
  document.setLineWidth(1);
  document.setDrawColor(...blue);
  labels.forEach((label, index) => {
    const boxX = x + index * (boxWidth + gap);
    document.setFillColor(...(index === 2 ? [238, 243, 247] as [number, number, number] : wash));
    document.setDrawColor(...(index === 2 ? blue : rule));
    document.roundedRect(boxX, y + 37, boxWidth, 52, 2, 2, 'FD');
    document.setTextColor(...(index === 2 ? blue : ink));
    document.setFont('helvetica', 'bold');
    document.setFontSize(7.5);
    const lines = document.splitTextToSize(label, boxWidth - 12);
    document.text(lines, boxX + boxWidth / 2, y + 59, { align: 'center', lineHeightFactor: 1.25 });
    if (index < labels.length - 1) {
      const start = boxX + boxWidth;
      document.setDrawColor(...blue);
      document.line(start, y + 63, start + gap - 3, y + 63);
      document.triangle(start + gap - 3, y + 60, start + gap, y + 63, start + gap - 3, y + 66, 'F');
    }
  });
  document.setTextColor(...gray);
  document.setFont('helvetica', 'normal');
  document.setFontSize(7);
  document.text('Signposts trigger review of the decision frame and its underlying assumptions.', x + width / 2, y + 116, { align: 'center' });
}

function drawStrategicField(
  document: import('jspdf').jsPDF,
  result: ScenarioResult,
  x: number,
  y: number,
  width: number,
  chartHeight: number,
  blue: [number, number, number],
  ink: [number, number, number],
  gray: [number, number, number],
  rule: [number, number, number],
  wash: [number, number, number],
) {
  document.setFillColor(...wash);
  document.setDrawColor(...rule);
  document.rect(x, y, width, chartHeight, 'FD');
  document.setLineWidth(0.5);
  document.line(x + width / 2, y + 16, x + width / 2, y + chartHeight - 16);
  document.line(x + 16, y + chartHeight / 2, x + width - 16, y + chartHeight / 2);
  document.setFont('helvetica', 'normal');
  document.setFontSize(6.5);
  document.setTextColor(...gray);
  document.text('Higher structural change', x + width / 2 + 6, y + 11);
  document.text('Lower structural change', x + width / 2 + 6, y + chartHeight - 5);
  document.text('Constrained response', x + 5, y + chartHeight / 2 - 5);
  document.text('Adaptive response', x + width - 5, y + chartHeight / 2 - 5, { align: 'right' });
  result.scenarios.forEach((scenario, index) => {
    const cx = x + 24 + (scenario.coordinates.x / 100) * (width - 48);
    const cy = y + chartHeight - 24 - (scenario.coordinates.y / 100) * (chartHeight - 48);
    document.setFillColor(...blue);
    document.setDrawColor(255, 255, 255);
    document.circle(cx, cy, 8, 'FD');
    document.setFont('helvetica', 'bold');
    document.setFontSize(6.8);
    document.setTextColor(255, 255, 255);
    document.text(String(index + 1), cx, cy + 2.2, { align: 'center' });
    document.setTextColor(...ink);
    document.setFontSize(7);
    const labelX = scenario.coordinates.x > 62 ? cx - 12 : cx + 12;
    document.text(pdfSafe(scenario.title), labelX, cy + 2.2, { align: scenario.coordinates.x > 62 ? 'right' : 'left', maxWidth: 115 });
  });
}

function drawPlanningWeights(
  document: import('jspdf').jsPDF,
  result: ScenarioResult,
  x: number,
  y: number,
  width: number,
  blue: [number, number, number],
  ink: [number, number, number],
  gray: [number, number, number],
  rule: [number, number, number],
) {
  const labelWidth = 132;
  const trackWidth = width - labelWidth - 36;
  result.scenarios.forEach((scenario, index) => {
    const rowY = y + index * 24;
    document.setFont('helvetica', 'normal');
    document.setFontSize(7.5);
    document.setTextColor(...ink);
    document.text(`${index + 1}. ${pdfSafe(scenario.title)}`, x, rowY + 8, { maxWidth: labelWidth - 8 });
    document.setFillColor(...rule);
    document.rect(x + labelWidth, rowY + 2, trackWidth, 7, 'F');
    document.setFillColor(...blue);
    document.rect(x + labelWidth, rowY + 2, trackWidth * (scenario.probability / 100), 7, 'F');
    document.setFont('helvetica', 'bold');
    document.setTextColor(...gray);
    document.text(`${scenario.probability}%`, x + width, rowY + 8, { align: 'right' });
  });
}

function drawActionTimeline(
  document: import('jspdf').jsPDF,
  result: ScenarioResult,
  x: number,
  y: number,
  width: number,
  blue: [number, number, number],
  ink: [number, number, number],
  gray: [number, number, number],
  rule: [number, number, number],
  wash: [number, number, number],
) {
  const timings = ['now', 'next 90 days', 'this year'] as const;
  const gap = 10;
  const columnWidth = (width - gap * 2) / 3;
  timings.forEach((timing, column) => {
    const columnX = x + column * (columnWidth + gap);
    document.setFillColor(...wash);
    document.setDrawColor(...rule);
    document.rect(columnX, y, columnWidth, 128, 'FD');
    document.setFillColor(...(column === 0 ? blue : ink));
    document.rect(columnX, y, columnWidth, 23, 'F');
    document.setTextColor(255, 255, 255);
    document.setFont('helvetica', 'bold');
    document.setFontSize(7.5);
    document.text(timing.toUpperCase(), columnX + 8, y + 15);
    const actions = result.robustActions.filter((item) => item.timing === timing).slice(0, 3);
    let textY = y + 39;
    actions.forEach((action, index) => {
      document.setTextColor(...ink);
      document.setFontSize(7.2);
      document.setFont('helvetica', 'bold');
      const lines = document.splitTextToSize(`${index + 1}. ${pdfSafe(action.action)}`, columnWidth - 16);
      document.text(lines, columnX + 8, textY, { lineHeightFactor: 1.25 });
      textY += lines.length * 9 + 8;
    });
    if (actions.length === 0) {
      document.setTextColor(...gray);
      document.setFont('helvetica', 'normal');
      document.setFontSize(7.2);
      document.text('No action assigned', columnX + 8, textY);
    }
  });
}

async function renderMermaidPng() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  try {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: mermaidThemeVariables,
      flowchart: { curve: 'linear', htmlLabels: false, nodeSpacing: 42, rankSpacing: 62 },
    });
    const rendered = await mermaid.render(`pdf-flow-${crypto.randomUUID()}`, decisionFlowDefinition);
    const blob = new Blob([rendered.svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const image = await loadImage(url);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1200, image.naturalWidth * 2);
      canvas.height = Math.max(360, image.naturalHeight * 2);
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function pdfSafe(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022\u00b7]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
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
