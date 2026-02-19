'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    status: string;
    createdAt: string | Date;
    brand: { name: string };
    _count: { generatedAssets: number };
  };
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }

      toast({
        title: 'Campaign deleted',
        description: `"${campaign.name}" has been deleted`,
      });

      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const statusClass =
    campaign.status === 'DRAFT'
      ? 'bg-gray-100 text-gray-700'
      : campaign.status === 'GENERATING'
        ? 'bg-blue-100 text-blue-700'
        : campaign.status === 'GENERATED'
          ? 'bg-green-100 text-green-700'
          : campaign.status === 'EDITING'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-purple-100 text-purple-700';

  return (
    <>
      <Card
        className="hover:shadow-lg transition-shadow h-full cursor-pointer group"
        onClick={() => router.push(`/campaigns/${campaign.id}`)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate">{campaign.name}</CardTitle>
              <CardDescription>{campaign.brand.name}</CardDescription>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusClass}`}
              >
                {campaign.status}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Assets:</span>
              <span className="font-medium">
                {campaign._count.generatedAssets}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{formatDate(new Date(campaign.createdAt))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{campaign.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the campaign,
              its brief, and all {campaign._count.generatedAssets} generated asset(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
