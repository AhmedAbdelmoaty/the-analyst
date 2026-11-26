/** One accepted navigation per visible message, with a click-through cooldown. */
export class DialogueGuard {
  private accepted: string | null = null;
  private last = -Infinity;
  accept(message: string, now: number) {
    if (this.accepted === message || now - this.last < 450) return false;
    this.accepted = message;
    this.last = now;
    return true;
  }
}