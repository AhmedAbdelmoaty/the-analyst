import { Component, type ReactNode } from 'react';

/** Keeps a render failure inside the game from blanking the screen. The local save is never cleared here. */
export class GameErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; key: number }> {
  state = { error: null as Error | null, key: 0 };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('[reward-decision] render error', error); }
  render() {
    if (!this.state.error) return <div key={this.state.key} style={{ display: 'contents' }}>{this.props.children}</div>;
    return (
      <main className="rd-root rd-fallback" dir="rtl" role="alert">
        <section>
          <h1>حصلت مشكلة في عرض اللعبة</h1>
          <p>تقدّمك المحفوظ ما اتمسحش. جرّب تاني، أو ارجع لصفحة الألعاب.</p>
          <div className="rd-actions">
            <button className="rd-button rd-button-primary" onClick={() => this.setState(s => ({ error: null, key: s.key + 1 }))}>إعادة المحاولة</button>
            <a className="rd-button rd-button-secondary" href="/app">الألعاب</a>
          </div>
        </section>
      </main>
    );
  }
}
