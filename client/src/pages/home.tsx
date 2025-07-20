import { useState } from "react";
import { Newspaper, FileText, Users, Send, Wand2, Eye, Trash2, Upload } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  headline: z.string().min(1, "Headline is required"),
  copy: z.string().min(1, "Main copy is required"),
  contact: z.string().min(1, "PR contact is required"),
  quote: z.string().optional(),
  competitors: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function Home() {
  const [activeSection, setActiveSection] = useState("generate");
  const [generatedRelease, setGeneratedRelease] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company: "",
      headline: "",
      copy: "",
      contact: "",
      quote: "",
      competitors: "",
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest('POST', '/api/generate', data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedRelease(data);
      toast({
        title: "Success",
        description: "Press release generated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate press release",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    generateMutation.mutate(data);
  };

  // History functionality
  const { data: releases = [], isLoading: releasesLoading } = useQuery({
    queryKey: ["/api/releases"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/releases/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Press release deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete press release",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this press release?")) {
      deleteMutation.mutate(id);
    }
  };

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
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Press Release</h2>
              <p className="text-gray-600">Create professional press releases powered by AI in minutes</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardContent className="p-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 gap-6">
                        <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PR Contact *</FormLabel>
                              <FormControl>
                                <Input placeholder="Contact person for media inquiries" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="headline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Headline *</FormLabel>
                            <FormControl>
                              <Input placeholder="Compelling headline for your press release" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="copy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Main Copy *</FormLabel>
                            <FormControl>
                              <Textarea
                                rows={4}
                                placeholder="Describe the key information, announcement, or story..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="quote"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Executive Quote</FormLabel>
                            <FormControl>
                              <Textarea
                                rows={3}
                                placeholder="Quote from company executive or spokesperson..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="competitors"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Competitor Information</FormLabel>
                            <FormControl>
                              <Textarea
                                rows={2}
                                placeholder="Any competitive context or market positioning..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={generateMutation.isPending}
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        {generateMutation.isPending ? "Generating..." : "Generate Press Release"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Generated Press Release</h3>
                  {generatedRelease ? (
                    <div className="space-y-4">
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm">{generatedRelease.release}</pre>
                      </div>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedRelease.release);
                          toast({ title: "Copied", description: "Press release copied to clipboard" });
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Copy to Clipboard
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Wand2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Fill out the form and click "Generate Press Release" to create your content</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        {activeSection === "history" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Press Release History</h2>
              <p className="text-gray-600">View and manage your generated press releases</p>
            </div>

            {releasesLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading press releases...</p>
              </div>
            ) : releases.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No press releases generated yet</p>
                <p className="text-sm text-gray-400 mt-2">Create your first press release in the Generate section</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {releases.map((release: any) => (
                  <Card key={release.id}>
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold mb-2">{release.headline}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <Badge variant="outline">{release.company}</Badge>
                            <span>Created {format(new Date(release.createdAt), "MMM dd, yyyy 'at' h:mm a")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(release.release);
                              toast({ title: "Copied", description: "Press release copied to clipboard" });
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(release.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-700 line-clamp-4">
                          {release.release.substring(0, 300)}...
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        <span>Contact: {release.contact}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        {activeSection === "contacts" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Media Contacts</h2>
              <p className="text-gray-600">Upload and manage your media contact database</p>
            </div>

            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Upload Media Contacts</h3>
                  <p className="text-gray-600 mb-6">
                    Upload a CSV file with columns: Name, Email, Publication
                  </p>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose CSV File
                  </Button>
                  <p className="text-sm text-gray-500 mt-4">
                    Supported format: CSV files with headers (Name, Email, Publication)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {activeSection === "distribute" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Distribute Press Release</h2>
              <p className="text-gray-600">Send your press releases to media contacts</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Select Press Release</CardTitle>
                </CardHeader>
                <CardContent>
                  {releases.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">No press releases available</p>
                      <p className="text-sm text-gray-400 mt-2">Generate a press release first</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {releases.map((release: any) => (
                        <div key={release.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                          <h4 className="font-medium">{release.headline}</h4>
                          <p className="text-sm text-gray-500 mt-1">{release.company}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {format(new Date(release.createdAt), "MMM dd, yyyy")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribution Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Send className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Upload media contacts first</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Add contacts in the Contacts section to enable distribution
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
