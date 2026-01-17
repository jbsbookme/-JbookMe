'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  text: string;
  label?: string;
  className?: string;
};

export function CopyToClipboardButton({ text, label = 'Copy', className }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied');
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={className}
      aria-label={label}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="ml-2">{copied ? 'Copied' : label}</span>
    </Button>
  );
}
