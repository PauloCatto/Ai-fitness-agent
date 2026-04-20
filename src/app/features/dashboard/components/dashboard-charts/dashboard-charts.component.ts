import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard-charts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-charts.component.html',
  styleUrl: './dashboard-charts.component.scss',
})
export class DashboardChartsComponent implements OnInit, AfterViewInit {
  @ViewChild('volumeChart') volumeCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fatigueChart') fatigueCanvas!: ElementRef<HTMLCanvasElement>;

  ngOnInit() {}

  ngAfterViewInit() {
    this.initVolumeChart();
    this.initFatigueChart();
  }

  private initVolumeChart() {
    new Chart(this.volumeCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
        datasets: [{
          label: 'Séries',
          data: [12, 19, 3, 5, 2, 3, 0],
          backgroundColor: 'rgba(163, 230, 53, 0.6)',
          borderColor: 'var(--accent)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { 
            beginAtZero: true, 
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'var(--text-3)' }
          },
          x: {
            grid: { display: false },
            ticks: { color: 'var(--text-3)' }
          }
        }
      }
    });
  }

  private initFatigueChart() {
    new Chart(this.fatigueCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
        datasets: [{
          label: 'Índice',
          data: [2, 4, 3, 6],
          borderColor: 'var(--ai)',
          backgroundColor: 'rgba(129, 140, 248, 0.2)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { 
            beginAtZero: true, 
            max: 10,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'var(--text-3)' }
          },
          x: {
            grid: { display: false },
            ticks: { color: 'var(--text-3)' }
          }
        }
      }
    });
  }
}

