import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EndpointQRProps {
  endpointId: string;
  apiKey: string;
  projectName: string;
}

export default function EndpointQR({ endpointId, apiKey, projectName }: EndpointQRProps) {
  const [showQR, setShowQR] = useState(false);

  const paymentUrl = `${window.location.origin}/pay/${apiKey}`;

  const downloadQR = () => {
    const svg = document.getElementById(`qr-${endpointId}`)?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx!.fillStyle = "#ffffff";
      ctx!.fillRect(0, 0, 400, 400);
      ctx!.drawImage(img, 40, 40, 320, 320);
      // Add label
      ctx!.fillStyle = "#000000";
      ctx!.font = "bold 18px sans-serif";
      ctx!.textAlign = "center";
      ctx!.fillText(projectName, 200, 380);
      const a = document.createElement("a");
      a.download = `BrightPay-${projectName.replace(/\s+/g, "-")}-QR.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div>
      {!showQR ? (
        <Button size="sm" variant="outline" className="btn-press" onClick={() => setShowQR(true)}>
          <QrCode className="w-4 h-4 mr-1" /> Show QR
        </Button>
      ) : (
        <div className="rounded-xl bg-white p-4 text-center border border-border inline-block">
          <div id={`qr-${endpointId}`}>
            <QRCodeSVG value={paymentUrl} size={150} level="M" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-mono break-all">{paymentUrl}</p>
          <div className="flex gap-2 mt-2 justify-center">
            <Button size="sm" variant="ghost" className="text-xs btn-press" onClick={downloadQR}>
              <Download className="w-3 h-3 mr-1" /> Download
            </Button>
            <Button size="sm" variant="ghost" className="text-xs btn-press" onClick={() => setShowQR(false)}>
              Hide
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
