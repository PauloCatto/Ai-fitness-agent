import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { StateService } from '../state/state.service';

/** Redirects to /login if no user is set in state */
export const authGuard: CanActivateFn = () => {
  const state = inject(StateService);
  const router = inject(Router);

  return state.user$.pipe(
    take(1),
    map((user) => (user ? true : router.createUrlTree(['/login']))),
  );
};
