import type { Element, Page, Settings, LintWarning } from '../types';
import { getPageSize } from './constants';

export function runLinter(pages: Page[], headerElements: Element[], footerElements: Element[], settings: Settings): LintWarning[] {
  const warnings: LintWarning[] = [];
  const { margins } = settings;

  const checkElements = (elements: Element[], context: string, width: number, height: number) => {
    for (const el of elements) {
      if (el.x < margins.left || el.x + el.w > width - margins.right) {
        warnings.push({
          type: 'warning',
          message: `${context}: "${el.type}" element exceeds horizontal margins`,
          elementId: el.id,
        });
      }
      if (el.y < margins.top || el.y + el.h > height - margins.bottom) {
        warnings.push({
          type: 'warning',
          message: `${context}: "${el.type}" element exceeds vertical margins`,
          elementId: el.id,
        });
      }
      if (el.type === 'image' && el.content && !el.content.match(/\.(png|jpg|jpeg|eps|pdf)$/i) && !el.content.startsWith('data:image/')) {
        warnings.push({
          type: 'info',
          message: `${context}: arXiv recommends PNG, JPG, EPS, or PDF for images`,
          elementId: el.id,
        });
      }
      if ((el.type === 'text' || el.type === 'markdownobs') && !el.content.trim()) {
        warnings.push({
          type: 'info',
          message: `${context}: Empty text element found`,
          elementId: el.id,
        });
      }
    }
  };

  pages.forEach((page, i) => {
    const size = getPageSize(page);
    checkElements(page.elements, `Page ${i + 1}`, size.width, size.height);
  });

  const first = pages[0];
  const commonSize = first ? getPageSize(first) : { width: 794, height: 1123 };
  checkElements(headerElements, 'Header', commonSize.width, commonSize.height);
  checkElements(footerElements, 'Footer', commonSize.width, commonSize.height);

  if (pages.length === 0) {
    warnings.push({ type: 'error', message: 'Document has no pages' });
  }

  const allElements = pages.flatMap((p) => p.elements);
  const hasTitle = allElements.some(
    (el) =>
      (el.type === 'text' && (el.content.includes('<h1>') || (el.isBold && el.fontSize >= 24))) ||
      (el.type === 'markdownobs' && /^\s*#\s+.+/m.test(el.content))
  );
  if (!hasTitle) {
    warnings.push({ type: 'info', message: 'No title detected - consider adding an H1 or large bold text' });
  }

  return warnings;
}
