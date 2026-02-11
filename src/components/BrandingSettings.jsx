import React, { useState, useEffect } from 'react';
import { useAppContext, supabaseClient } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';
import {
  getOrganizationBranding,
  updateOrganizationBranding,
  uploadLogo
} from '@siteweave/core-logic';

/**
 * Branding Settings Component
 * Configure organization branding for email reports
 */
function BrandingSettings() {
  const { state } = useAppContext();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [branding, setBranding] = useState({
    logo_url: null,
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    company_footer: '',
    email_signature: ''
  });

  useEffect(() => {
    if (state.currentOrganization?.id) {
      loadBranding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentOrganization?.id]);

  const loadBranding = async () => {
    setIsLoading(true);
    try {
      const orgId = state.currentOrganization?.id;
      if (!orgId) return;

      const brandingData = await getOrganizationBranding(supabaseClient, orgId);
      setBranding(brandingData);
    } catch (error) {
      addToast('Error loading branding: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const orgId = state.currentOrganization?.id;
      const logoUrl = await uploadLogo(supabaseClient, orgId, file);
      setBranding({ ...branding, logo_url: logoUrl });
      addToast('Logo uploaded successfully', 'success');
    } catch (error) {
      addToast('Error uploading logo: ' + error.message, 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const orgId = state.currentOrganization?.id;
      await updateOrganizationBranding(supabaseClient, orgId, branding);
      addToast('Branding settings saved', 'success');
    } catch (error) {
      addToast('Error saving branding: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading branding settings..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Email Branding</h2>
        <p className="text-sm text-gray-600 mt-1">
          Customize how your progress reports appear to recipients
        </p>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Organization Logo
        </label>
        <div className="flex items-center gap-4">
          {branding.logo_url && (
            <img
              src={branding.logo_url}
              alt="Organization logo"
              className="h-16 w-auto"
            />
          )}
          <div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isUploadingLogo}
                className="hidden"
              />
              <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isUploadingLogo ? 'Uploading...' : branding.logo_url ? 'Change Logo' : 'Upload Logo'}
              </span>
            </label>
            {branding.logo_url && (
              <button
                onClick={() => setBranding({ ...branding, logo_url: null })}
                className="ml-2 text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Logo will appear at the top of email reports. Recommended size: 200x60px
        </p>
      </div>

      {/* Colors */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primary_color}
                onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={branding.primary_color}
                onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#3B82F6"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Used for headers and accents</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.secondary_color}
                onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={branding.secondary_color}
                onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#10B981"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Used for highlights and completed items</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Footer
        </label>
        <textarea
          value={branding.company_footer}
          onChange={(e) => setBranding({ ...branding, company_footer: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Company address, contact info, etc. (HTML supported)"
        />
        <p className="text-xs text-gray-500 mt-1">
          This will appear at the bottom of all email reports
        </p>
      </div>

      {/* Email Signature */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Signature
        </label>
        <textarea
          value={branding.email_signature}
          onChange={(e) => setBranding({ ...branding, email_signature: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your name, title, contact info..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional signature block for reports
        </p>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Preview</h3>
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div style={{ backgroundColor: branding.primary_color, padding: '20px', textAlign: 'center' }}>
            {branding.logo_url && (
              <img src={branding.logo_url} alt="Logo" style={{ maxHeight: '60px' }} />
            )}
          </div>
          <div style={{ padding: '20px', backgroundColor: 'white' }}>
            <h2 style={{ color: branding.primary_color }}>Sample Report</h2>
            <p style={{ color: branding.secondary_color }}>This is how your reports will look</p>
            {branding.company_footer && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280' }}>
                {branding.company_footer}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Branding Settings'}
        </button>
      </div>
    </div>
  );
}

export default BrandingSettings;
