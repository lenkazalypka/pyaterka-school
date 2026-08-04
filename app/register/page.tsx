import { AuthScreen } from "@/components/auth-screen";

export default async function Page({ searchParams }: { searchParams: Promise<{ name?: string; email?: string }> }) {
  const params = await searchParams;
  return <AuthScreen mode="register" initialName={params.name?.slice(0, 80)} initialEmail={params.email?.slice(0, 200)} />;
}
