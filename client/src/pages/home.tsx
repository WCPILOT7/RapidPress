import { useState } from "react";
import { Newspaper, FileText, Users, Send } from "lucide-react";

export default function Home() {
  const [activeSection, setActiveSection] = useState("generate");

  const navItems = [
    { id: "generate", label: "Generate", icon: Newspaper },
    { id: "history", label: "History", icon: FileText },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "distribute", label: "Distribute", icon: Send },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Newspaper className="text-blue-600 text-2xl mr-3" />
                <h1 className="text-xl font-bold text-gray-900">PR Studio</h1>
              </div>
              <nav className="hidden md:ml-8 md:flex md:space-x-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        activeSection === item.id
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">Welcome back, Sarah</div>
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white text-sm font-medium">SC</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === "generate" && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Generate Press Release</h2>
            <p className="text-gray-600">Press release generation feature coming soon</p>
          </div>
        )}
        {activeSection === "history" && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Press Release History</h2>
            <p className="text-gray-600">History feature coming soon</p>
          </div>
        )}
        {activeSection === "contacts" && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Media Contacts</h2>
            <p className="text-gray-600">Contact management feature coming soon</p>
          </div>
        )}
        {activeSection === "distribute" && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Distribute Release</h2>
            <p className="text-gray-600">Distribution feature coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}
