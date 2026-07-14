import { fetchQuery } from "convex/nextjs";
import { makeFunctionReference } from "convex/server";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { NextResponse } from "next/server";

const resolveApprovedAsset = makeFunctionReference<
  "query",
  { assetId: Id<"assetUploads"> },
  string | null
>("assets:resolveApproved");

export async function GET(_request: Request, context: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await context.params;
  const storageUrl = await fetchQuery(resolveApprovedAsset, { assetId: assetId as Id<"assetUploads"> });
  if (!storageUrl) return NextResponse.json({ error: "Approved asset not found" }, { status: 404 });
  return NextResponse.redirect(storageUrl, 307);
}
