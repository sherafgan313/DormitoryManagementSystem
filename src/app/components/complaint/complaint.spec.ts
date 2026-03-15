import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ComplaintComponent, ComplaintItem } from './complaint';

const mockComplaints: ComplaintItem[] = [
  { complaint_id: 1, user_id: 5, description: 'Broken tap', status: 'SUBMITTED', created_at: '2025-01-01' },
  { complaint_id: 2, user_id: 6, description: 'No hot water', status: 'IN_PROGRESS', created_at: '2025-01-03' },
  { complaint_id: 3, user_id: 7, description: 'Fixed now', status: 'RESOLVED', created_at: '2025-01-05' },
];

describe('ComplaintComponent', () => {
  let fixture: ComponentFixture<ComplaintComponent>;
  let component: ComplaintComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplaintComponent],
    }).compileComponents();
    fixture   = TestBed.createComponent(ComplaintComponent);
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
    component.error = 'Network error';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('Network error');
  });

  it('renders complaint items', () => {
    component.complaints = mockComplaints;
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('li');
    expect(items.length).toBe(3);
  });

  it('shows complaint IDs', () => {
    component.complaints = mockComplaints;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('#1');
    expect(fixture.nativeElement.textContent).toContain('#2');
  });

  it('EventEmitters are defined', () => {
    expect(component.submitComplaint).toBeDefined();
    expect(component.updateStatus).toBeDefined();
  });

  it('defaults to empty complaints list', () => {
    expect(component.complaints.length).toBe(0);
  });
});
