import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompanyDialogProps {
  open: boolean;
  onClose: () => void;
  company?: {
    id: string;
    name: string;
    type: string;
    company_name: string | null;
    company_website: string | null;
    company_size: string | null;
    industry: string | null;
    description: string | null;
    logo_url: string | null;
  } | null;
}

export function CompanyDialog({ open, onClose, company }: CompanyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'EMPLOYER' as 'EMPLOYER' | 'AGENCY' | 'RECRUITING',
    company_name: '',
    company_website: '',
    company_size: '',
    industry: '',
    description: '',
    logo_url: '',
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        type: company.type as any,
        company_name: company.company_name || '',
        company_website: company.company_website || '',
        company_size: company.company_size || '',
        industry: company.industry || '',
        description: company.description || '',
        logo_url: company.logo_url || '',
      });
    } else {
      setFormData({
        name: '',
        type: 'EMPLOYER',
        company_name: '',
        company_website: '',
        company_size: '',
        industry: '',
        description: '',
        logo_url: '',
      });
    }
  }, [company, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (company) {
        // Update existing company
        const { error } = await supabase
          .from('organizations')
          .update(formData)
          .eq('id', company.id);

        if (error) throw error;
        toast.success('Company updated successfully');
      } else {
        // Create new company
        const { error } = await supabase
          .from('organizations')
          .insert([formData]);

        if (error) throw error;
        toast.success('Company created successfully');
      }
      
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {company ? 'Edit Company' : 'Create New Company'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Company Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYER">Employer</SelectItem>
                  <SelectItem value="AGENCY">Agency</SelectItem>
                  <SelectItem value="RECRUITING">Recruiting Firm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">Display Name</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Public-facing company name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_website">Website</Label>
              <Input
                id="company_website"
                type="url"
                value={formData.company_website}
                onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                placeholder="https://company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Technology, Finance"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_size">Company Size</Label>
            <Select
              value={formData.company_size}
              onValueChange={(value) => setFormData({ ...formData, company_size: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1-10 employees</SelectItem>
                <SelectItem value="11-50">11-50 employees</SelectItem>
                <SelectItem value="51-200">51-200 employees</SelectItem>
                <SelectItem value="201-500">201-500 employees</SelectItem>
                <SelectItem value="501-1000">501-1000 employees</SelectItem>
                <SelectItem value="1001-5000">1001-5000 employees</SelectItem>
                <SelectItem value="5000+">5000+ employees</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Company description..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://company.com/logo.png"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : company ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
