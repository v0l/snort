import Progress from "Element/Progress";
import { UploadProgress } from "Upload";

export default function FileUploadProgress({ progress }: { progress: Array<UploadProgress> }) {
  return (
    <div className="flex flex-col g8">
      {progress.map(p => (
        <div className="flex flex-col g2" id={p.id}>
          {p.file.name}
          <Progress value={p.progress} status={p.stage} />
        </div>
      ))}
    </div>
  );
}
