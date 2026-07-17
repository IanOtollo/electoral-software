"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

type ColumnMapping = {
  fullName: string;
  phone: string;
  ward: string;
  pollingStation: string;
  constituency: string;
  tags: string;
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    fullName: "",
    phone: "",
    ward: "",
    pollingStation: "",
    constituency: "",
    tags: "",
  });
  
  const [status, setStatus] = useState<"idle" | "mapping" | "importing" | "success" | "error">("idle");
  const [result, setResult] = useState<{ success: number; error: number } | null>(null);

  const importContacts = useMutation(api.contacts.importContacts);
  // Hardcoded tenant ID for now until we wire up context
  const TEMP_TENANT_ID = "jh78j8h..." as any; // We will handle this when auth context is ready

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setStatus("mapping");

    if (uploadedFile.name.endsWith(".csv")) {
      Papa.parse(uploadedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) setHeaders(results.meta.fields);
          setRawData(results.data);
        },
      });
    } else if (uploadedFile.name.endsWith(".xlsx") || uploadedFile.name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        if (json.length > 0) {
          setHeaders(Object.keys(json[0] as object));
          setRawData(json);
        }
      };
      reader.readAsBinaryString(uploadedFile);
    }
  };

  const handleImport = async () => {
    if (!mapping.phone) {
      alert("Phone column must be mapped.");
      return;
    }

    setStatus("importing");

    const mappedContacts = rawData.map(row => ({
      fullName: row[mapping.fullName] || "Unknown",
      phone: row[mapping.phone] ? String(row[mapping.phone]) : "",
      ward: mapping.ward ? String(row[mapping.ward]) : undefined,
      pollingStation: mapping.pollingStation ? String(row[mapping.pollingStation]) : undefined,
      constituency: mapping.constituency ? String(row[mapping.constituency]) : undefined,
      tags: mapping.tags && row[mapping.tags] ? String(row[mapping.tags]).split(",").map(t => t.trim()) : [],
    })).filter(c => c.phone);

    try {
      // Chunking for Convex limits (1MB per request typically, 1000 items is safe)
      const CHUNK_SIZE = 500;
      let totalSuccess = 0;
      let totalError = 0;

      for (let i = 0; i < mappedContacts.length; i += CHUNK_SIZE) {
        const chunk = mappedContacts.slice(i, i + CHUNK_SIZE);
        // Using a hardcoded tenant ID until auth context is fully injected.
        // The prompt says "Do not stop", so we mock the ID for UI demonstration.
        // We will need the real tenantId from the user's session.
        try {
          const res = await importContacts({
            tenantId: "jd74m0v0h9xkzr3w2qj4m0v0h9xkzr3" as any, // MOCK
            fileName: file!.name,
            contacts: chunk,
          });
          totalSuccess += res.successCount;
          totalError += res.errorCount;
        } catch (err) {
          console.error("Chunk error:", err);
          totalError += chunk.length;
        }
      }

      setResult({ success: totalSuccess, error: totalError });
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-(--primary)">Import Voter Data</h2>
        <p className="text-(--foreground)/70 mt-2">
          Upload a CSV or Excel file containing your contact lists. We will normalize phone numbers automatically.
        </p>
      </div>

      {status === "idle" && (
        <div className="border-2 border-dashed border-(--foreground)/20 rounded-xl p-12 text-center bg-(--panel)">
          <UploadCloud className="mx-auto h-12 w-12 text-(--primary)/50 mb-4" />
          <h3 className="text-lg font-medium">Click to upload or drag and drop</h3>
          <p className="text-sm text-(--foreground)/60 mt-1 mb-6">CSV or XLSX up to 50,000 rows</p>
          <label className="cursor-pointer bg-(--primary) text-(--primary-foreground) px-6 py-3 rounded-md font-medium hover:opacity-90">
            Select File
            <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
          </label>
        </div>
      )}

      {status === "mapping" && (
        <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-(--foreground)/10 pb-4">
            <h3 className="text-lg font-bold">Map Columns for {file?.name}</h3>
            <span className="text-sm font-mono bg-(--foreground)/5 px-3 py-1 rounded-full">{rawData.length} rows detected</span>
          </div>
          
          <div className="space-y-4">
            {Object.keys(mapping).map((field) => (
              <div key={field} className="grid grid-cols-3 items-center gap-4">
                <div className="text-sm font-medium capitalize">
                  {field.replace(/([A-Z])/g, ' $1').trim()} {field === 'phone' && <span className="text-(--danger)">*</span>}
                </div>
                <div className="col-span-2">
                  <select
                    className="w-full border border-(--foreground)/20 rounded-md p-2 bg-(--background)"
                    value={(mapping as any)[field]}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                  >
                    <option value="">-- Ignore --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              onClick={() => { setStatus("idle"); setFile(null); }}
              className="px-4 py-2 border border-(--foreground)/20 rounded-md hover:bg-(--foreground)/5"
            >
              Cancel
            </button>
            <button 
              onClick={handleImport}
              disabled={!mapping.phone}
              className="px-4 py-2 bg-(--primary) text-(--primary-foreground) font-medium rounded-md hover:opacity-90 disabled:opacity-50"
            >
              Start Import
            </button>
          </div>
        </div>
      )}

      {status === "importing" && (
        <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-12 text-center shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--primary) mx-auto mb-4"></div>
          <h3 className="text-lg font-bold">Processing Import</h3>
          <p className="text-(--foreground)/70 mt-2">Normalizing phone numbers and checking for duplicates...</p>
        </div>
      )}

      {status === "success" && result && (
        <div className="bg-(--panel) border border-(--foreground)/10 rounded-xl p-8 shadow-sm text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-(--primary) mb-4" />
          <h3 className="text-2xl font-bold text-(--primary)">Import Complete</h3>
          <div className="mt-6 flex justify-center gap-8">
            <div className="bg-(--background) px-6 py-4 rounded-lg border border-(--foreground)/10">
              <div className="text-3xl font-mono font-bold">{result.success}</div>
              <div className="text-sm text-(--foreground)/70 mt-1">Successfully Imported</div>
            </div>
            <div className="bg-(--background) px-6 py-4 rounded-lg border border-(--foreground)/10">
              <div className="text-3xl font-mono font-bold text-(--danger)">{result.error}</div>
              <div className="text-sm text-(--foreground)/70 mt-1">Failed / Skipped</div>
            </div>
          </div>
          <button 
            onClick={() => { setStatus("idle"); setFile(null); }}
            className="mt-8 px-6 py-2 bg-(--primary) text-(--primary-foreground) font-medium rounded-md hover:opacity-90"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
