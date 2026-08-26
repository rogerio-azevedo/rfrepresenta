export default function CatalogLoading() {
  return <main className="mx-auto w-full max-w-[1440px] animate-pulse px-4 py-10 sm:px-6 lg:px-8"><div className="h-9 w-72 rounded bg-muted" /><div className="mt-4 h-5 w-full max-w-xl rounded bg-muted" /><div className="mt-8 h-11 rounded bg-muted" /><div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div className="aspect-[3/5] rounded-md bg-muted" key={index} />)}</div></main>;
}
