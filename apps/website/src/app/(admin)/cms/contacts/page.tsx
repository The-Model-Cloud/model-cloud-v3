"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getContactSubmissions,
  markContactAsRead,
} from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail, Eye, CheckCircle } from "lucide-react";
import type { ContactSubmission } from "@/types/cms";

export default function ContactSubmissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] =
    useState<ContactSubmission | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function fetchSubmissions() {
    try {
      const data = await getContactSubmissions();
      setSubmissions(data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load contact submissions");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      await markContactAsRead(id);
      setSubmissions(
        submissions.map((s) => (s.id === id ? { ...s, read: true } : s))
      );
      toast.success("Marked as read");
    } catch (error) {
      console.error("Error marking as read:", error);
      toast.error("Failed to update submission");
    }
  }

  const formatDate = (timestamp: { seconds: number } | undefined) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unreadCount = submissions.filter((s) => !s.read).length;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/cms")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Contact Submissions
              {unreadCount > 0 && (
                <Badge variant="default">{unreadCount} new</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              View messages from your contact form
            </p>
          </div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No contact submissions yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow
                    key={submission.id}
                    className={!submission.read ? "bg-primary/5" : ""}
                  >
                    <TableCell>
                      {submission.read ? (
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {submission.name}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${submission.email}`}
                        className="text-primary hover:underline"
                      >
                        {submission.email}
                      </a>
                    </TableCell>
                    <TableCell>{submission.company || "-"}</TableCell>
                    <TableCell>
                      {formatDate(submission.createdAt as unknown as { seconds: number })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!submission.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(submission.id!)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!selectedSubmission}
        onOpenChange={() => setSelectedSubmission(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message from {selectedSubmission?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <a
                href={`mailto:${selectedSubmission?.email}`}
                className="text-primary hover:underline"
              >
                {selectedSubmission?.email}
              </a>
            </div>
            {selectedSubmission?.company && (
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p>{selectedSubmission.company}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Message</p>
              <p className="whitespace-pre-wrap">{selectedSubmission?.message}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received</p>
              <p>
                {formatDate(
                  selectedSubmission?.createdAt as unknown as { seconds: number }
                )}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setSelectedSubmission(null)}
            >
              Close
            </Button>
            <Button asChild>
              <a href={`mailto:${selectedSubmission?.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Reply
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
