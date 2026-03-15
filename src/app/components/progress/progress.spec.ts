import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ProgressComponent } from './progress';

describe('ProgressComponent', () => {
  let fixture: ComponentFixture<ProgressComponent>;
  let component: ProgressComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressComponent],
    }).compileComponents();
    fixture   = TestBed.createComponent(ProgressComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('renders nothing when open is false', () => {
    component.open = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.progress-overlay')).toBeNull();
  });

  it('renders modal when open is true', () => {
    component.open = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.progress-overlay')).toBeTruthy();
  });

  it('shows percentage and status', () => {
    component.open = true;
    component.percentage = 75;
    component.status = 'PENDING';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('75%');
    expect(fixture.nativeElement.textContent).toContain('PENDING');
  });

  it('shows Download button when status is COMPLETED', () => {
    component.open = true;
    component.status = 'COMPLETED';
    component.percentage = 100;
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn?.textContent).toContain('Download');
  });

  it('shows Cancel button when status is not COMPLETED/CANCELLED/FAILED', () => {
    component.open = true;
    component.status = 'PENDING';
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const cancelBtn = Array.from(buttons).find((b: HTMLButtonElement) => b.textContent?.includes('Cancel'));
    expect(cancelBtn).toBeTruthy();
  });

  it('does not show Cancel button when status is CANCELLED', () => {
    component.open = true;
    component.status = 'CANCELLED';
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const cancelBtn = Array.from(buttons).find((b: HTMLButtonElement) => b.textContent?.includes('Cancel'));
    expect(cancelBtn).toBeFalsy();
  });

  it('does not show Cancel button when status is FAILED', () => {
    component.open = true;
    component.status = 'FAILED';
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const cancelBtn = Array.from(buttons).find((b: HTMLButtonElement) => b.textContent?.includes('Cancel'));
    expect(cancelBtn).toBeFalsy();
  });

  it('emits download with reportId when Download is clicked', () => {
    component.open = true;
    component.status = 'COMPLETED';
    component.reportId = 7;
    fixture.detectChanges();
    let emitted: number | undefined;
    component.download.subscribe((id: number) => (emitted = id));
    const btn = fixture.nativeElement.querySelector('button');
    btn.click();
    expect(emitted).toBe(7);
  });

  it('emits cancel with reportId when Cancel is clicked', () => {
    component.open = true;
    component.status = 'PENDING';
    component.reportId = 5;
    fixture.detectChanges();
    let emitted: number | undefined;
    component.cancel.subscribe((id: number) => (emitted = id));
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const cancelBtn = Array.from(buttons).find((b: HTMLButtonElement) => b.textContent?.includes('Cancel'));
    (cancelBtn as HTMLButtonElement).click();
    expect(emitted).toBe(5);
  });

  it('emits close when Close is clicked', () => {
    component.open = true;
    component.status = 'PENDING';
    fixture.detectChanges();
    let closed = false;
    component.close.subscribe(() => (closed = true));
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const closeBtn = Array.from(buttons).find((b: HTMLButtonElement) => b.textContent?.includes('Close'));
    (closeBtn as HTMLButtonElement).click();
    expect(closed).toBeTrue();
  });
});
