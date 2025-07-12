"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Usb,
  X,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Edit3,
  Wifi,
  WifiOff,
  Cable,
  Play,
  Square,
  Activity,
  User,
  Hash,
  Calendar,
} from "lucide-react";

// Interfaces (tidak berubah)
interface SerialConfig {
  port: string;
  baudRate: number;
  dataBits: number;
  parity: string;
  stopBits: number;
  flowControl: string;
}

interface SerialPortDisplay {
  port: string;
  description: string;
  manufacturer?: string;
}

interface TestResult {
  test: string;
  value: string;
  unit: string;
}

interface ParsedTestData {
  serialNumber: string;
  date: string;
  operator: string;
  sequenceNumber: string;
  results: TestResult[];
}

interface Device {
  id: string;
  name: string;
  config: SerialConfig;
  status: "disconnected" | "connecting" | "connected" | "reading" | "error";
  lastTestResult: string;
  isReading: boolean;
  testData?: ParsedTestData;
  deviceInfo?: {
    serialNumber?: string;
    firmwareVersion?: string;
    model?: string;
  };
}

interface SerialPortData {
  path: string;
  manufacturer?: string;
}

interface BridgeMessage {
  action: string;
  data?: unknown;
  status?: string;
  message?: string;
}

// Tambahan interface untuk sinkronisasi
interface SyncStatusData {
  status: string;
  message: string;
  config: SerialConfig;
  testData?: ParsedTestData;
}

