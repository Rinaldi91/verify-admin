"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Save, X, Plus, UploadCloud, Users } from "lucide-react";
import Image from "next/image";

interface Division {
  id: number;
  name: string;
}

interface Position {
  id: number;
  name: string;
}

// This interface should also include an optional 'photo' for destructuring
export interface EmployeeFormData {
  id?: number;
  nik: string;
  name: string;
  gender: string;
  place_of_birth: string;
  date_of_birth: string;
  email: string;
  phone_number: string;
  address: string;
  date_of_entry: string;
  region: string;
  division_id: string;
  position_id: string;
  is_active: number;
  status: string;
  photo?: string; // Old photo filename
  photo_url?: string; // URL to display the existing photo
}

interface EmployeeFormProps {
  initialData?: EmployeeFormData;
  divisions: Division[];
  positions: Position[];
  onSubmit: (data: FormData) => Promise<void>;
  isSaving: boolean;
}

export default function EmployeeForm({
  initialData,
  divisions,
  positions,
  onSubmit,
  isSaving,
}: EmployeeFormProps) {
  const [formData, setFormData] = useState<
    Omit<EmployeeFormData, "id" | "photo_url" | "photo">
  >({
    nik: "",
    name: "",
    gender: "Laki-Laki",
    place_of_birth: "",
    date_of_birth: "",
    email: "",
    phone_number: "",
    address: "",
    date_of_entry: "",
    region: "",
    division_id: "",
    position_id: "",
    is_active: 1,
    status: "",
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.photo_url || null
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (initialData) {
      const { id: _id, photo_url, ...rest } = initialData;
      setFormData(rest);
      setPhotoPreview(photo_url || null);
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();

    // This loop will no longer append the 'photo' field with the old filename.
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, String(value));
    });

    // This will append the 'photo' field ONLY if a new file has been selected.
    if (photoFile) {
      data.append("photo", photoFile);
    }

    // For the PUT method in Laravel with FormData, add _method.
    if (initialData?.id) {
      data.append("_method", "PUT");
    }

    onSubmit(data);
  };

  const inputStyle =
    "w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Photo and Personal Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Employee Photo
          </label>
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-gray-700 mb-4 flex items-center justify-center overflow-hidden border-2 border-gray-600 relative">
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt="Preview"
                  className="object-cover"
                  fill
                  unoptimized={true}
                />
              ) : (
                <Users className="w-16 h-16 text-gray-500" />
              )}
            </div>
            <label
              htmlFor="photo-upload"
              className="cursor-pointer bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{photoFile ? "Change Photo" : "Upload Photo"}</span>
            </label>
            <input
              id="photo-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handlePhotoChange}
            />
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              NIK
            </label>
            <input
              type="text"
              name="nik"
              placeholder="e.g., 1234567890098765"
              value={formData.nik}
              onChange={handleChange}
              className={inputStyle}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="e.g., Jhon Doe"
              value={formData.name}
              onChange={handleChange}
              className={inputStyle}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={`${inputStyle} cursor-pointer`}
            >
              <option>Laki-Laki</option>
              <option>Perempuan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Birth & Contact Information Section */}
      <div className="border-t border-gray-700 pt-8">
        <h3 className="text-lg font-semibold text-white mb-4">
          Birth & Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Place of Birth
            </label>
            <input
              type="text"
              name="place_of_birth"
              placeholder="e.g., Medan"
              value={formData.place_of_birth}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Date of Birth
            </label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              className={`${inputStyle} [color-scheme:dark]`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="e.g., Jhon@email.com"
              value={formData.email}
              onChange={handleChange}
              className={inputStyle}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone_number"
              placeholder="e.g., 081389877896"
              value={formData.phone_number}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Address
            </label>
            <textarea
              name="address"
              placeholder="e.g., Jl, Setia Luhur"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className={`${inputStyle} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* Employment Details Section */}
      <div className="border-t border-gray-700 pt-8">
        <h3 className="text-lg font-semibold text-white mb-4">
          Employment Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Date of Entry
            </label>
            <input
              type="date"
              name="date_of_entry"
              value={formData.date_of_entry}
              onChange={handleChange}
              className={`${inputStyle} [color-scheme:dark]`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Region
            </label>
            <input
              type="text"
              name="region"
              placeholder="e.g., Medan"
              value={formData.region}
              onChange={handleChange}
              className={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Department
            </label>
            <select
              name="division_id"
              value={formData.division_id}
              onChange={handleChange}
              className={`${inputStyle} cursor-pointer`}
              required
            >
              <option value="">Select Department</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Position
            </label>
            <select
              name="position_id"
              value={formData.position_id}
              onChange={handleChange}
              className={`${inputStyle} cursor-pointer`}
              required
            >
              <option value="">Select Position</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
               Status Employee
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={`${inputStyle} cursor-pointer`}
            >
              <option value={"Training"}>Training</option>
              <option value={"Karyawan Kontrak"}>Karyawan Kontrak</option>
              <option value={"Karyawan Tetap"}>Karyawan Tetap</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Status
            </label>
            <select
              name="is_active"
              value={formData.is_active}
              onChange={handleChange}
              className={`${inputStyle} cursor-pointer`}
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-700">
        <Link
          href="/dashboard/employees"
          className="px-5 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" /> Cancel
        </Link>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
        >
          {initialData ? (
            <Save className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isSaving
            ? initialData
              ? "Updating..."
              : "Creating..."
            : initialData
            ? "Update Employee"
            : "Create Employee"}
        </button>
      </div>
    </form>
  );
}