import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface HttpOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  observe?: 'body';
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  reportProgress?: boolean;
  responseType?: 'json';
  withCredentials?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }

  get<T>(path: string, options?: HttpOptions): Observable<T> {
    return this.http.get<T>(path, options).pipe(
      catchError(this.formatErrors)
    );
  }

  post<T>(path: string, body: any = {}, options?: HttpOptions): Observable<T> {
    return this.http.post<T>(path, body, options).pipe(
      catchError(this.formatErrors)
    );
  }

  put<T>(path: string, body: any = {}, options?: HttpOptions): Observable<T> {
    return this.http.put<T>(path, body, options).pipe(
      catchError(this.formatErrors)
    );
  }

  delete<T>(path: string, options?: HttpOptions): Observable<T> {
    return this.http.delete<T>(path, options).pipe(
      catchError(this.formatErrors)
    );
  }

  private formatErrors(error: any): Observable<never> {
    let errorMessage = 'Ocorreu um erro inesperado.';

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else if (error.status) {
      errorMessage = `Backend retornou código ${error.status}: ${error.message}`;
      if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
