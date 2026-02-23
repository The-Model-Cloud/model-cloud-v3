import Link from "next/link";

export default function ClientSignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background p-4">
      <Link href="/" className="mb-8">
        <span className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          The Model Cloud
        </span>
      </Link>
      <div className="w-full max-w-4xl">{children}</div>
    </div>
  );
}
