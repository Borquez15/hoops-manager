import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-base',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onClose()">
      <div class="modal-content" [ngClass]="modalClass" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>
            <ng-content select="[header-icon]"></ng-content>
            {{ title }}
          </h2>
          <button class="btn-close" (click)="onClose()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <ng-content></ng-content>
        </div>
        
        <div class="modal-footer" *ngIf="showFooter">
          <ng-content select="[footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./modal-base.component.css']
})
export class ModalBaseComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() modalClass = '';
  @Input() showFooter = true;
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}