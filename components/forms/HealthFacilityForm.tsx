"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Save, X, Plus } from "lucide-react";

// --- Interface Definitions ---
interface TypeOfHealthFacility {
  id: number;
  name: string;
}

interface MedicalDevice {
  id: number;
  brand: string;
  model: string;
  serial_number: string;
}

export interface FormHealthFacilityData {
  id?: number;
  type_of_health_facility_id: string;
  name: string;
  slug: string;
  email: string;
  phone_number: string;
  city: string;
  address: string;
  medical_device_ids: number[];
}

interface HealthFacilityFormProps {
  initialData?: FormHealthFacilityData;
  healthFacilityTypes: TypeOfHealthFacility[];
  medicalDevices: MedicalDevice[];
  onSubmit: (data: FormHealthFacilityData) => Promise<void>;
  isSaving: boolean;
}

// --- Komponen Form ---
export default function HealthFacilityForm({
  initialData,
  healthFacilityTypes,
  medicalDevices,
  onSubmit,
  isSaving,
}: HealthFacilityFormProps) {
  const [formData, setFormData] = useState<FormHealthFacilityData>({
    type_of_health_facility_id: initialData?.type_of_health_facility_id || "",
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    email: initialData?.email || "",
    phone_number: initialData?.phone_number || "",
    city: initialData?.city || "",
    address: initialData?.address || "",
    medical_device_ids: initialData?.medical_device_ids || [],
  });
  const [filteredDevices, setFilteredDevices] = useState<MedicalDevice[]>(medicalDevices);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  useEffect(() => {
    if (formData.name && !initialData) { // Hanya auto-generate slug untuk data baru
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(prev.name),
      }));
    }
  }, [formData.name, initialData]);

  const handleDeviceSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = medicalDevices.filter(device => 
        `${device.brand} ${device.model} ${device.serial_number}`.toLowerCase().includes(keyword)
    );
    setFilteredDevices(filtered);
  };

  const handleDeviceSelection = (deviceId: number, checked: boolean) => {
      const selected = new Set(formData.medical_device_ids);
      if(checked) {
          selected.add(deviceId);
      } else {
          selected.delete(deviceId);
      }
      setFormData({ ...formData, medical_device_ids: Array.from(selected) });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
        ...formData,
        slug: formData.slug || generateSlug(formData.name)
    }
    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Facility Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., RSU Sehat Selalu"
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Type *</label>
          <select
            value={formData.type_of_health_facility_id}
            onChange={(e) => setFormData({ ...formData, type_of_health_facility_id: e.target.value })}
            className="w-full h-[42px] px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            required
          >
            <option value="">Select facility type</option>
            {healthFacilityTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Medical Devices</label>
          <input
            type="text"
            placeholder="Search medical device..."
            onChange={handleDeviceSearch}
            className="w-full px-3 py-2 mb-2 rounded bg-gray-700 border border-gray-600 text-white"
          />
          <div className="max-h-[200px] overflow-y-auto border border-gray-600 rounded bg-gray-700 px-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                {filteredDevices.map((device) => (
                    <label key={device.id} className="flex items-center justify-between gap-2 bg-gray-800 px-3 py-2 rounded hover:bg-gray-600 cursor-pointer">
                        <span className="text-sm text-white truncate">{device.brand} {device.model} - {device.serial_number}</span>
                        <input
                            type="checkbox"
                            className="form-checkbox w-4 h-4 accent-blue-600"
                            checked={formData.medical_device_ids.includes(device.id)}
                            onChange={(e) => handleDeviceSelection(device.id, e.target.checked)}
                        />
                    </label>
                ))}
            </div>
          </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="e.g., facility@example.com"
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Phone Number</label>
          <input
            type="tel"
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            placeholder="e.g., 081370197253"
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-300">City</label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          placeholder="e.g., Medan"
          className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-300">Address</label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="e.g., Jl. Setia Luhur No. 1, Medan"
          rows={3}
          className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-gray-700">
        <Link href="/dashboard/health-facilities" className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 cursor-pointer flex items-center gap-2">
          <X className="w-4 h-4" /> Cancel
        </Link>
        <button
          type="submit"
          disabled={isSaving || !formData.name.trim() || !formData.type_of_health_facility_id}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
        >
          {initialData ? (
            <>
              <Save className="w-4 h-4" /> {isSaving ? "Updating..." : "Update"}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> {isSaving ? "Creating..." : "Create"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
