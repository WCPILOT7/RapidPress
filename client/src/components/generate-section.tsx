import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wand2, Copy, Save, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import PressReleaseEditor from "@/components/press-release-editor";
import type { PressRelease } from "@shared/schema";

const formSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  headline: z.string().min(1, "Headline is required"),
  copy: z.string().min(1, "Main copy is required"),
  contact: z.string().min(1, "PR contact is required"),
  quote: z.string().optional(),
  competitors: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function GenerateSection() {
  const [generatedRelease, setGeneratedRelease] = useState<PressRelease | null>(null);
  const [editingRelease, setEditingRelease] = useState<PressRelease | null>(null);
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
    mutationFn: api.generatePressRelease,
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

  const onSubmit = (data: FormData) => {
    generateMutation.mutate(data);
  };

  const copyToClipboard = () => {
    if (generatedRelease?.release) {
      navigator.clipboard.writeText(generatedRelease.release);
      toast({
        title: "Copied",
        description: "Press release copied to clipboard",
      });
    }
  };

  const handleEdit = () => {
    if (generatedRelease) {
      setEditingRelease(generatedRelease);
    }
  };

  const handleCloseEditor = () => {
    setEditingRelease(null);
  };

  const handleSaveEditor = (updatedRelease: PressRelease) => {
    setGeneratedRelease(updatedRelease);
    setEditingRelease(null);
  };

  return (
    <section>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Press Release</h2>
        <p className="text-gray-600">Create professional press releases powered by AI in minutes</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Company Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {/* Headline */}
              <FormField
                control={form.control}
                name="headline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headline *</FormLabel>
                    <FormControl>
                      <Input placeholder="Compelling headline for your press release" {...field} />
                    </FormControl>
                    <p className="text-sm text-gray-500">Keep it under 100 characters for maximum impact</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Copy/Body Content */}
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
                    <p className="text-sm text-gray-500">Provide the main details of your announcement</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quote */}
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
                    <p className="text-sm text-gray-500">Include attribution (Name, Title)</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Competitors */}
              <FormField
                control={form.control}
                name="competitors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competitive Context</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="How does this position against competitors? (Optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Generate Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={generateMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {generateMutation.isPending ? "Generating..." : "Generate Press Release"}
                </Button>
              </div>
            </form>
          </Form>

          {/* Loading State */}
          {generateMutation.isPending && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-3"></div>
                <span className="text-primary font-medium">Generating your press release...</span>
              </div>
              <p className="text-primary text-sm mt-1">This may take 10-15 seconds</p>
            </div>
          )}

          {/* Generated Release Preview */}
          {generatedRelease && (
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Generated Press Release</h3>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="prose max-w-none">
                  <p className="text-sm text-gray-500 mb-4">FOR IMMEDIATE RELEASE</p>
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {generatedRelease.release}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
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
