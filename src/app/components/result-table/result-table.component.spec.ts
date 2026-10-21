import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultTableComponent } from './result-table.component';

describe('ResultTableComponent', () => {
  let fixture: ComponentFixture<ResultTableComponent>;
  let element: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(ResultTableComponent);
    fixture.componentRef.setInput('title', 'קיים בחיצוני ולא קיים בפנימי');
    fixture.componentRef.setInput('variant', 'external');
    fixture.componentRef.setInput('headers', ['מספר פריט']);
    fixture.componentRef.setInput('rows', [{ key: 'ab1', cells: [{ value: 'AB1', text: 'AB1' }] }]);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  it('starts closed, showing only the title with the row count', () => {
    expect(element.querySelector('.toggle')?.textContent).toContain('(1)');
    expect(element.querySelector('table')).toBeNull();
  });

  it('opens and closes when the title is clicked', () => {
    const toggle = element.querySelector<HTMLButtonElement>('.toggle')!;

    toggle.click();
    fixture.detectChanges();
    expect(element.querySelector('table')?.textContent).toContain('AB1');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    fixture.detectChanges();
    expect(element.querySelector('table')).toBeNull();
  });
});
