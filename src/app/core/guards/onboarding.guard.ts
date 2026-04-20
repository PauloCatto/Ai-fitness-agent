import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { StateService } from '../state/state.service';


export const onboardingGuard: CanActivateFn = () => {
  const state = inject(StateService);
  const router = inject(Router);

  return state.user$.pipe(
    take(1),
    map((user) => {
      if (!user) return router.createUrlTree(['/login']);
      if (!user.onboardingCompleted) return router.createUrlTree(['/onboarding']);
      return true;
    }),
  );
};

