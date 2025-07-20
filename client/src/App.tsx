// Minimal imports for debugging

function Router() {
  // Ultra simple test with no CSS classes
  return (
    <div style={{padding: '20px'}}>
      <h1>Debug Test</h1>
      <p>If you see this, React is working</p>
      <p>Current URL: {window.location.href}</p>
    </div>
  );
}

function App() {
  return <Router />;
}

export default App;
