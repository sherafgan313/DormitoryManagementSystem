import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ApplicationComponent, DormApplicationItem } from './application';

const mockApps: DormApplicationItem[] = [
  { application_id: 1, user_id: 10, submission_date: '2025-01-01', status: 'PENDING', created_at: '2025-01-01' },
  { application_id: 2, user_id: 11, submission_date: '2025-01-05', status: 'ACCEPTED', created_at: '2025-01-05' },
];

describe('ApplicationComponent', () => {
  let fixture: ComponentFixture<ApplicationComponent>;
  let component: ApplicationComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationComponent],
    }).compileComponents();
    fixture   = TestBed.createComponent(ApplicationComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('shows loading text when loading is true', () => {
    component.loading = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading');
  });

  it('shows error message when error is set', () => {
    component.error = 'Backend offline';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('Backend offline');
  });

  it('renders application items when loaded', () => {
    component.applications = mockApps;
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(2);
  });

  it('shows application IDs in the list', () => {
    component.applications = mockApps;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('#1');
    expect(fixture.nativeElement.textContent).toContain('#2');
  });

  it('EventEmitters are defined', () => {
    expect(component.submitApplication).toBeDefined();
    expect(component.uploadFiles).toBeDefined();
    expect(component.updateStatus).toBeDefined();
  });

  it('defaults to empty applications list', () => {
    expect(component.applications.length).toBe(0);
  });
});
