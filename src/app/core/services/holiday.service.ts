import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';

export interface Holiday {
  date: string;
  name: string;
  type: string;
}

@Injectable({ providedIn: 'root' })
export class HolidayService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://brasilapi.com.br/api/feriados/v1';
  
  private holidaysCache$?: Observable<Holiday[]>;

  getHolidays(year: number = new Date().getFullYear()): Observable<Holiday[]> {
    if (!this.holidaysCache$) {
      this.holidaysCache$ = this.http.get<Holiday[]>(`${this.apiUrl}/${year}`).pipe(
        shareReplay(1)
      );
    }
    return this.holidaysCache$;
  }

  getNextHoliday(): Observable<Holiday | null> {
    const today = new Date();
    return this.getHolidays().pipe(
      map(holidays => {
        const futureHolidays = holidays
          .map(h => ({ ...h, parsedDate: new Date(h.date + 'T00:00:00') }))
          .filter(h => h.parsedDate >= today)
          .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
        
        return futureHolidays.length > 0 ? futureHolidays[0] : null;
      })
    );
  }
}
