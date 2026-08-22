import { Platform, Alert } from 'react-native';
import { api } from './api';
import { PERMISSIONS, request, RESULTS } from 'react-native-permissions';

// Try to import Bluetooth module - handle both versions
let RNBluetoothClassic: any = null;
try {
  RNBluetoothClassic = require('react-native-bluetooth-classic');
} catch {
  console.warn('react-native-bluetooth-classic not installed');
}

export interface ReceiptData {
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  orderNumber: number;
  tableName?: string;
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  date: string;
  serverName?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    modifiers?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  tip?: number;
  paymentMethod: string;
  tendered?: number;
  change?: number;
}

export interface PrinterDevice {
  id: string;
  name: string;
  address: string;
  type: 'BLUETOOTH' | 'NETWORK' | 'USB';
  isActive: boolean;
  lastSeen?: string;
}

class PrinterService {
  private connectedDevice: PrinterDevice | null = null;
  private deviceType: 'BLUETOOTH' | 'NETWORK' | null = null;
  private bluetoothConnection: any = null;

  // ----- Get available printers from backend -----
  async getAvailablePrinters(): Promise<PrinterDevice[]> {
    try {
      const response = await api.get('/devices?type=PRINTER');
      const devices = response.data || [];
      
      return devices
        .filter((d: any) => d.isActive !== false)
        .map((d: any) => ({
          id: d.id,
          name: d.name || d.deviceId,
          address: d.ipAddress || d.deviceId,
          type: d.ipAddress ? 'NETWORK' : 'BLUETOOTH',
          isActive: d.isActive !== false,
          lastSeen: d.lastSeenAt,
        }));
    } catch (error) {
      console.error('Failed to fetch printers:', error);
      return [];
    }
  }

  // ----- Get a specific printer by ID -----
  async getPrinterById(printerId: string): Promise<PrinterDevice | null> {
    try {
      const response = await api.get(`/devices/${printerId}`);
      const d = response.data;
      if (!d || d.type !== 'PRINTER') return null;
      
      return {
        id: d.id,
        name: d.name || d.deviceId,
        address: d.ipAddress || d.deviceId,
        type: d.ipAddress ? 'NETWORK' : 'BLUETOOTH',
        isActive: d.isActive !== false,
        lastSeen: d.lastSeenAt,
      };
    } catch (error) {
      console.error(`Failed to fetch printer ${printerId}:`, error);
      return null;
    }
  }

