// pages/api/test-connection.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { SerialPort } from 'serialport';

// Definisikan interface yang sama dengan frontend
interface ConnectionConfig {
  port: string;
  baudRate: number;
  dataBits: 5 | 6 | 7 | 8;
  parity: 'none' | 'even' | 'odd' | 'mark' | 'space';
  stopBits: 1 | 1.5 | 2;
  flowControl: string; // flowControl tidak digunakan oleh library `serialport`, tapi kita biarkan untuk konsistensi
}

interface DeviceInfo {
  serialNumber: string;
  firmwareVersion: string;
  model: string;
}

interface TestResult {
  success: boolean;
  message: string;
  deviceInfo?: DeviceInfo;
}

// Function untuk parsing respons dari U120 Smart
function parseU120Response(response: string): DeviceInfo | null {
  console.log('Parsing response:', response);
  
  const deviceInfo: DeviceInfo = {
    serialNumber: 'Unknown',
    firmwareVersion: 'Unknown',
    model: 'U120 Smart'
  };
  let foundSomething = false;

  const lines = response.split(/\r\n|\n/);
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.match(/(SN:|Serial:)\s*([A-Z0-9]+)/i)) {
      deviceInfo.serialNumber = RegExp.$2;
      foundSomething = true;
    } else if (trimmedLine.match(/(FW:|Firmware:|Version:)\s*([0-9.]+)/i)) {
      deviceInfo.firmwareVersion = RegExp.$2;
      foundSomething = true;
    } else if (trimmedLine.match(/(MODEL:|Device:)\s*(.+)/i)) {
      deviceInfo.model = RegExp.$2;
      foundSomething = true;
    }
  });

  // Jika tidak ada prefix yang cocok, coba cari pola umum
  if (deviceInfo.serialNumber === 'Unknown') {
    const serialMatch = response.match(/\b[A-Z0-9]{8,}\b/);
    if (serialMatch) {
      deviceInfo.serialNumber = serialMatch[0];
      foundSomething = true;
    }
  }

  return foundSomething ? deviceInfo : null;
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResult>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { config }: { config: ConnectionConfig } = req.body;

  if (!config || !config.port) {
    return res.status(400).json({ success: false, message: 'Config and port are required' });
  }

  const port = new SerialPort({
    path: config.port,
    baudRate: config.baudRate,
    dataBits: config.dataBits,
    parity: config.parity,
    stopBits: config.stopBits,
    autoOpen: false,
  });

  const commands = [
    'AT+INFO?\r\n',
    'AT+SN?\r\n',
    'INFO\r\n',
    '\x05', // ENQ
  ];

  const testConnection = (): Promise<TestResult> => {
    return new Promise((resolve) => {
      port.open(async (err) => {
        if (err) {
          return resolve({ success: false, message: `✗ Gagal membuka port: ${err.message}` });
        }

        console.log(`Connected to ${config.port}`);
        let responseData = '';
        let resolved = false;

        const dataListener = (data: Buffer) => {
          responseData += data.toString();
          console.log('Received data chunk:', data.toString());
          // Coba parse setiap kali data masuk
          const deviceInfo = parseU120Response(responseData);
          if (deviceInfo) {
            if (!resolved) {
              resolved = true;
              port.close();
              resolve({
                success: true,
                message: '✓ Koneksi berhasil! U120 Smart terdeteksi.',
                deviceInfo,
              });
            }
          }
        };
        
        port.on('data', dataListener);
        port.on('error', (portErr) => {
          if (!resolved) {
            resolved = true;
            port.close();
            resolve({ success: false, message: `✗ Terjadi error pada port: ${portErr.message}` });
          }
        });

        // Loop untuk mengirim perintah secara sekuensial
        for (const command of commands) {
          if (resolved) break;

          console.log(`Sending command: ${command.replace(/\r\n/g, '\\r\\n')}`);
          port.write(command);
          // Tunggu sebentar untuk respons
          await new Promise(p => setTimeout(p, 2000));
        }
        
        // Cleanup listener setelah loop selesai
        port.removeListener('data', dataListener);

        if (!resolved) {
          resolved = true;
          port.close();
          // Cek sekali lagi jika ada data yang terkumpul
          const finalDeviceInfo = parseU120Response(responseData);
          if (finalDeviceInfo) {
            resolve({
              success: true,
              message: '✓ Koneksi berhasil! Info perangkat ditemukan.',
              deviceInfo: finalDeviceInfo,
            });
          } else {
            resolve({ success: false, message: '✗ Gagal! Tidak ada respons dari perangkat.' });
          }
        }
      });
    });
  };

  try {
    const result = await testConnection();
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Connection test error:', message);
    res.status(500).json({ success: false, message: `✗ Koneksi gagal: ${message}` });
  }
}