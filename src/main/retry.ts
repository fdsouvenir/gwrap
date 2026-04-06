export class RetryController {
  private attempts = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly maxAttempts: number,
    private readonly baseDelayMs: number,
    private readonly onRetry: (attempt: number) => void
  ) {}

  reset(): void {
    this.attempts = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  schedule(): boolean {
    if (this.attempts >= this.maxAttempts || this.timer) {
      return false;
    }

    this.attempts += 1;
    const delay = this.baseDelayMs * this.attempts;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.onRetry(this.attempts);
    }, delay);

    return true;
  }
}
