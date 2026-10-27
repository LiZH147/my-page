export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-40 bg-gray-200 rounded mb-6" />

      {/* Title + count skeleton */}
      <div className="h-10 w-64 bg-gray-200 rounded mb-3" />
      <div className="h-5 w-32 bg-gray-100 rounded mb-8" />

      {/* Child-category pills skeleton */}
      <div className="flex flex-wrap gap-2 mb-8">
        <div className="h-8 w-24 bg-gray-100 rounded-full" />
        <div className="h-8 w-20 bg-gray-100 rounded-full" />
        <div className="h-8 w-28 bg-gray-100 rounded-full" />
      </div>

      {/* Article card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-5">
            <div className="h-5 w-3/4 bg-gray-200 rounded mb-3" />
            <div className="h-4 w-full bg-gray-100 rounded mb-2" />
            <div className="h-4 w-5/6 bg-gray-100 rounded mb-4" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
