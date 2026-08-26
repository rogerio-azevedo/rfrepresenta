import { notFound } from "next/navigation";
import { CatalogAdminNav } from "@/components/products/catalog-admin-nav";
import { FamilyEditor } from "@/components/products/family-editor";
import { PageHeading } from "@/components/layout/page-heading";
import { getR2ObjectUrl } from "@/server/catalog/r2";
import { getAdminFamily } from "@/server/dal/catalog-admin";
import { ResourceNotFoundError } from "@/server/auth/errors";

export default async function FamilyPage({ params }: { params: Promise<{ familyId: string }> }) {
  const { familyId } = await params;
  let family;
  try { family = await getAdminFamily(familyId); } catch (error) { if (error instanceof ResourceNotFoundError) notFound(); throw error; }
  const serialized = { ...family, members: family.members.map((member) => ({ ...member, salePrice: member.salePrice ? Number(member.salePrice) : null, imageUrl: member.imageKey ? getR2ObjectUrl(member.imageKey) : null })) };
  return <><PageHeading title={family.name} description={`${family.members.length} SKU(s) nesta família`} /><CatalogAdminNav current="/admin/produtos/familias" /><FamilyEditor family={serialized} /></>;
}
