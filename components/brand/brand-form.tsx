'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPalette } from './color-palette';
import { ProhibitedTerms } from './prohibited-terms';
import { Upload } from 'lucide-react';
import { useS3Upload } from '@/hooks/use-s3-upload';

interface Brand {
  id?: string;
  name: string;
  logoUrl?: string | null;
  colorPalette?: string[] | null;
  guidelines?: string | null;
  tone?: string | null;
  style?: string | null;
  prohibitedTerms?: string[];
}

interface BrandFormProps {
  brand?: Brand;
  onSuccess?: () => void;
}

const toneOptions = ['Professional', 'Playful', 'Bold', 'Friendly', 'Serious'];
const styleOptions = ['Minimalist', 'Corporate', 'Vibrant', 'Modern', 'Classic'];

export function BrandForm({ brand, onSuccess }: BrandFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useS3Upload();
  const [formData, setFormData] = useState<Brand>({
    name: brand?.name || '',
    logoUrl: brand?.logoUrl || null,
    colorPalette: brand?.colorPalette || [],
    guidelines: brand?.guidelines || null,
    tone: brand?.tone || null,
    style: brand?.style || null,
    prohibitedTerms: brand?.prohibitedTerms || [],
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploadingLogo(true);
    try {
      const { s3Url } = await uploadFile(file);
      setFormData({ ...formData, logoUrl: s3Url });
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = brand?.id ? `/api/brands/${brand.id}` : '/api/brands';
      const method = brand?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save brand');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/brands');
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving brand:', error);
      alert('Failed to save brand. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Brand Name *</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter brand name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoUrl">Logo URL</Label>
        <div className="flex gap-2">
          <Input
            id="logoUrl"
            type="url"
            value={formData.logoUrl || ''}
            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={uploadingLogo}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
        {formData.logoUrl && (
          <div className="mt-2">
            <img src={formData.logoUrl} alt="Logo preview" className="h-16 w-auto object-contain" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Color Palette</Label>
        <ColorPalette
          colors={formData.colorPalette || []}
          onChange={(colors) => setFormData({ ...formData, colorPalette: colors })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tone">Brand Tone</Label>
        <Select value={formData.tone || ''} onValueChange={(value) => setFormData({ ...formData, tone: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select tone" />
          </SelectTrigger>
          <SelectContent>
            {toneOptions.map((tone) => (
              <SelectItem key={tone} value={tone.toLowerCase()}>
                {tone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="style">Brand Style</Label>
        <Select value={formData.style || ''} onValueChange={(value) => setFormData({ ...formData, style: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            {styleOptions.map((style) => (
              <SelectItem key={style} value={style.toLowerCase()}>
                {style}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guidelines">Brand Guidelines</Label>
        <Textarea
          id="guidelines"
          value={formData.guidelines || ''}
          onChange={(e) => setFormData({ ...formData, guidelines: e.target.value })}
          placeholder="Enter detailed brand guidelines..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Prohibited Terms</Label>
        <ProhibitedTerms
          terms={formData.prohibitedTerms || []}
          onChange={(terms) => setFormData({ ...formData, prohibitedTerms: terms })}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : brand?.id ? 'Update Brand' : 'Create Brand'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
