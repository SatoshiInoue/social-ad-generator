'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaSelector } from './media-selector';

interface Brand {
  id: string;
  name: string;
}

interface Brief {
  productName?: string | null;
  targetRegion?: string | null;
  language?: string | null;
  audience?: string | null;
  cta?: string | null;
  message?: string | null;
}

interface Campaign {
  id: string;
  name: string;
  brandId: string;
  productImageIds: string[];
  brief?: Brief | null;
}

interface CampaignEditFormProps {
  campaign: Campaign;
  brands: Brand[];
}

export function CampaignEditForm({ campaign, brands }: CampaignEditFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: campaign.name,
    brandId: campaign.brandId,
    productImageIds: campaign.productImageIds || [],
    brief: {
      productName: campaign.brief?.productName || '',
      targetRegion: campaign.brief?.targetRegion || '',
      language: campaign.brief?.language || 'en',
      audience: campaign.brief?.audience || '',
      cta: campaign.brief?.cta || '',
      message: campaign.brief?.message || '',
    },
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send only updatable fields (brandId is set at creation)
      const { brandId, ...updatePayload } = formData;
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error('Failed to update campaign');
      }

      router.push(`/campaigns/${campaign.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert('Failed to update campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label>Product Images</Label>
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

          {/* Brief Details */}
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Campaign Brief</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  value={formData.brief.productName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brief: { ...formData.brief, productName: e.target.value },
                    })
                  }
                  placeholder="e.g., Premium Green Tea"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetRegion">Target Region</Label>
                <Input
                  id="targetRegion"
                  value={formData.brief.targetRegion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brief: { ...formData.brief, targetRegion: e.target.value },
                    })
                  }
                  placeholder="e.g., North America"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={formData.brief.language}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      brief: { ...formData.brief, language: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta">Call to Action</Label>
                <Input
                  id="cta"
                  value={formData.brief.cta}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brief: { ...formData.brief, cta: e.target.value },
                    })
                  }
                  placeholder="e.g., Shop Now"
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="audience">Target Audience</Label>
              <Textarea
                id="audience"
                value={formData.brief.audience}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    brief: { ...formData.brief, audience: e.target.value },
                  })
                }
                placeholder="Describe your target audience..."
                rows={2}
              />
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="message">Core Message</Label>
              <Textarea
                id="message"
                value={formData.brief.message}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    brief: { ...formData.brief, message: e.target.value },
                  })
                }
                placeholder="What's the main message of this campaign?"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
