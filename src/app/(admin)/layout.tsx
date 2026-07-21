/** Administration takes over the full viewport (no app chrome, like the reference). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen overflow-hidden">{children}</div>;
}
