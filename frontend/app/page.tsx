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
            <span className="text-sm text-gray-400">商业资产管理平台</span>
          </div>
          <nav className="flex gap-6 text-sm text-gray-600">
            <Link href="/malls" className="hover:text-camp-600 transition-colors">
              购物中心
            </Link>
            <Link href="/finance" className="hover:text-camp-600 transition-colors">
              财务管理
            </Link>
            <Link href="/operations" className="hover:text-camp-600 transition-colors">
              运维管理
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          商业资产管理平台
        </h2>
        <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
          通过直观的铺位图纸可视化、AI智能合同处理和完整的租户生命周期管理，
          轻松管理您的购物中心资产组合。
        </p>

        {/* Quick Stats Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
          <StatCard label="购物中心" value="--" icon="building" />
          <StatCard label="铺位" value="--" icon="grid" />
          <StatCard label="出租率" value="--%" icon="chart" />
        </div>

        {/* CTA */}
        <Link
          href="/malls"
          className="inline-block px-6 py-3 bg-camp-600 text-white rounded-lg font-medium hover:bg-camp-700 transition-colors"
        >
          开始使用 - 查看购物中心
        </Link>
      </section>

      {/* Feature Highlights */}
      <section className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h3 className="text-xl font-semibold text-center mb-8">核心功能</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              title="铺位图纸可视化"
              description="交互式楼层平面图，点击铺位即可查看详情，直观管理"
            />
            <FeatureCard
              title="AI合同导入"
              description="自动从合同文件提取关键信息，智能匹配到对应铺位"
            />
            <FeatureCard
              title="租户全周期管理"
              description="从招商到续约的完整租户与合同管理流程"
            />
            <FeatureCard
              title="运维工单跟踪"
              description="报修工单管理、维保计划安排、问题处理闭环"
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
