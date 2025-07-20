import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Share2, Zap } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">PR Studio</span>
            </div>
            <Button asChild>
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            AI-Powered Press Release Studio
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Generate professional press releases, manage media contacts, and distribute your news with the power of AI. 
            Create compelling content and reach journalists effortlessly.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button size="lg" asChild>
              <a href="/api/login">Get Started</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Everything You Need for PR Success</h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Streamline your public relations workflow with our comprehensive suite of tools
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />
              <CardTitle>AI Press Releases</CardTitle>
              <CardDescription>
                Generate professional press releases with AI, including headlines, content, and proper formatting
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-green-600 dark:text-green-400 mb-4" />
              <CardTitle>Contact Management</CardTitle>
              <CardDescription>
                Import and manage your media contacts with CSV upload and easy organization tools
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <Share2 className="h-10 w-10 text-purple-600 dark:text-purple-400 mb-4" />
              <CardTitle>Social Media Ads</CardTitle>
              <CardDescription>
                Create platform-specific social media posts and advertisements with AI-generated images
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-orange-600 dark:text-orange-400 mb-4" />
              <CardTitle>Instant Distribution</CardTitle>
              <CardDescription>
                Send press releases directly to your media contacts with personalized messaging
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 dark:bg-blue-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Ready to Transform Your PR?</h2>
            <p className="mt-4 text-lg text-blue-100">
              Join PR Studio and start creating professional press releases in minutes
            </p>
            <div className="mt-8">
              <Button size="lg" variant="secondary" asChild>
                <a href="/api/login">Sign In to Get Started</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}