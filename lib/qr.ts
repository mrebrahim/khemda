import "server-only";
import QRCode from "qrcode";

/** QR كـdata URL عشان يتحط في <img> على طول من السيرفر */
export async function qrDataUrl(text: string, size = 220): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}
