export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <h1 className="text-2xl font-semibold">Table not found</h1>
      <p className="text-gray-500 text-center">
        This table doesn&apos;t exist or the link is incorrect.
      </p>
    </main>
  );
}
