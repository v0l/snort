export default function JsonBlock({ obj }: { obj: object }) {
  return (
    <div className="layer-2 p-3 overflow-auto text-[10px] font-mono whitespace-pre">
      {JSON.stringify(obj, undefined, 2)}
    </div>
  );
}
