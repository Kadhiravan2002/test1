import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { User, Phone, MapPin, Camera, AlertCircle } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  student_id?: string;
  year_of_study?: number;
  department_id?: string;
  room_id?: string;
  permanent_address?: string;
  local_address?: string;
  guardian_name?: string;
  guardian_phone?: string;
  photo_url?: string;
  is_approved: boolean;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Room {
  id: string;
  room_number: string;
  floor: number;
}

export default function StudentProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    student_id: "",
    year_of_study: "",
    department_id: "",
    room_id: "",
    permanent_address: "",
    local_address: "",
    guardian_name: "",
    guardian_phone: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.data.user.id)
        .single();

      // Fetch departments
      const { data: departmentData } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      // Fetch available rooms
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .order("room_number");

      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          student_id: profileData.student_id || "",
          year_of_study: profileData.year_of_study?.toString() || "",
          department_id: profileData.department_id || "",
          room_id: profileData.room_id || "",
          permanent_address: profileData.permanent_address || "",
          local_address: profileData.local_address || "",
          guardian_name: profileData.guardian_name || "",
          guardian_phone: profileData.guardian_phone || "",
        });
      }

      setDepartments(departmentData || []);
      setRooms(roomData || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch profile data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    
    const requiredFields = [
      profile.full_name,
      profile.phone,
      profile.student_id,
      profile.year_of_study,
      profile.department_id,
      profile.room_id,
      profile.permanent_address,
      profile.local_address,
      profile.guardian_name,
      profile.guardian_phone,
    ];

    const filledFields = requiredFields.filter(field => field && field.toString().trim() !== "").length;
    return Math.round((filledFields / requiredFields.length) * 100);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          student_id: formData.student_id,
          year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
          department_id: formData.department_id || null,
          room_id: formData.room_id || null,
          permanent_address: formData.permanent_address,
          local_address: formData.local_address,
          guardian_name: formData.guardian_name,
          guardian_phone: formData.guardian_phone,
        })
        .eq("user_id", user.data.user.id);

      if (error) throw error;

      toast({ title: "Success", description: "Profile updated successfully!" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const completionPercentage = calculateProfileCompletion();
  const isProfileIncomplete = completionPercentage < 100;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading profile...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Completion Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Completion Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Profile Completion</span>
              <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="w-full" />
            
            {isProfileIncomplete && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Profile Incomplete</p>
                  <p className="text-xs text-yellow-700">
                    Please complete all required fields. This is mandatory for outing approvals.
                  </p>
                </div>
              </div>
            )}

            {profile?.is_approved ? (
              <Badge className="bg-green-100 text-green-800">Profile Approved</Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details and contact information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="student_id">Student ID *</Label>
                <Input
                  id="student_id"
                  value={formData.student_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                  placeholder="Enter your student ID"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year_of_study">Year of Study *</Label>
                <Select value={formData.year_of_study} onValueChange={(value) => setFormData(prev => ({ ...prev, year_of_study: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department_id">Department *</Label>
                <Select value={formData.department_id} onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="room_id">Room *</Label>
                <Select value={formData.room_id} onValueChange={(value) => setFormData(prev => ({ ...prev, room_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.room_number} (Floor {room.floor})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardian_name">Guardian Name *</Label>
                <Input
                  id="guardian_name"
                  value={formData.guardian_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, guardian_name: e.target.value }))}
                  placeholder="Enter guardian's name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardian_phone">Guardian Phone *</Label>
                <Input
                  id="guardian_phone"
                  value={formData.guardian_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, guardian_phone: e.target.value }))}
                  placeholder="Enter guardian's phone"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanent_address">Permanent Address *</Label>
              <Textarea
                id="permanent_address"
                value={formData.permanent_address}
                onChange={(e) => setFormData(prev => ({ ...prev, permanent_address: e.target.value }))}
                placeholder="Enter your permanent address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="local_address">Local Address *</Label>
              <Textarea
                id="local_address"
                value={formData.local_address}
                onChange={(e) => setFormData(prev => ({ ...prev, local_address: e.target.value }))}
                placeholder="Enter your local address"
                required
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}