// Note: expo-camera needs to be installed: npm install expo-camera
// import { CameraView, Camera } from 'expo-camera';
// import { BarcodeScanningResult } from 'expo-camera';

export interface BarcodeScanResult {
  type: string;
  data: string;
  cornerPoints: { x: number; y: number }[];
}

export class BarcodeScannerService {
  private cameraPermission: boolean = false;

  async requestCameraPermission(): Promise<boolean> {
    try {
      // Placeholder for camera permission request
      // Uncomment when expo-camera is installed:
      // const { status } = await Camera.requestCameraPermissionsAsync();
      // this.cameraPermission = status === 'granted';
      this.cameraPermission = true; // Placeholder
      return this.cameraPermission;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  hasCameraPermission(): boolean {
    return this.cameraPermission;
  }

  parseBarcodeData(data: string): {
    type: 'PRODUCT' | 'TABLE' | 'UNKNOWN';
    id?: string;
    raw: string;
  } {
    // Try to parse different barcode formats
    // Product barcode format: "PROD-{productId}"
    // Table QR code format: "TABLE-{tableId}"
    
    if (data.startsWith('PROD-')) {
      return {
        type: 'PRODUCT',
        id: data.replace('PROD-', ''),
        raw: data,
      };
    }
    
    if (data.startsWith('TABLE-')) {
      return {
        type: 'TABLE',
        id: data.replace('TABLE-', ''),
        raw: data,
      };
    }
    
    // Try to parse as plain product ID (numeric)
    if (/^\d+$/.test(data)) {
      return {
        type: 'PRODUCT',
        id: data,
        raw: data,
      };
    }
    
    return {
      type: 'UNKNOWN',
      raw: data,
    };
  }

  generateProductQRCode(productId: string): string {
    return `PROD-${productId}`;
  }

  generateTableQRCode(tableId: string): string {
    return `TABLE-${tableId}`;
  }

  validateBarcodeFormat(data: string): boolean {
    const parsed = this.parseBarcodeData(data);
    return parsed.type !== 'UNKNOWN';
  }
}

// Singleton instance
export const barcodeScannerService = new BarcodeScannerService();
