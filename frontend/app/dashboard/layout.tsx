'use client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav bar */}
      <header className="bg-white border-b">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          <a href="/" className="text-sm text-gray-500 hover:text-camp-600">&larr; 首页</a>
          <nav className="flex gap-5 text-sm text-gray-500">
            <a href="/malls" className="hover:text-gray-700">购物中心</a>
            <a href="/dashboard" className="font-medium text-camp-600 border-b-2 border-camp-600 pb-3">驾驶舱</a>
            <a href="/dashboard/plans" className="hover:text-gray-700">计划</a>
          </nav>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
