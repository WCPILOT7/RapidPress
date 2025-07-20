import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Completely isolated landing page with NO external dependencies
// No auth context, no queries, no database calls - pure presentation until auth needed
export default function PureLanding() {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Direct API calls without auth context to avoid loading overhead
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email, password } 
        : { name, email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `${isLogin ? 'Login' : 'Registration'} failed`);
      }

      setSuccess(isLogin ? 'Login successful!' : 'Account created successfully!');
      
      // Redirect to dashboard after success
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);

    } catch (error: any) {
      setError(error.message || `${isLogin ? 'Login' : 'Registration'} failed`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instant Hero Section - No external dependencies */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold mb-4 bg-yellow-50 border-yellow-200">
            <span className="text-yellow-600">⭐</span>
            <span className="ml-2">#1 AI Press Release Platform</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
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

        {/* Streamlined Features - Pure static content */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <div className="text-center p-6 bg-white/80 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">✨</div>
            <h3 className="font-semibold mb-2">AI-Powered Generation</h3>
            <p className="text-sm text-gray-600">Create professional press releases in seconds</p>
          </div>
          <div className="text-center p-6 bg-white/80 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-semibold mb-2">Contact Management</h3>
            <p className="text-sm text-gray-600">Upload and manage media contacts easily</p>
          </div>
          <div className="text-center p-6 bg-white/80 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="font-semibold mb-2">Multi-Platform Distribution</h3>
            <p className="text-sm text-gray-600">Generate content for all your channels</p>
          </div>
        </div>

        {/* Pure Auth Form - No context dependencies */}
        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold">
                {isLogin ? 'Welcome Back!' : 'Start Your Free Trial'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {isLogin 
                  ? 'Sign in to continue'
                  : 'Join thousands of PR professionals'
                }
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 rounded-md bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                
                {success && (
                  <div className="p-3 rounded-md bg-green-50 border border-green-200">
                    <p className="text-sm text-green-600">{success}</p>
                  </div>
                )}
                
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
                      className="h-11"
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
                    className="h-11"
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
                    className="h-11"
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
                      className="h-11"
                    />
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full h-11 font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Start Free Trial')}
                </Button>
                
                {!isLogin && (
                  <p className="text-center text-xs text-gray-500">
                    No credit card required
                  </p>
                )}

                {isLogin && (
                  <p className="text-center text-xs text-gray-500">
                    Demo: test@example.com / password123
                  </p>
                )}

                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    {isLogin ? "Don't have an account?" : "Already registered?"}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                        setSuccess('');
                        if (!isLogin) {
                          setEmail('test@example.com');
                          setPassword('password123');
                        } else {
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

        {/* Minimal footer */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm mb-4">Trusted by professionals worldwide</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center"><span className="text-green-500 mr-1">✓</span> SOC 2 Compliant</span>
            <span className="flex items-center"><span className="text-green-500 mr-1">✓</span> GDPR Ready</span>
            <span className="flex items-center"><span className="text-green-500 mr-1">✓</span> 99.9% Uptime</span>
          </div>
        </div>
      </div>
    </div>
  );
}