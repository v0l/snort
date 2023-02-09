import QRCodeStyling from "qr-code-styling";
import { useEffect, useRef } from "react";

export interface QrCodeProps {
  data?: string;
  link?: string;
  avatar?: string;
  height?: number;
  width?: number;
  className?: string;
}

export default function QrCode(props: QrCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((props.data?.length ?? 0) > 0 && qrRef.current) {
      const qr = new QRCodeStyling({
        width: props.width || 256,
        height: props.height || 256,
        data: props.data,
        margin: 5,
        type: "canvas",
        image: props.avatar,
        dotsOptions: {
          type: "rounded",
        },
        cornersSquareOptions: {
          type: "extra-rounded",
        },
        imageOptions: {
          crossOrigin: "anonymous",
        },
      });
      qrRef.current.innerHTML = "";
      qr.append(qrRef.current);
      if (props.link) {
        qrRef.current.onclick = function () {
          const elm = document.createElement("a");
          elm.href = props.link ?? "";
          elm.click();
        };
      }
    } else if (qrRef.current) {
      qrRef.current.innerHTML = "";
    }
  }, [props.data, props.link]);

  return <div className={`qr${props.className ?? ""}`} ref={qrRef}></div>;
}
