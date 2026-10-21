import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('renders the two upload boxes with compare disabled', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('app-file-drop')).toHaveLength(2);
    expect(element.querySelector<HTMLButtonElement>('button.primary')?.disabled).toBe(true);
  });
});
