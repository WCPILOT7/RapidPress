import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function SimpleLanding() {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin && password !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
      } else {
        await register(name, email, password);
        toast({
          title: 'Welcome to PR Studio!',
          description: 'Your account has been created successfully.',
        });
      }
      setLocation('/dashboard');
    } catch (error: any) {
      toast({
        title: isLogin ? 'Login failed' : 'Registration failed',
        description: error.message || 'Please check your credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold mb-4 bg-yellow-50 border-yellow-200">
            <span className="text-yellow-600">⭐</span>
            <span className="ml-2">#1 AI Press Release Platform</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Your PR Strategy with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              AI-Powered
            </span>{' '}
            Press Releases
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Generate professional press releases, manage media contacts, and create targeted 
            advertisements in minutes. Trusted by PR professionals worldwide.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4">
              <div className="mb-4">
                <span className="text-3xl">✨</span>
              </div>
              <CardTitle className="text-xl">AI-Powered Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 leading-relaxed">
                Create professional press releases in seconds with advanced AI technology
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4">
              <div className="mb-4">
                <span className="text-3xl">👥</span>
              </div>
              <CardTitle className="text-xl">Contact Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 leading-relaxed">
                Upload and manage your media contacts with CSV import and organization tools
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4">
              <div className="mb-4">
                <span className="text-3xl">🚀</span>
              </div>
              <CardTitle className="text-xl">Multi-Platform Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 leading-relaxed">
                Generate targeted advertisements for social media and various platforms
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4">
              <div className="mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <CardTitle className="text-xl">Lightning Fast</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 leading-relaxed">
                Generate, edit, and distribute content faster than traditional methods
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4">
              <div className="mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <CardTitle className="text-xl">Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 leading-relaxed">
                Your data is protected with enterprise-grade security and user isolation
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-4">
              <div className="mb-4">
                <span className="text-3xl">⏰</span>
              </div>
              <CardTitle className="text-xl">Save Hours of Work</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 leading-relaxed">
                Automate your PR workflow and focus on strategy instead of manual writing
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Auth Section */}
        <div className="max-w-lg mx-auto">
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold">
                {isLogin ? 'Welcome Back!' : 'Start Your Free Trial'}
              </CardTitle>
              <CardDescription className="text-gray-600 text-lg">
                {isLogin 
                  ? 'Sign in to continue to your dashboard'
                  : 'Join thousands of PR professionals transforming their workflow'
                }
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6 px-8">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12"
                  />
                </div>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12"
                    />
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : (isLogin ? 'Sign In to Dashboard' : 'Start Free Trial - No Credit Card Required')}
                </Button>

                {!isLogin && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Free forever • No setup fees • Cancel anytime
                    </p>
                  </div>
                )}

                {isLogin && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      Demo account: test@example.com / password123
                    </p>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">or</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {isLogin ? "Don't have an account?" : "Already registered?"}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(!isLogin);
                        if (!isLogin) {
                          // Switching to login, prefill demo credentials
                          setEmail('test@example.com');
                          setPassword('password123');
                        } else {
                          // Switching to signup, clear fields
                          setEmail('');
                          setPassword('');
                          setName('');
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold underline"
                    >
                      {isLogin ? 'Create free account' : 'Sign in here'}
                    </button>
                  </p>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>

        {/* Social Proof */}
        <div className="text-center mt-16">
          <p className="text-gray-500 text-sm mb-6">Trusted by professionals at leading companies</p>
          <div className="flex items-center justify-center space-x-12 opacity-60">
            <div className="text-xl font-bold text-gray-400">TechCorp</div>
            <div className="text-xl font-bold text-gray-400">MediaFlow</div>
            <div className="text-xl font-bold text-gray-400">StartupLab</div>
            <div className="text-xl font-bold text-gray-400">InnovatePR</div>
            <div className="text-xl font-bold text-gray-400">GlobalNews</div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex justify-center space-x-8 mt-12">
          <div className="flex items-center text-sm text-gray-500">
            <span className="text-green-500 mr-2">✓</span>
            SOC 2 Compliant
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <span className="text-green-500 mr-2">✓</span>
            GDPR Ready
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <span className="text-green-500 mr-2">✓</span>
            99.9% Uptime
          </div>
        </div>
      </div>
    </div>
  );
}