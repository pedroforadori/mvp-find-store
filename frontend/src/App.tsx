import { LeadsList } from './components/LeadsList';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Leads — Prospecção São Paulo</h1>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-6">
        <LeadsList />
      </main>
    </div>
  );
}

export default App;
