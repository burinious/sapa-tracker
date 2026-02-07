import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("App crashed:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 18, fontFamily: "system-ui" }}>
          <h2 style={{ margin: 0 }}>SapaTracker crashed í·¯</h2>
          <p style={{ opacity: 0.8 }}>Hereâ€™s the error:</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#111827", color: "#e5e7eb", padding: 12, borderRadius: 12 }}>
            {String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
