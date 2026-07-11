'use client';

import * as React from 'react';

export interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function FileUpload({ onUploadComplete, onRemove, disabled }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null);

  const handleSimulatedUpload = () => {
    if (disabled) return;
    const mockUrl = 'https://abc.supabase.co/storage/v1/object/public/uploads/user/invoice.pdf';
    setSelectedFile('invoice.pdf');
    onUploadComplete(mockUrl);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    onRemove();
  };

  return (
    <div className="border border-dashed border-border p-4 rounded-lg text-center bg-muted/20">
      {selectedFile ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{selectedFile}</p>
          <button
            onClick={handleRemove}
            className="text-xs text-destructive hover:underline"
            disabled={disabled}
          >
            Remove File
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Select a file (PDF, PNG, JPG) to upload</p>
          <button
            onClick={handleSimulatedUpload}
            className="text-xs text-primary hover:underline"
            disabled={disabled}
          >
            Choose File (Simulated)
          </button>
        </div>
      )}
    </div>
  );
}
