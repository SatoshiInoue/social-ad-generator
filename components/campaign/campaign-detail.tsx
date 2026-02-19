'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useGenerationPoll } from '@/hooks/use-generation-poll';
import { ExportDialog } from '@/components/export/export-dialog';
import { DeleteAssetDialog } from '@/components/campaign/delete-asset-dialog';
import { Sparkles, FileImage, Edit as EditIcon, Copy, Info, ShieldCheck, Loader2, Languages } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SUPPORTED_LANGUAGES } from '@/lib/localization';
import Image from 'next/image';

interface CampaignDetailProps {
  campaign: any;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-700 bg-green-50 border-green-200';
  if (score >= 50) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function getScoreDotColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

const CHECK_LABELS: Record<string, { label: string; maxScore: number }> = {
  prohibitedTerms: { label: 'Prohibited Terms', maxScore: 25 },
  colorCompliance: { label: 'Color Palette', maxScore: 25 },
  guidelinesCompliance: { label: 'Brand Guidelines', maxScore: 30 },
  logoPresence: { label: 'Logo Presence', maxScore: 10 },
  textReadability: { label: 'Text Readability', maxScore: 10 },
};

export function CampaignDetail({ campaign }: CampaignDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [copying, setCopying] = useState(false);
  const [jobId, setJobId] = useState<string | null>(
    campaign.generationJobs[0]?.id || null
  );
  const [complianceScores, setComplianceScores] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const asset of campaign.generatedAssets) {
      if (asset.complianceScore) {
        initial[asset.id] = asset.complianceScore;
      }
    }
    return initial;
  });
  const [scoringAssets, setScoringAssets] = useState<Set<string>>(new Set());
  const [translatingAsset, setTranslatingAsset] = useState<string | null>(null);

  const { job } = useGenerationPoll(jobId);

  const handleLocalize = async (assetId: string, targetLanguage: string) => {
    setTranslatingAsset(assetId);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, targetLanguage }),
      });
      if (response.ok) {
        toast({
          title: 'Asset localized',
          description: `Created ${targetLanguage} variant`,
        });
        router.refresh();
      } else {
        throw new Error('Translation failed');
      }
    } catch (error) {
      console.error('Error localizing asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to localize asset',
        variant: 'destructive',
      });
    } finally {
      setTranslatingAsset(null);
    }
  };

  const handleScoreAsset = async (assetId: string) => {
    setScoringAssets((prev) => new Set(prev).add(assetId));
    try {
      const response = await fetch('/api/compliance/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      if (response.ok) {
        const score = await response.json();
        setComplianceScores((prev) => ({ ...prev, [assetId]: score }));
      }
    } catch (error) {
      console.error('Error scoring asset:', error);
    } finally {
      setScoringAssets((prev) => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          aspectRatios: ['1:1', '9:16', '16:9'],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start generation');
      }

      const { jobId: newJobId } = await response.json();
      setJobId(newJobId);
    } catch (error) {
      console.error('Error starting generation:', error);
      alert('Failed to start generation');
      setGenerating(false);
    }
  };

  const handleCopyCampaign = async () => {
    setCopying(true);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/copy`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to copy campaign');
      }

      const newCampaign = await response.json();

      toast({
        title: 'Campaign copied',
        description: `Created "${newCampaign.name}"`,
      });

      router.push(`/campaigns/${newCampaign.id}`);
    } catch (error) {
      console.error('Error copying campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy campaign',
        variant: 'destructive',
      });
      setCopying(false);
    }
  };

  const isGenerating = job?.status === 'PENDING' || job?.status === 'PROCESSING';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-muted-foreground">{campaign.brand.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyCampaign} disabled={copying}>
            <Copy className="mr-2 h-4 w-4" />
            {copying ? 'Copying...' : 'Copy Campaign'}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/campaigns/${campaign.id}/edit`)}
          >
            Edit Campaign
          </Button>
          {!campaign.brief && (
            <Button onClick={() => router.push(`/campaigns/${campaign.id}/brief`)}>
              Add Brief
            </Button>
          )}
        </div>
      </div>

      {campaign.brief && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Brief</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Product</p>
              <p className="text-sm text-muted-foreground">
                {campaign.brief.productName || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Target Region</p>
              <p className="text-sm text-muted-foreground">
                {campaign.brief.targetRegion || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Audience</p>
              <p className="text-sm text-muted-foreground">
                {campaign.brief.audience || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">CTA</p>
              <p className="text-sm text-muted-foreground">
                {campaign.brief.cta || 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {campaign.brief && campaign.generatedAssets.length === 0 && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Generate Ad Assets</CardTitle>
            <CardDescription>
              Use AI to create ad creatives based on your campaign brief
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button
              onClick={handleGenerate}
              disabled={generating || isGenerating}
              size="lg"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {isGenerating ? 'Generating...' : 'Generate Assets'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isGenerating && job && (
        <Card>
          <CardHeader>
            <CardTitle>Generating Assets...</CardTitle>
            <CardDescription>
              Creating ad creatives with AI. This may take a few minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={job.progress} />
            <p className="text-sm text-center text-muted-foreground">
              {job.progress}% complete
            </p>
            {job.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600 mt-1">{job.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {job?.status === 'FAILED' && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800">Generation Failed</CardTitle>
            <CardDescription>
              There was an error generating your assets. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">Error Details</p>
                <p className="text-sm text-red-600 mt-1 font-mono">{job.error}</p>
              </div>
            )}
            <Button onClick={handleGenerate} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {campaign.generatedAssets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Generated Assets</h2>
            <Button
              onClick={handleGenerate}
              disabled={generating || isGenerating}
              variant="outline"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Regenerate Assets
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaign.generatedAssets.map((asset: any) => (
              <Card key={asset.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{asset.aspectRatio}</CardTitle>
                  <CardDescription>{asset.language}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                    {asset.s3Url ? (
                      <Image
                        src={asset.s3Url}
                        alt={`Generated ${asset.aspectRatio} asset`}
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                          No preview available
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Compliance Score */}
                  <div className="flex items-center gap-2">
                    {complianceScores[asset.id] ? (
                      <>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm font-medium ${getScoreColor(complianceScores[asset.id].score)}`}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {complianceScores[asset.id].score}/100
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm">Compliance Details</h4>
                              {Object.entries(CHECK_LABELS).map(([key, { label, maxScore }]) => {
                                const reasoning = complianceScores[asset.id].reasoning as any;
                                const check = reasoning?.[key];
                                const checkScore = (complianceScores[asset.id] as any)[key === 'prohibitedTerms' ? 'prohibitedTerms' : key] as number;
                                return (
                                  <div key={key} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm">{label}</span>
                                      <span className="text-sm font-medium">
                                        <span className={checkScore >= maxScore * 0.8 ? 'text-green-600' : checkScore >= maxScore * 0.5 ? 'text-yellow-600' : 'text-red-600'}>
                                          {checkScore}
                                        </span>
                                        /{maxScore}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full ${checkScore >= maxScore * 0.8 ? 'bg-green-500' : checkScore >= maxScore * 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${(checkScore / maxScore) * 100}%` }}
                                      />
                                    </div>
                                    {check?.reasoning && (
                                      <p className="text-xs text-muted-foreground">{check.reasoning}</p>
                                    )}
                                    {check?.issues?.length > 0 && (
                                      <ul className="text-xs text-red-600 list-disc pl-4">
                                        {check.issues.map((issue: string, i: number) => (
                                          <li key={i}>{issue}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleScoreAsset(asset.id)}
                        disabled={scoringAssets.has(asset.id)}
                      >
                        {scoringAssets.has(asset.id) ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Scoring...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Check Compliance
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      size="sm"
                      onClick={() =>
                        router.push(`/campaigns/${campaign.id}/editor?assetId=${asset.id}`)
                      }
                    >
                      <EditIcon className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <ExportDialog
                      assetId={asset.id}
                      trigger={
                        <Button variant="outline" size="sm" className="flex-1">
                          <FileImage className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      }
                    />
                    <DeleteAssetDialog
                      campaignId={campaign.id}
                      assetId={asset.id}
                      aspectRatio={asset.aspectRatio}
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={translatingAsset === asset.id}
                      >
                        {translatingAsset === asset.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Translating...
                          </>
                        ) : (
                          <>
                            <Languages className="mr-2 h-4 w-4" />
                            Localize
                          </>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Translate to:</p>
                        {SUPPORTED_LANGUAGES.filter((lang) => lang.code !== asset.language).map((lang) => (
                          <button
                            key={lang.code}
                            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
                            onClick={() => handleLocalize(asset.id, lang.code)}
                          >
                            {lang.name}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
