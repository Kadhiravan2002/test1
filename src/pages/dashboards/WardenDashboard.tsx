import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users, AlertCircle } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

export default function WardenDashboard() {
  useEffect(() => {
    document.title = "Warden Dashboard | Exita";
  }, []);
  
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [comments, setComments] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // ----- Fetch Outing Requests + Attached Profiles -----
      const { data: requestsWithProfiles, error: requestsError } = await supabase
        .from("outing_requests")
        .select(`
          *,
          profiles:user_id (
            full_name,
            student_id,
            phone,
            guardian_name,
            guardian_phone,
            is_approved,
            department_id,
            room_id
          )
        `)
        .eq("current_stage", "warden")
        .order("created_at", { ascending: false });
      
      if (requestsError) console.error("Requests error:", requestsError);
      else console.log("Requests with profiles:", requestsWithProfiles);

      // ----- Fetch Approval History -----
      const { data: history, error: historyError } = await supabase
        .from("approval_history")
        .select(`
          *,
          outing_requests (
            destination,
            outing_type,
            from_date,
            to_date,
            profiles:user_id (
              full_name,
              student_id
            )
          )
        `)
        .eq("stage", "warden")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (historyError) console.error("History error:", historyError);

      // ----- Fetch Complaints -----
      const { data: complaintsData, error: complaintsError } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (complaintsError) console.error("Complaints error:", complaintsError);

      // ----- Stats -----
      const total = requestsWithProfiles?.length || 0;
      const pending = requestsWithProfiles?.filter(r => r.final_status === "pending").length || 0;
      const approved = requestsWithProfiles?.filter(r => r.final_status === "approved").length || 0;
      const rejected = requestsWithProfiles?.filter(r => r.final_status === "rejected").length || 0;

      setAllRequests(requestsWithProfiles || []);
      setPendingRequests(requestsWithProfiles?.filter(r => r.final_status === "pending") || []);
      setApprovalHistory(history || []);
      setComplaints(complaintsData || []);
      setStats({ total, pending, approved, rejected });
    } catch (error) {
      console.error("Unexpected fetch error:", error);
      toast({ title: "Error", description: "Failed to fetch requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ----- Handle Approvals -----
  const handleApproval = async (requestId, action, isLocalOuting = false) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;
      const userId = user.data.user.id;

      let updateData: any = {
        warden_approved_by: userId,
        warden_approved_at: new Date().toISOString(),
      };

      if (action === "approve") {
        if (isLocalOuting) {
          // Local outing: warden’s word is final
          updateData.final_status = "approved";
        } else {
          // Hometown outing: escalate to admin
          updateData.current_stage = "admin";
          updateData.final_status = "pending";
        }
      } else {
        updateData.final_status = "rejected";
        updateData.rejected_by = userId;
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = comments;
      }

      const { error } = await supabase
        .from("outing_requests")
        .update(updateData)
        .eq("id", requestId);
      
      if (error) throw error;

      // Add to approval history
      const { error: insertError } = await supabase.from("approval_history").insert({
        request_id: requestId,
        approver_id: userId,
        stage: "warden",
        action: action === "approve" ? "approved" : "rejected",
        comments: comments,
      });

      if (insertError) throw insertError;

      toast({ 
        title: "Success", 
        description: `Request ${action === "approve" ? "approved" : "rejected"} successfully!` 
      });
      
      setComments("");
      setSelectedRequest(null);
      fetchData();
    } catch (error) {
      console.error("Approval error:", error);
      toast({ title: "Error", description: "Failed to process request", variant: "destructive" });
    }
  };

  // ----- Status Badge -----
  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return <Badge className={colors[status] || colors.pending}>{status}</Badge>;
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-background">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </main>
    );
  }

  // ----- Render -----
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Warden Dashboard" 
        subtitle="Approve local outings and escalate hometown outings" 
        userRole="warden" 
      />
      <main className="p-6">
        <div className="max-w-7xl mx-auto">

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pending" className="w-full">
            <TabsList>
              <TabsTrigger value="pending">Pending Approvals ({stats.pending})</TabsTrigger>
              <TabsTrigger value="all">All Requests</TabsTrigger>
              <TabsTrigger value="history">My Approval History</TabsTrigger>
              <TabsTrigger value="complaints">Complaints</TabsTrigger>
            </TabsList>

            {/* Pending Approvals */}
            <TabsContent value="pending" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Approvals</CardTitle>
                  <CardDescription>Requests waiting for your approval</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No pending requests</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Date Range</TableHead>
                          <TableHead>Profile Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{request.profiles?.full_name || "N/A"}</p>
                                <p className="text-sm text-muted-foreground">{request.profiles?.student_id || "N/A"}</p>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{request.outing_type}</TableCell>
                            <TableCell>{request.destination}</TableCell>
                            <TableCell>
                              {request.from_date} → {request.to_date}
                            </TableCell>
                            <TableCell>
                              {request.profiles?.is_approved
                                ? <Badge className="bg-green-100 text-green-800">Profile Approved</Badge>
                                : <Badge className="bg-yellow-100 text-yellow-800">Profile Incomplete</Badge>}
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                onClick={() => setSelectedRequest(request)}
                              >
                                Review
                              </Button>
                              {selectedRequest?.id === request.id && (
                                <Dialog open={true} onOpenChange={() => setSelectedRequest(null)}>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Review Outing Request</DialogTitle>
                                      <DialogDescription>
                                        Approve or reject this outing request
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <p><strong>Student:</strong> {request.profiles?.full_name}</p>
                                      <p><strong>Destination:</strong> {request.destination}</p>
                                      <p><strong>Dates:</strong> {request.from_date} → {request.to_date}</p>
                                      <Textarea 
                                        value={comments}
                                        onChange={(e) => setComments(e.target.value)}
                                        placeholder="Add comments here..."
                                      />
                                      <div className="flex gap-2">
                                        <Button 
                                          onClick={() => handleApproval(request.id, "approve", request.outing_type === "local")}
                                          className="flex-1"
                                        >
                                          <CheckCircle className="h-4 w-4 mr-2" /> Approve
                                        </Button>
                                        <Button 
                                          onClick={() => handleApproval(request.id, "reject")}
                                          variant="destructive"
                                          className="flex-1"
                                        >
                                          <XCircle className="h-4 w-4 mr-2" /> Reject
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Requests */}
            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>All Requests</CardTitle>
                  <CardDescription>History of all requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <p className="font-medium">{request.profiles?.full_name || "N/A"}</p>
                          </TableCell>
                          <TableCell>{request.outing_type}</TableCell>
                          <TableCell>{request.destination}</TableCell>
                          <TableCell>{request.from_date} → {request.to_date}</TableCell>
                          <TableCell>{getStatusBadge(request.final_status)}</TableCell>
                          <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Approval History */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>My Approval History</CardTitle>
                  <CardDescription>Decisions you made</CardDescription>
                </CardHeader>
                <CardContent>
                  {approvalHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No history yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Date Range</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Decision Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvalHistory.map((history) => (
                          <TableRow key={history.id}>
                            <TableCell>{history.outing_requests?.profiles?.full_name}</TableCell>
                            <TableCell>{history.outing_requests?.outing_type}</TableCell>
                            <TableCell>{history.outing_requests?.destination}</TableCell>
                            <TableCell>{history.outing_requests?.from_date} → {history.outing_requests?.to_date}</TableCell>
                            <TableCell>
                              <Badge className={history.action === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                {history.action}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(history.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Complaints */}
            <TabsContent value="complaints">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Student Complaints
                  </CardTitle>
                  <CardDescription>Review feedback from students</CardDescription>
                </CardHeader>
                <CardContent>
                  {complaints.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No complaints yet</p>
                  ) : (
                    complaints.map((complaint) => (
                      <div key={complaint.id} className="border rounded-lg p-4 mb-4">
                        <h3 className="font-semibold">{complaint.title}</h3>
                        <Badge className={complaint.status === "resolved" ? "bg-green-100 text-green-800" : complaint.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                          {complaint.status}
                        </Badge>
                        <p>{complaint.description}</p>
                        {complaint.admin_response && (
                          <div className="bg-blue-50 p-3 rounded mt-2">
                            <p><strong>Admin Response:</strong> {complaint.admin_response}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
