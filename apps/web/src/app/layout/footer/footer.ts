import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="border-t border-neutral-200 py-6 px-6 text-center text-sm text-neutral-400">
      &copy; {{ year }} Adrián León
    </footer>
  `,
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}
