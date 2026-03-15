import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { HomeComponent } from './home';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), provideLocationMocks()],
    }).compileComponents();
    fixture   = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('has 6 feature items', () => {
    expect(component.features.length).toBe(6);
  });

  it('features contain expected titles', () => {
    const titles = component.features.map(f => f.title);
    expect(titles).toContain('Room Management');
    expect(titles).toContain('Billing & Payments');
    expect(titles).toContain('Maintenance Requests');
  });

  it('goToLogin() navigates to /login', async () => {
    const spy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.goToLogin();
    expect(spy).toHaveBeenCalledWith(['/login']);
  });

  it('goToRegister() navigates to /register', async () => {
    const spy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.goToRegister();
    expect(spy).toHaveBeenCalledWith(['/register']);
  });
});
