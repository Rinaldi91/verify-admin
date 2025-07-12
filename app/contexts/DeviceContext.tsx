"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';

// --- INTERFACES (Tidak berubah) ---
interface SerialConfig { port: string; baudRate: number; dataBits: number; parity: string; stopBits: number; flowControl: string; }
interface TestResult { test: string; value: string; unit: string; flag?: string | null; }
interface ParsedTestData { date: string; operator: string; sequenceNumber: string; serialNumber: string; results: TestResult[]; }
interface Device { id: string; name: string; config: SerialConfig; status: "disconnected" | "connecting" | "connected" | "error"; lastMessage: string; testData?: ParsedTestData; }
interface SerialPortDisplay { port: string; description: string; }
interface SerialPortData { path: string; manufacturer?: string; }
interface BridgeMessage { action:string; data?:unknown; status?:Device["status"]; message?:string; config?:SerialConfig; }
interface SyncStatusData { status: Device["status"]; message: string; config: SerialConfig; testData?: ParsedTestData; }
interface DeviceContextType {
    device: Device;
    availablePorts: SerialPortDisplay[];
    isBridgeConnected: boolean;
    isScanning: boolean;
    startReading: () => void;
    stopReading: () => void;
    scanPorts: () => void;
    handleConfigChange: (key: keyof SerialConfig, value: string | number) => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider = ({ children }: { children: ReactNode }) => {
    const [device, setDevice] = useState<Device>({
        id: "1", name: "U120 Smart",
        config: { port: "COM3", baudRate: 9600, dataBits: 8, parity: "none", stopBits: 1, flowControl: "none" },
        status: "disconnected", lastMessage: "Ready to connect.",
    });
    const [availablePorts, setAvailablePorts] = useState<SerialPortDisplay[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isBridgeConnected, setIsBridgeConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- PERBAIKAN UTAMA: Logika WebSocket disederhanakan di dalam satu useEffect ---
    useEffect(() => {
         let healthCheckInterval: NodeJS.Timeout | null = null;

        const connect = () => {
            if (ws.current && ws.current.readyState !== WebSocket.CLOSED) return;
            // Hentikan upaya rekoneksi sebelumnya jika ada
            // if (reconnectTimeoutRef.current) {
            //     clearTimeout(reconnectTimeoutRef.current);
            // }

            const wsInstance = new WebSocket("ws://localhost:8088");
            ws.current = wsInstance;

            wsInstance.onopen = () => {
                console.log("Bridge connection established.");
                setIsBridgeConnected(true);
                wsInstance.send(JSON.stringify({ action: "get-status" }));
                wsInstance.send(JSON.stringify({ action: "list-ports" }));

                if (healthCheckInterval) clearInterval(healthCheckInterval);
                healthCheckInterval = setInterval(() => {
                    if (wsInstance.readyState === WebSocket.OPEN) {
                        console.log("Health Check: Pinging bridge for status...");
                        wsInstance.send(JSON.stringify({ action: "get-status" }));
                    }
                }, 5000);
            };

            wsInstance.onclose = () => {
                console.log("Bridge disconnected.");
                setIsBridgeConnected(false);
                setDevice(prev => ({ ...prev, status: 'disconnected', lastMessage: 'Bridge server offline.' }));
                if (healthCheckInterval) clearInterval(healthCheckInterval); // Hentikan health check saat koneksi putus
                setTimeout(connect, 3000);
            };

            wsInstance.onerror = (err) => {
                // console.error("WebSocket error:", err);
                wsInstance.close(); // Memicu onclose untuk rekoneksi
            };

            wsInstance.onmessage = (event) => {
                const response: BridgeMessage = JSON.parse(event.data);
                
                // Selalu gunakan functional update untuk menjamin state terbaru
                switch (response.action) {
                    case "ports-list":
                        if (Array.isArray(response.data)) {
                            setAvailablePorts((response.data as SerialPortData[]).map(p => ({ port: p.path, description: p.manufacturer || "Serial Device" })));
                            setIsScanning(false);
                        }
                        break;
                    case "sync-status": {
                        const data = response.data as SyncStatusData;
                        setDevice(prev => (prev.config.port === data.config.port ? { ...prev, status: data.status, lastMessage: data.message, testData: data.testData } : prev));
                        break;
                    }
                    case "device-status":
                        setDevice(prev => ({ ...prev, status: response.status!, lastMessage: response.message || '' }));
                        break;
                    case "test-data-update":
                        console.log("Received test-data-update, updating state...");
                        setDevice(prev => ({ ...prev, testData: response.data as ParsedTestData }));
                        break;
                    case "device-error":
                        setDevice(prev => ({ ...prev, status: 'error', lastMessage: response.message || 'Unknown error' }));
                        break;
                }
            };
        }

        connect(); // Panggil fungsi koneksi

        // Fungsi cleanup saat komponen di-unmount
        return () => {
            if (healthCheckInterval) clearInterval(healthCheckInterval);
            if (ws.current) {
                ws.current.onclose = null;
                ws.current.close();
            }
        };
    }, []); // <-- Array dependensi kosong, memastikan ini hanya berjalan sekali

    const sendToBridge = (message: object) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        }
    };

    const startReading = () => { setDevice(prev => ({ ...prev, status: "connecting", lastMessage: "Initializing...", testData: undefined })); sendToBridge({ action: "start-reading", data: device.config }); };
    const stopReading = () => { sendToBridge({ action: "stop-reading" }); };
    const scanPorts = () => { setIsScanning(true); sendToBridge({ action: "list-ports" }); };
    const handleConfigChange = (key: keyof SerialConfig, value: string | number) => { setDevice(prev => ({ ...prev, config: { ...prev.config, [key]: value } })); };

    const value = { device, availablePorts, isBridgeConnected, isScanning, startReading, stopReading, scanPorts, handleConfigChange };

    return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};

export const useDevice = () => {
    const context = useContext(DeviceContext);
    if (context === undefined) {
        throw new Error('useDevice must be used within a DeviceProvider');
    }
    return context;
};