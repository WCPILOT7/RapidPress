import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Share2, 
  Zap, 
  Shield, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function Landing() {
  const [isLogin, setIsLogin] = useState(true);
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
          title: 'Welcome!',
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

  const features = [
    {
      icon: <Sparkles className="h-6 w-6 text-blue-600" />,
      title: "AI-Powered Generation",
      description: "Create professional press releases in seconds with advanced AI technology"
    },
    {
      icon: <Users className="h-6 w-6 text-green-600" />,
      title: "Instant Distribution",
      description: "Upload and manage your media contacts or get access to top lists"
    },
    {
      icon: <Share2 className="h-6 w-6 text-purple-600" />,
      title: "Multi-Platform Distribution",
      description: "Generate instant advertisements for social media and various platforms"
    },
    {
      icon: <Clock className="h-6 w-6 text-orange-600" />,
      title: "Save Hours of Work",
      description: "Automate your PR workflow and focus on strategy instead of manual writing"
    },
    {
      icon: <Shield className="h-6 w-6 text-red-600" />,
      title: "Secure & Private",
      description: "Your data is protected with enterprise-grade security and user isolation"
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-600" />,
      title: "Lightning Fast",
      description: "Generate, edit, and distribute content faster than traditional methods"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold mb-4 bg-yellow-50 border-yellow-200">
            <span className="text-yellow-600">⭐</span>
            <span className="ml-2">#1 AI Press Release Platform</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Energise Your PR Strategy with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              AI-Powered
            </span>{' '}
            Press Releases
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Generate professional press releases, manage media contacts, and create targeted 
            advertisements in minutes. Trusted by PR professionals worldwide.
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 mb-12">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              No credit card required
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Free to start
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              Setup in 30 seconds
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Auth Section */}
        <div className="max-w-md mx-auto">
          <Card className="shadow-2xl border-0">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl">
                {isLogin ? 'Sign In to PR Studio' : 'Create Your Account'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {isLogin 
                  ? 'Welcome back! Enter your credentials to continue'
                  : 'Join thousands of PR professionals using our platform'
                }
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
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
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    'Processing...'
                  ) : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                {isLogin && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-2">
                      Demo credentials: test@example.com / password123
                    </p>
                  </div>
                )}

                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>

        {/* Social Proof */}
        <div className="text-center mt-16">
          <p className="text-gray-500 text-sm mb-4">Trusted by professionals at</p>
          <div className="flex items-center justify-center space-x-8 opacity-60">
            <div className="text-lg font-semibold text-gray-400">TechCorp</div>
            <div className="text-lg font-semibold text-gray-400">MediaFlow</div>
            <div className="text-lg font-semibold text-gray-400">StartupLab</div>
            <div className="text-lg font-semibold text-gray-400">InnovatePR</div>
          </div>
        </div>
      </div>
    </div>
  );
}