import { useState, useCallback, useMemo } from "react";
import { Newspaper, FileText, Users, Send, Share2, Wand2, Eye, Trash2, Upload, Edit, Save, X, ChevronRight, ChevronLeft, Building, User, Calendar, Palette, FileText as FileTextIcon, Quote, Trophy, Languages } from "lucide-react";
import { Link } from "wouter";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PressRelease } from "@shared/schema";

const formSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  copy: z.string().min(1, "Main copy is required"),
  contact: z.string().min(1, "PR contact is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().min(1, "Phone number is required"),
  date: z.string().min(1, "Release date is required"),
  brandTone: z.string().optional(),
  quote: z.string().optional(),
  competitors: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Move languages array outside component to avoid recreation on every render
const TRANSLATION_LANGUAGES = [
  { code: "Spanish", name: "Spanish" },
  { code: "French", name: "French" },
  { code: "German", name: "German" },
  { code: "Italian", name: "Italian" },
  { code: "Portuguese", name: "Portuguese" },
  { code: "Chinese", name: "Chinese (Simplified)" },
  { code: "Japanese", name: "Japanese" },
  { code: "Korean", name: "Korean" },
  { code: "Arabic", name: "Arabic" },
  { code: "Russian", name: "Russian" },
  { code: "Dutch", name: "Dutch" },
  { code: "Swedish", name: "Swedish" },
  { code: "Norwegian", name: "Norwegian" },
  { code: "Danish", name: "Danish" },
  { code: "Finnish", name: "Finnish" },
  // Indian Regional Languages
  { code: "Hindi", name: "Hindi (हिंदी)" },
  { code: "Bengali", name: "Bengali (বাংলা)" },
  { code: "Telugu", name: "Telugu (తెలుగు)" },
  { code: "Marathi", name: "Marathi (मराठी)" },
  { code: "Tamil", name: "Tamil (தமிழ்)" },
  { code: "Gujarati", name: "Gujarati (ગુજરાતી)" },
  { code: "Urdu", name: "Urdu (اردو)" },
  { code: "Kannada", name: "Kannada (ಕನ್ನಡ)" },
  { code: "Odia", name: "Odia (ଓଡ଼ିଆ)" },
  { code: "Malayalam", name: "Malayalam (മലയാളം)" },
  { code: "Punjabi", name: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "Assamese", name: "Assamese (অসমীয়া)" },
];

// Define form steps outside component to avoid recreation
const FORM_STEPS = [
  {
    id: 0,
    title: "Company Info",
    description: "Basic company details",
    icon: Building,
    fields: ["company", "contact", "contactEmail", "contactPhone", "date"]
  },
  {
    id: 1,
    title: "Brand Voice", 
    description: "Tone and guidelines",
    icon: Palette,
    fields: ["brandTone"]
  },
  {
    id: 2,
    title: "Content",
    description: "Main story and details", 
    icon: FileTextIcon,
    fields: ["copy"]
  },
  {
    id: 3,
    title: "Quotes & Context",
    description: "Executive quotes and competition",
    icon: Quote,
    fields: ["quote", "competitors"]
  }
];

export default function Home() {
  const [activeSection, setActiveSection] = useState("generate");
  const [generatedRelease, setGeneratedRelease] = useState<any>(null);
  const [editingRelease, setEditingRelease] = useState<PressRelease | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();



  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company: "",
      copy: "",
      contact: "",
      contactEmail: "",
      contactPhone: "",
      date: "",
      brandTone: "",
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
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate press release",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, instruction }: { id: number, instruction: string }) => {
      const response = await apiRequest('POST', `/api/releases/${id}/edit`, {
        instruction,
        currentContent: editingRelease?.release || ""
      });
      return response.json();
    },
    onSuccess: (data) => {
      setEditingRelease({ ...editingRelease!, release: data.release });
      setEditInstruction("");
      toast({
        title: "Success",
        description: "Press release updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to edit press release",
        variant: "destructive",
      });
    },
  });

  const saveEditMutation = useMutation({
    mutationFn: async ({ id, release }: { id: number, release: string }) => {
      const response = await apiRequest('PUT', `/api/releases/${id}`, { release });
      return response.json();
    },
    onSuccess: () => {
      setEditingRelease(null);
      toast({
        title: "Success",
        description: "Changes saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // Only submit if we're on the final step
    if (currentStep === FORM_STEPS.length - 1) {
      try {
        generateMutation.mutate(data);
      } catch (error) {
        console.error('Form submission error:', error);
        toast({
          title: "Submission Error",
          description: "Unable to submit form. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleGenerateClick = () => {
    if (currentStep === FORM_STEPS.length - 1 && isStepValid(currentStep)) {
      form.handleSubmit(onSubmit)();
    }
  };

  // Translation mutation
  const translateMutation = useMutation({
    mutationFn: async ({ id, language }: { id: number, language: string }) => {
      const response = await apiRequest('POST', `/api/releases/${id}/translate`, { language });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Press release translated to ${selectedLanguage} successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      setSelectedLanguage("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to translate press release",
        variant: "destructive",
      });
    },
  });

  // Lazy load data only when needed for each section
  const { data: releases = [], isLoading: releasesLoading } = useQuery({
    queryKey: ["/api/releases"],
    enabled: activeSection === "history", // Only fetch when viewing history
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["/api/contacts"], 
    enabled: activeSection === "contacts" || activeSection === "distribute", // Only fetch when needed
  });

  // Helper functions for step navigation
  const isStepValid = (stepIndex: number) => {
    try {
      const step = FORM_STEPS[stepIndex];
      if (!step) return false;
      
      const requiredFields = step.fields.filter((field: string) => 
        ["company", "copy", "contact", "contactEmail", "contactPhone", "date"].includes(field)
      );
      
      return requiredFields.every((field: string) => {
        try {
          const value = form.getValues(field as keyof FormData);
          return value && typeof value === 'string' && value.trim() !== "";
        } catch (error) {
          console.warn(`Error getting form value for field ${field}:`, error);
          return false;
        }
      });
    } catch (error) {
      console.error('Error in isStepValid:', error);
      return false;
    }
  };

  const goToNextStep = () => {
    try {
      if (currentStep < FORM_STEPS.length - 1 && isStepValid(currentStep)) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error('Error navigating to next step:', error);
      toast({
        title: "Navigation Error",
        description: "Unable to proceed to next step. Please check your form inputs.",
        variant: "destructive",
      });
    }
  };

  const goToPrevStep = () => {
    try {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
    } catch (error) {
      console.error('Error navigating to previous step:', error);
    }
  };

  const goToStep = (stepIndex: number) => {
    try {
      if (stepIndex >= 0 && stepIndex < FORM_STEPS.length) {
        setCurrentStep(stepIndex);
      }
    } catch (error) {
      console.error('Error navigating to step:', error);
    }
  };



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

  const externalNavItems = [
    { id: "advertisements", label: "Advertisements", icon: Share2, path: "/advertisements" },
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
                {externalNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link 
                      key={item.id}
                      href={item.path}
                      className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Link>
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
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Step Progress Bar */}
                  <div className="bg-gray-50 px-6 py-4 border-b">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Step {currentStep + 1} of {FORM_STEPS.length}</h3>
                      <div className="text-sm text-gray-500">{Math.round(((currentStep + 1) / FORM_STEPS.length) * 100)}% Complete</div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentStep + 1) / FORM_STEPS.length) * 100}%` }}
                      ></div>
                    </div>

                    {/* Step indicators */}
                    <div className="flex items-center justify-between">
                      {FORM_STEPS.map((step: any, index: number) => {
                        const Icon = step.icon;
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;
                        const isAccessible = index <= currentStep || (index === currentStep + 1 && isStepValid(currentStep));
                        
                        return (
                          <button
                            key={step.id}
                            onClick={() => isAccessible ? goToStep(index) : null}
                            className={`flex flex-col items-center space-y-2 p-2 rounded-lg transition-all duration-200 ${
                              isActive 
                                ? 'bg-blue-100 text-blue-600 scale-110' 
                                : isCompleted
                                ? 'text-green-600 hover:bg-green-50'
                                : isAccessible
                                ? 'text-gray-500 hover:bg-gray-100 cursor-pointer'
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                            disabled={!isAccessible}
                          >
                            <div className={`rounded-full p-2 ${
                              isActive 
                                ? 'bg-blue-600 text-white' 
                                : isCompleted
                                ? 'bg-green-600 text-white'
                                : isAccessible
                                ? 'bg-gray-200 text-gray-600'
                                : 'bg-gray-100 text-gray-300'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="text-xs font-medium text-center">
                              <div>{step.title}</div>
                              <div className="text-gray-400 text-xs">{step.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form Content */}
                  <div className="p-6">
                    
                    <Form {...form}>
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault(); // Prevent default form submission
                          // Only allow submission through explicit generate button click
                          return false;
                        }} 
                        className="space-y-6"
                      >
                        {/* Step 0: Company Info */}
                        {currentStep === 0 && (
                          <div className="space-y-6" style={{ minHeight: '400px' }}>
                            <div className="text-center mb-6">
                              <Building className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                              <h3 className="text-xl font-bold text-gray-900">Company Information</h3>
                              <p className="text-gray-600">Let's start with basic details about your company</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                              <FormField
                                control={form.control}
                                name="company"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Company Name *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter your company name" {...field} className="h-12" />
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
                                    <FormLabel>PR Contact Name *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Contact person name" {...field} className="h-12" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormField
                                control={form.control}
                                name="contactEmail"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Contact Email *</FormLabel>
                                    <FormControl>
                                      <Input type="email" placeholder="contact@company.com" {...field} className="h-12" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="contactPhone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Contact Phone *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="+1 (555) 123-4567" {...field} className="h-12" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="date"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Release Date *</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} className="h-12" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {/* Step 1: Brand Voice */}
                        {currentStep === 1 && (
                          <div className="space-y-6">
                            <div className="text-center mb-6">
                              <Palette className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                              <h3 className="text-xl font-bold text-gray-900">Brand Voice & Guidelines</h3>
                              <p className="text-gray-600">Help us understand your brand's tone and style</p>
                            </div>

                            <FormField
                              control={form.control}
                              name="brandTone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Brand Tone, Voice & Guidelines</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      rows={6}
                                      placeholder="Describe your brand's tone of voice, writing style, guidelines, and company boilerplate details. Include any standard company descriptions, mission statements, or key messaging you want incorporated (e.g., formal, casual, technical, friendly, etc.)..."
                                      {...field}
                                      className="resize-none"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {/* Step 2: Content */}
                        {currentStep === 2 && (
                          <div className="space-y-6">
                            <div className="text-center mb-6">
                              <FileTextIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
                              <h3 className="text-xl font-bold text-gray-900">Main Content</h3>
                              <p className="text-gray-600">Tell us about your announcement or story</p>
                            </div>

                            <FormField
                              control={form.control}
                              name="copy"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Main Copy *</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      rows={6}
                                      placeholder="Describe the key information, announcement, or story. Include important details like what's being announced, why it's significant, key benefits, and any relevant background information..."
                                      {...field}
                                      className="resize-none"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {/* Step 3: Quotes & Context */}
                        {currentStep === 3 && (
                          <div className="space-y-6">
                            <div className="text-center mb-6">
                              <Quote className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                              <h3 className="text-xl font-bold text-gray-900">Quotes & Context</h3>
                              <p className="text-gray-600">Add executive quotes and competitive context</p>
                            </div>

                            <FormField
                              control={form.control}
                              name="quote"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Executive Quote</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      rows={4}
                                      placeholder="Quote from company executive or spokesperson..."
                                      {...field}
                                      className="resize-none"
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
                                      rows={3}
                                      placeholder="Any competitive context or market positioning..."
                                      {...field}
                                      className="resize-none"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between pt-6 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={goToPrevStep}
                            disabled={currentStep === 0}
                            className="flex items-center"
                          >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Previous
                          </Button>

                          <div className="text-sm text-gray-500">
                            Step {currentStep + 1} of {FORM_STEPS.length}
                          </div>

                          {currentStep < FORM_STEPS.length - 1 ? (
                            <Button
                              type="button"
                              onClick={goToNextStep}
                              disabled={!isStepValid(currentStep)}
                              className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            >
                              Next
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={handleGenerateClick}
                              disabled={generateMutation.isPending || !isStepValid(currentStep)}
                              className="flex items-center bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                            >
                              <Wand2 className="w-4 h-4 mr-2" />
                              {generateMutation.isPending ? "Generating..." : "Generate Press Release"}
                            </Button>
                          )}
                        </div>
                      </form>
                    </Form>
                  </div>
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
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedRelease.release);
                            toast({ title: "Copied", description: "Press release copied to clipboard" });
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Copy to Clipboard
                        </Button>
                        <Button
                          onClick={() => setEditingRelease(generatedRelease)}
                          variant="outline"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              <Languages className="w-4 h-4 mr-2" />
                              Translate
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Translate Press Release</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-gray-600">
                                Select a language to translate this press release. A new translated version will be created and saved.
                              </p>
                              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TRANSLATION_LANGUAGES.map((lang) => (
                                    <SelectItem key={lang.code} value={lang.code}>
                                      {lang.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => {
                                  if (selectedLanguage && generatedRelease) {
                                    translateMutation.mutate({ id: generatedRelease.id, language: selectedLanguage });
                                  }
                                }}
                                disabled={!selectedLanguage || translateMutation.isPending}
                                className="w-full"
                              >
                                {translateMutation.isPending ? "Translating..." : "Create Translation"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
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
            ) : (releases as any[]).length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No press releases generated yet</p>
                <p className="text-sm text-gray-400 mt-2">Create your first press release in the Generate section</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {(releases as any[]).map((release: any) => (
                  <Card key={release.id}>
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold mb-2">{release.headline}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <Badge variant="outline">{release.company}</Badge>
                            <Badge variant={release.language === "English" ? "default" : "secondary"}>
                              {release.language || "English"}
                            </Badge>
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
                            onClick={() => setEditingRelease(release)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Languages className="w-4 h-4 mr-2" />
                                Translate
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Translate Press Release</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                  Select a language to translate "{release.headline}". A new translated version will be created and saved.
                                </p>
                                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select language" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TRANSLATION_LANGUAGES.map((lang: any) => (
                                      <SelectItem key={lang.code} value={lang.code}>
                                        {lang.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  onClick={() => {
                                    if (selectedLanguage) {
                                      translateMutation.mutate({ id: release.id, language: selectedLanguage });
                                    }
                                  }}
                                  disabled={!selectedLanguage || translateMutation.isPending}
                                  className="w-full"
                                >
                                  {translateMutation.isPending ? "Translating..." : "Create Translation"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
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

      {/* Edit Dialog */}
      {editingRelease && (
        <Dialog open={!!editingRelease} onOpenChange={() => setEditingRelease(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Press Release</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Current Release</h4>
                <Textarea 
                  value={editingRelease.release} 
                  onChange={(e) => setEditingRelease({ ...editingRelease, release: e.target.value })}
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">AI Assistant</h4>
                <div className="space-y-3">
                  <Input
                    placeholder="Tell me how to modify this release (e.g., 'make it more casual', 'add technical details', 'change the tone')"
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                  />
                  <Button 
                    onClick={() => editMutation.mutate({ id: editingRelease.id, instruction: editInstruction })}
                    disabled={editMutation.isPending || !editInstruction.trim()}
                    className="w-full"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    {editMutation.isPending ? "Updating..." : "Update with AI"}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => saveEditMutation.mutate({ id: editingRelease.id, release: editingRelease.release })}
                  disabled={saveEditMutation.isPending}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveEditMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingRelease(null)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
