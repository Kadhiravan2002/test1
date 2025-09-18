import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, Calendar, MapPin, Clock, User } from "lucide-react";

interface ApprovalSlipProps {
  request: {
    id: string;
    outing_type: string;
    destination: string;
    from_date: string;
    to_date: string;
    from_time?: string;
    to_time?: string;
    final_status: string;
    warden_approved_at?: string;
    profiles?: {
      full_name: string;
      student_id: string;
    };
  };
}

export default function ApprovalSlip({ request }: ApprovalSlipProps) {
  if (request.final_status !== "approved") {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
      <CardContent className="p-6">
        {/* Header with Approval Status */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <Shield className="h-8 w-8 text-green-600 mr-2" />
            <h2 className="text-2xl font-bold text-green-800">OFFICIAL OUTING PASS</h2>
          </div>
          <div className="flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
            <Badge className="bg-green-600 text-white px-4 py-1 text-lg">
              APPROVED
            </Badge>
          </div>
        </div>

        {/* Pass Details */}
        <div className="space-y-4 border-t border-green-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Student Info */}
            <div className="space-y-2">
              <div className="flex items-center">
                <User className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-semibold text-gray-700">Student Details</span>
              </div>
              <div className="ml-7">
                <p className="text-lg font-bold text-gray-900">{request.profiles?.full_name}</p>
                <p className="text-sm text-gray-600">Reg. No: {request.profiles?.student_id}</p>
              </div>
            </div>

            {/* Outing Type */}
            <div className="space-y-2">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-semibold text-gray-700">Outing Type</span>
              </div>
              <div className="ml-7">
                <Badge 
                  className={`text-sm ${
                    request.outing_type === "local" 
                      ? "bg-blue-100 text-blue-800" 
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {request.outing_type.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-semibold text-gray-700">Destination</span>
              </div>
              <div className="ml-7">
                <p className="text-lg font-medium text-gray-900">{request.destination}</p>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-semibold text-gray-700">Valid Dates</span>
              </div>
              <div className="ml-7">
                <p className="text-sm text-gray-900">
                  From: <span className="font-medium">{formatDate(request.from_date)}</span>
                </p>
                <p className="text-sm text-gray-900">
                  To: <span className="font-medium">{formatDate(request.to_date)}</span>
                </p>
              </div>
            </div>

            {/* Time (for local outings) */}
            {request.from_time && request.to_time && (
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-semibold text-gray-700">Time Limit</span>
                </div>
                <div className="ml-7">
                  <p className="text-sm text-gray-900">
                    Out: <span className="font-medium">{formatTime(request.from_time)}</span> | 
                    In: <span className="font-medium">{formatTime(request.to_time)}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-green-200 pt-4 mt-6">
          <div className="text-center text-sm text-gray-600">
            <p className="font-semibold mb-1">Present this pass to security for exit/entry</p>
            <p>Pass ID: {request.id.slice(0, 8).toUpperCase()}</p>
            <p>Approved on: {request.warden_approved_at && formatDate(request.warden_approved_at)}</p>
          </div>
          
          {/* Security Features */}
          <div className="mt-4 bg-green-100 border border-green-300 rounded p-2 text-center">
            <p className="text-xs text-green-800 font-medium">
              🔒 This is a digitally approved pass. Cannot be modified or duplicated.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}