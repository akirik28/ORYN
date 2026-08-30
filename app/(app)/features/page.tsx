import { requireUser } from "@/lib/security/dal";
import { FeaturesView } from "@/features/catalog/features-view";

export const metadata = { title: "Features" };

export default async function FeaturesPage() {
  const session = await requireUser();
  return <FeaturesView userId={session.userId!} />;
}
