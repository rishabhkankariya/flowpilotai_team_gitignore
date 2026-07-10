import { toast as sonnerToast, ExternalToast } from 'sonner';

type ToastOptions = Omit<ExternalToast, 'description'> & {
  description?: string;
};

// ─── Duration constants ───────────────────────────────────────────────────────
const DURATIONS = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
} as const;

// ─── Toast helper functions ───────────────────────────────────────────────────

export const toast = {
  success(message: string, opts?: ToastOptions) {
    return sonnerToast.success(message, {
      duration: DURATIONS.success,
      ...opts,
    });
  },

  error(message: string, opts?: ToastOptions) {
    return sonnerToast.error(message, {
      duration: DURATIONS.error,
      ...opts,
    });
  },

  warning(message: string, opts?: ToastOptions) {
    return sonnerToast.warning(message, {
      duration: DURATIONS.warning,
      ...opts,
    });
  },

  info(message: string, opts?: ToastOptions) {
    return sonnerToast.info(message, {
      duration: DURATIONS.info,
      ...opts,
    });
  },

  loading(message: string, opts?: ToastOptions) {
    return sonnerToast.loading(message, {
      ...opts,
    });
  },

  /**
   * Promise toast: shows loading → success/error based on promise resolution.
   */
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
    opts?: ToastOptions,
  ) {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      ...opts,
    });
  },

  /**
   * Dismiss a specific toast by ID, or all toasts if no ID given.
   */
  dismiss(toastId?: string | number) {
    return sonnerToast.dismiss(toastId);
  },
};

// ─── Common toast messages (shared constants) ─────────────────────────────────

export const TOAST_MESSAGES = {
  auth: {
    loginSuccess: 'Welcome back!',
    loginError: 'Invalid email or password',
    logoutSuccess: 'You have been signed out',
    registerSuccess: 'Account created successfully',
    sessionExpired: 'Your session has expired. Please sign in again.',
  },
  inbox: {
    submitSuccess: 'Submission received — AI is processing it',
    submitError: 'Failed to submit. Please try again.',
    processingComplete: 'Your submission has been processed',
    processingFailed: 'Processing failed — please check the result for details',
  },
  documents: {
    uploadSuccess: 'Document uploaded successfully',
    uploadError: 'Failed to upload document',
    extractSuccess: 'Invoice data extracted successfully',
    extractError: 'Extraction failed. Please try again.',
    extractTimeout: 'Processing timed out. Try a smaller file.',
  },
  admin: {
    resetSuccess: (count: number) => `Demo reset: ${count} submissions deleted`,
    resetError: 'Failed to reset demo data',
    seedSuccess: (count: number) => `Demo seeded: ${count} submissions added`,
    seedError: 'Failed to seed demo data',
  },
  generic: {
    networkError: 'Network error. Please check your connection.',
    serverError: 'Something went wrong. Please try again.',
    saved: 'Changes saved',
    copied: 'Copied to clipboard',
  },
} as const;
