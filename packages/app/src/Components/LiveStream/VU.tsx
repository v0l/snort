import { useEffect, useRef } from "react";

export default function VuBar({
  track,
  full,
  width,
  height,
  className,
}: {
  track?: MediaStreamTrack;
  full?: boolean;
  height?: number;
  width?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (ref && track) {
      const audioContext = new AudioContext();

      const trackClone = track;
      const mediaStreamSource = audioContext.createMediaStreamSource(new MediaStream([trackClone]));
      const analyser = audioContext.createAnalyser();
      const minVU = -60;
      const maxVU = 0;
      const minFreq = 50;
      const maxFreq = 7_000;
      analyser.minDecibels = -100;
      analyser.maxDecibels = 0;
      analyser.smoothingTimeConstant = 0.4;
      analyser.fftSize = 1024;
      mediaStreamSource.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const filteredAudio = (i: Uint8Array) => {
        const binFreq = audioContext.sampleRate / 2 / dataArray.length;
        return i.subarray(minFreq / binFreq, maxFreq / binFreq);
      };
      const peakVolume = (data: Uint8Array) => {
        const max = data.reduce((acc, v) => (v > acc ? v : acc), 0);
        return (maxVU - minVU) * (max / 256) + minVU;
      };

      const canvas = ref.current!;
      const ctx = canvas.getContext("2d")!;
      const t = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const data = filteredAudio(dataArray);
        const vol = peakVolume(data);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (full) {
          ctx.fillStyle = "#00FF00";
          for (let x = 0; x < data.length; x++) {
            const bx = data[x];
            const h = canvas.height / data.length;
            ctx.fillRect(0, x * h, (bx / 255) * canvas.width, h);
          }
        }

        const barLen = ((vol - minVU) / (maxVU - minVU)) * canvas.height;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, canvas.height - barLen, canvas.width, barLen);
      }, 50);

      return () => {
        clearInterval(t);
        audioContext.close();
      };
    }
  }, [ref, track, full]);

  return <canvas ref={ref} width={width ?? 200} height={height ?? 10} className={className}></canvas>;
}
