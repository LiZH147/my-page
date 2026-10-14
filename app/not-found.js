import { generatePageMetadata, SITE_CONFIG } from '@/lib/seo';
import Link from 'next/link';

export const metadata = generatePageMetadata({
  title: '404 - 页面未找到',
  description: '您访问的页面不存在，请返回首页浏览其他内容。',
});

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">页面未找到</h1>
      <p className="text-gray-500 mb-8">
        您访问的页面不存在或已被移除，请返回首页浏览其他内容。
      </p>
      <Link
        href="/"
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors font-medium"
      >
        返回首页
      </Link>
    </div>
  );
}