import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";

interface RequestRoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserEmail: string;
  targetUserName?: string;
  requestType: "assign" | "update" | "remove";
  currentRole?: string;
  suggestedRole?: string;
  orgId?: string;
  onSuccess?: () => void;
}

const CRITICAL_ROLES = ['platform_admin', 'org_admin', 'agency_admin'];

export function RequestRoleChangeDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserEmail,
  targetUserName,
  requestType,
  currentRole,
  suggestedRole,
  orgId,
  onSuccess
}: RequestRoleChangeDialogProps) {
  const [newRole, setNewRole] = useState(suggestedRole || '');
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newRole && requestType !== 'remove') {
      toast.error('Please select a role');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for this change');
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('role_change_requests')
        .insert([{
          target_user_id: targetUserId,
          requested_by: (await supabase.auth.getUser()).data.user?.id!,
          request_type: requestType,
          previous_role: currentRole || null,
          new_role: newRole as any || null,
          org_id: orgId || null,
          reason,
          justification: justification || null
        }]);

      if (error) throw error;

      toast.success('Role change request submitted for approval');
      onOpenChange(false);
      if (onSuccess) onSuccess();
      
      // Reset form
      setNewRole(suggestedRole || '');
      setReason('');
      setJustification('');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit role change request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionLabel = () => {
    switch (requestType) {
      case 'assign': return 'Assign';
      case 'update': return 'Update';
      case 'remove': return 'Remove';
      default: return 'Change';
    }
  };

  const getDescription = () => {
    const isCritical = CRITICAL_ROLES.includes(newRole || currentRole || '');
    
    if (isCritical) {
      return 'This is a critical role change that requires approval from another administrator before it takes effect.';
    }
    return 'This role change requires approval before it takes effect.';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Request Role Change
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="p-3 rounded-lg bg-muted border">
            <div className="space-y-1">
              <div className="font-medium">{targetUserName || 'User'}</div>
              <div className="text-sm text-muted-foreground">{targetUserEmail}</div>
            </div>
          </div>

          {/* Role Selection */}
          {requestType !== 'remove' && (
            <div className="space-y-2">
              <Label htmlFor="new-role">
                {requestType === 'assign' ? 'Role to Assign' : 'New Role'} *
              </Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="new-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                  <SelectItem value="org_admin">Org Admin</SelectItem>
                  <SelectItem value="agency_admin">Agency Admin</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="candidate">Candidate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Current Role Display for Update/Remove */}
          {(requestType === 'update' || requestType === 'remove') && currentRole && (
            <div className="space-y-2">
              <Label>Current Role</Label>
              <div className="p-2 rounded-md bg-muted text-sm font-medium">
                {currentRole}
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this role change is needed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label htmlFor="justification">Additional Justification (Optional)</Label>
            <Textarea
              id="justification"
              placeholder="Provide any additional context or business justification..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning for Critical Roles */}
          {CRITICAL_ROLES.includes(newRole || currentRole || '') && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800 dark:text-orange-300">
                <strong>Critical Role:</strong> This request will be reviewed by another administrator before being applied.
                You will receive a notification once it's approved or rejected.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : `Submit ${getActionLabel()} Request`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
