import { useState } from 'react';
import QRCode from 'react-qr-code';
import { MoreVertical, ExternalLink, Copy, Download, XCircle, Clock, QrCode as QrCodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { SharedLink } from '@/types';

interface ShareManagerProps {
  links: SharedLink[];
  onExtend?: (link: SharedLink) => void;
  onRevoke?: (link: SharedLink) => void;
  onCopy?: (url: string) => void;
  onGenerateQR?: (link: SharedLink) => void;
  onOpen?: (link: SharedLink) => void;
}

export default function ShareManager({
  links = [],
  onExtend,
  onRevoke,
  onCopy,
  onGenerateQR,
  onOpen,
}: ShareManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLinks = links.filter((link) =>
    link.modelName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getShareUrl = (linkId: string): string => {
    return `${window.location.origin}/ar?id=${linkId}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Share Manager</h1>
        <p className="text-muted-foreground mt-2">
          Manage your shared links and QR codes
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search models..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
          data-testid="input-search-links"
        />
      </div>

      {filteredLinks.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-card-border">
          <p className="text-muted-foreground">
            {searchTerm ? 'No links found' : 'No shared links yet'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-card-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">QR Code</TableHead>
                <TableHead>Model Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Scans</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks.map((link) => {
                const shareUrl = getShareUrl(link.id);
                const isExpired = link.expiresAt < Date.now();
                
                return (
                  <TableRow key={link.id} data-testid={`link-row-${link.id}`}>
                    <TableCell>
                      <div className="w-12 h-12 bg-white p-1 rounded border">
                        <QRCode
                          value={shareUrl}
                          size={40}
                          bgColor={link.qrOptions.bgColor}
                          fgColor={link.qrOptions.fgColor}
                          level={link.qrOptions.level}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{link.modelName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(link.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(link.expiresAt)}
                    </TableCell>
                    <TableCell className="text-sm">{link.views}</TableCell>
                    <TableCell className="text-sm">{link.scans}</TableCell>
                    <TableCell>
                      <Badge
                        variant={link.isActive && !isExpired ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {isExpired ? 'Expired' : link.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            data-testid={`button-link-menu-${link.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onOpen && (
                            <DropdownMenuItem onClick={() => onOpen(link)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Link
                            </DropdownMenuItem>
                          )}
                          {onCopy && (
                            <DropdownMenuItem onClick={() => onCopy(shareUrl)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                          )}
                          {onGenerateQR && (
                            <DropdownMenuItem onClick={() => onGenerateQR(link)}>
                              <QrCodeIcon className="h-4 w-4 mr-2" />
                              Generate QR
                            </DropdownMenuItem>
                          )}
                          {onExtend && !isExpired && (
                            <DropdownMenuItem onClick={() => onExtend(link)}>
                              <Clock className="h-4 w-4 mr-2" />
                              Extend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {onRevoke && (
                            <DropdownMenuItem
                              onClick={() => onRevoke(link)}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Revoke
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
