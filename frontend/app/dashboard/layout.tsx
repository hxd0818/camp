'use client';

import Link from 'next/link';

const TOOL_LINKS = [
  { href: '/dashboard/tools/brands', label: '品牌查询' },
  { href: '/dashboard/tools/units', label: '铺位查询' },
  { href: '/dashboard/tools/projects', label: '项目信息' },
  { href: '/dashboard/news', label: '市场资讯' },
];

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

      {/* Sub nav - Tool pages */}
      <div className="bg-gray-100 border-b">
        <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center gap-6 text-sm overflow-x-auto">
          {TOOL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap px-3 py-1 rounded-md transition-colors ${
                false ? 'text-gray-500 hover:text-camp-600 hover:bg-white' : 'text-camp-600 bg-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
