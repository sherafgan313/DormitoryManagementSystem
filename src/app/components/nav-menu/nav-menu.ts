import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-nav-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="nav-menu">
      <ul class="nav-list">
        @for (item of navItems; track item.id) {
          <li
            class="nav-item"
            [class.active]="item.id === activeNav"
            (click)="navSelect.emit(item.id)">
            <img [src]="'assets/icons/' + item.icon" [alt]="item.label" class="nav-icon" />
            <span class="nav-label">{{ item.label }}</span>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class NavMenuComponent {
  @Input() navItems: NavItem[] = [];
  @Input() activeNav = '';
  @Input() sidebarOpen = true;
  @Output() navSelect      = new EventEmitter<string>();
  @Output() sidebarToggle  = new EventEmitter<void>();
}