  // ----- Connect to a printer -----
  async connect(device: PrinterDevice): Promise<boolean> {
    try {
      if (device.type === 'NETWORK' && device.address) {
        this.deviceType = 'NETWORK';
        this.connectedDevice = device;
        return true;
      }
      
      if (device.type === 'BLUETOOTH') {
        // Check if Bluetooth is available
        if (!RNBluetoothClassic) {
          Alert.alert('Error', 'Bluetooth module not available. Please install react-native-bluetooth-classic.');
          return false;
        }

        if (Platform.OS === 'android') {
          try {
            const result = await request(
              Platform.Version >= 31 
                ? PERMISSIONS.ANDROID.BLUETOOTH_CONNECT 
                : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
            );
            if (result !== RESULTS.GRANTED) {
              Alert.alert('Permission required', 'Bluetooth permission is required.');
              return false;
            }
          } catch (permError) {
            console.error('Permission error:', permError);
            Alert.alert('Error', 'Could not get Bluetooth permission.');
            return false;
          }
        }
        
        // Try to connect via Bluetooth
        try {
          // Try the newer API first
          if (RNBluetoothClassic.connectToDevice) {
            this.bluetoothConnection = await RNBluetoothClassic.connectToDevice(device.address);
          } else if (RNBluetoothClassic.connect) {
            this.bluetoothConnection = await RNBluetoothClassic.connect(device.address);
          } else {
            Alert.alert('Error', 'Bluetooth module does not support connection.');
            return false;
          }
          
          if (!this.bluetoothConnection) {
            Alert.alert('Error', 'Could not connect to Bluetooth printer.');
            return false;
          }
        } catch (connError) {
          console.error('Bluetooth connection error:', connError);
          Alert.alert('Connection Failed', `Could not connect to ${device.name}.`);
          return false;
        }
        
        this.deviceType = 'BLUETOOTH';
        this.connectedDevice = device;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to connect:', error);
      return false;
    }
  }

  // ----- Disconnect -----
  async disconnect(): Promise<void> {
    try {
      if (this.bluetoothConnection) {
        // Try multiple disconnect methods
        try {
          if (this.bluetoothConnection.disconnect) {
            await this.bluetoothConnection.disconnect();
          } else if (this.bluetoothConnection.close) {
            await this.bluetoothConnection.close();
          }
        } catch (e) {
          console.warn('Disconnect method failed:', e);
        }
        
        // Also try module-level disconnect
        try {
          if (RNBluetoothClassic) {
            if (RNBluetoothClassic.disconnect) {
              await RNBluetoothClassic.disconnect();
            } else if (RNBluetoothClassic.close) {
              await RNBluetoothClassic.close();
            }
          }
        } catch (e) {
          console.warn('Module-level disconnect failed:', e);
        }
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
    
    this.connectedDevice = null;
    this.deviceType = null;
    this.bluetoothConnection = null;
  }

  // ----- Print receipt -----
  async printReceipt(data: ReceiptData, printerId?: string): Promise<boolean> {
    let printer: PrinterDevice | null = null;
    
    if (printerId) {
      printer = await this.getPrinterById(printerId);
    }
    
    if (!printer) {
      const printers = await this.getAvailablePrinters();
      const networkPrinter = printers.find(p => p.type === 'NETWORK' && p.isActive);
      if (networkPrinter) {
        printer = networkPrinter;
      } else {
        printer = printers.find(p => p.isActive) || printers[0];
      }
    }
    
    if (!printer) {
      Alert.alert('No Printer', 'Please register a printer in the Devices page.');
      return false;
    }

    if (this.connectedDevice?.id !== printer.id) {
      const connected = await this.connect(printer);
      if (!connected) {
        Alert.alert('Connection Failed', `Could not connect to ${printer.name}.`);
        return false;
      }
    }

    try {
      const receiptText = this.generateReceiptText(data);
      
      if (this.deviceType === 'NETWORK' && this.connectedDevice) {
        await api.post(`/devices/${this.connectedDevice.id}/print`, {
          content: receiptText,
        });
        return true;
      }
      
      if (this.deviceType === 'BLUETOOTH' && this.bluetoothConnection) {
        return await this.printViaBluetooth(receiptText);
      }
      
      return false;
    } catch (error: any) {
      console.error('Print error:', error);
      Alert.alert('Print Failed', error?.message || 'Could not print receipt.');
      return false;
    }
  }

  // ----- Print via Bluetooth -----
  private async printViaBluetooth(text: string): Promise<boolean> {
    try {
      if (!this.bluetoothConnection) {
        throw new Error('No Bluetooth connection available');
      }

      // Build the ESC/POS commands as a string
      let printData = '';
      
      // Initialize printer (ESC @)
      printData += String.fromCharCode(0x1B, 0x40);
      
      // Set UTF-8 encoding (ESC t 16)
      printData += String.fromCharCode(0x1B, 0x74, 0x10);
      
      // Add the receipt text
      printData += text;
      
      // Cut paper (GS V B 0)
      printData += String.fromCharCode(0x1D, 0x56, 0x42, 0x00);
      
      // Write to device - try multiple methods
      try {
        if (this.bluetoothConnection.write) {
          // Try string write
          await this.bluetoothConnection.write(printData);
        } else if (this.bluetoothConnection.send) {
          await this.bluetoothConnection.send(printData);
        } else {
          throw new Error('No write method available');
        }
      } catch (writeError: any) {
        console.error('Write error:', writeError);
        
        // Try alternative: write as array of bytes
        try {
          const bytes = this.stringToBytes(printData);
          if (this.bluetoothConnection.write) {
            await this.bluetoothConnection.write(bytes);
          }
        } catch (e) {
          console.error('Alternative write failed:', e);
          throw writeError;
        }
      }
      
      // Disconnect after printing
      await this.disconnect();
      
      return true;
    } catch (error) {
      console.error('Bluetooth print error:', error);
      Alert.alert('Bluetooth Error', 'Could not print via Bluetooth. Please check the connection.');
      return false;
    }
  }

  // ----- Convert string to bytes for fallback -----
  private stringToBytes(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    return bytes;
  }

  // ----- Generate receipt text -----
  private generateReceiptText(data: ReceiptData): string {
    const lines: string[] = [];
    const line = '='.repeat(32);

    lines.push(line);
    lines.push(`  ${data.restaurantName.toUpperCase()}`);
    lines.push(`  Order #${data.orderNumber}`);
    lines.push(line);
    lines.push(`  ${data.date}`);
    if (data.tableName) lines.push(`  Table: ${data.tableName}`);
    if (data.orderType) lines.push(`  Type: ${data.orderType}`);
    if (data.serverName) lines.push(`  Server: ${data.serverName}`);
    lines.push(line);

    for (const item of data.items) {
      const name = item.name.length > 22 ? item.name.slice(0, 22) : item.name;
      const price = item.totalPrice.toFixed(2);
      lines.push(`  ${name.padEnd(22)} ${price.padStart(8)}`);
      if (item.quantity > 1) {
        lines.push(`    x${item.quantity} @ ${item.unitPrice.toFixed(2)}`);
      }
      if (item.modifiers) {
        lines.push(`    + ${item.modifiers}`);
      }
    }

    lines.push(line);
    lines.push(`  Subtotal${' '.repeat(20)} ${data.subtotal.toFixed(2)}`);
    lines.push(`  Tax${' '.repeat(24)} ${data.tax.toFixed(2)}`);
    if (data.tip && data.tip > 0) {
      lines.push(`  Tip${' '.repeat(25)} ${data.tip.toFixed(2)}`);
    }
    lines.push(line);
    lines.push(`  TOTAL${' '.repeat(22)} ${data.total.toFixed(2)}`);
    lines.push(line);
    lines.push(`  Payment: ${data.paymentMethod}`);
    if (data.tendered) lines.push(`  Tendered: ${data.tendered.toFixed(2)}`);
    if (data.change && data.change > 0) lines.push(`  Change: ${data.change.toFixed(2)}`);
    lines.push(line);
    lines.push(`  Thank you!`);
    lines.push(`  Please visit again.`);
    lines.push(line);
    lines.push('\n\n\n');

    return lines.join('\n');
  }
}

export const printerService = new PrinterService();