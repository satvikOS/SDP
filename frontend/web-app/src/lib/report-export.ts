import type { ScenarioResult } from './scenario-schema';

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

async function buildScenarioPdf(result: ScenarioResult) {
  const { jsPDF } = await import('jspdf');
  const document = new jsPDF({ unit: 'pt', format: 'a4' });
  const width = document.internal.pageSize.getWidth();
  const height = document.internal.pageSize.getHeight();
  const margin = 48;
  let y = 54;

  const page = () => {
    document.setFillColor(0, 0, 0);
    document.rect(0, 0, width, height, 'F');
    document.setTextColor(243, 246, 251);
  };
  const ensure = (space: number) => {
    if (y + space < height - 48) return;
    document.addPage();
    page();
    y = 54;
  };
  const heading = (text: string, size = 18) => {
    document.setFont('helvetica', 'bold');
    document.setFontSize(size);
    const lines = document.splitTextToSize(text, width - margin * 2);
    const lineHeight = size * 1.12;
    ensure(lines.length * lineHeight + 18);
    document.setTextColor(243, 246, 251);
    document.text(lines, margin, y, { lineHeightFactor: 1.12 });
    y += lines.length * lineHeight + 12;
  };
  const paragraph = (text: string, options: { color?: [number, number, number]; indent?: number } = {}) => {
    document.setFont('helvetica', 'normal');
    document.setFontSize(10.5);
    document.setTextColor(...(options.color ?? [188, 198, 212]));
    const indent = options.indent ?? 0;
    const lines = document.splitTextToSize(text, width - margin * 2 - indent);
    ensure(lines.length * 15 + 8);
    document.text(lines, margin + indent, y);
    y += lines.length * 15 + 9;
  };

  page();
  document.setTextColor(77, 127, 255);
  document.setFontSize(10);
  document.setFont('helvetica', 'bold');
  document.text('SDP  /  DECISION BRIEF', margin, y);
  y += 32;
  heading(result.briefTitle, 25);
  paragraph(result.executiveSummary, { color: [220, 227, 237] });
  y += 10;
  paragraph(`${result.request.organization}  •  ${result.request.region}  •  Horizon ${result.request.horizonYear}`);

  result.scenarios.forEach((scenario, index) => {
    ensure(180);
    y += 18;
    document.setTextColor(index % 2 === 0 ? 77 : 110, index % 2 === 0 ? 127 : 146, index % 2 === 0 ? 255 : 116);
    document.setFontSize(9);
    document.setFont('helvetica', 'bold');
    document.text(`SCENARIO ${index + 1}  /  ${scenario.probability}%`, margin, y);
    y += 20;
    heading(scenario.title, 17);
    paragraph(scenario.thesis, { color: [220, 227, 237] });
    paragraph(scenario.narrative);
    paragraph(`Signals: ${scenario.signposts.join(' • ')}`, { indent: 12 });
    paragraph(`Moves: ${scenario.strategicMoves.join(' • ')}`, { indent: 12 });
  });

  y += 16;
  heading('Actions across the scenario set', 18);
  result.robustActions.forEach((action) => paragraph(`${action.timing}: ${action.action} — ${action.rationale}`));
  heading('Open questions', 18);
  result.criticalUnknowns.forEach((item) => paragraph(`• ${item}`));
  paragraph(`Alternative interpretation: ${result.dissent}`);

  return document;
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
