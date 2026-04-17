import Link from 'next/link';

/**
 * CAMP Dashboard / Home Page
 *
 * Shows overview of all malls with quick navigation.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-camp-700">CAMP</h1>
            <span className="text-sm text-gray-400">Commercial Asset Management Platform</span>
          </div>
          <nav className="flex gap-6 text-sm text-gray-600">
            <Link href="/malls" className="hover:text-camp-600 transition-colors">
              Malls
            </Link>
            <Link href="/finance" className="hover:text-camp-600 transition-colors">
              Finance
            </Link>
            <Link href="/operations" className="hover:text-camp-600 transition-colors">
              Operations
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Commercial Asset Management Platform
        </h2>
        <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
          Manage your shopping mall portfolio with intuitive floor plan visualization,
          AI-powered contract processing, and comprehensive tenant lifecycle management.
        </p>

        {/* Quick Stats Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
          <StatCard label="Malls" value="--" icon="building" />
          <StatCard label="Units" value="--" icon="grid" />
          <StatCard label="Occupancy" value="--%" icon="chart" />
        </div>

        {/* CTA */}
        <Link
          href="/malls"
          className="inline-block px-6 py-3 bg-camp-600 text-white rounded-lg font-medium hover:bg-camp-700 transition-colors"
        >
          Get Started - View Malls
        </Link>
      </section>

      {/* Feature Highlights */}
      <section className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h3 className="text-xl font-semibold text-center mb-8">Core Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              title="Floor Plan Visualization"
              description="Interactive floor plans with clickable unit hotspots for intuitive management"
            />
            <FeatureCard
              title="AI Contract Import"
              description="Auto-extract contract data from documents and match to units on floor plan"
            />
            <FeatureCard
              title="Tenant Lifecycle"
              description="Complete tenant and contract management from prospecting to renewal"
            />
            <FeatureCard
              title="Operations Tracking"
              description="Work order management, maintenance scheduling, and issue resolution"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-lg border p-6 text-center">
      <p className="text-3xl font-bold text-camp-600">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="border rounded-lg p-5">
      <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
