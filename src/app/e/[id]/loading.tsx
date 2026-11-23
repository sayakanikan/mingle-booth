export default function EventLoading() {
  return (
    <div className="min-h-screen bg-[#14100e] text-[#faf6ee] flex flex-col items-center py-8 px-4 font-sans animate-pulse">
      <div className="w-36 h-12 bg-white/10 rounded-xl mb-4" />
      <div className="w-64 h-8 bg-white/10 rounded-xl mb-2" />
      <div className="w-40 h-4 bg-white/5 rounded-md mb-8" />

      <div className="w-full max-w-7xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-1/2 sm:aspect-9/16 bg-white/5 border border-white/5 rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}
