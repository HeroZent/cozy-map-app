import type { Page } from '@playwright/test';

export interface JourneyStep {
  id: string;
  label: string;
}

export class JourneyTracker {
  constructor(private page: Page) {}

  async install(steps: JourneyStep[]): Promise<void> {
    await this.page.evaluate((steps) => {
      const overlay = document.createElement('div');
      overlay.id = '__journey-tracker';
      overlay.style.cssText = `
        position: fixed; top: 12px; right: 12px; z-index: 99999;
        background: rgba(20,26,58,0.92); color: #f5e6c8; font-family: monospace;
        padding: 10px 14px; border: 1px solid rgba(244,201,122,0.5);
        border-radius: 10px; font-size: 12px; min-width: 220px;
        pointer-events: none;
      `;
      const title = document.createElement('div');
      title.textContent = 'JOURNEY';
      title.style.cssText = 'font-weight:700;letter-spacing:1.5px;margin-bottom:6px;color:#f4c97a';
      overlay.appendChild(title);
      const list = document.createElement('div');
      list.id = '__journey-list';
      for (const s of steps) {
        const row = document.createElement('div');
        row.id = `__journey-${s.id}`;
        row.dataset.done = 'false';
        row.textContent = `☐ ${s.label}`;
        row.style.padding = '2px 0';
        list.appendChild(row);
      }
      overlay.appendChild(list);
      document.body.appendChild(overlay);
    }, steps);
  }

  async tick(stepId: string): Promise<void> {
    await this.page.evaluate((id) => {
      const row = document.getElementById(`__journey-${id}`);
      if (row) {
        row.dataset.done = 'true';
        row.textContent = `✓ ${row.textContent?.replace(/^[☐✓]\s+/, '')}`;
        (row.style as any).color = '#a8d8a8';
      }
    }, stepId);
  }

  async clear(): Promise<void> {
    await this.page.evaluate(() => {
      document.getElementById('__journey-tracker')?.remove();
    });
  }
}
