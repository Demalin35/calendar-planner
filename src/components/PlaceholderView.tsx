interface PlaceholderViewProps {
  title: string;
  description: string;
}

export function PlaceholderView({ title, description }: PlaceholderViewProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-gray-100">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
    </div>
  );
}
