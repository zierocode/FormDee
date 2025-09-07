export default function LoadingEditForm() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 rounded bg-gray-200 animate-pulse" />
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="h-10 w-full rounded-md bg-gray-100 animate-pulse" />
            </div>
          ))}
          <div className="md:col-span-2 space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-24 w-full rounded-md bg-gray-100 animate-pulse" />
          </div>
          <div className="md:col-span-2">
            <div className="h-9 w-28 rounded-md bg-blue-200 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

