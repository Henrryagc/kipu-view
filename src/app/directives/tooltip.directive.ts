import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  Renderer2,
  HostListener
} from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnDestroy {
  @Input('appTooltip') text: string | null = '';
  @Input() tooltipPosition: 'top' | 'bottom' = 'top';
  @Input() tooltipHtml = false;

  private tooltipEl: HTMLDivElement | null = null;
  private destroyTimeout: any = null;
  private tooltipListeners: (() => void)[] = [];

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mouseenter')
  onMouseEnter() {
    this.clearTimeout();
    if (!this.text) return;
    if (!this.tooltipEl) {
      this.createTooltip();
    }
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.startTimeout();
  }

  @HostListener('click')
  onClick() {
    this.destroyTooltip();
  }

  @HostListener('mousedown')
  onMouseDown() {
    this.destroyTooltip();
  }

  ngOnDestroy() {
    this.destroyTooltip();
  }

  private clearTimeout() {
    if (this.destroyTimeout) {
      clearTimeout(this.destroyTimeout);
      this.destroyTimeout = null;
    }
  }

  private startTimeout() {
    this.clearTimeout();
    this.destroyTimeout = setTimeout(() => {
      this.destroyTooltip();
    }, 150);
  }

  private createTooltip() {
    // Create tooltip element
    this.tooltipEl = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltipEl, 'custom-tooltip-box');
    this.renderer.addClass(this.tooltipEl, `tooltip-${this.tooltipPosition}`);
    
    if (this.tooltipHtml) {
      this.renderer.setProperty(this.tooltipEl, 'innerHTML', this.text || '');
    } else {
      const textNode = this.renderer.createText(this.text || '');
      this.renderer.appendChild(this.tooltipEl, textNode);
    }

    // Append to body so it doesn't get clipped by parent overflow:hidden containers
    this.renderer.appendChild(document.body, this.tooltipEl);

    // Add listeners to tooltip element so hover keeps it alive
    const enterListener = this.renderer.listen(this.tooltipEl, 'mouseenter', () => {
      this.clearTimeout();
    });
    const leaveListener = this.renderer.listen(this.tooltipEl, 'mouseleave', () => {
      this.startTimeout();
    });
    this.tooltipListeners.push(enterListener, leaveListener);

    // Position it relative to the host element
    const hostRect = this.el.nativeElement.getBoundingClientRect();
    const tooltipRect = this.tooltipEl!.getBoundingClientRect();

    let top = 0;
    let left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;

    if (this.tooltipPosition === 'top') {
      top = hostRect.top - tooltipRect.height - 8;
    } else {
      top = hostRect.bottom + 8;
    }

    // Keep it on screen horizontally
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));

    this.renderer.setStyle(this.tooltipEl, 'top', `${top + window.scrollY}px`);
    this.renderer.setStyle(this.tooltipEl, 'left', `${left + window.scrollX}px`);

    // Trigger transition
    setTimeout(() => {
      if (this.tooltipEl) {
        this.renderer.addClass(this.tooltipEl, 'tooltip-visible');
      }
    }, 10);
  }

  private destroyTooltip() {
    this.clearTimeout();
    
    // Remove listeners
    this.tooltipListeners.forEach(unlisten => unlisten());
    this.tooltipListeners = [];

    if (this.tooltipEl) {
      this.renderer.removeChild(document.body, this.tooltipEl);
      this.tooltipEl = null;
    }
  }
}
