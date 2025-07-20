import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { Eye, Edit, Send, Trash2, Search, Newspaper, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import PressReleaseEditor from "@/components/press-release-editor";
import type { PressRelease } from "@shared/schema";

export default function HistorySection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");
  const [editingRelease, setEditingRelease] = useState<PressRelease | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: releases = [], isLoading } = useQuery<PressRelease[]>({
    queryKey: ["/api/releases"],
  });

  const deleteMutation = useMutation({
    mutationFn: api.deletePressRelease,
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

  const filteredReleases = releases.filter((release) => {
    const matchesSearch = release.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         release.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = selectedCompany === "all" || release.company === selectedCompany;
    
    const now = new Date();
    const releaseDate = new Date(release.createdAt);
    const daysDiff = Math.floor((now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const matchesPeriod = selectedPeriod === "all" || daysDiff <= parseInt(selectedPeriod);
    
    return matchesSearch && matchesCompany && matchesPeriod;
  });

  const uniqueCompanies = Array.from(new Set(releases.map(r => r.company)));

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this press release?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (release: PressRelease) => {
    setEditingRelease(release);
  };

  const handleCloseEditor = () => {
    setEditingRelease(null);
  };

  const handleSaveEditor = (updatedRelease: PressRelease) => {
    // The editor handles saving through the API, just close the editor
    setEditingRelease(null);
  };

  if (isLoading) {
    return (
      <section>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Press Release History</h2>
          <p className="text-gray-600">View and manage your previously generated press releases</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Press Release History</h2>
        <p className="text-gray-600">View and manage your previously generated press releases</p>
      </div>

      <Card>
        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input
                  placeholder="Search press releases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">This year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Release List */}
        <div className="divide-y divide-gray-200">
          {filteredReleases.length === 0 ? (
            <div className="p-12 text-center">
              <Newspaper className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {releases.length === 0 ? "No press releases yet" : "No releases match your search"}
              </h3>
              <p className="text-gray-500 mb-4">
                {releases.length === 0 
                  ? "Get started by generating your first press release"
                  : "Try adjusting your search criteria"
                }
              </p>
              {releases.length === 0 && (
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Press Release
                </Button>
              )}
            </div>
          ) : (
            filteredReleases.map((release) => (
              <div key={release.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {release.headline}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span>{release.company}</span>
                      <span>•</span>
                      <span>{format(new Date(release.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                      <span>•</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <span className="text-xs">Draft</span>
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {release.release.substring(0, 150)}...
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="ghost" size="icon" title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Edit"
                      onClick={() => handleEdit(release)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Send">
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Delete"
                      onClick={() => handleDelete(release.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Press Release Editor Modal */}
      {editingRelease && (
        <PressReleaseEditor
          pressRelease={editingRelease}
          onClose={handleCloseEditor}
          onSave={handleSaveEditor}
        />
      )}
    </section>
  );
}
