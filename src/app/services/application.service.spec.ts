import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApplicationService } from './application.service';
import { ApiService } from './api.service';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getApplications', 'submitApplication', 'uploadApplicationFiles',
      'getApplicationFiles', 'updateApplicationStatus',
    ]);
    apiSpy.getApplications.and.returnValue(of([]));
    apiSpy.submitApplication.and.returnValue(of({ message: 'ok', applicationId: 1 }));
    apiSpy.uploadApplicationFiles.and.returnValue(of({ count: 1 }));
    apiSpy.getApplicationFiles.and.returnValue(of([]));
    apiSpy.updateApplicationStatus.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        ApplicationService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(ApplicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getApplications() delegates to api.getApplications()', () => {
    service.getApplications().subscribe();
    expect(apiSpy.getApplications).toHaveBeenCalled();
  });

  it('submitApplication() delegates with submission_date and default NEW type', () => {
    service.submitApplication('2025-01-01').subscribe();
    expect(apiSpy.submitApplication).toHaveBeenCalledWith('2025-01-01', 'NEW');
  });

  it('submitApplication() delegates with EXTENSION type', () => {
    service.submitApplication('2025-06-01', 'EXTENSION').subscribe();
    expect(apiSpy.submitApplication).toHaveBeenCalledWith('2025-06-01', 'EXTENSION');
  });

  it('uploadApplicationFiles() delegates to api.uploadApplicationFiles()', () => {
    const files = [new File([''], 'test.pdf')];
    service.uploadApplicationFiles(1, files).subscribe();
    expect(apiSpy.uploadApplicationFiles).toHaveBeenCalledWith(1, files);
  });

  it('getApplicationFiles() delegates to api.getApplicationFiles()', () => {
    service.getApplicationFiles(2).subscribe();
    expect(apiSpy.getApplicationFiles).toHaveBeenCalledWith(2);
  });

  it('updateApplicationStatus() delegates with status and extras', () => {
    service.updateApplicationStatus(5, 'ACCEPTED', { room_id: 10 }).subscribe();
    expect(apiSpy.updateApplicationStatus).toHaveBeenCalledWith(5, 'ACCEPTED', { room_id: 10 });
  });

  it('updateApplicationStatus() delegates with REJECTED status', () => {
    service.updateApplicationStatus(6, 'REJECTED', { remarks: 'No vacancy' }).subscribe();
    expect(apiSpy.updateApplicationStatus).toHaveBeenCalledWith(6, 'REJECTED', { remarks: 'No vacancy' });
  });
});
