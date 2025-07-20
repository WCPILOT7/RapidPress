import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { User, LogOut, FileText, Share, Home, PlusCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navigation() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="border-b bg-white px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-6">
          <Link href="/" className="font-bold text-xl text-gray-900">
            PR Studio
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button 
                variant={location === '/dashboard' ? 'default' : 'ghost'} 
                size="sm"
                className="flex items-center space-x-2"
              >
                <Home className="h-4 w-4" />
                <span>Press Releases</span>
              </Button>
            </Link>
            <Link href="/advertisements">
              <Button 
                variant={location === '/advertisements' ? 'default' : 'ghost'} 
                size="sm"
                className="flex items-center space-x-2"
              >
                <Share className="h-4 w-4" />
                <span>Advertisements</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout} className="flex items-center space-x-2">
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
}