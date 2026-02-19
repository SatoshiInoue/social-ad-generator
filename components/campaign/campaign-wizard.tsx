'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BriefForm } from './brief-form';
import { MediaSelector } from './media-selector';
import { CheckCircle } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
}

interface CampaignWizardProps {
  brands: Brand[];
}

type Step = 'basic' | 'brief' | 'complete';

export function CampaignWizard({ brands }: CampaignWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('basic');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    brandId: '',
    productImageIds: [] as string[],
  });
  const [loading, setLoading] = useState(false);

  const handleBasicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }

      const campaign = await response.json();
      setCampaignId(campaign.id);
      setStep('brief');
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBriefComplete = () => {
    setStep('complete');
  };

  if (step === 'complete' && campaignId) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Campaign Created!</CardTitle>
          <CardDescription>
            Your campaign has been set up successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button onClick={() => router.push(`/campaigns/${campaignId}`)}>
            View Campaign
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`flex items-center gap-2 ${step === 'basic' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step !== 'basic' ? 'bg-primary text-primary-foreground' : 'border-2 border-current'}`}>
            {step !== 'basic' ? '✓' : '1'}
          </div>
          <span className="text-sm font-medium">Basic Info</span>
        </div>
        <div className="h-px w-12 bg-border" />
        <div className={`flex items-center gap-2 ${step === 'brief' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step === 'complete' ? 'bg-primary text-primary-foreground' : 'border-2 border-current'}`}>
            {step === 'complete' ? '✓' : '2'}
          </div>
          <span className="text-sm font-medium">Campaign Brief</span>
        </div>
      </div>

      {/* Step Content */}
      {step === 'basic' && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Basics</CardTitle>
            <CardDescription>
              Start by selecting a brand and naming your campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBasicSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brandId">Brand *</Label>
                <Select
                  value={formData.brandId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, brandId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {brands.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No brands found.{' '}
                    <a href="/brands/new" className="text-primary underline">
                      Create a brand first
                    </a>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Summer 2024 Product Launch"
                />
              </div>

              <div className="space-y-2">
                <Label>Product Images (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Select product images from your media library
                </p>
                <MediaSelector
                  selectedIds={formData.productImageIds}
                  onChange={(ids) =>
                    setFormData({ ...formData, productImageIds: ids })
                  }
                />
              </div>

              <Button type="submit" disabled={loading || brands.length === 0}>
                {loading ? 'Creating...' : 'Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 'brief' && campaignId && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Brief</CardTitle>
            <CardDescription>
              Provide details about your campaign to generate relevant assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BriefForm campaignId={campaignId} onComplete={handleBriefComplete} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
