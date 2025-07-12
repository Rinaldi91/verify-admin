const { WebSocketServer } = require("ws");
const { SerialPort } = require("serialport");
const { DelimiterParser } = require("@serialport/parser-delimiter");

const wss = new WebSocketServer({ port: 8088 });
console.log("U120 Smart Bridge Server running on ws://localhost:8088");

let activePort = null;
let activeConfig = null; // Variabel untuk mengingat konfigurasi yang aktif
let lastTestData = null; // Variabel untuk mengingat data tes terakhir

const closeActivePort = async () => {
  if (activePort && activePort.isOpen) {
    console.log(`Closing active port ${activePort.path}...`);
    activePort.close();
  }
  // Reset state akan ditangani oleh event 'close'
};

wss.on("connection", (ws) => {
  console.log("Web UI connected to bridge.");

  ws.on("message", async (message) => {
    try {
      const request = JSON.parse(message);
      console.log("Received request from UI:", request);

      if (request.action === "list-ports") {
        const ports = await SerialPort.list();
        ws.send(JSON.stringify({ action: "ports-list", data: ports }));
      }
      
      // --- AKSI BARU: Untuk sinkronisasi saat refresh ---
      if (request.action === "get-status") {
        if (activePort && activePort.isOpen && activeConfig) {
          console.log("Syncing active status to UI...");
          ws.send(JSON.stringify({
            action: "sync-status",
            data: {
              status: "connected",
              message: `Resumed session on ${activeConfig.port}`,
              config: activeConfig,
              testData: lastTestData
            }
          }));
        }
      }

      if (request.action === "start-reading") {
        await closeActivePort(); 

        const config = request.data;
        if (!config || !config.port) {
          return ws.send(JSON.stringify({ action: "device-error", message: "Port configuration is missing." }));
        }

        activeConfig = config; // Simpan konfigurasi saat koneksi dimulai
        activePort = new SerialPort({
          path: config.port,
          baudRate: config.baudRate,
          dataBits: config.dataBits,
          stopBits: config.stopBits,
          parity: config.parity,
          rtscts: config.flowControl === 'rts/cts',
          autoOpen: false,
        });

        const parser = activePort.pipe(new DelimiterParser({ delimiter: Buffer.from([0x03]) }));

        activePort.open((err) => {
          if (err) {
            return ws.send(JSON.stringify({ action: "device-status", status: "error", message: `Failed to open port: ${err.message}` }));
          }
          console.log(`Port ${config.port} opened. Listening for data...`);
          ws.send(JSON.stringify({ 
            action: "device-status", 
            status: "connected", 
            message: `Listening on ${config.port}. Please perform a test.` 
          }));
        });
        
        parser.on("data", (data) => {
          const dataString = data.toString("ascii").trim();
          console.log("--- Complete Message Received ---\n", dataString, "\n---------------------------------");

          try {
            const parsedData = parseU120TextMessage(dataString);
            lastTestData = parsedData; // Simpan data tes terakhir
            
            if(parsedData.results.length > 0) {
              console.log("Sending parsed data to UI:", parsedData);
              ws.send(JSON.stringify({ action: "test-data-update", data: parsedData }));
            }
          } catch (e) {
            console.error("Error parsing message:", e);
            ws.send(JSON.stringify({ action: "device-error", message: "Failed to parse data." }));
          }
        });

        activePort.on("error", (err) => {
            console.error("Port Error:", err.message);
            ws.send(JSON.stringify({ action: "device-error", message: err.message }))
        });
        
        activePort.on('close', () => {
          console.log(`Port ${activeConfig?.port || ''} closed.`);
          ws.send(JSON.stringify({ action: 'device-status', status: 'disconnected', message: 'Connection closed.' }));
          activePort = null;
          activeConfig = null;
          lastTestData = null;
        });
      }

      if (request.action === "stop-reading") {
        await closeActivePort();
      }

    } catch (error) {
       console.error("Bridge error:", error);
       ws.send(JSON.stringify({ action: "error", message: `Bridge error: ${error.message}`}));
    }
  });

  ws.on("close", () => {
     console.log("Web UI disconnected from bridge.");
  });
});

function parseU120TextMessage(message) {
  // ... (Fungsi parser Anda tidak perlu diubah, gunakan versi terakhir yang sudah benar)
  const lines = message.split(/[\r\n]+/).filter(line => line.trim() !== '');
  const output = {
    serialNumber: "N/A (Not Available in Result)",
    date: "",
    operator: "",
    sequenceNumber: "",
    results: [],
  };

  console.log("Parsing U120 text message (v2.1)...");
  
  const dateRegex = /Date:\s*(.*)/;
  const operatorRegex = /Operator:\s*(.*)/;
  const sequenceRegex = /No\.\s*(\d+)/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    let match = trimmedLine.match(dateRegex);
    if (match) { output.date = match[1].trim(); continue; }
    
    match = trimmedLine.match(operatorRegex);
    if (match) { output.operator = match[1].trim(); continue; }

    match = trimmedLine.match(sequenceRegex);
    if (match) { output.sequenceNumber = match[1].trim(); continue; }

    const resultLineRegex = /^(\*?)\s*([a-zA-Z]{2,3})\s+(.*)$/i;
    match = trimmedLine.match(resultLineRegex);

    if (match) {
      const flag = match[1]; 
      const test = match[2];
      const restOfLine = match[3].trim();
      
      let value = restOfLine;
      let unit = '';

      const knownUnits = ['mg/dL', 'Leu/uL'];
      for (const u of knownUnits) {
        if (restOfLine.endsWith(u)) {
          unit = u;
          value = restOfLine.replace(u, '').trim();
          break;
        }
      }

      output.results.push({
        test: test.toUpperCase(),
        value: `${flag}${value}`.trim(), 
        unit: unit,
      });
    }
  }

  if (output.results.length > 0) {
    console.log(`Successfully parsed ${output.results.length} results.`);
  } else {
    console.warn("Could not parse any results from the message.");
  }
  
  return output;
}

process.on("SIGINT", async () => {
  console.log("\nShutting down bridge server...");
  await closeActivePort();
  wss.close(() => {
    console.log("Bridge server closed.");
    process.exit(0);
  });
});