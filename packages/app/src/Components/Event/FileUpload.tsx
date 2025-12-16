import Progress from "@/Components/Progress/Progress";
import type { UploadProgress } from "@/Utils/Upload";

export default function FileUploadProgress({ progress }: { progress: Array<UploadProgress> }) {
  return (
    <div className="flex flex-col gap-2">
      {progress.map(p => (
        <div key={p.id} className="flex flex-col gap-0.5" id={p.id}>
          {"name" in p.file ? p.file.name : ""}
          <Progress value={p.progress} status={p.stage} />
        </div>
      ))}
    </div>
  );
}
