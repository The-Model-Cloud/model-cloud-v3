// Force dynamic rendering for all admin routes
export const dynamic = "force-dynamic";

export default function AdminTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
