'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';

interface BriefFormProps {
  campaignId: string;
  onComplete: () => void;
}

export function BriefForm({ campaignId, onComplete }: BriefFormProps) {
  const [formData, setFormData] = useState({
    campaignName: '',
    brandName: '',
    cta: '',
    productName: '',
    targetRegion: '',
    language: 'English',
    audience: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/briefs/parse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse file');
      }

      const parsed = await response.json();
      setFormData((prev) => ({ ...prev, ...parsed }));
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Failed to parse file. Please fill in the form manually.');
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          campaignId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create brief');
      }

      onComplete();
    } catch (error) {
      console.error('Error creating brief:', error);
      alert('Failed to create brief. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Brief (Optional)</CardTitle>
          <CardDescription>
            Upload a PDF, DOCX, JSON, or YAML file to auto-fill the form
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="file"
              id="brief-upload"
              className="hidden"
              accept=".pdf,.docx,.json,.yaml,.yml"
              onChange={handleFileUpload}
              disabled={parsing}
            />
            <label htmlFor="brief-upload">
              <Button type="button" variant="outline" asChild disabled={parsing}>
                <span>
                  {parsing ? (
                    <>Parsing...</>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload File
                    </>
                  )}
                </span>
              </Button>
            </label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>PDF, DOCX, JSON, or YAML</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="campaignName">Campaign Name *</Label>
          <Input
            id="campaignName"
            required
            value={formData.campaignName}
            onChange={(e) =>
              setFormData({ ...formData, campaignName: e.target.value })
            }
            placeholder="Enter campaign name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brandName">Brand Name *</Label>
          <Input
            id="brandName"
            required
            value={formData.brandName}
            onChange={(e) =>
              setFormData({ ...formData, brandName: e.target.value })
            }
            placeholder="Enter brand name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productName">Product/Service</Label>
          <Input
            id="productName"
            value={formData.productName}
            onChange={(e) =>
              setFormData({ ...formData, productName: e.target.value })
            }
            placeholder="Enter product or service name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cta">Call to Action</Label>
          <Input
            id="cta"
            value={formData.cta}
            onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
            placeholder="e.g., Shop Now, Learn More"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetRegion">Target Region</Label>
          <Input
            id="targetRegion"
            value={formData.targetRegion}
            onChange={(e) =>
              setFormData({ ...formData, targetRegion: e.target.value })
            }
            placeholder="e.g., North America, EMEA"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Input
            id="language"
            value={formData.language}
            onChange={(e) =>
              setFormData({ ...formData, language: e.target.value })
            }
            placeholder="e.g., English, Spanish"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience">Target Audience</Label>
        <Textarea
          id="audience"
          value={formData.audience}
          onChange={(e) =>
            setFormData({ ...formData, audience: e.target.value })
          }
          placeholder="Describe your target audience..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Core Message</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="What's the main message of this campaign?"
          rows={4}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
