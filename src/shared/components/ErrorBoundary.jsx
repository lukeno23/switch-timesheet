import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-switch-bg">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border-t-4 border-switch-primary">
            <h2 className="text-xl font-bold text-switch-secondary font-dm mb-2">
              Something went wrong
            </h2>
            <p className="text-stone-500 text-sm font-dm mb-6">
              Refresh the page to try again. If the problem persists, contact your administrator.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-switch-secondary text-white px-4 py-2 rounded-lg font-dm font-bold"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
