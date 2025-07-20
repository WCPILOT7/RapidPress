import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { PressRelease, Contact } from "@shared/schema";

export default function DistributeSection() {
  const [selectedRelease, setSelectedRelease] = useState<number | null>(null);
  const [recipientType, setRecipientType] = useState("all");
  const [selectedPublications, setSelectedPublications] = useState<string[]>([]);
  const [sendOption, setSendOption] = useState("immediate");
  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [distributionProgress, setDistributionProgress] = useState(0);
  const [isDistributing, setIsDistributing] = useState(false);
  const { toast } = useToast();

  const { data: releases = [] } = useQuery<PressRelease[]>({
    queryKey: ["/api/releases"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const sendMutation = useMutation({
    mutationFn: api.sendRelease,
    onMutate: () => {
      setIsDistributing(true);
      setDistributionProgress(0);
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Press release sent to ${data.recipients} contacts!`,
      });
      setIsDistributing(false);
      setDistributionProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send press release",
        variant: "destructive",
      });
      setIsDistributing(false);
      setDistributionProgress(0);
    },
  });

  // Simulate progress for better UX
  useState(() => {
    if (isDistributing) {
      const interval = setInterval(() => {
        setDistributionProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return prev;
          }
          return prev + 5;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  });

  const uniquePublications = Array.from(new Set(contacts.map(c => c.publication)));

  const getFilteredContacts = () => {
    if (recipientType === "all") return contacts;
    if (recipientType === "publication") {
      return contacts.filter(contact => 
        selectedPublications.length === 0 || selectedPublications.includes(contact.publication)
      );
    }
    return contacts; // For custom selection, implement based on requirements
  };

  const filteredContacts = getFilteredContacts();
  const selectedReleaseData = releases.find(r => r.id === selectedRelease);

  const handleSend = () => {
    if (!selectedRelease) {
      toast({
        title: "Error",
        description: "Please select a press release to send",
        variant: "destructive",
      });
      return;
    }

    if (filteredContacts.length === 0) {
      toast({
        title: "Error",
        description: "No contacts selected for distribution",
        variant: "destructive",
      });
      return;
    }

    const recipientIds = recipientType === "all" ? undefined : filteredContacts.map(c => c.id);

    sendMutation.mutate({
      releaseId: selectedRelease,
      recipientIds,
      subject: subject || undefined,
      customMessage: customMessage || undefined,
    });
  };

  const handlePublicationChange = (publication: string, checked: boolean) => {
    setSelectedPublications(prev => 
      checked 
        ? [...prev, publication]
        : prev.filter(p => p !== publication)
    );
  };

  return (
    <section>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Distribute Press Release</h2>
        <p className="text-gray-600">Send your press releases to your media contacts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Select Release */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Press Release</h3>
            
            {releases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No press releases available</p>
                <p className="text-sm text-gray-400 mt-1">Generate a press release first</p>
              </div>
            ) : (
              <RadioGroup value={selectedRelease?.toString()} onValueChange={(value) => setSelectedRelease(parseInt(value))}>
                <div className="space-y-3">
                  {releases.map((release) => (
                    <div key={release.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary cursor-pointer">
                      <div className="flex items-start">
                        <RadioGroupItem value={release.id.toString()} className="mt-1 mr-3" />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {release.headline}
                          </h4>
                          <p className="text-sm text-gray-500 mb-2">
                            {release.company} • {format(new Date(release.createdAt), "MMM d, yyyy")}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {release.release.substring(0, 100)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {/* Email Settings */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Email Settings</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="subject">Subject Line</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={selectedReleaseData ? `Press Release: ${selectedReleaseData.headline}` : "Press Release: [Release Headline]"}
                  />
                </div>
                <div>
                  <Label htmlFor="custom-message">Custom Message (Optional)</Label>
                  <Textarea
                    id="custom-message"
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personal note to your media contacts..."
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Settings */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution Settings</h3>

            {/* Contact Selection */}
            <div className="mb-6">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Select Recipients</Label>
              <RadioGroup value={recipientType} onValueChange={setRecipientType}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="text-sm text-gray-700">
                      All contacts ({contacts.length} recipients)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="publication" id="publication" />
                    <Label htmlFor="publication" className="text-sm text-gray-700">
                      Filter by publication
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="text-sm text-gray-700">
                      Custom selection
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Publication Filter */}
            {recipientType === "publication" && (
              <div className="mb-6">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Publications</Label>
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-3">
                  {uniquePublications.map((publication) => {
                    const count = contacts.filter(c => c.publication === publication).length;
                    return (
                      <div key={publication} className="flex items-center space-x-2">
                        <Checkbox
                          id={publication}
                          checked={selectedPublications.includes(publication)}
                          onCheckedChange={(checked) => handlePublicationChange(publication, checked as boolean)}
                        />
                        <Label htmlFor={publication} className="text-sm">
                          {publication} ({count})
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Send Options */}
            <div className="mb-6">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">Send Options</Label>
              <RadioGroup value={sendOption} onValueChange={setSendOption}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="immediate" id="immediate" />
                    <Label htmlFor="immediate" className="text-sm text-gray-700">
                      Send immediately
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="scheduled" id="scheduled" />
                    <Label htmlFor="scheduled" className="text-sm text-gray-700">
                      Schedule for later
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Schedule Options */}
            {sendOption === "scheduled" && (
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="date" className="text-sm font-medium text-gray-700 mb-1 block">Date</Label>
                    <Input type="date" id="date" />
                  </div>
                  <div>
                    <Label htmlFor="time" className="text-sm font-medium text-gray-700 mb-1 block">Time</Label>
                    <Input type="time" id="time" />
                  </div>
                </div>
              </div>
            )}

            {/* Distribution Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Distribution Summary</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Recipients:</span>
                  <span className="font-medium">{filteredContacts.length} contacts</span>
                </div>
                <div className="flex justify-between">
                  <span>Send time:</span>
                  <span className="font-medium">
                    {sendOption === "immediate" ? "Immediately" : "Scheduled"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated delivery:</span>
                  <span className="font-medium">2-3 minutes</span>
                </div>
              </div>
            </div>

            {/* Send Button */}
            <Button
              className="w-full"
              onClick={handleSend}
              disabled={!selectedRelease || filteredContacts.length === 0 || isDistributing}
            >
              <Send className="w-4 h-4 mr-2" />
              {isDistributing ? "Sending..." : "Send Press Release"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Status */}
      {isDistributing && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Distribution Status</h3>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Clock className="w-3 h-3 mr-1" />
                Sending...
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">
                  {Math.floor((distributionProgress / 100) * filteredContacts.length)} of {filteredContacts.length} sent
                </span>
              </div>
              <Progress value={distributionProgress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Started at {format(new Date(), "h:mm a")}</span>
                <span>~{Math.ceil((100 - distributionProgress) / 20)} minutes remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
