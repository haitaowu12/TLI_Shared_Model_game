export class AdaptiveDifficulty {
  constructor() {
    this.history = [];
  }

  recordRound(performance) {
    this.history.push(performance);
    if (this.history.length > 2) {
      this.history.shift();
    }
  }

  getAdjustments() {
    if (this.history.length < 2) {
      return { timerAdjust: 0, extraInterrupt: false, pressureDirection: null };
    }

    const last2 = this.history.slice(-2);
    const bothHigh = last2.every(
      (p) => p.averageMeterValue > 75 && p.tagCoverage > 80
    );
    const eitherLow = last2.some(
      (p) => p.averageMeterValue < 40 || p.tagCoverage < 40
    );

    if (bothHigh) {
      return { timerAdjust: -10, extraInterrupt: true, pressureDirection: "up" };
    }
    if (eitherLow) {
      return { timerAdjust: 15, interruptPauses: true, pressureDirection: "down" };
    }
    return { timerAdjust: 0, extraInterrupt: false, pressureDirection: null };
  }

  shouldShowPressureIndicator() {
    const adj = this.getAdjustments();
    return adj.pressureDirection || null;
  }

  reset() {
    this.history = [];
  }
}
