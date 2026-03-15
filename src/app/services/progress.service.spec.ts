import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProgressService } from './progress.service';
import { ApiService } from './api.service';

describe('ProgressService', () => {
  let service: ProgressService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getReportProgress']);
    apiSpy.getReportProgress.and.returnValue(of({ percentage: 60, status: 'PENDING' }));

    TestBed.configureTestingModule({
      providers: [
        ProgressService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(ProgressService);
  });

  it('should be created', () => expect(service).toBeTruthy());

  it('getProgress() delegates to api.getReportProgress()', () => {
    service.getProgress(3).subscribe(data => {
      expect(data.percentage).toBe(60);
    });
    expect(apiSpy.getReportProgress).toHaveBeenCalledWith(3);
  });

  it('startPolling() calls onTick at each interval', fakeAsync(() => {
    const ticks: any[] = [];
    const handle = service.startPolling(1, data => ticks.push(data), 500);
    tick(500);
    expect(ticks.length).toBe(1);
    expect(ticks[0].percentage).toBe(60);
    tick(500);
    expect(ticks.length).toBe(2);
    service.stopPolling(handle);
    tick(5000);
    expect(ticks.length).toBe(2); // stopped — no more ticks
  }));

  it('startPolling() silently ignores errors from api', fakeAsync(() => {
    apiSpy.getReportProgress.and.returnValue(throwError(() => new Error('API error')));
    const handle = service.startPolling(1, () => {}, 300);
    expect(() => tick(300)).not.toThrow();
    service.stopPolling(handle);
  }));

  it('stopPolling() with a valid handle stops the interval', fakeAsync(() => {
    let count = 0;
    const handle = service.startPolling(1, () => count++, 400);
    tick(400);
    service.stopPolling(handle);
    tick(800);
    expect(count).toBe(1);
  }));

  it('stopPolling() with null is a no-op', () => {
    expect(() => service.stopPolling(null)).not.toThrow();
  });

  it('startPolling() uses default 600ms interval when not specified', fakeAsync(() => {
    const ticks: any[] = [];
    const handle = service.startPolling(2, data => ticks.push(data));
    tick(600);
    expect(ticks.length).toBe(1);
    service.stopPolling(handle);
    tick(600);
    expect(ticks.length).toBe(1);
  }));
});
