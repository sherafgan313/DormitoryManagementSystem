import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ComplaintService } from './complaint.service';
import { ApiService } from './api.service';

describe('ComplaintService', () => {
  let service: ComplaintService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getComplaints', 'submitComplaint', 'updateComplaintStatus',
    ]);
    apiSpy.getComplaints.and.returnValue(of([]));
    apiSpy.submitComplaint.and.returnValue(of({ success: true }));
    apiSpy.updateComplaintStatus.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        ComplaintService,
        { provide: ApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(ComplaintService);
  });

  it('should be created', () => expect(service).toBeTruthy());

  it('getComplaints() delegates to api.getComplaints()', () => {
    service.getComplaints().subscribe();
    expect(apiSpy.getComplaints).toHaveBeenCalled();
  });

  it('submitComplaint() delegates with description', () => {
    service.submitComplaint('Leaky roof').subscribe();
    expect(apiSpy.submitComplaint).toHaveBeenCalledWith('Leaky roof');
  });

  it('updateComplaintStatus() delegates with id and IN_PROGRESS', () => {
    service.updateComplaintStatus(3, 'IN_PROGRESS').subscribe();
    expect(apiSpy.updateComplaintStatus).toHaveBeenCalledWith(3, 'IN_PROGRESS');
  });

  it('updateComplaintStatus() delegates with id and RESOLVED', () => {
    service.updateComplaintStatus(4, 'RESOLVED').subscribe();
    expect(apiSpy.updateComplaintStatus).toHaveBeenCalledWith(4, 'RESOLVED');
  });

  it('updateComplaintStatus() delegates with id and SUBMITTED', () => {
    service.updateComplaintStatus(5, 'SUBMITTED').subscribe();
    expect(apiSpy.updateComplaintStatus).toHaveBeenCalledWith(5, 'SUBMITTED');
  });
});
