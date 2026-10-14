import "server-only";
import { headers } from "next/headers";

/**
 * رابط الموقع. بيتاخد من الهيدر عشان يشتغل على أي دومين
 * من غير إعداد، ولو NEXT_PUBLIC_SITE_URL متظبّط بيتغلّب عليه.
 */
export async function getBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
