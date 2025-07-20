import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Edit3, Save, MessageSquare, Wand2, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { PressRelease } from "@shared/schema";

interface PressReleaseEditorProps {
  pressRelease: PressRelease;
  onClose: () => void;
  onSave?: (updatedRelease: PressRelease) => void;
}

export default function PressReleaseEditor({ pressRelease, onClose, onSave }: PressReleaseEditorProps) {
  const [editedContent, setEditedContent] = useState(pressRelease.release);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isChatMode, setIsChatMode] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const editWithAIMutation = useMutation({
    mutationFn: async (instruction: string) => {
      const response = await api.editPressRelease({
        releaseId: pressRelease.id,
        instruction,
        currentContent: editedContent
      });
      return response;
    },
    onSuccess: (data) => {
      setEditedContent(data.updatedContent);
      setHasUnsavedChanges(true);
      setChatHistory(prev => [...prev, 
        { role: 'user', content: chatMessage },
        { role: 'assistant', content: `I've updated the press release based on your request. The changes include: ${data.changes || 'content modifications'}.` }
      ]);
      setChatMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to edit press release",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => api.updatePressRelease(pressRelease.id, { release: editedContent }),
    onSuccess: (updatedRelease) => {
      setHasUnsavedChanges(false);
      toast({
        title: "Success",
        description: "Press release saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      if (onSave) onSave(updatedRelease);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save press release",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleChatSubmit = () => {
    if (!chatMessage.trim()) return;
    editWithAIMutation.mutate(chatMessage);
  };

  const handleManualEdit = (content: string) => {
    setEditedContent(content);
    setHasUnsavedChanges(content !== pressRelease.release);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editedContent);
    toast({
      title: "Copied",
      description: "Press release copied to clipboard",
    });
  };

  const downloadAsText = () => {
    const blob = new Blob([editedContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pressRelease.headline.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Press Release</h2>
            <p className="text-sm text-gray-500 mt-1">{pressRelease.headline}</p>
          </div>
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Unsaved changes
              </Badge>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Panel */}
          <div className="flex-1 flex flex-col border-r border-gray-200">
            {/* Editor Toolbar */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant={isChatMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsChatMode(true)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat Edit
                </Button>
                <Button
                  variant={!isChatMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsChatMode(false)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Manual Edit
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadAsText}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || saveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {isChatMode ? (
                <div className="bg-gray-50 rounded-lg p-4 h-full">
                  <div className="prose max-w-none">
                    <p className="text-sm text-gray-500 mb-4">FOR IMMEDIATE RELEASE</p>
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed bg-white p-4 rounded border">
                      {editedContent}
                    </div>
                  </div>
                </div>
              ) : (
                <Textarea
                  value={editedContent}
                  onChange={(e) => handleManualEdit(e.target.value)}
                  className="h-full min-h-[500px] font-mono text-sm"
                  placeholder="Edit your press release content here..."
                />
              )}
            </div>
          </div>

          {/* Chat Panel */}
          {isChatMode && (
            <div className="w-80 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">AI Editor Chat</h3>
                <p className="text-sm text-gray-500">Tell me what you'd like to change</p>
              </div>

              {/* Chat History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatHistory.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Start a conversation to edit your press release</p>
                    <p className="text-xs mt-1">Try saying: "Make it more professional" or "Add more excitement"</p>
                  </div>
                ) : (
                  chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 text-sm ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="How should I edit this?"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                    disabled={editWithAIMutation.isPending}
                  />
                  <Button
                    onClick={handleChatSubmit}
                    disabled={!chatMessage.trim() || editWithAIMutation.isPending}
                    size="sm"
                  >
                    {editWithAIMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[
                    "Make it more professional",
                    "Add more excitement",
                    "Shorten it",
                    "Add statistics",
                    "Make it more urgent"
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => setChatMessage(suggestion)}
                      disabled={editWithAIMutation.isPending}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}