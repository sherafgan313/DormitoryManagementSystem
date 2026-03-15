import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReportService } from './report.service';
import { ApiService } from './api.service';

describe('ReportService', () => {
  let service: ReportService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getReports', 'generateReport', 'getReportProgress',
      'downloadReport', 'cancelReport', 'generateAdminReport', 'downloadAdminReport',
    ]);
    apiSpy.getReports.and.returnValue(of([]));
    apiSpy.generateReport.and.returnValue(of({ reportId: 1, progressId: 1 }));
    apiSpy.getReportProgress.and.returnValue(of({ percentage: 50, status: 'PENDING' }));
    apiSpy.downloadReport.and.returnValue(of(new Blob()));
    apiSpy.cancelReport.and.returnValue(of({}));
    apiSpy.generateAdminReport.and.returnValue(of({ fileName: 'report.pdf' }));
    apiSpy.downloadAdminReport.and.returnValue('http://localhost:3000/uploads/reports/report.pdf');

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(ReportService);
  });

  it('should be created', () => expect(service).toBeTruthy());

  it('getReports() delegates to api.getReports()', () => {
    service.getReports().subscribe();
    expect(apiSpy.getReports).toHaveBeenCalled();
  });

  it('generateReport() delegates to api.generateReport()', () => {
    service.generateReport().subscribe();
    expect(apiSpy.generateReport).toHaveBeenCalled();
  });

  it('getReportProgress() delegates with reportId', () => {
    service.getReportProgress(5).subscribe();
    expect(apiSpy.getReportProgress).toHaveBeenCalledWith(5);
  });

  it('downloadReport() delegates with id', () => {
    service.downloadReport(7).subscribe();
    expect(apiSpy.downloadReport).toHaveBeenCalledWith(7);
  });

  it('cancelReport() delegates with id', () => {
    service.cancelReport(2).subscribe();
    expect(apiSpy.cancelReport).toHaveBeenCalledWith(2);
  });

  it('generateAdminReport() delegates with payload', () => {
    const payload = { stats: {}, chartImages: { occupancy: '', finances: '', maintenance: '' } };
    service.generateAdminReport(payload).subscribe();
    expect(apiSpy.generateAdminReport).toHaveBeenCalledWith(payload);
  });

  it('downloadAdminReport() delegates with fileName and returns URL', () => {
    const url = service.downloadAdminReport('report.pdf');
    expect(apiSpy.downloadAdminReport).toHaveBeenCalledWith('report.pdf');
    expect(url).toBe('http://localhost:3000/uploads/reports/report.pdf');
  });
});
