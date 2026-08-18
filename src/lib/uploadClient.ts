/**
 * Frontend Upload Client for Pixel Rider
 * Handles file uploads to the Multer backend server
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:5000';

export interface UploadFile {
  originalName: string;
  filename: string;
  relativePath: string;
  publicUrl: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface UploadResponse {
  success: boolean;
  file?: UploadFile;
  files?: UploadFile[];
  message?: string;
  error?: string;
}

export type UploadCategory = 'garage' | 'market' | 'avatars' | 'pois' | 'photos-of-week';

/**
 * Upload single or multiple files to backend
 * @param category - Upload category (garage, market, avatars, pois, photos-of-week)
 * @param files - File(s) to upload
 * @param fieldName - Form field name (default based on category)
 */
export const uploadFiles = async (
  category: UploadCategory,
  files: File | File[],
  fieldName?: string
): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    const fileArray = Array.isArray(files) ? files : [files];
    const field = fieldName || getDefaultFieldName(category);

    // Validate files
    if (fileArray.length === 0) {
      throw new Error('No files selected');
    }

    // Add files to form data
    fileArray.forEach((file) => {
      formData.append(field, file);
    });

    // Make request to backend
    const response = await fetch(`${API_BASE_URL}/api/upload/${category}`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
};

/**
 * Upload garage bike images
 */
export const uploadGarageImages = async (files: File[]): Promise<UploadResponse> => {
  return uploadFiles('garage', files, 'images');
};

/**
 * Upload marketplace item images
 */
export const uploadMarketImages = async (files: File[]): Promise<UploadResponse> => {
  return uploadFiles('market', files, 'images');
};

/**
 * Upload user avatar
 */
export const uploadAvatar = async (file: File): Promise<UploadResponse> => {
  return uploadFiles('avatars', file, 'avatar');
};

/**
 * Upload POI image
 */
export const uploadPoiImage = async (file: File): Promise<UploadResponse> => {
  return uploadFiles('pois', file, 'image');
};

/**
 * Upload photo for photo of the week
 */
export const uploadPhotoOfWeek = async (file: File): Promise<UploadResponse> => {
  return uploadFiles('photos-of-week', file, 'photo');
};

/**
 * Delete an uploaded file from server
 */
export const deleteFile = async (category: UploadCategory, filename: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/upload/${category}/${filename}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Delete failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};

/**
 * Get default field name based on category
 */
function getDefaultFieldName(category: UploadCategory): string {
  const fieldNames: Record<UploadCategory, string> = {
    garage: 'images',
    market: 'images',
    avatars: 'avatar',
    pois: 'image',
    'photos-of-week': 'photo',
  };
  return fieldNames[category];
}

/**
 * Get authentication token from localStorage or Supabase session
 */
function getAuthToken(): string {
  // Try to get from localStorage first
  const token = localStorage.getItem('auth_token');
  if (token) return token;

  // Fallback: empty token (for unauthenticated uploads)
  return '';
}

/**
 * Convert file to base64 for preview
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Validate image file
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }

  return { valid: true };
};

export default {
  uploadFiles,
  uploadGarageImages,
  uploadMarketImages,
  uploadAvatar,
  uploadPoiImage,
  uploadPhotoOfWeek,
  deleteFile,
  fileToBase64,
  validateImageFile,
};
