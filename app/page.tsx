export default function HomePage() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-lg border bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📝</div>
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Missing Form Key</h1>
          <p className="text-gray-600">
            You need a form reference key to view a form.
          </p>
        </div>

        <div className="space-y-4 text-sm">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-gray-700 mb-2">
              <strong>To access a form:</strong>
            </p>
            <p className="text-gray-600">
              Please validate the URL and try again with a valid refKey in the format:
            </p>
            <p className="text-blue-700 font-mono mt-2">
              /f/your-form-key
            </p>
          </div>
          
          <div className="text-center text-xs text-gray-500 pt-4 border-t">
            FormDee - ฟอร์มดี
          </div>
        </div>
      </div>
    </div>
  )
}

