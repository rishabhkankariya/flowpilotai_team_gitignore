import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET_NAME = 'flowpilot-uploads';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

export interface UploadResult {
  url: string;
  path: string;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Unsupported file type: ${file.type}. Allowed: PDF, PNG, JPG`;
  }
  return null;
}

export async function uploadFile(
  file: File,
  userId: string,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const uniqueId = crypto.randomUUID();
  const path = `${userId}/${uniqueId}.${ext}`;

  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let simulatedProgress = 0;
  if (onProgress) {
    progressInterval = setInterval(() => {
      simulatedProgress = Math.min(simulatedProgress + 10, 90);
      onProgress(simulatedProgress);
    }, 200);
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (error) throw new StorageError(error.message);

    if (onProgress) onProgress(100);

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, path: data.path };
  } finally {
    if (progressInterval) clearInterval(progressInterval);
  }
}

export async function deleteFile(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);
  if (error) throw new StorageError(error.message);
}
