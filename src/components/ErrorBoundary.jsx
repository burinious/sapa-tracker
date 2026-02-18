import React from "react";
import "../styles/app.css";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="loading-screen">
          <div className="page-card" style={{ maxWidth: 760 }}>
            <h2 className="page-title">SapaTracker crashed</h2>
            <p className="page-sub">Here is the error:</p>
            <pre className="list-card" style={{ whiteSpace: "pre-wrap" }}>
              {String(this.state.error)}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
