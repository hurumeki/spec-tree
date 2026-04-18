import { Route, Routes } from 'react-router-dom';
import Nav from './components/Nav';
import TraceabilityMap from './pages/TraceabilityMap';
import NodeDetail from './pages/NodeDetail';
import ImpactView from './pages/ImpactView';
import JsonImport from './pages/JsonImport';

const App = () => {
  return (
    <div className="app-shell">
      <Nav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<TraceabilityMap />} />
          <Route path="/nodes/:id" element={<NodeDetail />} />
          <Route path="/impact/:crId" element={<ImpactView />} />
          <Route path="/import" element={<JsonImport />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
