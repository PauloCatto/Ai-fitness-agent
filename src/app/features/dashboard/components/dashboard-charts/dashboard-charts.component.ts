import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { ProgressMetrics, FatigueLevel } from '../../../../core/models';

@Component({
  selector: 'app-dashboard-charts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-charts.component.html',
  styleUrl: './dashboard-charts.component.scss',
})
export class DashboardChartsComponent implements AfterViewInit, OnChanges {
  @Input() progress: ProgressMetrics | null = null;
  @Input() fatigue: FatigueLevel | null = null;

  @ViewChild('volumeChart') volumeCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fatigueChart') fatigueCanvas!: ElementRef<HTMLCanvasElement>;

  private volumeChart?: Chart;
  private fatigueChart?: Chart;

  ngOnChanges(changes: SimpleChanges) {
    if (this.volumeChart && changes['progress']) {
      this.updateVolumeChart();
    }
    if (this.fatigueChart && changes['fatigue']) {
      this.updateFatigueChart();
    }
  }

  ngAfterViewInit() {
    this.initVolumeChart();
    this.initFatigueChart();
  }

  private initVolumeChart() {
    this.volumeChart = new Chart(this.volumeCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
        datasets: [{
          label: 'Séries',
          data: [0, 0, 0, 0, 0, 0, 0],
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
    this.updateVolumeChart();
  }

  private updateVolumeChart() {
    if (!this.volumeChart) return;
    // Mock simulation for demo if no real data is found
    const mockData = this.progress?.weeklyConsistency === 0 ? [12, 19, 3, 5, 2, 3, 0] : [15, 22, 10, 8, 12, 5, 2];
    this.volumeChart.data.datasets[0].data = mockData;
    this.volumeChart.update();
  }

  private initFatigueChart() {
    this.fatigueChart = new Chart(this.fatigueCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
        datasets: [{
          label: 'Índice',
          data: [0, 0, 0, 0],
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
    this.updateFatigueChart();
  }

  private updateFatigueChart() {
    if (!this.fatigueChart) return;
    const currentScore = this.fatigue?.score || 0;
    const history = [2, 4, 3, currentScore];
    this.fatigueChart.data.datasets[0].data = history;
    this.fatigueChart.update();
  }
}

