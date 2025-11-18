/**
 * Metrics collection abstraction
 * In-memory implementation that can be swapped for Prometheus, DataDog, etc.
 */

export interface MetricLabels {
  [key: string]: string | number;
}

export interface Counter {
  name: string;
  value: number;
  labels: MetricLabels;
  timestamp: Date;
}

export interface Histogram {
  name: string;
  values: number[];
  labels: MetricLabels;
}

export interface Gauge {
  name: string;
  value: number;
  labels: MetricLabels;
  timestamp: Date;
}

/**
 * Simple in-memory metrics collector
 */
class MetricsCollector {
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private gauges: Map<string, Gauge> = new Map();

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1, labels: MetricLabels = {}): void {
    const key = this.getKey(name, labels);
    const existing = this.counters.get(key);

    if (existing) {
      existing.value += value;
      existing.timestamp = new Date();
    } else {
      this.counters.set(key, {
        name,
        value,
        labels,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.getKey(name, labels);
    const existing = this.histograms.get(key);

    if (existing) {
      existing.values.push(value);
      // Keep only last 1000 values to prevent memory issues
      if (existing.values.length > 1000) {
        existing.values.shift();
      }
    } else {
      this.histograms.set(key, {
        name,
        values: [value],
        labels,
      });
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, {
      name,
      value,
      labels,
      timestamp: new Date(),
    });
  }

  /**
   * Get counter value
   */
  getCounter(name: string, labels: MetricLabels = {}): number {
    const key = this.getKey(name, labels);
    return this.counters.get(key)?.value || 0;
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string, labels: MetricLabels = {}): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const key = this.getKey(name, labels);
    const histogram = this.histograms.get(key);

    if (!histogram || histogram.values.length === 0) {
      return null;
    }

    const values = [...histogram.values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / count;

    return {
      count,
      sum,
      avg,
      min: values[0],
      max: values[count - 1],
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99),
    };
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, labels: MetricLabels = {}): number | null {
    const key = this.getKey(name, labels);
    return this.gauges.get(key)?.value ?? null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): {
    counters: Counter[];
    histograms: Array<{ name: string; labels: MetricLabels; stats: any }>;
    gauges: Gauge[];
  } {
    return {
      counters: Array.from(this.counters.values()),
      histograms: Array.from(this.histograms.values()).map(h => ({
        name: h.name,
        labels: h.labels,
        stats: this.getHistogramStats(h.name, h.labels),
      })),
      gauges: Array.from(this.gauges.values()),
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }

  /**
   * Generate unique key for metric with labels
   */
  private getKey(name: string, labels: MetricLabels): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    return labelStr ? `${name}{${labelStr}}` : name;
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedValues: number[], p: number): number {
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedValues[lower];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }
}

/**
 * Global metrics instance
 */
export const metrics = new MetricsCollector();

/**
 * Helper to measure execution time
 */
export async function measureTime<T>(
  metricName: string,
  fn: () => Promise<T>,
  labels?: MetricLabels
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    metrics.recordHistogram(metricName, duration, labels);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    metrics.recordHistogram(metricName, duration, { ...labels, status: 'error' });
    throw error;
  }
}
