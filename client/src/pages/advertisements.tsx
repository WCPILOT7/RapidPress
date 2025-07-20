import { useState, useRef, useEffect } from "react";
import { Share2, Facebook, Twitter, Linkedin, Instagram, Monitor, Plus, Trash2, Copy, Eye, Newspaper, ArrowLeft, Edit, Save, X, RefreshCw, Image as ImageIcon, Upload } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import type { PressRelease, Advertisement } from "@shared/schema";

const platformIcons = {
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  google_ads: Monitor,
};

const platformColors = {
  facebook: "bg-blue-600",
  twitter: "bg-sky-500",
  linkedin: "bg-blue-800",
  instagram: "bg-pink-600",
  google_ads: "bg-green-600",
};

export default function Advertisements() {
  const [selectedPressRelease, setSelectedPressRelease] = useState<number | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewingAd, setViewingAd] = useState<Advertisement | null>(null);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [isAiEditMode, setIsAiEditMode] = useState(false);
  const [editingImagePrompt, setEditingImagePrompt] = useState("");
  const [isImageEditMode, setIsImageEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Redirect to login if unauthorized
  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, isLoading, toast]);

  // Fetch press releases and advertisements
  const { data: pressReleases = [], isLoading: releasesLoading } = useQuery<PressRelease[]>({
    queryKey: ["/api/releases"],
  });

  const { data: advertisements = [], isLoading: adsLoading } = useQuery<Advertisement[]>({
    queryKey: ["/api/advertisements"],
  });

  // Create advertisement mutation
  const createAdMutation = useMutation({
    mutationFn: async (data: { pressReleaseId: number; platform: string; type: string }) => {
      console.log('Creating advertisement with data:', data);
      try {
        // Add timeout handling for long-running AI operations
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        const response = await fetch('/api/advertisements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || `HTTP ${response.status}` };
          }
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Advertisement created successfully:', result);
        return result;
      } catch (error: any) {
        console.error('Detailed error:', error);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Advertisement created successfully:', data);
      toast({
        title: "Success",
        description: "Advertisement created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/advertisements"] });
      setIsCreateDialogOpen(false);
      setSelectedPressRelease(null);
      setSelectedPlatform("");
      setSelectedType("");
    },
    onError: (error: any) => {
      console.error('Error creating advertisement:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create advertisement",
        variant: "destructive",
      });
    },
  });

  // Delete advertisement mutation
  const deleteAdMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/advertisements/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Advertisement deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/advertisements"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete advertisement",
        variant: "destructive",
      });
    },
  });

  // Update advertisement mutation
  const updateAdMutation = useMutation({
    mutationFn: async ({ id, content, title }: { id: number; content: string; title: string }) => {
      const response = await apiRequest('PUT', `/api/advertisements/${id}`, { content, title });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Advertisement updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/advertisements"] });
      setEditingAd(null);
      setEditedContent("");
      setEditedTitle("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update advertisement",
        variant: "destructive",
      });
    },
  });

  // AI edit advertisement mutation
  const aiEditMutation = useMutation({
    mutationFn: async ({ id, instruction, currentContent }: { id: number; instruction: string; currentContent: string }) => {
      const response = await apiRequest('POST', `/api/advertisements/${id}/edit`, { instruction, currentContent });
      return response.json();
    },
    onSuccess: (data) => {
      setEditedContent(data.content);
      toast({
        title: "Success",
        description: "AI edit completed! Review and save the changes.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to edit with AI",
        variant: "destructive",
      });
    },
  });

  // Generate image mutation (initial generation)
  const generateImageMutation = useMutation({
    mutationFn: async ({ id, imagePrompt }: { id: number; imagePrompt?: string }) => {
      const response = await apiRequest('POST', `/api/advertisements/${id}/generate-image`, { imagePrompt });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Image generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/advertisements"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate image",
        variant: "destructive",
      });
    },
  });

  // Regenerate image mutation
  const regenerateImageMutation = useMutation({
    mutationFn: async ({ id, imagePrompt }: { id: number; imagePrompt?: string }) => {
      const response = await apiRequest('POST', `/api/advertisements/${id}/regenerate-image`, { imagePrompt });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Image regenerated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/advertisements"] });
      setIsImageEditMode(false);
      setEditingImagePrompt("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate image",
        variant: "destructive",
      });
    },
  });

  // Upload custom image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/advertisements/${id}/upload-image`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/advertisements"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  const handleCreateAd = () => {
    if (!selectedPressRelease || !selectedPlatform || !selectedType) {
      toast({
        title: "Error",
        description: "Please select a press release, platform, and type",
        variant: "destructive",
      });
      return;
    }

    createAdMutation.mutate({
      pressReleaseId: selectedPressRelease,
      platform: selectedPlatform,
      type: selectedType,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this advertisement?")) {
      deleteAdMutation.mutate(id);
    }
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setEditedContent(ad.content);
    setEditedTitle(ad.title);
    setAiInstruction("");
    setIsAiEditMode(false);
    setEditingImagePrompt(ad.imagePrompt || "");
    setIsImageEditMode(false);
  };

  const handleSaveEdit = () => {
    if (!editingAd) return;
    updateAdMutation.mutate({
      id: editingAd.id,
      content: editedContent,
      title: editedTitle,
    });
  };

  const handleAiEdit = () => {
    if (!editingAd || !aiInstruction.trim()) {
      toast({
        title: "Error",
        description: "Please provide an instruction for AI editing",
        variant: "destructive",
      });
      return;
    }

    aiEditMutation.mutate({
      id: editingAd.id,
      instruction: aiInstruction,
      currentContent: editedContent,
    });
  };

  const handleGenerateImage = (ad: Advertisement, customPrompt?: string) => {
    generateImageMutation.mutate({ 
      id: ad.id, 
      imagePrompt: customPrompt || ad.imagePrompt || undefined
    });
  };

  const handleRegenerateImage = (ad: Advertisement, customPrompt?: string) => {
    regenerateImageMutation.mutate({ 
      id: ad.id, 
      imagePrompt: customPrompt || ad.imagePrompt || undefined
    });
  };

  const handleImageUpload = (ad: Advertisement, file: File) => {
    uploadImageMutation.mutate({ id: ad.id, file });
  };

  const handleFileSelect = (ad: Advertisement) => {
    if (fileInputRef.current) {
      fileInputRef.current.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          handleImageUpload(ad, file);
        }
      };
      fileInputRef.current.click();
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  const getPlatformIcon = (platform: string) => {
    const Icon = platformIcons[platform as keyof typeof platformIcons];
    return Icon || Monitor;
  };

  const getPlatformColor = (platform: string) => {
    return platformColors[platform as keyof typeof platformColors] || "bg-gray-600";
  };

  const socialPlatforms = [
    { value: "facebook", label: "Facebook" },
    { value: "twitter", label: "Twitter/X" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "instagram", label: "Instagram" },
  ];

  const adPlatforms = [
    { value: "google_ads", label: "Google Ads" },
    { value: "facebook", label: "Facebook Ads" },
  ];

  if (releasesLoading || adsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading advertisements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="flex items-center">
                  <Newspaper className="text-blue-600 text-2xl mr-3" />
                  <h1 className="text-xl font-bold text-gray-900">PR Studio</h1>
                </Link>
              </div>
              <nav className="hidden md:ml-8 md:flex md:space-x-8">
                <Link 
                  href="/"
                  className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
                <span className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-blue-600 text-blue-600">
                  <Share2 className="w-4 h-4 mr-2" />
                  Advertisements
                </span>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hidden file input for image uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
        />
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advertisements</h1>
            <p className="text-gray-600 mt-2">Create social media posts and ads from your press releases</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create Advertisement</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Advertisement</DialogTitle>
                <DialogDescription>
                  Select a press release and platform to generate AI-powered social media posts or advertisements.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Press Release
                  </label>
                  <Select value={selectedPressRelease?.toString() || ""} onValueChange={(value) => setSelectedPressRelease(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a press release" />
                    </SelectTrigger>
                    <SelectContent>
                      {pressReleases.map((release) => (
                        <SelectItem key={release.id} value={release.id.toString()}>
                          {release.headline}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Type
                  </label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social_media">Social Media Post</SelectItem>
                      <SelectItem value="ad">Advertisement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform
                  </label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedType === "social_media" && socialPlatforms.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          {platform.label}
                        </SelectItem>
                      ))}
                      {selectedType === "ad" && adPlatforms.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          {platform.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button 
                    onClick={handleCreateAd} 
                    disabled={createAdMutation.isPending || !selectedPressRelease || !selectedPlatform || !selectedType}
                    className="flex-1"
                  >
                    {createAdMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating (30-60s)...
                      </div>
                    ) : (
                      "Create"
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {advertisements.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No advertisements yet</h3>
              <p className="text-gray-600 mb-6">Create your first social media post or advertisement from a press release</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Advertisement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advertisements.map((ad) => {
              const Icon = getPlatformIcon(ad.platform);
              const platformColor = getPlatformColor(ad.platform);
              const pressRelease = pressReleases.find(r => r.id === ad.pressReleaseId);
              
              return (
                <Card key={ad.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`p-2 rounded-lg ${platformColor}`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <Badge variant={ad.type === 'social_media' ? 'default' : 'secondary'}>
                            {ad.type === 'social_media' ? 'Social Media' : 'Advertisement'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(ad.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg">{ad.title}</CardTitle>
                    {pressRelease && (
                      <p className="text-sm text-gray-600">From: {pressRelease.headline}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {ad.imageUrl && (
                        <div className="relative group">
                          <img 
                            src={ad.imageUrl} 
                            alt="Generated advertisement image"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRegenerateImage(ad)}
                              disabled={regenerateImageMutation.isPending || uploadImageMutation.isPending}
                              className="bg-white/90 hover:bg-white"
                            >
                              <RefreshCw className={`w-3 h-3 ${regenerateImageMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleFileSelect(ad)}
                              disabled={regenerateImageMutation.isPending || uploadImageMutation.isPending}
                              className="bg-white/90 hover:bg-white"
                            >
                              <Upload className="w-3 h-3" />
                            </Button>
                          </div>
                          {(ad as any).isCustomImage && (
                            <Badge className="absolute top-2 left-2 bg-blue-600 text-white text-xs">
                              Custom
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700 line-clamp-3">{ad.content}</p>
                      </div>
                      
                      {ad.imagePrompt && !ad.imageUrl && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-xs font-medium text-blue-800">Image Suggestion:</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateImage(ad)}
                              disabled={generateImageMutation.isPending}
                              className="h-6 px-2 text-xs"
                            >
                              {generateImageMutation.isPending ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                                  Generating...
                                </div>
                              ) : (
                                <>
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  Generate Image
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-blue-700 line-clamp-2">{ad.imagePrompt}</p>
                        </div>
                      )}
                      
                      {!ad.imagePrompt && !ad.imageUrl && (ad.platform === 'instagram' || ad.platform === 'facebook' || ad.platform === 'linkedin' || ad.type === 'ad') && (
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateImage(ad)}
                            disabled={generateImageMutation.isPending}
                            className="w-full"
                          >
                            {generateImageMutation.isPending ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-600 mr-2"></div>
                                Generating Image...
                              </div>
                            ) : (
                              <>
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Generate Image
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created {format(new Date(ad.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingAd(ad)}
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(ad)}
                          className="w-full"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(ad.content)}
                          className="w-full"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </Button>
                        {ad.imageUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateImage(ad)}
                            disabled={regenerateImageMutation.isPending}
                            className="w-full"
                          >
                            <RefreshCw className={`w-4 h-4 mr-1 ${regenerateImageMutation.isPending ? 'animate-spin' : ''}`} />
                            New Image
                          </Button>
                        ) : (ad.platform === 'instagram' || ad.platform === 'facebook' || ad.platform === 'linkedin' || ad.type === 'ad') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateImage(ad)}
                            disabled={generateImageMutation.isPending}
                            className="w-full"
                          >
                            {generateImageMutation.isPending ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600 mr-1"></div>
                                Generating...
                              </div>
                            ) : (
                              <>
                                <ImageIcon className="w-4 h-4 mr-1" />
                                Generate Image
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* View Advertisement Dialog */}
        <Dialog open={!!viewingAd} onOpenChange={() => setViewingAd(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingAd?.title}</DialogTitle>
              <DialogDescription>
                View the complete advertisement content and generated image.
              </DialogDescription>
            </DialogHeader>
            
            {viewingAd && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${getPlatformColor(viewingAd.platform)}`}>
                    {(() => {
                      const Icon = getPlatformIcon(viewingAd.platform);
                      return <Icon className="w-4 h-4 text-white" />;
                    })()}
                  </div>
                  <Badge variant={viewingAd.type === 'social_media' ? 'default' : 'secondary'}>
                    {viewingAd.type === 'social_media' ? 'Social Media' : 'Advertisement'}
                  </Badge>
                </div>

                {viewingAd.imageUrl ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">
                        {(viewingAd as any).isCustomImage ? 'Custom Image:' : 'Generated Image:'}
                      </h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFileSelect(viewingAd)}
                          disabled={uploadImageMutation.isPending}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Upload New
                        </Button>
                        {!((viewingAd as any).isCustomImage) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateImage(viewingAd)}
                            disabled={regenerateImageMutation.isPending}
                          >
                            <RefreshCw className={`w-4 h-4 mr-1 ${regenerateImageMutation.isPending ? 'animate-spin' : ''}`} />
                            Regenerate
                          </Button>
                        )}
                      </div>
                    </div>
                    <img 
                      src={viewingAd.imageUrl} 
                      alt="Advertisement image"
                      className="w-full max-w-md mx-auto rounded-lg border"
                    />
                  </div>
                ) : (viewingAd.platform === 'instagram' || viewingAd.platform === 'facebook' || viewingAd.platform === 'linkedin' || viewingAd.type === 'ad') && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h4 className="font-medium text-gray-700 mb-2">No Image Generated</h4>
                    <p className="text-sm text-gray-500 mb-4">Generate an AI image to enhance your {viewingAd.type === 'social_media' ? 'social media post' : 'advertisement'}.</p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => handleGenerateImage(viewingAd)}
                        disabled={generateImageMutation.isPending}
                        size="sm"
                      >
                        {generateImageMutation.isPending ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating...
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Generate Image
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFileSelect(viewingAd)}
                        disabled={uploadImageMutation.isPending}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Image
                      </Button>
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium mb-2">Content:</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{viewingAd.content}</p>
                  </div>
                </div>
                
                {viewingAd.imagePrompt && (
                  <div>
                    <h4 className="font-medium mb-2">Image Prompt:</h4>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-800">{viewingAd.imagePrompt}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => copyToClipboard(viewingAd.content)}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Content
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setViewingAd(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Advertisement Dialog */}
        <Dialog open={!!editingAd} onOpenChange={() => {
          setEditingAd(null);
          setEditedContent("");
          setEditedTitle("");
          setAiInstruction("");
          setIsAiEditMode(false);
        }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Advertisement</DialogTitle>
              <DialogDescription>
                Edit the advertisement content manually or use AI to make specific changes.
              </DialogDescription>
            </DialogHeader>
            
            {editingAd && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${getPlatformColor(editingAd.platform)}`}>
                      {(() => {
                        const Icon = getPlatformIcon(editingAd.platform);
                        return <Icon className="w-4 h-4 text-white" />;
                      })()}
                    </div>
                    <Badge variant={editingAd.type === 'social_media' ? 'default' : 'secondary'}>
                      {editingAd.type === 'social_media' ? 'Social Media' : 'Advertisement'}
                    </Badge>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant={isAiEditMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsAiEditMode(!isAiEditMode)}
                    >
                      AI Edit
                    </Button>
                    {editingAd.imageUrl && (
                      <Button
                        variant={isImageEditMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setIsImageEditMode(!isImageEditMode);
                          if (!isImageEditMode) {
                            setEditingImagePrompt(editingAd.imagePrompt || '');
                          }
                        }}
                      >
                        Edit Image
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    placeholder="Advertisement title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    placeholder="Advertisement content"
                    rows={6}
                    className="resize-none"
                  />
                </div>

                {isAiEditMode && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Edit Instruction
                    </label>
                    <div className="flex space-x-2">
                      <Textarea
                        value={aiInstruction}
                        onChange={(e) => setAiInstruction(e.target.value)}
                        placeholder="Tell AI how to modify the content (e.g., 'make it more exciting', 'add emojis', 'make it shorter')"
                        rows={2}
                        className="flex-1 resize-none"
                      />
                      <Button
                        onClick={handleAiEdit}
                        disabled={aiEditMutation.isPending || !aiInstruction.trim()}
                        className="self-end"
                      >
                        {aiEditMutation.isPending ? "Processing..." : "Apply AI Edit"}
                      </Button>
                    </div>
                  </div>
                )}

                {isImageEditMode && editingAd.imageUrl && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image Options
                    </label>
                    
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <img 
                          src={editingAd.imageUrl} 
                          alt="Current advertisement image"
                          className="w-48 h-32 object-cover rounded-lg border"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleFileSelect(editingAd)}
                          disabled={uploadImageMutation.isPending}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadImageMutation.isPending ? "Uploading..." : "Upload Custom"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRegenerateImage(editingAd)}
                          disabled={regenerateImageMutation.isPending}
                          className="w-full"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${regenerateImageMutation.isPending ? 'animate-spin' : ''}`} />
                          {regenerateImageMutation.isPending ? "Generating..." : "Regenerate"}
                        </Button>
                      </div>
                      
                      {!((editingAd as any).isCustomImage) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom Image Prompt
                          </label>
                          <div className="space-y-2">
                            <Textarea
                              value={editingImagePrompt}
                              onChange={(e) => setEditingImagePrompt(e.target.value)}
                              placeholder="Describe how you want the image to look (e.g., 'make it more colorful', 'add a cityscape background', 'modern minimalist style')"
                              rows={3}
                              className="resize-none"
                            />
                            <Button
                              onClick={() => handleRegenerateImage(editingAd, editingImagePrompt)}
                              disabled={regenerateImageMutation.isPending || !editingImagePrompt.trim()}
                              className="w-full"
                            >
                              {regenerateImageMutation.isPending ? "Generating..." : "Generate with Custom Prompt"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    onClick={handleSaveEdit}
                    disabled={updateAdMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateAdMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingAd(null);
                      setEditedContent("");
                      setEditedTitle("");
                      setAiInstruction("");
                      setIsAiEditMode(false);
                    }}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}