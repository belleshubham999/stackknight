// Set favicon to favicon.png from assets
function processFavicon() {
    const link = document.querySelector('link[rel="icon"]');
    if (link) {
        link.href = './trickle/assets/favicon.png';
    }
}

// Important: DO NOT remove this `ErrorBoundary` component.
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                    <div className="text-center p-6">
                        <h1 className="text-2xl font-bold mb-4 text-red-500 pixel-font">CRASHED!</h1>
                        <p className="text-gray-400 mb-6">The knight stumbled.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
                        >
                            Respawn (Reload)
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

function App() {
    try {
        return (
            <StackKnightGame />
        );
    } catch (error) {
        console.error('App component error:', error);
        return null;
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

// Process favicon on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(processFavicon, 100));
} else {
    setTimeout(processFavicon, 100);
}