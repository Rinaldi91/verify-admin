import { NextApiRequest, NextApiResponse } from 'next';
import { SerialPort } from 'serialport';

interface PortInfo {
  port: string;
  description: string;
  manufacturer?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PortInfo[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const ports = await SerialPort.list();
    const availablePorts: PortInfo[] = ports.map(p => ({
      port: p.path, // p.path akan berisi 'COM3', 'COM4', dll.
      description: p.manufacturer || 'N/A',
      manufacturer: p.manufacturer,
    }));
    
    res.status(200).json(availablePorts);
  } catch (error) {
    console.error('Failed to list serial ports:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to list ports: ${message}` });
  }
}