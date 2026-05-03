import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, throwError } from 'rxjs';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  // If the request URL starts with a '/', we prefix it with the API URL
  const isApiRequest = req.url.startsWith('/');

  let authReq = req;

  if (isApiRequest) {
    authReq = req.clone({
      url: `${environment.apiUrl}${req.url}`
    });
  }

  const token = localStorage.getItem('ai_fitness_token');
  if (token && isApiRequest) {
    authReq = authReq.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      console.error('HTTP Error Details:', error);
      return throwError(() => error);
    })
  );
};