const U120ConnectionSettings: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([
    {
      id: "1",
      name: "U120 Smart #1",
      config: {
        port: "COM3",
        baudRate: 9600,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        flowControl: "none",
      },
      status: "disconnected",
      lastTestResult: "",
      isReading: false,
    },
  ]);
  const [availablePorts, setAvailablePorts] = useState<SerialPortDisplay[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("1");
  const [isScanning, setIsScanning] = useState(false);
  const [editingDeviceName, setEditingDeviceName] = useState<string | null>(
    null
  );
  const [tempDeviceName, setTempDeviceName] = useState<string>("");
  const [isBridgeConnected, setIsBridgeConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // State baru untuk tracking inisialisasi
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  const baudRates = [9600, 19200, 38400, 57600, 115200];
  const dataBitsOptions = [5, 6, 7, 8];
  const parityOptions = ["none", "odd", "even", "mark", "space"];
  const stopBitsOptions = [1, 1.5, 2];
  const flowControlOptions = ["none", "xon/xoff", "rts/cts"];

  // Fungsi untuk meminta status sinkronisasi dari bridge
  const requestStatusSync = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log("Requesting status sync from bridge...");
      ws.current.send(JSON.stringify({ action: "get-status" }));
    }
  };

  // Fungsi untuk menangani sinkronisasi status
  const handleStatusSync = (data: SyncStatusData) => {
    console.log("Received status sync:", data);

    // Cari device yang cocok dengan konfigurasi aktif
    setDevices((currentDevices) => {
      return currentDevices.map((device) => {
        // Cocokkan berdasarkan port yang aktif
        if (device.config.port === data.config.port) {
          return {
            ...device,
            status: data.status === "connected" ? "reading" : "disconnected",
            isReading: data.status === "connected",
            lastTestResult: data.message || "",
            testData: data.testData || device.testData,
            // Sinkronisasi konfigurasi jika diperlukan
            config: { ...device.config, ...data.config },
          };
        }
        return device;
      });
    });
  };

  // WebSocket connection setup yang diperbaiki
  useEffect(() => {
    const connectToBridge = () => {
      // Clear existing timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      ws.current = new WebSocket("ws://localhost:8088");

      ws.current.onopen = () => {
        console.log("Bridge connected");
        setIsBridgeConnected(true);

        // Scan ports dan request status sync
        scanPorts();

        // Request status sync setelah koneksi berhasil
        setTimeout(() => {
          requestStatusSync();
          setIsInitialized(true);
        }, 100);
      };

      ws.current.onmessage = (event) => {
        try {
          const response: BridgeMessage = JSON.parse(event.data);
          console.log("Message from bridge:", response);

          // Handle port list response
          if (
            response.action === "ports-list" &&
            Array.isArray(response.data)
          ) {
            const ports = response.data.map((p: SerialPortData) => ({
              port: p.path,
              description: p.manufacturer || "Serial Device",
            }));
            setAvailablePorts(ports);

            // --- PERBAIKAN DI SINI ---
            // Menggunakan functional update agar tidak bergantung pada 'devices'
            setDevices((currentDevices) => {
              // Cek apakah port pertama dari hasil scan sudah digunakan
              const isFirstPortTaken = currentDevices.some(
                (d) => d.config.port === ports[0]?.port
              );

              // Jika port tersedia dan belum ada device yang memakainya, update device pertama
              if (ports.length > 0 && !isFirstPortTaken) {
                return currentDevices.map((device) =>
                  device.id === "1"
                    ? {
                        ...device,
                        config: { ...device.config, port: ports[0].port },
                      }
                    : device
                );
              }
              // Jika tidak, kembalikan state seperti semula
              return currentDevices;
            });

            setIsScanning(false);
          }

          // Handle status sync response - BARU
          // 'response.data' is of type 'unknown', cast to SyncStatusData
          if (
            response.action === "sync-status" &&
            response.data !== undefined
          ) {
            handleStatusSync(response.data as SyncStatusData);
          }

          // Handle device status updates
          if (response.action === "device-status") {
            setDevices((currentDevices) =>
              currentDevices.map((d) => {
                if (d.isReading || d.status === "connecting") {
                  let newStatus: Device["status"] = "disconnected";
                  if (response.status === "connected") {
                    newStatus = "reading";
                  } else if (response.status === "error") {
                    newStatus = "error";
                  } else if (response.status === "disconnected") {
                    newStatus = "disconnected";
                  }

                  return {
                    ...d,
                    status: newStatus,
                    lastTestResult: response.message || "",
                    isReading: response.status === "connected",
                  };
                }
                return d;
              })
            );
          }

          // Handle test data updates
          if (response.action === "test-data-update" && response.data) {
            setDevices((currentDevices) =>
              currentDevices.map((d) => {
                if (d.isReading) {
                  return {
                    ...d,
                    testData: response.data as ParsedTestData, // Cast response.data to ParsedTestData
                    lastTestResult: `Test completed - ${
                      (response.data as ParsedTestData)?.results?.length || 0
                    } results`,
                  };
                }
                return d;
              })
            );
          }

          // Handle device errors
          if (response.action === "device-error") {
            setDevices((currentDevices) =>
              currentDevices.map((d) => {
                if (d.isReading || d.status === "connecting") {
                  return {
                    ...d,
                    status: "error",
                    lastTestResult: response.message || "Unknown error",
                    isReading: false,
                  };
                }
                return d;
              })
            );
          }
        } catch (e) {
          console.error("Error parsing message from bridge", e);
        }
      };

      ws.current.onclose = () => {
        console.log("Bridge disconnected. Reconnecting...");
        setIsBridgeConnected(false);
        setIsInitialized(false);

        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connectToBridge, 3000);
      };

      ws.current.onerror = (error) => {
        console.log("Bridge connection error:", error);
        setIsBridgeConnected(false);
        setIsInitialized(false);
      };
    };

    connectToBridge();

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, []);

  const scanPorts = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      setIsScanning(true);
      ws.current.send(JSON.stringify({ action: "list-ports" }));
    } else {
      console.error("Cannot scan: Bridge not connected.");
    }
  };

  const startReading = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (!device || !isBridgeConnected) {
      alert(
        "Connection to the bridge server is not ready. Please ensure local-bridge.js is running."
      );
      return;
    }

    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              status: "connecting",
              lastTestResult: "Starting reading session...",
              isReading: true,
              testData: undefined,
            }
          : d
      )
    );

    ws.current?.send(
      JSON.stringify({
        action: "start-reading",
        data: device.config,
      })
    );
  };

  const stopReading = (deviceId: string) => {
    if (!isBridgeConnected) return;

    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              status: "disconnected",
              lastTestResult: "Reading stopped",
              isReading: false,
            }
          : d
      )
    );

    ws.current?.send(JSON.stringify({ action: "stop-reading" }));
  };

  const handleConfigChange = (
    deviceId: string,
    key: keyof SerialConfig,
    value: string | number
  ) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId
          ? { ...device, config: { ...device.config, [key]: value } }
          : device
      )
    );
  };

  const addNewDevice = () => {
    const newId = (devices.length + 1).toString();
    const availablePort = availablePorts.find(
      (port) => !devices.some((device) => device.config.port === port.port)
    );

    const newDevice: Device = {
      id: newId,
      name: `U120 Smart #${newId}`,
      config: {
        port: availablePort?.port || "COM1",
        baudRate: 9600,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        flowControl: "none",
      },
      status: "disconnected",
      lastTestResult: "",
      isReading: false,
    };

    setDevices((prev) => [...prev, newDevice]);
    setSelectedDeviceId(newId);
  };

  const removeDevice = (deviceId: string) => {
    if (devices.length <= 1) return;
    const device = devices.find((d) => d.id === deviceId);
    if (device?.isReading) {
      stopReading(deviceId);
    }
    setDevices((prev) => prev.filter((device) => device.id !== deviceId));
    if (selectedDeviceId === deviceId) {
      setSelectedDeviceId(devices.find((d) => d.id !== deviceId)?.id || "1");
    }
  };

  const duplicateDevice = (deviceId: string) => {
    const deviceToDuplicate = devices.find((d) => d.id === deviceId);
    if (!deviceToDuplicate) return;

    const newId = (
      Math.max(...devices.map((d) => parseInt(d.id))) + 1
    ).toString();
    const availablePort = availablePorts.find(
      (port) => !devices.some((device) => device.config.port === port.port)
    );

    const newDevice: Device = {
      ...deviceToDuplicate,
      id: newId,
      name: `${deviceToDuplicate.name} (Copy)`,
      config: {
        ...deviceToDuplicate.config,
        port: availablePort?.port || deviceToDuplicate.config.port,
      },
      status: "disconnected",
      lastTestResult: "",
      isReading: false,
      testData: undefined,
    };

    setDevices((prev) => [...prev, newDevice]);
    setSelectedDeviceId(newId);
  };

  const startEditingDeviceName = (deviceId: string, currentName: string) => {
    setEditingDeviceName(deviceId);
    setTempDeviceName(currentName);
  };

  const saveDeviceName = (deviceId: string) => {
    if (tempDeviceName.trim()) {
      setDevices((prev) =>
        prev.map((device) =>
          device.id === deviceId
            ? { ...device, name: tempDeviceName.trim() }
            : device
        )
      );
    }
    setEditingDeviceName(null);
    setTempDeviceName("");
  };

  const cancelEditingDeviceName = () => {
    setEditingDeviceName(null);
    setTempDeviceName("");
  };

  const startReadingAllDevices = () => {
    devices.forEach((device) => {
      if (device.status === "disconnected") {
        startReading(device.id);
      }
    });
  };

  const stopReadingAllDevices = () => {
    devices.forEach((device) => {
      if (device.isReading) {
        stopReading(device.id);
      }
    });
  };

  // UI Helper Functions
  const getStatusColor = (status: Device["status"]) => {
    switch (status) {
      case "connected":
      case "reading":
        return "text-green-400";
      case "connecting":
        return "text-yellow-400";
      case "error":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusText = (status: Device["status"]) => {
    switch (status) {
      case "connected":
      case "reading":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Error";
      default:
        return "Disconnected";
    }
  };

  const getStatusBadgeDarkColor = (status: Device["status"]) => {
    switch (status) {
      case "connected":
      case "reading":
        return "bg-green-900/50 text-green-300 border border-green-500/30";
      case "connecting":
        return "bg-yellow-900/50 text-yellow-300 border border-yellow-500/30";
      case "error":
        return "bg-red-900/50 text-red-300 border border-red-500/30";
      default:
        return "bg-gray-700 text-gray-300 border border-gray-600";
    }
  };

  const readingDevicesCount = devices.filter((d) => d.isReading).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cable className="w-6 h-6" /> Connection Settings
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage all devices - {readingDevicesCount} of {devices.length}{" "}
            devices reading
            {!isInitialized && isBridgeConnected && (
              <span className="ml-2 text-yellow-400">(Synchronizing...)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startReadingAllDevices}
            disabled={!isBridgeConnected || !isInitialized}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 mr-2" />
            Start All
          </button>
          <button
            onClick={stopReadingAllDevices}
            disabled={!isInitialized}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop All
          </button>
        </div>
      </div>

      {/* Bridge Connection Indicator */}
      <div
        className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
          isBridgeConnected
            ? "bg-green-900/50 text-green-300 border-green-500/30"
            : "bg-red-900/50 text-red-300 border-red-500/30"
        }`}
      >
        {isBridgeConnected ? (
          <Wifi className="w-5 h-5" />
        ) : (
          <WifiOff className="w-5 h-5" />
        )}
        <span>
          {isBridgeConnected
            ? `Successfully connected to Bridge Server.${
                !isInitialized ? " Synchronizing..." : ""
              }`
            : "Disconnected from Bridge Server. Ensure local-bridge.js is running."}
        </span>
      </div>

      {/* Main Content */}
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Device List */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-200">
                Device List
              </h2>
              <button
                onClick={addNewDevice}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedDeviceId === device.id
                      ? "border-blue-500 bg-blue-900/50"
                      : "border-gray-700 bg-gray-800 hover:bg-gray-700/50"
                  }`}
                  onClick={() => setSelectedDeviceId(device.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    {editingDeviceName === device.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={tempDeviceName}
                          onChange={(e) => setTempDeviceName(e.target.value)}
                          className="flex-1 px-2 py-1 border rounded text-sm bg-gray-900 border-gray-600 text-white focus:ring-blue-500"
                          onKeyPress={(e) =>
                            e.key === "Enter" && saveDeviceName(device.id)
                          }
                          onBlur={() => saveDeviceName(device.id)}
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditingDeviceName();
                          }}
                          className="text-gray-500 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <h3 className="font-medium text-white">
                          {device.name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingDeviceName(device.id, device.name);
                          }}
                          className="text-gray-500 hover:text-white"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateDevice(device.id);
                        }}
                        className="text-gray-400 hover:text-blue-400"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {devices.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDevice(device.id);
                          }}
                          className="text-gray-400 hover:text-red-400"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      {device.config.port}
                    </span>
                    <div className="flex items-center gap-2">
                      {device.isReading && (
                        <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeDarkColor(
                          device.status
                        )}`}
                      >
                        {getStatusText(device.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Configuration & Test Data */}
          <div className="lg:col-span-2">
            {selectedDevice && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Configuration Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-200">
                    Configuration: {selectedDevice.name}
                  </h2>

                  {/* Serial Port */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Serial Port
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedDevice.config.port}
                        onChange={(e) =>
                          handleConfigChange(
                            selectedDevice.id,
                            "port",
                            e.target.value
                          )
                        }
                        disabled={
                          !isBridgeConnected || selectedDevice.isReading
                        }
                        className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {availablePorts.length > 0 ? (
                          availablePorts.map((port, index) => (
                            <option
                              key={`${port.port}-${index}`}
                              value={port.port}
                            >
                              {port.port} - {port.description}
                            </option>
                          ))
                        ) : (
                          <option>Scanning...</option>
                        )}
                      </select>
                      <button
                        onClick={scanPorts}
                        disabled={
                          isScanning ||
                          !isBridgeConnected ||
                          selectedDevice.isReading
                        }
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        {isScanning ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Other Configuration Fields */}
                  {[
                    { label: "Baud Rate", key: "baudRate", options: baudRates },
                    {
                      label: "Data Bits",
                      key: "dataBits",
                      options: dataBitsOptions,
                    },
                    { label: "Parity", key: "parity", options: parityOptions },
                    {
                      label: "Stop Bits",
                      key: "stopBits",
                      options: stopBitsOptions,
                    },
                    {
                      label: "Flow Control",
                      key: "flowControl",
                      options: flowControlOptions,
                    },
                  ].map((item) => (
                    <div key={item.key}>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        {item.label}
                      </label>
                      <select
                        value={
                          selectedDevice.config[item.key as keyof SerialConfig]
                        }
                        onChange={(e) =>
                          handleConfigChange(
                            selectedDevice.id,
                            item.key as keyof SerialConfig,
                            item.key === "baudRate" || item.key === "dataBits"
                              ? parseInt(e.target.value)
                              : e.target.value
                          )
                        }
                        disabled={selectedDevice.isReading}
                        className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {item.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {typeof opt === "string" ? opt.toUpperCase() : opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {/* Control Buttons */}
                  <div className="space-y-3">
                    {!selectedDevice.isReading && (
                      <button
                        onClick={() => startReading(selectedDevice.id)}
                        disabled={!isBridgeConnected || !isInitialized}
                        className="w-full justify-center inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                      >
                        <Play className="w-4 h-4 mr-2" /> Start Connection
                      </button>
                    )}
                    {selectedDevice.isReading && (
                      <button
                        onClick={() => stopReading(selectedDevice.id)}
                        className="w-full justify-center inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <Square className="w-4 h-4 mr-2" /> Stop Connection
                      </button>
                    )}
                  </div>

                  {/* Status Message */}
                  {selectedDevice.lastTestResult && (
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        selectedDevice.status === "reading"
                          ? "bg-green-900/50 text-green-300 border border-green-500/30"
                          : selectedDevice.status === "error"
                          ? "bg-red-900/50 text-red-300 border border-red-500/30"
                          : "bg-yellow-900/50 text-yellow-300 border border-yellow-500/30"
                      }`}
                    >
                      {selectedDevice.lastTestResult}
                    </div>
                  )}
                </div>

                {/* Test Data Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-200">
                    Test Data
                  </h2>

                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Usb className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-200">Status:</span>
                      <span
                        className={`ml-2 font-semibold ${getStatusColor(
                          selectedDevice.status
                        )}`}
                      >
                        {getStatusText(selectedDevice.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>Port: {selectedDevice.config.port}</p>
                      <p>Baud Rate: {selectedDevice.config.baudRate}</p>
                    </div>
                  </div>

                  {/* Test Results */}
                  {selectedDevice.testData && (
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-200 mb-4 text-lg">
                        Last Test Details
                      </h3>
                      {/* Metadata */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-gray-400">Date & Time</p>
                            <p className="font-medium text-white">
                              {selectedDevice.testData.date || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-gray-400">Operator</p>
                            <p className="font-medium text-white">
                              {selectedDevice.testData.operator || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Hash className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-gray-500">Seq. No.</p>
                            <p className="font-medium text-white">
                              {selectedDevice.testData.sequenceNumber || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <hr className="my-4 border-gray-700" />

                      {/* Results Table */}
                      <h4 className="font-semibold text-gray-200 mb-2">
                        Results
                      </h4>
                      <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-4 font-bold text-gray-400 px-2">
                          <span>Test</span>
                          <span>Result</span>
                          <span>Unit</span>
                        </div>
                        {selectedDevice.testData.results.map((res, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-3 gap-4 p-2 rounded-md even:bg-gray-900/50"
                          >
                            <span className="text-gray-300">{res.test}</span>
                            <span className="font-semibold text-white">
                              {res.value}
                            </span>
                            <span className="text-gray-400">{res.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default U120ConnectionSettings;
