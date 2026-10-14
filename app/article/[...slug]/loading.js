export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-32 bg-gray-200 rounded mb-6" />

      {/* Title skeleton */}
      <div className="h-10 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="h-5 w-1/2 bg-gray-100 rounded mb-8" />

      {/* Content skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-5/6 bg-gray-100 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-4/6 bg-gray-100 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-3/4 bg-gray-100 rounded" />
      </div>

      {/* Code block skeletons */}
      <div className="mt-8 space-y-4">
        <div className="h-32 w-full bg-gray-200 rounded-lg" />
        <div className="h-4 w-1/3 bg-gray-100 rounded" />
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-2/3 bg-gray-100 rounded" />
        <div className="h-24 w-full bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}