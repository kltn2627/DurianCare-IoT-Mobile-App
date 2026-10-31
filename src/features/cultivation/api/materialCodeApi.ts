import { authorizedRequest } from "@/src/features/auth/authApi";
import type { AgriculturalInput } from "./cultivationTypes";
import type { ScannedMaterialCode } from "./materialCode";

export type MaterialCodeResolution = { found: boolean; agriculturalInput: AgriculturalInput | null };

export async function resolveMaterialCode(code: string): Promise<MaterialCodeResolution> {
  const response = await authorizedRequest<MaterialCodeResolution>({
    method: "GET",
    url: "/api/v1/agricultural-inputs/resolve-code",
    params: { code },
  });
  return response.data;
}

export async function saveMaterialCodeMapping(scanned: ScannedMaterialCode, agriculturalInputId: string): Promise<void> {
  await authorizedRequest({
    method: "POST",
    url: "/api/v1/agricultural-inputs/code-mappings",
    data: { ...scanned, agriculturalInputId },
  });
}
