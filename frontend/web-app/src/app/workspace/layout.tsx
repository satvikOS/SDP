import { Sidebar } from '@/components/Sidebar';

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="workspace-shell">
      <Sidebar />
      <main className="workspace-main" id="main-content">{children}</main>
    </div>
  );
}
