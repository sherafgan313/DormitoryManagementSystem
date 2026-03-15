import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NavMenuComponent, NavItem } from './nav-menu';

describe('NavMenuComponent', () => {
  let fixture: ComponentFixture<NavMenuComponent>;
  let component: NavMenuComponent;

  const items: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'chart-bar.svg' },
    { id: 'rooms',     label: 'Rooms',     icon: 'home.svg'      },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavMenuComponent],
    }).compileComponents();
    fixture   = TestBed.createComponent(NavMenuComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('renders all provided nav items', () => {
    component.navItems = items;
    fixture.detectChanges();
    const liEls = fixture.nativeElement.querySelectorAll('li.nav-item');
    expect(liEls.length).toBe(2);
  });

  it('marks item as active when its id matches activeNav', () => {
    component.navItems = items;
    component.activeNav = 'rooms';
    fixture.detectChanges();
    const active = fixture.nativeElement.querySelector('li.nav-item.active');
    expect(active?.textContent).toContain('Rooms');
  });

  it('emits navSelect with clicked item id', () => {
    component.navItems = items;
    fixture.detectChanges();
    let emitted = '';
    component.navSelect.subscribe((id: string) => (emitted = id));
    const firstItem = fixture.nativeElement.querySelector('li.nav-item');
    firstItem.click();
    expect(emitted).toBe('dashboard');
  });

  it('sidebarOpen input defaults to true', () => {
    expect(component.sidebarOpen).toBeTrue();
  });

  it('sidebarToggle EventEmitter is defined', () => {
    expect(component.sidebarToggle).toBeTruthy();
  });

  it('renders no items when navItems is empty', () => {
    component.navItems = [];
    fixture.detectChanges();
    const liEls = fixture.nativeElement.querySelectorAll('li.nav-item');
    expect(liEls.length).toBe(0);
  });
});
