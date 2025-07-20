import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Users, Send, History, FileText, Plus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "wouter";

export default function SimpleHome() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("generate");

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Static Hero Section */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-600 mr-2" />
                <h1 className="text-2xl font-bold text-gray-900">PR Studio</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button>Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Static Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              AI-Powered Press Release Generator
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Create professional press releases in minutes with our intelligent writing assistant. 
              Generate, translate, and distribute your news to the world.
            </p>
          </div>

          {/* Static Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Generation</h3>
                <p className="text-gray-600">
                  Powerful AI creates professional press releases tailored to your company and news.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact Management</h3>
                <p className="text-gray-600">
                  Import and organize your media contacts for targeted press release distribution.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Send className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Distribution</h3>
                <p className="text-gray-600">
                  Send your press releases directly to journalists and publications with one click.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Static Call to Action */}
          <div className="text-center bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to get started?</h3>
            <p className="text-gray-600 mb-6">
              Join thousands of companies using PR Studio to amplify their news and reach more audiences.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/register">
                <Button size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Account
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user gets the full dynamic interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">PR Studio</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">{user.email}</Badge>
              <Button variant="ghost" onClick={logout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant={activeSection === "generate" ? "default" : "outline"}
            onClick={() => setActiveSection("generate")}
            className="flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            Generate
          </Button>
          <Button
            variant={activeSection === "contacts" ? "default" : "outline"}
            onClick={() => setActiveSection("contacts")}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Contacts
          </Button>
          <Button
            variant={activeSection === "distribute" ? "default" : "outline"}
            onClick={() => setActiveSection("distribute")}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Distribute
          </Button>
          <Button
            variant={activeSection === "history" ? "default" : "outline"}
            onClick={() => setActiveSection("history")}
            className="flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            History
          </Button>
        </div>

        {/* Content Areas - Static placeholders for now */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {activeSection === "generate" && (
            <div className="text-center py-12">
              <Wand2 className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Generate Press Release</h2>
              <p className="text-gray-600">Full press release generator will load here</p>
            </div>
          )}
          
          {activeSection === "contacts" && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Manage Contacts</h2>
              <p className="text-gray-600">Contact management interface will load here</p>
            </div>
          )}
          
          {activeSection === "distribute" && (
            <div className="text-center py-12">
              <Send className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Distribute Releases</h2>
              <p className="text-gray-600">Distribution interface will load here</p>
            </div>
          )}
          
          {activeSection === "history" && (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-orange-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Release History</h2>
              <p className="text-gray-600">History interface will load here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}