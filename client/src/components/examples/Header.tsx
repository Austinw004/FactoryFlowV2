import { Header } from '../Header';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function HeaderExample() {
  return (
    <SidebarProvider>
      <div className="w-full">
        <Header />
        <div className="p-8">
          <h1 className="text-2xl font-semibold">Page Content</h1>
        </div>
      </div>
    </SidebarProvider>
  );
}
